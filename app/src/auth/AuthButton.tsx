import { Text, StyleSheet, ActivityIndicator, Pressable, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, radii, spacing, type } from '../design/tokens'

/**
 * Login button — "Button Login/Registration w Google/Email" symbol: 360x50, radius 30,
 * #FFFBF7 fill, icon inset 22, label Inter Semi Bold 18 in #723710.
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
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    columnGap: spacing.md,
  },
  disabled: { opacity: 0.6 },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.loginButton, color: colors.brand, flex: 1, textAlign: 'center' },
})
