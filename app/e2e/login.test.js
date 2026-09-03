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

/**
 * Taps a control that only carries an accessibilityLabel (the chat back arrow has no
 * testID). The label is localised, so every language spelling is tried.
 */
async function tapByLabel(driver, labels) {
  for (const label of labels) {
    const el = await driver.$(IS_IOS ? `~${label}` : `//*[@content-desc="${label}"]`);
    if (await el.isDisplayed().catch(() => false)) {
      await el.click();
      return;
    }
  }
  throw new Error('none of these labels is on screen: ' + labels.join(', '));
}

/** Screen text as the platform reports it, used for the language checks. */
async function pageText(driver) {
  return String(await driver.getPageSource());
}

/** Strings that only exist in one language pack (src/lib/i18n.ts). */
const LANGUAGE_MARKERS = {
  uk: ['Пізнай Себе', 'Увійти через пошту', 'Я приймаю'],
  ru: ['Познай Себя', 'Войти через почту', 'Я принимаю'],
  en: ['Know Thyself', 'Continue with Email', 'I accept the'],
};

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

  // Reported bug: the login screen mixed Ukrainian and English. Every label now comes from
  // one pack, so seeing markers of two languages on this screen is the regression.
  it('renders the login screen in a single language', async () => {
    const start = await driver.$(selector('auth-email-start'));
    await start.waitForDisplayed({ timeout: TIMEOUT });

    const text = await pageText(driver);
    const present = Object.entries(LANGUAGE_MARKERS)
      .map(([lang, markers]) => [lang, markers.filter((m) => text.includes(m))])
      .filter(([, hits]) => hits.length > 0);

    console.log(
      'login screen languages:',
      present.map(([lang, hits]) => lang + '(' + hits.length + ')').join(', ') || 'none'
    );

    if (present.length === 0) {
      throw new Error('no known login copy on screen: the layout changed');
    }
    if (present.length > 1) {
      throw new Error(
        'login screen mixes languages: ' +
          present.map(([lang, hits]) => lang + ' -> ' + hits.join(' | ')).join('; ')
      );
    }
  });

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

  // The home screen used to show the bundled placeholder even for accounts with a picture:
  // the avatar is now bound to useUser().imageUrl.
  //
  // iOS: the avatar lives inside the `home-profile` Pressable, and an accessible button
  // hides its subtree from XCUITest — so `home-avatar` simply does not exist there. The
  // button itself is what can be asserted. Android exposes the image by resource-id.
  it('shows the profile avatar on the home screen', async () => {
    const testId = IS_IOS ? 'home-profile' : 'home-avatar';
    const avatar = await driver.$(selector(testId));
    await avatar.waitForDisplayed({ timeout: TIMEOUT });

    const size = await avatar.getSize();
    if (!size || size.width < 10 || size.height < 10) {
      throw new Error(testId + ' is not rendered: ' + JSON.stringify(size));
    }
  });

  // Three reported dead controls on the profile screen: "opportunities", "leave feedback"
  // and the language modal that showed the choice but never applied it.
  it('profile screen: opportunities, language switch and feedback all react', async () => {
    await tap(driver, 'home-profile');
    await tap(driver, 'profile-opportunities');

    // The info modal is the whole feature: no route existed for this button before.
    const close = await driver.$(selector('info-close'));
    await close.waitForDisplayed({ timeout: TIMEOUT });
    await close.click();

    // Switching must repaint the tree, not just tick a row.
    await tap(driver, 'profile-language');
    await tap(driver, 'language-uk');
    await driver.waitUntil(async () => (await pageText(driver)).includes('Можливості'), {
      timeout: TIMEOUT,
      interval: 500,
      timeoutMsg: 'the profile stayed in the old language after picking Ukrainian',
    });

    await tap(driver, 'profile-language');
    await tap(driver, 'language-en');
    await driver.waitUntil(async () => (await pageText(driver)).includes('Opportunities'), {
      timeout: TIMEOUT,
      interval: 500,
      timeoutMsg: 'the profile stayed in the old language after picking English',
    });

    // Back to Ukrainian: that is the product language, and the rest of the run reads it.
    await tap(driver, 'profile-language');
    await tap(driver, 'language-uk');

    await tap(driver, 'profile-close');
    const home = await driver.$(selector('home-continue'));
    await home.waitForDisplayed({ timeout: TIMEOUT });
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

  // The history drawer belongs on the right: it slides out of the header button in the
  // top-right corner. It used to sit against the left edge.
  it('opens the history drawer on the right edge', async () => {
    await tap(driver, 'header-menu');

    // A control inside the panel: its right edge tracks the panel's right edge
    // (ChatMenu footer keeps a 24pt margin), so a left-aligned drawer fails this.
    const newChat = await driver.$(selector('menu-new-chat'));
    await newChat.waitForDisplayed({ timeout: TIMEOUT });

    const window = await driver
      .getWindowSize()
      .catch(() => driver.getWindowRect());
    const location = await newChat.getLocation();
    const size = await newChat.getSize();
    const rightEdge = location.x + size.width;

    console.log(
      'drawer content: x=' + location.x + ' right=' + rightEdge + ' screen=' + window.width
    );

    if (rightEdge < window.width - 60) {
      throw new Error(
        'history drawer is not right-aligned: content right edge ' +
          rightEdge +
          ' of screen width ' +
          window.width
      );
    }
    if (location.x < window.width / 4) {
      throw new Error('history drawer starts at the left edge: x=' + location.x);
    }
  });

  // Last on purpose: this one hands the screen to the browser (Linking.openURL), and on
  // iOS the app does not always come back, which would poison every test after it.
  it('opens the feedback page from the profile', async () => {
    // The drawer from the previous case is still up, and the profile is reachable from the
    // home screen only: close the drawer, go back out of the chat, open the profile.
    await tap(driver, 'menu-new-chat');
    await tapByLabel(driver, ['Назад', 'Back']);
    await tap(driver, 'home-profile');
    await tap(driver, 'profile-feedback');

    // The app losing the screen is the portable signal; Safari needs a while before its
    // address field reports the host, so waiting for the URL alone is flaky on iOS.
    await driver.waitUntil(
      async () => {
        const text = await pageText(driver).catch(() => '');
        return !text.includes('profile-feedback') || text.includes('e-lli.com');
      },
      {
        timeout: 60000,
        interval: 1000,
        timeoutMsg: 'the feedback button did not hand the screen to the browser',
      }
    );
  });
});
