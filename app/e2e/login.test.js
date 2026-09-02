/**
 * Device-level login check for ELLI.
 *
 * Journey: cold start -> "Continue with Email" -> Clerk test address -> OTP 424242 ->
 * the signed-in screen must appear (testID `home-continue`).
 *
 * The assert at the end is the regression guard: in build 8 the signed-in tree crashed on
 * mount (SafeAreaProvider was below ChatMenu), so authentication looked broken.
 *
 * Appium is provided by Device Farm; the driver connects to the already-installed app.
 */

const fs = require('fs');
const { remote } = require('webdriverio');

// pre_test resolves the prebuilt WebDriverAgent path and drops it here.
function readWdaPath() {
  try {
    return fs.readFileSync('.wda_path', 'utf8').trim() || null;
  } catch (e) {
    return process.env.DEVICEFARM_WDA_DERIVED_DATA_PATH || null;
  }
}
const WDA_PATH = readWdaPath();

const PLATFORM = (process.env.DEVICEFARM_DEVICE_PLATFORM_NAME || 'iOS').toLowerCase();
const IS_IOS = PLATFORM.includes('ios');
// run_devicefarm.py generates a per-run address + password and ships them in the test
// package; the account is deleted right after the run. Nothing is stored in the repo.
function readFixture() {
  try {
    return JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
  } catch (e) {
    return {};
  }
}
const FIXTURE = readFixture();

const EMAIL = FIXTURE.email || process.env.E2E_EMAIL || 'elli.e2e+clerk_test@example.com';
// Needed when the address is not registered yet: the instance has
// user_settings.attributes.password.required = true.
const PASSWORD =
  FIXTURE.password ||
  process.env.E2E_PASSWORD ||
  'Elli-' + Math.random().toString(36).slice(2, 12) + '-A1!';
const OTP = '424242';
const TIMEOUT = 30000;
// A turn can take three Bedrock calls (first attempt, safety retry, recovery), so the
// answer gets its own, longer budget.
const ANSWER_TIMEOUT = 120000;
const PROMPT = 'Привіт! Мені тривожно перед сном. З чого почати?';
// The app renders one generic bubble for every failure; catching its copy in any of the
// three languages is what turns "the chat is broken" into a red build.
const ERROR_MARKERS = [
  'Сталася помилка',
  'Произошла ошибка',
  'Something went wrong. Please try again.',
];

/** Message text as the platform exposes it: accessibilityLabel on the bubble. */
async function answerText(el) {
  const label = await el.getAttribute(IS_IOS ? 'label' : 'content-desc').catch(() => null);
  if (label) return String(label);
  return String((await el.getText().catch(() => '')) || '');
}

function selector(testId) {
  // iOS: testID becomes the accessibility identifier, so `~id` matches.
  // Android: testID becomes resource-id, while content-desc holds accessibilityLabel —
  // `~id` would look at content-desc and miss every labelled button.
  return IS_IOS ? `~${testId}` : `//*[@resource-id="${testId}"]`;
}

async function tap(driver, testId) {
  const el = await driver.$(selector(testId));
  await el.waitForDisplayed({ timeout: TIMEOUT });
  await el.click();
  return el;
}

async function type(driver, testId, text) {
  const el = await driver.$(selector(testId));
  await el.waitForDisplayed({ timeout: TIMEOUT });
  await el.click();
  await el.setValue(text);
  // On Android the soft keyboard covers the button below the field, and Appium reports a
  // covered element as not displayed — that is what killed the registration step.
  if (!IS_IOS) {
    try {
      await driver.hideKeyboard();
    } catch (e) {
      // Already hidden: nothing to do.
    }
  }
  return el;
}

describe('ELLI login on a real device', function () {
  this.timeout(300000);
  let driver;

  before(async () => {
    driver = await remote({
      hostname: process.env.DEVICEFARM_APPIUM_HOST || '127.0.0.1',
      port: parseInt(process.env.DEVICEFARM_APPIUM_PORT || '4723', 10),
      path: '/wd/hub',
      logLevel: 'warn',
      capabilities: {
        platformName: IS_IOS ? 'iOS' : 'Android',
        'appium:automationName': IS_IOS ? 'XCUITest' : 'UiAutomator2',
        'appium:udid': process.env.DEVICEFARM_DEVICE_UDID,
        'appium:deviceName': process.env.DEVICEFARM_DEVICE_NAME,
        'appium:platformVersion': process.env.DEVICEFARM_DEVICE_OS_VERSION,
        'appium:newCommandTimeout': 120,
        ...(IS_IOS
          ? {
              'appium:bundleId': process.env.APP_BUNDLE_ID || 'com.unkd.elli',
              // Device Farm prebuilds WebDriverAgent; letting the driver build it fails
              // with "xcodebuild failed with code 65".
              ...(WDA_PATH
                ? { 'appium:usePrebuiltWDA': true, 'appium:derivedDataPath': WDA_PATH }
                : {}),
            }
          : { 'appium:appPackage': process.env.APP_PACKAGE || 'com.elli.app' }),
      },
    });
  });

  after(async () => {
    if (driver) await driver.deleteSession();
  });

  // On failure, capture what is actually on screen: the page source goes to the build log
  // and the screenshot to the run artifacts. A bare "element not displayed" does not say
  // whether Clerk refused the code, the app crashed, or the screen simply differs.
  afterEach(async function () {
    if (this.currentTest && this.currentTest.state !== 'failed') return
    if (!driver) return
    try {
      const source = await driver.getPageSource()
      console.log('----- page source at failure -----')
      console.log(String(source).slice(0, 8000))
    } catch (e) {
      console.log('could not read page source:', e && e.message)
    }
    try {
      const dir = process.env.DEVICEFARM_LOG_DIR || '.'
      await driver.saveScreenshot(dir + '/failure.png')
      console.log('screenshot saved to', dir + '/failure.png')
    } catch (e) {
      console.log('could not save screenshot:', e && e.message)
    }
  })

  it('signs in and reaches the signed-in screen', async () => {
    // Login screen is up.
    const start = await driver.$(selector('auth-email-start'));
    await start.waitForDisplayed({ timeout: TIMEOUT });

    // Consent is mandatory: the instance requires `legal_accepted` on every strategy, so
    // the buttons stay disabled until the checkbox is ticked.
    await tap(driver, 'auth-legal');
    await start.click();

    await type(driver, 'auth-email', EMAIL);
    await tap(driver, 'auth-send-code');

    // Unknown address -> registration step, which also needs a password
    // (instance has password.required: true). Known address -> straight to the code.
    const passwordField = await driver.$(selector('auth-password'));
    if (await passwordField.isDisplayed().catch(() => false)) {
      await type(driver, 'auth-password', PASSWORD);
      await tap(driver, 'auth-register');
    }

    await type(driver, 'auth-code', OTP);
    await tap(driver, 'auth-verify');

    // The signed-in tree mounted: this is what crashed in build 8.
    const home = await driver.$(selector('home-continue'));
    await home.waitForDisplayed({ timeout: TIMEOUT });

    if (!(await home.isDisplayed())) {
      throw new Error('signed-in screen did not render');
    }
  });

  // Login alone is not the product. This is the case the owner cares about, and it is the
  // one that broke unnoticed: the API was reachable, but the app showed the error bubble
  // because the running task held a database password that had been rotated away.
  it('sends a message and renders the model answer', async () => {
    await tap(driver, 'home-continue');

    const input = await driver.$(selector('chat-input'));
    await input.waitForDisplayed({ timeout: TIMEOUT });
    await type(driver, 'chat-input', PROMPT);
    await tap(driver, 'chat-send');

    const bubble = await driver.$(selector('chat-bubble-agent'));
    await bubble.waitForDisplayed({ timeout: ANSWER_TIMEOUT });

    // The answer streams in, so the bubble exists long before it is complete.
    await driver.waitUntil(async () => (await answerText(bubble)).length > 40, {
      timeout: ANSWER_TIMEOUT,
      interval: 2000,
      timeoutMsg: 'no answer text arrived within ' + ANSWER_TIMEOUT + 'ms',
    });

    const answer = await answerText(bubble);
    console.log('answer (first 200 chars):', answer.slice(0, 200));

    for (const marker of ERROR_MARKERS) {
      if (answer.includes(marker)) {
        throw new Error('chat returned the error bubble: ' + answer.slice(0, 200));
      }
    }
  });
});
