"""Device Farm orchestration. Runs INSIDE CodeBuild (elli-mobile-ci-e2e), never locally.

Inputs come from the build environment:
  PLATFORM            ios | android
  APP_ARCHIVE_URL     URL of the .ipa/.apk produced by EAS
  DF_PROJECT_ARN      Device Farm project (Terraform-managed)
  DF_IOS_POOL_ARN     iOS device pool (Terraform-managed)
  DF_ANDROID_POOL_ARN Android device pool (Terraform-managed)
  DF_REGION           us-west-2
  APP_SECRET_ID       Secrets Manager id holding CLERK_SECRET_KEY
  APP_SECRET_REGION   region of that secret

Uploads app + Appium package + test spec, schedules the run, waits for it, then prints the
verdict and the test-spec output so the whole story sits in the CodeBuild log. The exit
code mirrors the Device Farm result, so a failed login turns the build red.

Test fixtures are borrowed, never left behind: Clerk test mode is switched on for the run
(it makes the +clerk_test address accept the fixed OTP) and switched back off in `finally`,
and the account the app creates during the run is deleted afterwards — including when the
run fails.
"""

import base64
import datetime
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile

REGION = os.environ.get("DF_REGION", "us-west-2")
PROJECT_ARN = os.environ["DF_PROJECT_ARN"]
PLATFORM = os.environ.get("PLATFORM", "ios").lower()
APP_URL = os.environ["APP_ARCHIVE_URL"]
POOL_ARN = os.environ["DF_IOS_POOL_ARN"] if PLATFORM == "ios" else os.environ["DF_ANDROID_POOL_ARN"]
APP_TYPE = "IOS_APP" if PLATFORM == "ios" else "ANDROID_APP"
APP_FILE = "app.ipa" if PLATFORM == "ios" else "app.apk"
ZIP_FILE = "e2e-package.zip"
FIXTURE_FILE = "fixture.json"
APP_SECRET_ID = os.environ.get("APP_SECRET_ID", "elli-eu-north-1-app")
APP_SECRET_REGION = os.environ.get("APP_SECRET_REGION", "eu-north-1")
LANGFUSE_SECRET_ID = os.environ.get("LANGFUSE_SECRET_ID", "langfuse-api-keys")
LANGFUSE_SECRET_REGION = os.environ.get("LANGFUSE_SECRET_REGION", "eu-north-1")
POLL_SECONDS = 30
MAX_MINUTES = 45
# When this build started; scopes the Langfuse query to this run only.
RUN_STARTED_AT = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Clerk treats an address as a test address through the `+clerk_test` subaddress, so the
# per-run id goes in front of the plus sign.
RUN_ID = uuid.uuid4().hex[:10]
E2E_EMAIL = "elli.e2e.%s+clerk_test@example.com" % RUN_ID
E2E_PASSWORD = "Elli-%s-A1!" % uuid.uuid4().hex[:12]


def aws(args):
    out = subprocess.run(["aws"] + args, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit("aws %s failed: %s" % (" ".join(args[:3]), out.stderr.strip()[:400]))
    return json.loads(out.stdout) if out.stdout.strip() else {}


def clerk_secret():
    payload = subprocess.run(
        [
            "aws", "secretsmanager", "get-secret-value",
            "--secret-id", APP_SECRET_ID,
            "--region", APP_SECRET_REGION,
            "--query", "SecretString",
            "--output", "text",
        ],
        capture_output=True,
        text=True,
    )
    if payload.returncode != 0:
        raise SystemExit("cannot read app secret: " + payload.stderr.strip()[:300])
    return json.loads(payload.stdout)["CLERK_SECRET_KEY"]


CLERK_KEY = clerk_secret()


def clerk(method, path, body=None):
    req = urllib.request.Request(
        "https://api.clerk.com/v1" + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "Authorization": "Bearer " + CLERK_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "curl/8.7.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw or b"{}")
        except Exception:
            return e.code, {"raw": raw[:300].decode("utf-8", "replace")}


def set_test_mode(enabled):
    status, _ = clerk("PATCH", "/instance", {"test_mode": enabled})
    print("clerk test_mode=%s -> http %s" % (enabled, status))
    return status in (200, 204)


# Clerk user ids seen during cleanup. The Langfuse check needs them, and by then the
# accounts are already deleted, so they are remembered here.
RUN_USER_IDS = []


def delete_e2e_user():
    """Remove the account the run created, so prod keeps no leftovers."""
    status, found = clerk("GET", "/users?limit=10&email_address=" + urllib.parse.quote(E2E_EMAIL))
    users = found if isinstance(found, list) else found.get("data", [])
    print("cleanup: users matching %s -> %s (http %s)" % (E2E_EMAIL, len(users), status))
    for user in users:
        RUN_USER_IDS.append(user["id"])
        code, _ = clerk("DELETE", "/users/" + user["id"])
        print("cleanup: deleted %s -> http %s" % (user["id"], code))


def langfuse_config():
    """Project keys for the cabinet: the same secret services/api reads at runtime."""
    payload = subprocess.run(
        [
            "aws", "secretsmanager", "get-secret-value",
            "--secret-id", LANGFUSE_SECRET_ID,
            "--region", LANGFUSE_SECRET_REGION,
            "--query", "SecretString",
            "--output", "text",
        ],
        capture_output=True,
        text=True,
    )
    if payload.returncode != 0:
        raise SystemExit("cannot read langfuse secret: " + payload.stderr.strip()[:300])
    return json.loads(payload.stdout)


def langfuse_generations(user_id, since_iso):
    """Generations the API traced for this user. An empty list means nothing was traced."""
    cfg = langfuse_config()
    auth = base64.b64encode(
        ("%s:%s" % (cfg["LANGFUSE_PUBLIC_KEY"], cfg["LANGFUSE_SECRET_KEY"])).encode()
    ).decode()
    # v1 /api/public/observations is disabled on a v4 events_only deployment; model and
    # usage are not part of the default field groups, hence the explicit `fields`.
    path = (
        "/api/public/v2/observations?userId=%s&fromStartTime=%s"
        "&fields=basic,time,model,usage&limit=50"
        % (urllib.parse.quote(user_id), urllib.parse.quote(since_iso))
    )
    req = urllib.request.Request(
        cfg["LANGFUSE_HOST"] + path,
        headers={"Authorization": "Basic " + auth, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            body = json.loads(response.read())
    except urllib.error.HTTPError as e:
        print("langfuse read failed: http %s %s" % (e.code, e.read()[:200]))
        return []
    items = body.get("data", [])
    print("langfuse: %d observations for %s" % (len(items), user_id))
    return [item for item in items if item.get("type") == "GENERATION"]


print("platform=%s pool=%s" % (PLATFORM, POOL_ARN.rsplit("/", 1)[-1]))
# The EAS artifact CDN answers 403 Forbidden to urllib's default user agent (that killed
# the first e2e build 23 seconds in); curl follows the redirects and fetches the file.
fetch = subprocess.run(["curl", "-sSL", "-o", APP_FILE, APP_URL], capture_output=True, text=True)
if fetch.returncode != 0 or not os.path.exists(APP_FILE):
    raise SystemExit("artifact download failed: " + fetch.stderr.strip()[:300])
print("app bytes:", os.path.getsize(APP_FILE))

# Credentials for this run only: generated here, shipped inside the test package, and the
# account they create is deleted in the cleanup step below. Nothing is committed.
with open(FIXTURE_FILE, "w") as f:
    json.dump({"email": E2E_EMAIL, "password": E2E_PASSWORD}, f)

with zipfile.ZipFile(ZIP_FILE, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("package.json")
    z.write("login.test.js")
    z.write(FIXTURE_FILE)
print("test package bytes:", os.path.getsize(ZIP_FILE))
print("fixture address:", E2E_EMAIL)


def upload(name, kind, path):
    up = aws(
        [
            "devicefarm", "create-upload",
            "--project-arn", PROJECT_ARN,
            "--name", name,
            "--type", kind,
            "--region", REGION,
        ]
    )["upload"]
    put = subprocess.run(
        ["curl", "-sS", "-T", path, "-H", "Content-Type: application/octet-stream", up["url"]],
        capture_output=True,
        text=True,
    )
    if put.returncode != 0:
        raise SystemExit("upload PUT failed: " + put.stderr.strip()[:200])
    for _ in range(60):
        state = aws(["devicefarm", "get-upload", "--arn", up["arn"], "--region", REGION])["upload"]
        if state["status"] in ("SUCCEEDED", "FAILED"):
            break
        time.sleep(5)
    print("%-26s %s %s" % (kind, state["status"], state.get("message", "")))
    if state["status"] != "SUCCEEDED":
        raise SystemExit(1)
    return up["arn"]


app_arn = upload(APP_FILE, APP_TYPE, APP_FILE)
pkg_arn = upload(ZIP_FILE, "APPIUM_NODE_TEST_PACKAGE", ZIP_FILE)
spec_arn = upload("testspec.yml", "APPIUM_NODE_TEST_SPEC", "testspec.yml")

# Test mode makes the +clerk_test address accept the fixed OTP. It is a production
# instance, so it must be off again by the time this build ends — hence the try/finally.
if not set_test_mode(True):
    raise SystemExit("could not enable Clerk test mode")

try:
    run = aws(
        [
            "devicefarm", "schedule-run",
            "--project-arn", PROJECT_ARN,
            "--app-arn", app_arn,
            "--device-pool-arn", POOL_ARN,
            "--name", "%s-login-flow" % PLATFORM,
            "--test", json.dumps({"type": "APPIUM_NODE", "testPackageArn": pkg_arn, "testSpecArn": spec_arn}),
            "--region", REGION,
        ]
    )["run"]
    run_arn = run["arn"]
    print("run:", run_arn)

    deadline = time.time() + MAX_MINUTES * 60
    while True:
        run = aws(["devicefarm", "get-run", "--arn", run_arn, "--region", REGION])["run"]
        print("status=%s result=%s counters=%s" % (run["status"], run.get("result"), json.dumps(run.get("counters", {}))))
        if run["status"] == "COMPLETED" or time.time() > deadline:
            break
        time.sleep(POLL_SECONDS)
finally:
    # Both steps run even if scheduling raised: prod goes back to how it was.
    try:
        delete_e2e_user()
    finally:
        set_test_mode(False)

print("device minutes:", json.dumps(run.get("deviceMinutes", {})))

for job in aws(["devicefarm", "list-jobs", "--arn", run_arn, "--region", REGION]).get("jobs", []):
    print("\njob %s | %s %s | result=%s" % (job["name"], job["device"]["name"], job["device"]["os"], job.get("result")))
    for suite in aws(["devicefarm", "list-suites", "--arn", job["arn"], "--region", REGION]).get("suites", []):
        print("  suite %-22s %s" % (suite["name"], suite.get("result")))
        for test in aws(["devicefarm", "list-tests", "--arn", suite["arn"], "--region", REGION]).get("tests", []):
            print("    test %-26s %-8s %s" % (test["name"], test.get("result"), (test.get("message") or "")[:120]))
    for art in aws(["devicefarm", "list-artifacts", "--arn", job["arn"], "--type", "FILE", "--region", REGION]).get("artifacts", []):
        if art["type"] in ("TESTSPEC_OUTPUT", "APPIUM_JAVA_OUTPUT", "CUSTOMER_ARTIFACT"):
            print("\n----- %s -----" % art["type"])
            try:
                with urllib.request.urlopen(art["url"], timeout=60) as response:
                    sys.stdout.write(response.read().decode("utf-8", "replace")[:20000])
            except Exception as exc:
                print("could not fetch artifact:", exc)

result = run.get("result")
# The device only proves the app rendered an answer. This proves the turn reached Bedrock
# and landed in the cabinet with a model and token counts — the other half of "chat works".
traced = False
if result == "PASSED":
    print("\n----- langfuse check -----")
    if not RUN_USER_IDS:
        print("no Clerk user id captured for this run; cannot check the traces")
    for user_id in RUN_USER_IDS:
        for gen in langfuse_generations(user_id, RUN_STARTED_AT):
            usage = gen.get("usageDetails") or {}
            print(
                "  %s %s model=%s usage=%s"
                % (gen.get("startTime"), gen.get("name"), gen.get("model"), json.dumps(usage))
            )
            if gen.get("model") and (usage.get("output") or 0) > 0:
                traced = True
    print("langfuse trace with model and output tokens:", traced)

print("\nFINAL result=%s status=%s langfuse_traced=%s" % (result, run["status"], traced))
sys.exit(0 if result == "PASSED" and traced else 1)
