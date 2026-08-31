import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { t } from '../lib/i18n'
import { legalUrls } from '../lib/legal'
import { colors, spacing, type } from '../design/tokens'

/**
 * Consent checkbox. The Clerk instance has `sign_up.legal_consent_enabled: true`, so
 * `legal_accepted` is a required sign-up field for every strategy (Google, email code,
 * password) — the checkbox therefore gates all of the sign-in buttons, not just one flow.
 */
export function LegalConsent({
  accepted,
  onToggle,
}: {
  accepted: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <View style={styles.row}>
      <Pressable
        testID="auth-legal"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={`${t.legalAccept} ${t.legalTerms} / ${t.legalPrivacy}`}
        hitSlop={10}
        onPress={() => onToggle(!accepted)}
        style={styles.box}
      >
        <Ionicons
          name={accepted ? 'checkbox' : 'square-outline'}
          size={22}
          color={accepted ? colors.brand : colors.muted}
        />
      </Pressable>

      <Text style={styles.text}>
        {t.legalAccept}{' '}
        <Text
          testID="auth-legal-terms"
          accessibilityRole="link"
          style={styles.link}
          onPress={() => void Linking.openURL(legalUrls.terms)}
        >
          {t.legalTerms}
        </Text>
        {' / '}
        <Text
          testID="auth-legal-privacy"
          accessibilityRole="link"
          style={styles.link}
          onPress={() => void Linking.openURL(legalUrls.privacy)}
        >
          {t.legalPrivacy}
        </Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  box: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  text: { ...type.bodySmall, color: colors.mutedStrong, flex: 1 },
  link: { color: colors.brand, textDecorationLine: 'underline' },
})
