import { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import { useLang } from '../lib/i18n'
import { colors, layout, radii, spacing, type } from '../design/tokens'

/** Delete confirmation — "EN Delete Chat" frame (300x151, radius 20). */
export function DeleteChatModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useLang()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.card}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t.deleteTitle}</Text>
          <Text style={styles.hint}>{t.deleteHint}</Text>
        </View>
        <View style={styles.stackedButtons}>
          <ModalButton testID="delete-confirm" label={t.confirmDelete} onPress={onConfirm} danger />
          <ModalButton testID="delete-cancel" label={t.declineDelete} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  )
}

/** Rename dialog — "EN Rename Chat" frame (300x140, radius 20). */
export function RenameChatModal({
  visible,
  initialValue,
  onCancel,
  onSave,
}: {
  visible: boolean
  initialValue: string
  onCancel: () => void
  onSave: (title: string) => void
}) {
  const { t } = useLang()
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (visible) setValue(initialValue)
  }, [visible, initialValue])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.card}>
        <Text style={styles.title}>{t.renameTitle}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            testID="rename-input"
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={t.renamePlaceholder}
            placeholderTextColor={colors.muted}
            autoFocus
          />
        </View>
        <View style={styles.inlineButtons}>
          <ModalButton testID="rename-cancel" label={t.cancel} onPress={onCancel} inline />
          <ModalButton
            testID="rename-save"
            label={t.ok}
            onPress={() => onSave(value.trim())}
            inline
          />
        </View>
      </View>
    </Modal>
  )
}

function ModalButton({
  label,
  onPress,
  danger,
  inline,
  testID,
}: {
  label: string
  onPress: () => void
  danger?: boolean
  inline?: boolean
  testID?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, inline && styles.buttonInline]}
    >
      <Text style={[styles.buttonLabel, danger && styles.buttonLabelDanger]}>{label}</Text>
    </Pressable>
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
    rowGap: spacing.lg,
  },
  textBlock: { rowGap: spacing.xs, alignItems: 'center' },
  title: { ...type.bodySmall, color: colors.textStrong, textAlign: 'center' },
  hint: { ...type.caption, color: colors.textStrong, textAlign: 'center', letterSpacing: -0.12 },
  stackedButtons: { alignItems: 'stretch' },
  inlineButtons: { flexDirection: 'row', alignItems: 'center' },
  button: {
    height: layout.modalButtonHeight,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bubbleAgent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonInline: { flex: 1 },
  buttonLabel: { ...type.bodySmall, color: colors.textStrong, textAlign: 'center' },
  buttonLabelDanger: { color: colors.danger },
  inputWrap: {
    height: layout.renameInputHeight,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  input: { ...type.message, color: colors.text, padding: 0 },
})
