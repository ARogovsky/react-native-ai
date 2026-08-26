"""Device Farm orchestration. Runs INSIDE CodeBuild (elli-mobile-ci-e2e), never locally.

Inputs come from the build environment:
  PLATFORM            ios | android
  APP_ARCHIVE_URL     URL of the .ipa/.apk produced by EAS
  DF_PROJECT_ARN      Device Farm project (Terraform-managed)
  DF_IOS_POOL_ARN     iOS device pool (Terraform-managed)
  DF_ANDROID_POOL_ARN Android device pool (Terraform-managed)
  DF_REGION           us-west-2

Uploads app + Appium package + test spec, schedules the run, waits for it, then prints the
verdict and the test-spec output so the whole story sits in the CodeBuild log. The exit
code mirrors the Device Farm result, so a failed login turns the build red.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import zipfile

REGION = os.environ.get("DF_REGION", "us-west-2")
PROJECT_ARN = os.environ["DF_PROJECT_ARN"]
PLATFORM = os.environ.get("PLATFORM", "ios").lower()
APP_URL = os.environ["APP_ARCHIVE_URL"]
POOL_ARN = os.environ["DF_IOS_POOL_ARN"] if PLATFORM == "ios" else os.environ["DF_ANDROID_POOL_ARN"]
APP_TYPE = "IOS_APP" if PLATFORM == "ios" else "ANDROID_APP"
APP_FILE = "app.ipa" if PLATFORM == "ios" else "app.apk"
ZIP_FILE = "e2e-package.zip"
POLL_SECONDS = 30
MAX_MINUTES = 45


def aws(args):
    out = subprocess.run(["aws"] + args, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit("aws %s failed: %s" % (" ".join(args[:3]), out.stderr.strip()[:400]))
    return json.loads(out.stdout) if out.stdout.strip() else {}


print("platform=%s pool=%s" % (PLATFORM, POOL_ARN.rsplit("/", 1)[-1]))
# The EAS artifact CDN answers 403 Forbidden to urllib's default user agent (that killed
# the first e2e build 23 seconds in); curl follows the redirects and fetches the file.
fetch = subprocess.run(["curl", "-sSL", "-o", APP_FILE, APP_URL], capture_output=True, text=True)
if fetch.returncode != 0 or not os.path.exists(APP_FILE):
    raise SystemExit("artifact download failed: " + fetch.stderr.strip()[:300])
print("app bytes:", os.path.getsize(APP_FILE))

with zipfile.ZipFile(ZIP_FILE, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("package.json")
    z.write("login.test.js")
print("test package bytes:", os.path.getsize(ZIP_FILE))


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
print("\nFINAL result=%s status=%s" % (result, run["status"]))
sys.exit(0 if result == "PASSED" else 1)
