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
const EMAIL = 'elli.e2e+clerk_test@example.com';
const OTP = '424242';
const TIMEOUT = 30000;

function selector(testId) {
  // React Native maps testID to accessibility id on both platforms.
  return `~${testId}`;
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

  it('signs in and reaches the signed-in screen', async () => {
    // Login screen is up.
    const start = await driver.$(selector('auth-email-start'));
    await start.waitForDisplayed({ timeout: TIMEOUT });
    await start.click();

    await type(driver, 'auth-email', EMAIL);
    await tap(driver, 'auth-send-code');

    await type(driver, 'auth-code', OTP);
    await tap(driver, 'auth-verify');

    // The signed-in tree mounted: this is what crashed in build 8.
    const home = await driver.$(selector('home-continue'));
    await home.waitForDisplayed({ timeout: TIMEOUT });

    if (!(await home.isDisplayed())) {
      throw new Error('signed-in screen did not render');
    }
  });
});
