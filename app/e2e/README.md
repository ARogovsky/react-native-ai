# Device-level login test (AWS Device Farm, Appium)

Proves on a real device that signing in works and the signed-in tree mounts — the exact
path that broke in build 8 (`SafeAreaProvider` below `ChatMenu`, see
`.kiro/steering/no-regressions-verify-startup.md`). Random-event fuzz runs cannot reach it,
because they never authenticate.

## How the login is possible without a mailbox

Clerk development instances accept any address containing `+clerk_test` with the fixed
one-time code `424242`. So the app under test must be built with a **dev** Clerk
publishable key: that is the `e2e` profile in `eas.json`.

Consequence: tokens from the dev Clerk instance are rejected by the production API
(it verifies against the live instance), so this suite asserts only up to the signed-in
screen. Chat traffic is out of scope here and is covered by the API-side evals.

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
