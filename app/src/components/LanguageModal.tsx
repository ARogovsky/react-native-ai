import { Modal, View, Text, StyleSheet, Pressable } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { lang } from '../lib/i18n'
import { colors, layout, radii, spacing, type } from '../design/tokens'

/**
 * Language selection modal — "EN Language selection" frame: 300 wide, radius 20, one
 * 45-tall row per language with a checkmark on the active one.
 *
 * Switching at runtime is not wired yet: the app resolves its language from the device
 * locale (src/lib/i18n.ts), so this shows the current choice only.
 */
const LANGUAGES = [
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
]

export function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        {LANGUAGES.map((item, index) => (
          <View
            key={item.code}
            style={[styles.row, index < LANGUAGES.length - 1 && styles.rowDivider]}
          >
            <View style={styles.rowText}>
              <Text style={styles.native}>{item.native}</Text>
              <Text style={styles.english}>{item.english}</Text>
            </View>
            {item.code === lang && (
              <Ionicons name="checkmark" size={20} color={colors.text} />
            )}
          </View>
        ))}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
    width: layout.modalWidth,
    borderRadius: radii.modal,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  row: {
    height: layout.profileRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { rowGap: spacing.xs },
  native: { ...type.body, color: colors.text },
  english: { ...type.captionRegular, color: colors.text },
})
