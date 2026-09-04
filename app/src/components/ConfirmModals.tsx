import { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import { useLang } from '../lib/i18n'
import { colors, layout, radii, shadows, spacing, type } from '../design/tokens'

/** Delete confirmation — `delete_modal.*` in the layout spec (300 wide, radius 20). */
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
          <ModalButton
            testID="delete-confirm"
            label={t.confirmDelete}
            onPress={onConfirm}
            corner="top"
            danger
          />
          <ModalButton
            testID="delete-cancel"
            label={t.declineDelete}
            onPress={onCancel}
            corner="bottom"
          />
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
            // Colors sheet: the "Conversation name" text is secondary.
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
        </View>
        <View style={styles.inlineButtons}>
          <ModalButton
            testID="rename-cancel"
            label={t.cancel}
            onPress={onCancel}
            corner="left"
            inline
          />
          <ModalButton
            testID="rename-save"
            label={t.ok}
            onPress={() => onSave(value.trim())}
            corner="right"
            inline
          />
        </View>
      </View>
    </Modal>
  )
}

/** `corner` says which end of the pair this button is, so only outer corners round. */
function ModalButton({
  label,
  onPress,
  danger,
  inline,
  corner,
  testID,
}: {
  label: string
  onPress: () => void
  danger?: boolean
  inline?: boolean
  corner: 'top' | 'bottom' | 'left' | 'right'
  testID?: string
}) {
  const cornerStyle = {
    top: styles.buttonStackedTop,
    bottom: styles.buttonStackedBottom,
    left: styles.buttonInlineLeft,
    right: styles.buttonInlineRight,
  }[corner]

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, cornerStyle, inline && styles.buttonInline]}
    >
      <Text style={[styles.buttonLabel, danger && styles.buttonLabelDanger]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  // Spec: 300 wide card centred on the screen, radius 20, padding 15, gap 15, and the
  // modal drop shadow 0 4px 4px rgba(26,26,26,0.28).
  card: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
    width: layout.modalWidth,
    borderRadius: radii.modal,
    backgroundColor: colors.background,
    padding: spacing.lg,
    rowGap: spacing.lg,
    boxShadow: shadows.modalCard,
  },
  textBlock: { rowGap: spacing.xs, alignItems: 'center' },
  title: { ...type.bodySmall, color: colors.textStrong, textAlign: 'center' },
  // Colors sheet: the delete body line is secondary text, not the strong colour.
  hint: { ...type.caption, color: colors.textSecondary, textAlign: 'center', letterSpacing: -0.12 },
  stackedButtons: { alignItems: 'stretch' },
  inlineButtons: { flexDirection: 'row', alignItems: 'center' },
  button: {
    height: layout.modalButtonHeight,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bubbleAgent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    boxShadow: shadows.button,
  },
  // The pair reads as one rounded block: only the outer corners are round (spec gives
  // 15/15/0/0 on top and 0/0/15/15 below for delete, left/right for rename).
  buttonStackedTop: {
    borderTopLeftRadius: radii.control,
    borderTopRightRadius: radii.control,
  },
  buttonStackedBottom: {
    borderBottomLeftRadius: radii.control,
    borderBottomRightRadius: radii.control,
  },
  buttonInlineLeft: {
    borderTopLeftRadius: radii.control,
    borderBottomLeftRadius: radii.control,
  },
  buttonInlineRight: {
    borderTopRightRadius: radii.control,
    borderBottomRightRadius: radii.control,
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
