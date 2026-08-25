import { useState } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { useSignInWithGoogle } from '@clerk/expo/google'
import { useSignInWithApple } from '@clerk/expo/apple'
import { t } from '../lib/i18n'
import { AuthButton } from './AuthButton'
import { spacing } from '../design/tokens'

// Codes emitted when the user backs out of the native picker — not real errors.
const CANCEL_CODES = new Set(['SIGN_IN_CANCELLED', '-5', 'ERR_REQUEST_CANCELED'])

function isCancellation(e: unknown): boolean {
  const code = String((e as any)?.code ?? '')
  return CANCEL_CODES.has(code)
}

/**
 * Native social sign-in buttons (Clerk Core 3).
 * - Google: iOS + Android (Credential Manager / ASAuthorization), via @clerk/expo/google.
 * - Apple: iOS only (ASAuthorization), via @clerk/expo/apple.
 *
 * The handoff's login screen shows Google + Email only; Apple stays on iOS because App
 * Store review requires Sign in with Apple alongside other third-party sign-in options.
 */
export function SocialButtons({ onError }: { onError: (msg: string) => void }) {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle()
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null)

  async function run(
    provider: 'google' | 'apple',
    start: () => Promise<{ createdSessionId: string | null; setActive?: (p: any) => Promise<void> }>
  ) {
    if (busy) return
    setBusy(provider)
    onError('')
    try {
      const { createdSessionId, setActive } = await start()
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
      }
    } catch (e) {
      if (!isCancellation(e)) onError(t.genericError)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.container}>
      <AuthButton
        testID="auth-google"
        icon="logo-google"
        label={t.continueWithGoogle}
        onPress={() => run('google', startGoogleAuthenticationFlow)}
        loading={busy === 'google'}
        disabled={!!busy}
      />

      {Platform.OS === 'ios' && (
        <AuthButton
          testID="auth-apple"
          icon="logo-apple"
          label={t.continueWithApple}
          onPress={() => run('apple', startAppleAuthenticationFlow)}
          loading={busy === 'apple'}
          disabled={!!busy}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { rowGap: spacing.lg },
})
