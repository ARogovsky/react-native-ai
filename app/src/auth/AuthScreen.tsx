import { useState, useContext } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableHighlight,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSignIn, useSignUp } from '@clerk/expo/legacy'
import { ThemeContext } from '../context'
import { t } from '../lib/i18n'

// Avoids depending on a specific error-guard export across Clerk versions.
function clerkErrorList(e: unknown): Array<{ code?: string; message?: string; longMessage?: string }> {
  const errs = (e as any)?.errors
  return Array.isArray(errs) ? errs : []
}

/**
 * Passwordless email-code auth (Clerk custom flow, Approach 1 — works in Expo Go).
 * New users are signed up, returning users signed in; both via a one-time email code.
 */
export function AuthScreen() {
  const { theme } = useContext(ThemeContext)
  const styles = getStyles(theme)

  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ready = signUpLoaded && signInLoaded

  async function sendCode() {
    if (!ready || !email.trim() || loading) return
    setLoading(true)
    setError('')
    const addr = email.trim()
    try {
      // Try sign-up first; if the account already exists, fall back to sign-in.
      try {
        await signUp!.create({ emailAddress: addr })
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
        setMode('signUp')
      } catch (e) {
        if (clerkErrorList(e).some((x) => x.code === 'form_identifier_exists')) {
          const attempt = await signIn!.create({ identifier: addr })
          const factor = attempt.supportedFirstFactors?.find(
            (f: any) => f.strategy === 'email_code'
          ) as any
          await signIn!.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: factor.emailAddressId,
          })
          setMode('signIn')
        } else {
          throw e
        }
      }
      setPending(true)
    } catch (e) {
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    if (!ready || !code.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'signUp') {
        const res = await signUp!.attemptEmailAddressVerification({ code: code.trim() })
        if (res.status === 'complete') {
          await setActiveSignUp!({ session: res.createdSessionId })
        } else {
          setError(t.genericError)
        }
      } else {
        const res = await signIn!.attemptFirstFactor({
          strategy: 'email_code',
          code: code.trim(),
        })
        if (res.status === 'complete') {
          await setActiveSignIn!({ session: res.createdSessionId })
        } else {
          setError(t.genericError)
        }
      }
    } catch (e) {
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t.authTitle}</Text>

        {!pending ? (
          <>
            <Text style={styles.label}>{t.emailLabel}</Text>
            <TextInput
              style={styles.input}
              testID="auth-email"
              value={email}
              onChangeText={setEmail}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={theme.placeholderTextColor}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            <Text style={styles.hint}>{t.authHint}</Text>
            <PrimaryButton testID="auth-send-code" label={t.sendCode} onPress={sendCode} loading={loading} theme={theme} />
          </>
        ) : (
          <>
            <Text style={styles.label}>{t.codeLabel}</Text>
            <TextInput
              style={styles.input}
              testID="auth-code"
              value={code}
              onChangeText={setCode}
              placeholder={t.codePlaceholder}
              placeholderTextColor={theme.placeholderTextColor}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
            <PrimaryButton testID="auth-verify" label={t.verify} onPress={verify} loading={loading} theme={theme} />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  )
}

function PrimaryButton({
  label,
  onPress,
  loading,
  theme,
  testID,
}: {
  label: string
  onPress: () => void
  loading: boolean
  theme: any
  testID?: string
}) {
  return (
    <TouchableHighlight
      testID={testID}
      underlayColor="transparent"
      onPress={onPress}
      disabled={loading}
      style={{ marginTop: 16 }}
    >
      <View style={[btn.button, { backgroundColor: theme.tintColor, opacity: loading ? 0.6 : 1 }]}>
        {loading ? (
          <ActivityIndicator color={theme.tintTextColor} />
        ) : (
          <Text style={[btn.text, { color: theme.tintTextColor }]}>{label}</Text>
        )}
      </View>
    </TouchableHighlight>
  )
}

function extractError(e: unknown): string {
  const list = clerkErrorList(e)
  return list[0]?.longMessage || list[0]?.message || t.genericError
}

const btn = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '600' },
})

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundColor,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: { width: '100%' },
    title: {
      fontSize: 24,
      fontFamily: theme.boldFont,
      color: theme.textColor,
      marginBottom: 24,
      textAlign: 'center',
    },
    label: {
      fontSize: 14,
      color: theme.textColor,
      marginBottom: 8,
      fontFamily: theme.mediumFont,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: theme.textColor,
      fontSize: 16,
    },
    hint: { color: theme.textColor, opacity: 0.6, fontSize: 13, marginTop: 8 },
    error: { color: '#c0392b', marginTop: 14, textAlign: 'center' },
  })
