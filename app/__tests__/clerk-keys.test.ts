/**
 * Runs the Clerk key guard over the real eas.json on every `pnpm test`, so a wrong Clerk
 * instance in a build profile fails the CodeBuild gate instead of a store build.
 */

const path = require('path')
const fs = require('fs')
const { check, decodeHost, LIVE_HOST, DEV_HOST } = require('../scripts/check-clerk-keys')

const EAS_JSON = path.join(__dirname, '..', 'eas.json')

function fixture(name: string, body: unknown): string {
  const file = path.join(__dirname, name)
  fs.writeFileSync(file, JSON.stringify(body))
  return file
}

describe('Clerk publishable keys in eas.json', () => {
  it('has no profile pointing at the wrong Clerk instance', () => {
    expect(check(EAS_JSON)).toEqual([])
  })

  it('decodes the two keys we use', () => {
    expect(decodeHost('pk_live_Y2xlcmsuZS1sbGkuY29tJA')).toBe(LIVE_HOST)
    expect(decodeHost('pk_test_bmVhdC1iYWJvb24tNDIuY2xlcmsuYWNjb3VudHMuZGV2JA')).toBe(DEV_HOST)
  })

  it('rejects a store profile carrying a dev key', () => {
    const file = fixture('eas.fixture-store.json', {
      build: {
        production: {
          env: {
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
              'pk_test_bmVhdC1iYWJvb24tNDIuY2xlcmsuYWNjb3VudHMuZGV2JA',
          },
        },
      },
    })
    try {
      expect(check(file)).toHaveLength(1)
    } finally {
      fs.unlinkSync(file)
    }
  })

  it('rejects an e2e profile carrying the live key', () => {
    const file = fixture('eas.fixture-e2e.json', {
      build: {
        'e2e-sim': {
          env: { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsuZS1sbGkuY29tJA' },
        },
      },
    })
    try {
      expect(check(file)).toHaveLength(1)
    } finally {
      fs.unlinkSync(file)
    }
  })

  it('rejects submitting an e2e build', () => {
    const file = fixture('eas.fixture-submit.json', {
      build: {},
      submit: { 'e2e-sim': { ios: { ascAppId: '1' } } },
    })
    try {
      expect(check(file)).toHaveLength(1)
    } finally {
      fs.unlinkSync(file)
    }
  })
})
