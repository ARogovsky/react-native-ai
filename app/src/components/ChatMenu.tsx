import { useContext, useMemo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableHighlight,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useClerk } from '@clerk/expo'
import { ThemeContext } from '../context'
import { useChat } from '../ChatProvider'
import { ChatSession } from '../lib/sessions'
import { isFavorite } from '../lib/favorites'
import { t } from '../lib/i18n'

const HIT = { top: 10, bottom: 10, left: 10, right: 10 }

export function ChatMenu() {
  const { theme } = useContext(ThemeContext)
  const { signOut } = useClerk()
  const styles = getStyles(theme)
  const {
    menuOpen,
    closeMenu,
    sessions,
    favorites,
    currentSessionId,
    sessionsLoading,
    selectSession,
    newChat,
    removeSession,
    rename,
    toggleFavorite,
  } = useChat()

  const [renaming, setRenaming] = useState<ChatSession | null>(null)
  const [renameText, setRenameText] = useState('')

  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const af = isFavorite(a.id, favorites)
      const bf = isFavorite(b.id, favorites)
      if (af !== bf) return af ? -1 : 1
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bt - at
    })
  }, [sessions, favorites])

  function confirmDelete(s: ChatSession) {
    Alert.alert(s.title || '—', t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => removeSession(s.id) },
    ])
  }

  function startRename(s: ChatSession) {
    setRenaming(s)
    setRenameText(s.title || '')
  }

  async function saveRename() {
    if (renaming && renameText.trim()) {
      await rename(renaming.id, renameText.trim())
    }
    setRenaming(null)
  }

  return (
    <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={closeMenu}>
      <Pressable style={styles.backdrop} onPress={closeMenu} />
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.yourChats}</Text>
          <TouchableOpacity onPress={closeMenu} hitSlop={HIT}>
            <Ionicons name="close" size={26} color={theme.textColor} />
          </TouchableOpacity>
        </View>

        <TouchableHighlight underlayColor="transparent" onPress={newChat}>
          <View style={styles.newChatBtn}>
            <Ionicons name="add" size={20} color={theme.tintTextColor} />
            <Text style={styles.newChatText}>{t.newChat}</Text>
          </View>
        </TouchableHighlight>

        <ScrollView style={styles.list}>
          {sessionsLoading && sessions.length === 0 ? (
            <Text style={styles.muted}>...</Text>
          ) : sorted.length === 0 ? (
            <Text style={styles.muted}>{t.noChats}</Text>
          ) : (
            sorted.map((s) => {
              const fav = isFavorite(s.id, favorites)
              const active = s.id === currentSessionId
              return (
                <View key={s.id} style={[styles.row, active && styles.rowActive]}>
                  <TouchableOpacity onPress={() => toggleFavorite(s.id)} hitSlop={HIT}>
                    <Ionicons
                      name={fav ? 'star' : 'star-outline'}
                      size={18}
                      color={fav ? theme.tintColor : theme.textColor}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rowTitle} onPress={() => selectSession(s.id)}>
                    <Text numberOfLines={1} style={[styles.rowText, active && styles.rowTextActive]}>
                      {s.title || '—'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => startRename(s)} hitSlop={HIT} style={styles.rowAction}>
                    <Ionicons name="pencil" size={17} color={theme.textColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(s)} hitSlop={HIT} style={styles.rowAction}>
                    <Ionicons name="trash-outline" size={17} color={theme.textColor} />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </ScrollView>

        <TouchableHighlight underlayColor="transparent" onPress={() => signOut()}>
          <View style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={18} color={theme.textColor} />
            <Text style={styles.signOutText}>{t.signOut}</Text>
          </View>
        </TouchableHighlight>
      </View>

      {/* Rename sub-modal */}
      <Modal visible={!!renaming} animationType="fade" transparent onRequestClose={() => setRenaming(null)}>
        <Pressable style={styles.renameBackdrop} onPress={() => setRenaming(null)} />
        <View style={styles.renameCard}>
          <Text style={styles.renameTitle}>{t.rename}</Text>
          <TextInput
            style={styles.renameInput}
            value={renameText}
            onChangeText={setRenameText}
            placeholderTextColor={theme.placeholderTextColor}
            autoFocus
          />
          <View style={styles.renameButtons}>
            <TouchableOpacity onPress={() => setRenaming(null)} style={styles.renameButton}>
              <Text style={styles.renameCancel}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveRename} style={styles.renameButton}>
              <Text style={styles.renameSave}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  )
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    panel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '82%',
      backgroundColor: theme.backgroundColor,
      paddingTop: 60,
      paddingHorizontal: 16,
      paddingBottom: 24,
      borderRightWidth: 1,
      borderRightColor: theme.borderColor,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    headerTitle: { fontSize: 20, fontFamily: theme.boldFont, color: theme.textColor },
    newChatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tintColor,
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    newChatText: { color: theme.tintTextColor, fontFamily: theme.boldFont, marginLeft: 8, fontSize: 15 },
    list: { flex: 1 },
    muted: { color: theme.textColor, opacity: 0.5, paddingVertical: 16, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 10,
      gap: 10,
    },
    rowActive: { backgroundColor: theme.secondaryBackgroundColor },
    rowTitle: { flex: 1 },
    rowText: { color: theme.textColor, fontFamily: theme.regularFont, fontSize: 15 },
    rowTextActive: { fontFamily: theme.boldFont },
    rowAction: { paddingHorizontal: 4 },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
      marginTop: 8,
    },
    signOutText: { color: theme.textColor, fontFamily: theme.mediumFont, marginLeft: 8 },
    renameBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    renameCard: {
      position: 'absolute',
      top: '38%',
      left: 24,
      right: 24,
      backgroundColor: theme.backgroundColor,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    renameTitle: { fontSize: 17, fontFamily: theme.boldFont, color: theme.textColor, marginBottom: 12 },
    renameInput: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.textColor,
      fontSize: 16,
    },
    renameButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 20 },
    renameButton: { paddingVertical: 6, paddingHorizontal: 8 },
    renameCancel: { color: theme.textColor, opacity: 0.7, fontFamily: theme.mediumFont },
    renameSave: { color: theme.tintColor, fontFamily: theme.boldFont },
  })
