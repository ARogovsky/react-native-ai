import { useState } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { useSignInWithGoogle } from '@clerk/expo/google'
import { useSignInWithApple } from '@clerk/expo/apple'
import type { SetActive, SignUpResource } from '@clerk/shared/types'
import { useLang } from '../lib/i18n'
import { AuthButton } from './AuthButton'
import { spacing } from '../design/tokens'

// Codes emitted when the user backs out of the native picker — not real errors.
const CANCEL_CODES = new Set(['SIGN_IN_CANCELLED', '-5', 'ERR_REQUEST_CANCELED'])

function isCancellation(e: unknown): boolean {
  const code = String((e as any)?.code ?? '')
  return CANCEL_CODES.has(code)
}

type FlowResult = {
  createdSessionId: string | null
  setActive?: SetActive
  signUp?: SignUpResource
}

/**
 * Native social sign-in buttons (Clerk Core 3).
 * - Google: iOS + Android (Credential Manager / ASAuthorization), via @clerk/expo/google.
 * - Apple: iOS only (ASAuthorization), via @clerk/expo/apple.
 *
 * The hooks create the sign-up with `{ transfer: true }` only
 * (@clerk/expo/dist/hooks/useSignInWithGoogle.shared.js), so they never send
 * `legal_accepted`. On an instance with legal consent enabled that leaves the sign-up in
 * `missing_requirements` with no session — the acceptance is applied here instead, using
 * the consent the user already gave through the checkbox.
 */
export function SocialButtons({
  legalAccepted,
  onError,
}: {
  legalAccepted: boolean
  onError: (msg: string) => void
}) {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle()
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const { t } = useLang()
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null)

  async function run(provider: 'google' | 'apple', start: () => Promise<FlowResult>) {
    if (busy) return
    if (!legalAccepted) {
      onError(t.legalRequired)
      return
    }
    setBusy(provider)
    onError('')
    try {
      const { createdSessionId, setActive, signUp } = await start()
      let session = createdSessionId

      // Freshly transferred sign-up still waiting on the consent field.
      if (!session && signUp?.status === 'missing_requirements') {
        const updated = await signUp.update({ legalAccepted: true })
        if (updated.status === 'complete') session = updated.createdSessionId
      }

      if (session && setActive) {
        await setActive({ session })
      } else if (signUp?.status === 'missing_requirements') {
        onError(t.genericError)
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
        disabled={!!busy || !legalAccepted}
      />

      {Platform.OS === 'ios' && (
        <AuthButton
          testID="auth-apple"
          icon="logo-apple"
          label={t.continueWithApple}
          onPress={() => run('apple', startAppleAuthenticationFlow)}
          loading={busy === 'apple'}
          disabled={!!busy || !legalAccepted}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { rowGap: spacing.lg },
})
