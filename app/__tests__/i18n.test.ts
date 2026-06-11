// i18n resolves language at import time, so reset modules and re-require per case.
function loadWithLocales(locales: any[]) {
  jest.resetModules()
  jest.doMock('expo-localization', () => ({ getLocales: () => locales }))
  return require('../src/lib/i18n')
}

describe('i18n.detectLang', () => {
  afterEach(() => jest.resetModules())

  it('defaults to uk for unsupported locales', () => {
    const { lang, t } = loadWithLocales([{ languageCode: 'fr' }])
    expect(lang).toBe('uk')
    expect(t.greeting).toContain('Elli')
    expect(typeof t.signOut).toBe('string')
  })

  it('selects ru when device is ru', () => {
    expect(loadWithLocales([{ languageCode: 'ru' }]).lang).toBe('ru')
  })

  it('selects en when device is en', () => {
    expect(loadWithLocales([{ languageCode: 'en' }]).lang).toBe('en')
  })

  it('selects uk when device is uk', () => {
    expect(loadWithLocales([{ languageCode: 'uk' }]).lang).toBe('uk')
  })

  it('falls back to uk when getLocales throws', () => {
    jest.resetModules()
    jest.doMock('expo-localization', () => ({
      getLocales: () => {
        throw new Error('not ready')
      },
    }))
    expect(require('../src/lib/i18n').lang).toBe('uk')
  })

  it('every language has the full key set', () => {
    const { t: uk } = loadWithLocales([{ languageCode: 'uk' }])
    const { t: ru } = loadWithLocales([{ languageCode: 'ru' }])
    const { t: en } = loadWithLocales([{ languageCode: 'en' }])
    const keys = Object.keys(uk).sort()
    expect(Object.keys(ru).sort()).toEqual(keys)
    expect(Object.keys(en).sort()).toEqual(keys)
  })
})
