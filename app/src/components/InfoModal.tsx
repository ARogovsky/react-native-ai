import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useLang } from '../lib/i18n'
import { colors, layout, radii, spacing, type } from '../design/tokens'

/**
 * Plain informational sheet: a title, a body of newline-separated lines, one dismiss
 * button. Used by the profile's "Можливості" row, which used to be a dead label.
 */
export function InfoModal({
  visible,
  title,
  body,
  onClose,
}: {
  visible: boolean
  title: string
  body: string
  onClose: () => void
}) {
  const { t } = useLang()
  const lines = body.split('\n').filter((line) => line.trim().length > 0)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView contentContainerStyle={styles.body}>
          {lines.map((line, index) => (
            <Text key={index} style={styles.line}>
              {'\u2022'} {line}
            </Text>
          ))}
        </ScrollView>
        <Pressable
          testID="info-close"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{t.ok}</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    top: '20%',
    maxHeight: '60%',
    width: layout.modalWidth,
    borderRadius: radii.modal,
    backgroundColor: colors.background,
    padding: spacing.lg,
    rowGap: spacing.md,
  },
  title: { ...type.body, color: colors.text, textAlign: 'center' },
  body: { rowGap: spacing.sm },
  line: { ...type.captionRegular, color: colors.text },
  button: {
    height: layout.sendButton,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { ...type.body, color: colors.text },
})
