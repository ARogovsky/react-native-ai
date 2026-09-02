# Device-level login test (AWS Device Farm, Appium)

Proves on a real device that signing in works and the signed-in tree mounts — the exact
path that broke in build 8 (`SafeAreaProvider` below `ChatMenu`, see
`.kiro/steering/no-regressions-verify-startup.md`). Random-event fuzz runs cannot reach it,
because they never authenticate.

## How the login is possible without a mailbox

Clerk accepts any address containing `+clerk_test` with the fixed one-time code `424242`
while the instance has **test mode** on. `run_devicefarm.py` switches test mode on for the
run and off again in `finally`, and deletes the throwaway account afterwards.

The app under test is therefore built against the **live** Clerk instance (the `e2e`
profile in `eas.json` pins `pk_live_…`). That is what makes the chat testable: the
production API verifies tokens against the live instance and rejects dev-instance ones.
`scripts/check-clerk-keys.js` enforces the pairing.

## What the run proves

1. Sign-in works and the signed-in tree mounts (`home-continue` is displayed) — the path
   that broke in build 8.
2. A message sent from the chat screen comes back as a real answer: the assistant bubble
   fills with text and is not the generic error copy.
3. The turn reached Bedrock — after the device run, `run_devicefarm.py` asks Langfuse for
   that user's generations and requires one with a model and output tokens. A build where
   the app renders an answer but nothing is traced is red.

## Test type

Appium NodeJS, which Device Farm pre-configures on both host types (Amazon Linux 2 for
Android, macOS for iOS). Maestro is not a Device Farm test type and would need to be
installed and wired to the device by hand inside a custom environment.

## Files

- `login.test.js`  — the flow: email → code → assert the signed-in screen
- `package.json`   — deps Device Farm installs from the bundled `node_modules`
- `testspec.yml`   — Device Farm custom test environment spec

## Trigger

`tmp/df-login.py` builds nothing: it takes an existing `e2e` build artifact, uploads app +
test package + spec, schedules `APPIUM_NODE`, then prints the verdict and artifacts.
