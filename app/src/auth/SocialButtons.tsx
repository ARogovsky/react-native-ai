import { useState } from 'react'
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useSignInWithGoogle } from '@clerk/expo/google'
import { useSignInWithApple } from '@clerk/expo/apple'
import { t } from '../lib/i18n'

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
 * Both hooks auto-manage the sign-up/sign-in transfer flow and, on success,
 * set the active session — App.tsx then swaps to the signed-in UI.
 */
export function SocialButtons({
  theme,
  onError,
}: {
  theme: any
  onError: (msg: string) => void
}) {
  const styles = getStyles(theme)
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
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{t.orSeparator}</Text>
        <View style={styles.divider} />
      </View>

      <SocialButton
        testID="auth-google"
        label={t.continueWithGoogle}
        onPress={() => run('google', startGoogleAuthenticationFlow)}
        loading={busy === 'google'}
        disabled={!!busy}
        theme={theme}
      />

      {Platform.OS === 'ios' && (
        <SocialButton
          testID="auth-apple"
          label={t.continueWithApple}
          onPress={() => run('apple', startAppleAuthenticationFlow)}
          loading={busy === 'apple'}
          disabled={!!busy}
          theme={theme}
          dark
        />
      )}
    </View>
  )
}

function SocialButton({
  label,
  onPress,
  loading,
  disabled,
  theme,
  dark,
  testID,
}: {
  label: string
  onPress: () => void
  loading: boolean
  disabled: boolean
  theme: any
  dark?: boolean
  testID?: string
}) {
  const bg = dark ? '#000' : theme.backgroundColor
  const fg = dark ? '#fff' : theme.textColor
  return (
    <TouchableHighlight
      testID={testID}
      underlayColor="transparent"
      onPress={onPress}
      disabled={disabled}
      style={{ marginTop: 12 }}
    >
      <View
        style={[
          styles.button,
          { backgroundColor: bg, borderColor: theme.borderColor, opacity: disabled ? 0.6 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        )}
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
})

const getStyles = (theme: any) =>
  StyleSheet.create({
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 4,
    },
    divider: { flex: 1, height: 1, backgroundColor: theme.borderColor },
    dividerText: {
      marginHorizontal: 12,
      color: theme.textColor,
      opacity: 0.6,
      fontSize: 13,
    },
  })
