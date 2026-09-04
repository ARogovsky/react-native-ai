import {
  View,
  Text,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native'
import 'react-native-get-random-values'
import { useState, useRef, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import Markdown from '@ronradtke/react-native-markdown-display'
import * as Clipboard from 'expo-clipboard'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useChat, ChatMsg } from '../ChatProvider'
import { useLang } from '../lib/i18n'
import { colors, layout, radii, shadows, spacing, type } from '../design/tokens'

/** Chat screen — `chat.*` in the layout spec of the handoff. */
export function Chat() {
  const { messages, send, loading, openMenu } = useChat()
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { showActionSheetWithOptions } = useActionSheet()
  const { t } = useLang()

  const [input, setInput] = useState('')
  const scrollViewRef = useRef<ScrollView | null>(null)

  useEffect(() => {
    const id = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50)
    return () => clearTimeout(id)
  }, [messages, loading])

  async function onSend() {
    const prompt = input.trim()
    if (!prompt || loading) return
    Keyboard.dismiss()
    setInput('')
    await send(prompt)
  }

  function showMessageActions(text: string) {
    showActionSheetWithOptions(
      { options: [t.newChat, 'Copy', 'Cancel'], cancelButtonIndex: 2 },
      (selected) => {
        if (selected === 1) Clipboard.setStringAsync(text)
      }
    )
  }

  // The last assistant message is empty while the model has not produced a token yet:
  // the design shows a muted "Elli is thinking ..." line in its place.
  const last = messages[messages.length - 1]
  const awaitingFirstToken = loading && last?.role === 'assistant' && !last.content

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, layout.topBarPaddingTop) }]}>
        <RoundButton
          icon="chevron-back"
          accessibilityLabel={t.back}
          onPress={() => navigation.goBack()}
        />
        <RoundButton icon="ellipsis-horizontal" accessibilityLabel={t.yourChats} onPress={openMenu} testID="header-menu" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
      >
        {messages.map((message, index) =>
          awaitingFirstToken && index === messages.length - 1 ? (
            <Text key="thinking" style={styles.thinking}>
              {t.thinking}
            </Text>
          ) : (
            <Bubble key={index} message={message} onLongPress={showMessageActions} />
          )
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, layout.bottomBarPaddingBottom) }]}>
          <View style={styles.inputPill}>
            <TextInput
              testID="chat-input"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.inputPlaceholder}
              // Colors sheet: the input placeholder is the secondary text colour.
              placeholderTextColor={colors.textSecondary}
              multiline
              onSubmitEditing={onSend}
            />
            <Pressable
              testID="chat-send"
              accessibilityLabel={t.send}
              accessibilityRole="button"
              onPress={onSend}
              style={styles.sendButton}
            >
              <Ionicons name="leaf" size={22} color={colors.brand} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

function RoundButton({
  icon,
  onPress,
  accessibilityLabel,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  accessibilityLabel: string
  testID?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.roundButton}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  )
}

function Bubble({
  message,
  onLongPress,
}: {
  message: ChatMsg
  onLongPress: (text: string) => void
}) {
  const { t } = useLang()
  const isUser = message.role === 'user'
  const spoken = message.error ? t.genericError : message.content
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
      <Pressable
        // testID + accessibilityLabel: the label is how a screen reader — and the device
        // test — reads a message, since the body is rendered as Markdown, not a Text.
        testID={isUser ? 'chat-bubble-user' : 'chat-bubble-agent'}
        accessibilityLabel={spoken}
        onLongPress={() => onLongPress(message.content)}
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}
      >
        {message.error ? (
          <Text style={[styles.messageText, styles.errorText]}>{t.genericError}</Text>
        ) : (
          <Markdown
            style={{
              body: { ...type.message, color: colors.text, textAlign: isUser ? 'right' : 'left' },
              paragraph: { marginTop: 0, marginBottom: 0 },
              strong: { fontFamily: type.brandName.fontFamily },
            }}
          >
            {message.content}
          </Markdown>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: layout.topBarHeight,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: colors.barOverlay,
  },
  // Effects sheet: glassmorphism — rgba(255,255,255,0.8) fill, 1px light edge,
  // 2px 2px 10px rgba(0,0,0,0.05). Real backdrop blur needs a native BlurView; the fill
  // plus edge is what reads on the cream background.
  roundButton: {
    width: layout.topButton,
    height: layout.topButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.glassButton,
  },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing.md, rowGap: spacing.lg },
  row: { paddingVertical: spacing.md },
  rowAgent: { paddingLeft: spacing.md, paddingRight: layout.bubbleOppositeInset },
  rowUser: { paddingRight: spacing.md, paddingLeft: layout.bubbleOppositeInset, alignItems: 'flex-end' },
  bubble: {
    maxWidth: layout.bubbleMaxWidth,
    borderRadius: radii.bubble,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  bubbleAgent: { backgroundColor: colors.bubbleAgent },
  // The design leaves user messages unfilled: right-aligned text on the page background.
  bubbleUser: { backgroundColor: 'transparent' },
  messageText: { ...type.message, color: colors.text },
  errorText: { color: colors.danger },
  // Spec: padding 15 T / 25 R / 15 B / 25 L.
  thinking: {
    ...type.message,
    color: colors.muted,
    paddingHorizontal: spacing.lg + spacing.md,
    paddingVertical: spacing.lg,
  },
  // Spec: input bar area — padding 0 T / 10 R / 30 B / 10 L, top corners 39.
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.barOverlay,
    borderTopLeftRadius: layout.chatFooterRadius,
    borderTopRightRadius: layout.chatFooterRadius,
  },
  // Glassmorphism, the stronger variant: 1.5px edge and 0 10px 25px rgba(0,0,0,0.12).
  inputPill: {
    minHeight: layout.inputHeight,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.glassBarBorder,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: spacing.lg,
    boxShadow: shadows.glassBar,
  },
  input: {
    flex: 1,
    ...type.message,
    color: colors.text,
    maxHeight: 120,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sendButton: {
    width: layout.sendButton,
    height: layout.sendButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bubbleAgent,
  },
})
