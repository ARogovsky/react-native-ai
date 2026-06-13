import {
  View,
  Text,
  KeyboardAvoidingView,
  StyleSheet,
  TouchableHighlight,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native'
import 'react-native-get-random-values'
import { useContext, useState, useRef, useEffect } from 'react'
import { ThemeContext } from '../context'
import { useChat, ChatMsg } from '../ChatProvider'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Clipboard from 'expo-clipboard'
import { useActionSheet } from '@expo/react-native-action-sheet'
import Markdown from '@ronradtke/react-native-markdown-display'
import { t } from '../lib/i18n'

export function Chat() {
  const { theme } = useContext(ThemeContext)
  const { messages, send, loading, newChat } = useChat()
  const styles = getStyles(theme)
  const { showActionSheetWithOptions } = useActionSheet()

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

  async function copyToClipboard(text: string) {
    await Clipboard.setStringAsync(text)
  }

  function showMessageActions(text: string) {
    showActionSheetWithOptions(
      { options: [t.newChat, 'Copy', 'Cancel'], cancelButtonIndex: 2 },
      (selected) => {
        if (selected === 0) newChat()
        if (selected === 1) copyToClipboard(text)
      }
    )
  }

  const hasMessages = messages.length > 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={110}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
        contentContainerStyle={!hasMessages && styles.scrollContentContainer}
      >
        {!hasMessages && (
          <View style={styles.greetingWrapper}>
            <View style={styles.assistantBubble}>
              <Markdown style={styles.markdownStyle as any}>{t.greeting}</Markdown>
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <MessageRow
            key={i}
            msg={m}
            theme={theme}
            styles={styles}
            onLongPress={() => showMessageActions(m.content)}
          />
        ))}
        {loading && <Text style={styles.typing}>{t.typing}</Text>}
      </ScrollView>

      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.input}
          testID="chat-input"
          onChangeText={setInput}
          placeholder={t.inputPlaceholder}
          placeholderTextColor={theme.placeholderTextColor}
          value={input}
          multiline
        />
        <TouchableHighlight testID="chat-send" underlayColor={'transparent'} activeOpacity={0.65} onPress={onSend}>
          <View style={styles.chatButton}>
            <Ionicons name="arrow-up-outline" size={20} color={theme.tintTextColor} />
          </View>
        </TouchableHighlight>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageRow({
  msg,
  theme,
  styles,
  onLongPress,
}: {
  msg: ChatMsg
  theme: any
  styles: any
  onLongPress: () => void
}) {
  if (msg.role === 'user') {
    return (
      <View style={styles.promptTextContainer}>
        <View style={styles.promptTextWrapper}>
          <Text style={styles.promptText}>{msg.content}</Text>
        </View>
      </View>
    )
  }
  if (msg.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t.genericError}</Text>
      </View>
    )
  }
  return (
    <TouchableHighlight underlayColor="transparent" onLongPress={onLongPress}>
      <View style={styles.assistantBubble}>
        <Markdown style={styles.markdownStyle as any}>{msg.content}</Markdown>
      </View>
    </TouchableHighlight>
  )
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { backgroundColor: theme.backgroundColor, flex: 1 },
    scrollContentContainer: { flex: 1, justifyContent: 'center' },
    greetingWrapper: { paddingHorizontal: 10 },
    assistantBubble: {
      borderWidth: 1,
      marginRight: 25,
      borderColor: theme.borderColor,
      paddingHorizontal: 15,
      paddingVertical: 6,
      margin: 10,
      borderRadius: 13,
    },
    promptTextContainer: { alignItems: 'flex-end', marginRight: 15, marginLeft: 24, marginTop: 10 },
    promptTextWrapper: { borderRadius: 8, borderTopRightRadius: 0, backgroundColor: theme.tintColor },
    promptText: {
      color: theme.tintTextColor,
      fontFamily: theme.regularFont,
      paddingVertical: 6,
      paddingHorizontal: 10,
      fontSize: 16,
    },
    typing: { marginTop: 10, marginLeft: 14, color: theme.textColor, opacity: 0.6, fontStyle: 'italic' },
    errorContainer: {
      marginHorizontal: 10,
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: 'rgba(192,57,43,0.12)',
    },
    errorText: { color: '#c0392b' },
    chatButton: { marginRight: 14, padding: 5, borderRadius: 99, backgroundColor: theme.tintColor },
    chatInputContainer: {
      paddingTop: 5,
      borderColor: theme.borderColor,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 5,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 24,
      color: theme.textColor,
      marginHorizontal: 10,
      paddingVertical: 10,
      paddingHorizontal: 21,
      maxHeight: 120,
      borderColor: theme.borderColor,
      fontFamily: theme.semiBoldFont,
    },
    markdownStyle: {
      body: { color: theme.textColor, fontFamily: theme.regularFont },
      paragraph: { color: theme.textColor, fontSize: 16, fontFamily: theme.regularFont },
      link: { color: theme.tintColor },
      list_item: { marginTop: 7, color: theme.textColor, fontFamily: theme.regularFont, fontSize: 16 },
      bullet_list_icon: { color: theme.textColor },
      ordered_list_icon: { color: theme.textColor },
      code_inline: { color: theme.textColor, backgroundColor: theme.secondaryBackgroundColor },
      fence: { color: theme.textColor, backgroundColor: theme.secondaryBackgroundColor, borderColor: theme.borderColor },
    } as any,
  })
