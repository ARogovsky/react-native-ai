import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native'
import { useSignIn, useSignUp } from '@clerk/expo/legacy'
import { t } from '../lib/i18n'
import { SocialButtons } from './SocialButtons'
import { AuthButton } from './AuthButton'
import { colors, images, radii, spacing, type } from '../design/tokens'

// Avoids depending on a specific error-guard export across Clerk versions.
function clerkErrorList(e: unknown): Array<{ code?: string; message?: string; longMessage?: string }> {
  const errs = (e as any)?.errors
  return Array.isArray(errs) ? errs : []
}

/**
 * Login screen — "EN Registered / Login" frame: logo, "Know Thyself", then the
 * Continue-with buttons. Email keeps the passwordless code flow (Clerk custom flow),
 * revealed only after the user picks it.
 */
export function AuthScreen() {
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'choose' | 'email' | 'code'>('choose')
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
      setStep('code')
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
        const res = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: code.trim() })
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
      style={styles.screen}
    >
      <View style={styles.brand}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>{t.knowThyself}</Text>
      </View>

      <View style={styles.actions}>
        {step === 'choose' && (
          <>
            <SocialButtons onError={setError} />
            <AuthButton
              testID="auth-email-start"
              icon="mail-outline"
              label={t.continueWithEmail}
              onPress={() => setStep('email')}
            />
          </>
        )}

        {step === 'email' && (
          <>
            <View style={styles.inputWrap}>
              <TextInput
                testID="auth-email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t.emailPlaceholder}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                textContentType="emailAddress"
                autoFocus
              />
            </View>
            <AuthButton
              testID="auth-send-code"
              icon="mail-outline"
              label={t.sendCode}
              onPress={sendCode}
              loading={loading}
              disabled={loading}
            />
            <BackLink onPress={() => setStep('choose')} />
          </>
        )}

        {step === 'code' && (
          <>
            <View style={styles.inputWrap}>
              <TextInput
                testID="auth-code"
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder={t.codePlaceholder}
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
              />
            </View>
            <AuthButton
              testID="auth-verify"
              icon="checkmark"
              label={t.verify}
              onPress={verify}
              loading={loading}
              disabled={loading}
            />
            <BackLink onPress={() => setStep('email')} />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  )
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.backLink}>
      <Text style={styles.backLinkText}>{t.back}</Text>
    </Pressable>
  )
}

function extractError(e: unknown): string {
  const list = clerkErrorList(e)
  return list[0]?.longMessage || list[0]?.message || t.genericError
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    rowGap: 101,
  },
  brand: { alignItems: 'center', rowGap: spacing.lg },
  logo: { width: 242, height: 65 },
  tagline: { ...type.tagline, color: colors.brand, textAlign: 'center' },
  actions: { rowGap: spacing.lg },
  inputWrap: {
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.muted,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  input: { ...type.body, color: colors.text, padding: 0 },
  backLink: { alignSelf: 'center', paddingVertical: spacing.md },
  backLinkText: { ...type.bodySmall, color: colors.mutedStrong },
  error: { ...type.bodySmall, color: colors.danger, textAlign: 'center' },
})
