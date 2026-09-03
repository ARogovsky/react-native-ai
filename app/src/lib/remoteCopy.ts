/**
 * Copy a clinician can change without a store release.
 *
 * The API resolves it from the cabinet and serves it at GET /api/config (unauthenticated,
 * cacheable). The app keeps the last answer in AsyncStorage, so a cold start with no network
 * still shows the words the user saw last time, and the strings compiled into i18n.ts remain
 * the final fallback.
 *
 * Only text lives here. No layout, no flags: a wrong value can misword a screen, never break
 * it, which is what keeps this safe to change from outside the release cycle.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { DOMAIN } from '../../constants'
import { isLang, setRemoteStrings, type Lang } from './i18n'

const STORAGE_KEY = 'elli-remote-copy'

/** Shape of GET /api/config (services/api/app/api/config/route.ts). */
interface RemoteCopyResponse {
  copy?: { greeting?: Partial<Record<Lang, string>> }
}

function greetingsOf(payload: RemoteCopyResponse): Partial<Record<Lang, string>> {
  const greeting = payload.copy?.greeting || {}
  const cleaned: Partial<Record<Lang, string>> = {}

  for (const [lang, text] of Object.entries(greeting)) {
    if (isLang(lang) && typeof text === 'string' && text.trim()) {
      cleaned[lang] = text.trim()
    }
  }

  return cleaned
}

/**
 * Applies the stored copy immediately, then refreshes from the API in the background.
 * Never throws and never blocks the UI: on any failure the app keeps what it already had.
 */
export async function hydrateRemoteCopy(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored) setRemoteStrings({ greeting: greetingsOf(JSON.parse(stored)) })
  } catch {
    /* nothing stored yet, or unreadable: the bundled strings stand */
  }

  try {
    const response = await fetch(`${DOMAIN}/api/config`)
    if (!response.ok) return

    const payload = (await response.json()) as RemoteCopyResponse
    const greeting = greetingsOf(payload)
    if (!Object.keys(greeting).length) return

    setRemoteStrings({ greeting })
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* the copy is applied for this session even if it cannot be cached */
    }
  } catch {
    /* offline or the API is down: the stored/bundled copy is already in place */
  }
}
