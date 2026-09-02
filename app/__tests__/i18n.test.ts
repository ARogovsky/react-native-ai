// The initial language comes from the device locale, resolved at import time, so each
// case re-requires the module with a different mocked locale.
function loadWithLocales(locales: any[]) {
  jest.resetModules()
  jest.doMock('expo-localization', () => ({ getLocales: () => locales }))
  return require('../src/lib/i18n')
}

describe('i18n.detectLang', () => {
  afterEach(() => jest.resetModules())

  it('defaults to uk for unsupported locales', () => {
    const { getLang, getStrings } = loadWithLocales([{ languageCode: 'fr' }])
    expect(getLang()).toBe('uk')
    expect(getStrings().greeting).toContain('Elli')
    expect(typeof getStrings().signOut).toBe('string')
  })

  it('selects ru when device is ru', () => {
    expect(loadWithLocales([{ languageCode: 'ru' }]).getLang()).toBe('ru')
  })

  it('selects en when device is en', () => {
    expect(loadWithLocales([{ languageCode: 'en' }]).getLang()).toBe('en')
  })

  it('selects uk when device is uk', () => {
    expect(loadWithLocales([{ languageCode: 'uk' }]).getLang()).toBe('uk')
  })

  it('falls back to uk when getLocales throws', () => {
    jest.resetModules()
    jest.doMock('expo-localization', () => ({
      getLocales: () => {
        throw new Error('not ready')
      },
    }))
    expect(require('../src/lib/i18n').getLang()).toBe('uk')
  })

  it('every language has the full key set', () => {
    const { STRINGS } = loadWithLocales([{ languageCode: 'uk' }])
    const keys = Object.keys(STRINGS.uk).sort()
    expect(Object.keys(STRINGS.ru).sort()).toEqual(keys)
    expect(Object.keys(STRINGS.en).sort()).toEqual(keys)
  })
})

describe('i18n.setLang', () => {
  afterEach(() => jest.resetModules())

  it('switches the strings', async () => {
    const { getLang, getStrings, setLang } = loadWithLocales([{ languageCode: 'uk' }])
    expect(getLang()).toBe('uk')

    await setLang('en')

    expect(getLang()).toBe('en')
    expect(getStrings().profile).toBe('Profile')
  })

  it('ignores an unsupported value', async () => {
    const { getLang, setLang } = loadWithLocales([{ languageCode: 'uk' }])
    await setLang('de' as any)
    expect(getLang()).toBe('uk')
  })

  it('hydrate applies the stored choice', async () => {
    jest.resetModules()
    jest.doMock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'uk' }] }))
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: {
        getItem: jest.fn().mockResolvedValue('ru'),
        setItem: jest.fn().mockResolvedValue(undefined),
      },
    }))
    const { getLang, hydrateLang } = require('../src/lib/i18n')

    await hydrateLang()

    expect(getLang()).toBe('ru')
  })
})

describe('the Ukrainian dictionary', () => {
  // The login screen showed "Continue with Google" next to Ukrainian copy because these
  // values were left in English inside the uk block.
  it('has no Latin-only button labels', () => {
    const { STRINGS } = loadWithLocales([{ languageCode: 'uk' }])
    const cyrillic = /[\u0400-\u04FF]/

    expect(STRINGS.uk.continueWithGoogle).toMatch(cyrillic)
    expect(STRINGS.uk.continueWithEmail).toMatch(cyrillic)
    expect(STRINGS.uk.continueWithApple).toMatch(cyrillic)
    expect(STRINGS.ru.continueWithGoogle).toMatch(cyrillic)
    expect(STRINGS.ru.continueWithEmail).toMatch(cyrillic)
  })
})
