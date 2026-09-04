import { Text, StyleSheet, ActivityIndicator, Pressable, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, layout, radii, shadows, spacing, type } from '../design/tokens'

/**
 * Login button — `login.auth_buttons.*` in the layout spec: 50 tall, fills its group,
 * radius 30, padding 6/22, gap 10, #FFFBF7 fill, label Inter Semi Bold 18 in #723710.
 * The Effects sheet gives it an inner glow (inset 2px -1px 9px #F8DECD).
 */
export function AuthButton({
  icon,
  label,
  onPress,
  loading,
  disabled,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  testID?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <Ionicons name={icon} size={24} color={colors.brand} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: layout.loginButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 6,
    columnGap: spacing.md,
    boxShadow: shadows.loginButton,
  },
  disabled: { opacity: 0.6 },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.loginButton, color: colors.brand, flex: 1, textAlign: 'center' },
})
