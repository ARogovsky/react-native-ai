# Maestro E2E flows (ELLI mobile)

Critical-path smoke for the mobile client. Selectors use stable `testID`s
(`auth-email`, `auth-code`, `auth-send-code`, `auth-verify`, `chat-input`,
`chat-send`, `header-menu`, `menu-new-chat`, `menu-session-row`) so flows are
locale-independent.

## Flows
- `auth.yaml` — sign in via Clerk email code (test mode).
- `smoke.yaml` — full journey: sign in → send message → menu → new chat →
  reopen menu → select previous session → history loads. Runs `auth.yaml` first.

## Clerk test mode (no real inbox)
Clerk **dev** instances accept any `…+clerk_test@example.com` email with the fixed
one-time code **424242**. The build under test must therefore use a Clerk DEV
publishable key (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…`). With a prod key
these flows will not receive the fixed code.

## Backend
The build must point at a reachable backend (`EXPO_PUBLIC_DEV_API_URL` /
`EXPO_PUBLIC_PROD_API_URL` = https://api.e-lli.com). Steps 2–5 exercise the real
SSE stream + `/api/sessions`, so the API must be up.

## Run locally (against an emulator/simulator with the app installed)
```bash
# Install Maestro once: https://maestro.mobile.dev
maestro test .maestro/smoke.yaml
```
`appId` in the flows is `com.elli.app` (current placeholder). When we set the
real ELLI bundle id in the EAS step, update `appId` in both YAMLs.

## On AWS Device Farm (planned)
Device Farm runs Maestro flows against managed devices (pay-per-device-minute,
zero idle). Upload the built app (APK/IPA) + the `.maestro/` flows as the test
package. Wiring this is the next infra step after EAS profiles.
