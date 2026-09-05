import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useSignIn, useSignUp } from '@clerk/expo/legacy'
import { getStrings, useLang } from '../lib/i18n'
import { SocialButtons } from './SocialButtons'
import { AuthButton } from './AuthButton'
import { LegalConsent } from './LegalConsent'
import { colors, images, layout, radii, spacing, type } from '../design/tokens'

// Avoids depending on a specific error-guard export across Clerk versions.
function clerkErrorList(e: unknown): Array<{ code?: string; message?: string; longMessage?: string }> {
  const errs = (e as any)?.errors
  return Array.isArray(errs) ? errs : []
}

function hasCode(e: unknown, ...codes: string[]): boolean {
  return clerkErrorList(e).some((x) => !!x.code && codes.includes(x.code))
}

type Step = 'choose' | 'email' | 'register' | 'code' | 'password'

/**
 * Login screen — "EN Registered / Login" frame: logo, "Know Thyself", the Continue-with
 * buttons, and the consent checkbox.
 *
 * Shaped after what the Clerk instance actually requires
 * (GET https://clerk.e-lli.com/v1/environment):
 *  - `sign_up.legal_consent_enabled: true` -> `legal_accepted` is required for every
 *    strategy, so the checkbox gates Google, Apple and email alike. Without it the
 *    sign-up stays `missing_requirements` and no session is created.
 *  - `password.required: true` -> a new account cannot be created from an email code
 *    alone, so registration asks for a password.
 *  - `email_address.first_factors: ['email_code']` -> returning users sign in with a code
 *    (one button, no password), with identifier + password kept as the fallback.
 */
export function AuthScreen() {
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()
  const { t } = useLang()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signIn')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<ScrollView | null>(null)
  const { height: windowHeight } = useWindowDimensions()

  const ready = signUpLoaded && signInLoaded

  /**
   * The spec frame is 390x844 and the 100 gap between the logo block and the buttons is
   * measured on that height. A 780pt-tall device with the keyboard up has no room for it:
   * on Device Farm the email field landed under the keyboard and the run could not reach it
   * (run 1c2b2201, failure screenshot). So the gap keeps the spec value only on frames at
   * least as tall as the design, and every form step scrolls its field into view.
   */
  const rootGap = windowHeight >= 844 ? layout.loginGap : spacing.xxl + spacing.xl

  useEffect(() => {
    if (step === 'choose') return
    // Shortly after the field mounts, so the keyboard height is already applied.
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
    return () => clearTimeout(id)
  }, [step])

  function requireLegal(): boolean {
    if (legalAccepted) return true
    setError(t.legalRequired)
    return false
  }

  /** Existing account -> email code. Unknown address -> registration (password + consent). */
  async function startEmail() {
    if (!ready || !email.trim() || loading || !requireLegal()) return
    setLoading(true)
    setError('')
    try {
      const attempt = await signIn!.create({ identifier: email.trim() })
      const factor = attempt.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'email_code'
      ) as any
      if (!factor) {
        setStep('password')
        return
      }
      await signIn!.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: factor.emailAddressId,
      })
      setMode('signIn')
      setStep('code')
    } catch (e) {
      if (hasCode(e, 'form_identifier_not_found')) {
        setStep('register')
      } else {
        setError(extractError(e))
      }
    } finally {
      setLoading(false)
    }
  }

  /** Registration: the instance requires email + password + accepted legal documents. */
  async function register() {
    if (!ready || !email.trim() || !password || loading || !requireLegal()) return
    setLoading(true)
    setError('')
    try {
      await signUp!.create({
        emailAddress: email.trim(),
        password,
        legalAccepted: true,
      })
      await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
      setMode('signUp')
      setStep('code')
    } catch (e) {
      if (hasCode(e, 'form_identifier_exists')) {
        setStep('password')
        setError('')
      } else {
        setError(extractError(e))
      }
    } finally {
      setLoading(false)
    }
  }

  /** Fallback path: identifier + password, no code round-trip. */
  async function signInWithPassword() {
    if (!ready || !email.trim() || !password || loading || !requireLegal()) return
    setLoading(true)
    setError('')
    try {
      const res = await signIn!.create({ identifier: email.trim(), password })
      if (res.status === 'complete') {
        await setActiveSignIn!({ session: res.createdSessionId })
      } else {
        setError(t.genericError)
      }
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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { rowGap: rootGap }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Image source={images.logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>{t.knowThyself}</Text>
        </View>

        <View style={styles.actions}>
          <LegalConsent
            accepted={legalAccepted}
            onToggle={(next) => {
              setLegalAccepted(next)
              if (next && error === t.legalRequired) setError('')
            }}
          />

          {step === 'choose' && (
            <>
              <SocialButtons legalAccepted={legalAccepted} onError={setError} />
              <AuthButton
                testID="auth-email-start"
                icon="mail-outline"
                label={t.continueWithEmail}
                onPress={() => (requireLegal() ? setStep('email') : undefined)}
                disabled={!legalAccepted}
              />
              <Pressable
                testID="auth-password-start"
                accessibilityRole="button"
                onPress={() => (requireLegal() ? setStep('password') : undefined)}
                style={styles.backLink}
              >
                <Text style={styles.backLinkText}>{t.continueWithPassword}</Text>
              </Pressable>
            </>
          )}

          {(step === 'email' || step === 'register' || step === 'password') && (
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
                autoFocus={step === 'email'}
                editable={!loading}
              />
            </View>
          )}

          {(step === 'register' || step === 'password') && (
            <View style={styles.inputWrap}>
              <TextInput
                testID="auth-password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType={step === 'register' ? 'newPassword' : 'password'}
                autoFocus
                editable={!loading}
              />
            </View>
          )}

          {step === 'email' && (
            <>
              <AuthButton
                testID="auth-send-code"
                icon="mail-outline"
                label={t.sendCode}
                onPress={startEmail}
                loading={loading}
                disabled={loading || !legalAccepted}
              />
              <BackLink onPress={() => setStep('choose')} />
            </>
          )}

          {step === 'register' && (
            <>
              <AuthButton
                testID="auth-register"
                icon="mail-outline"
                label={t.sendCode}
                onPress={register}
                loading={loading}
                disabled={loading || !legalAccepted}
              />
              <BackLink onPress={() => setStep('email')} />
            </>
          )}

          {step === 'password' && (
            <>
              <AuthButton
                testID="auth-password-submit"
                icon="lock-closed-outline"
                label={t.signInAction}
                onPress={signInWithPassword}
                loading={loading}
                disabled={loading || !legalAccepted}
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
                  editable={!loading}
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

          {!!error && (
            <Text testID="auth-error" style={styles.error}>
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function BackLink({ onPress }: { onPress: () => void }) {
  const { t } = useLang()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.backLink}>
      <Text style={styles.backLinkText}>{t.back}</Text>
    </Pressable>
  )
}

/**
 * Clerk answers in English. Known codes get our own copy so the screen stays in one
 * language; anything unmapped falls back to the neutral message instead of dropping an
 * English sentence into a Ukrainian form.
 */
const CLERK_ERROR_COPY: Record<string, keyof ReturnType<typeof getStrings>> = {
  form_code_incorrect: 'codeIncorrect',
  verification_failed: 'codeIncorrect',
  form_password_incorrect: 'passwordIncorrect',
  form_identifier_not_found: 'accountNotFound',
  form_password_pwned: 'passwordWeak',
  form_password_length_too_short: 'passwordWeak',
  form_param_format_invalid: 'emailInvalid',
  form_identifier_exists: 'accountExists',
}

function extractError(e: unknown): string {
  const strings = getStrings()
  for (const item of clerkErrorList(e)) {
    const key = item.code ? CLERK_ERROR_COPY[item.code] : undefined
    if (key) return strings[key]
  }
  return strings.genericError
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    // Spec: the login root is a vertical auto-layout with a 100 gap between the logo block
    // and the buttons block, both padded 30 on the sides. The gap is applied inline
    // (`rootGap`) because it must shrink on frames shorter than the 844 design.
  },
  brand: { alignItems: 'center', rowGap: spacing.lg },
  logo: { width: 242, height: 65 },
  tagline: { ...type.tagline, color: colors.brand, textAlign: 'center' },
  // The buttons group stops growing at 500 so it stays a column on a tablet.
  actions: {
    rowGap: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.loginGroupMaxWidth,
  },
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
