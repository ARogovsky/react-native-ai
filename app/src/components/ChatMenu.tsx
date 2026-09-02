import { useMemo, useState } from 'react'
import { Modal, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useChat } from '../ChatProvider'
import { ChatSession } from '../lib/sessions'
import { isFavorite } from '../lib/favorites'
import { useLang } from '../lib/i18n'
import { DeleteChatModal, RenameChatModal } from './ConfirmModals'
import { colors, layout, spacing, type } from '../design/tokens'

const HIT = { top: 10, bottom: 10, left: 10, right: 10 }

/** History drawer — "EN History block" frame: 260 wide panel, 230 of content. */
export function ChatMenu() {
  const insets = useSafeAreaInsets()
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

  const { t } = useLang()
  const [renaming, setRenaming] = useState<ChatSession | null>(null)
  const [deleting, setDeleting] = useState<ChatSession | null>(null)

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

  return (
    <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={closeMenu}>
      <Pressable style={styles.backdrop} onPress={closeMenu} />
      <View style={styles.panel}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
          <Text style={styles.headerTitle}>{t.history}</Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {sessionsLoading && sessions.length === 0 ? (
            <Text style={styles.muted}>...</Text>
          ) : sorted.length === 0 ? (
            <Text style={styles.muted}>{t.noChats}</Text>
          ) : (
            sorted.map((session) => {
              const fav = isFavorite(session.id, favorites)
              const active = session.id === currentSessionId
              return (
                <View key={session.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => toggleFavorite(session.id)}
                    hitSlop={HIT}
                  >
                    <Ionicons
                      name={fav ? 'bookmark' : 'bookmark-outline'}
                      size={layout.drawerIcon}
                      color={colors.text}
                    />
                  </Pressable>

                  <Pressable
                    testID="menu-session-row"
                    style={styles.rowTitle}
                    onPress={() => selectSession(session.id)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.rowText, active && styles.rowTextActive]}
                    >
                      {session.title || '—'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRenaming(session)}
                    hitSlop={HIT}
                  >
                    <Ionicons name="pencil" size={layout.drawerIcon} color={colors.text} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleting(session)}
                    hitSlop={HIT}
                  >
                    <Ionicons name="trash-outline" size={layout.drawerIcon} color={colors.text} />
                  </Pressable>
                </View>
              )
            })
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 45) }]}>
          <Pressable testID="menu-new-chat" onPress={newChat} style={styles.newChatButton}>
            <Text style={styles.newChatText}>{t.newChat}</Text>
          </Pressable>
        </View>
      </View>

      <RenameChatModal
        visible={!!renaming}
        initialValue={renaming?.title || ''}
        onCancel={() => setRenaming(null)}
        onSave={async (title) => {
          if (renaming && title) await rename(renaming.id, title)
          setRenaming(null)
        }}
      />

      <DeleteChatModal
        visible={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeSession(deleting.id)
          setDeleting(null)
        }}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  // The drawer hangs off the right edge: it is opened from the header button in the
  // top-right corner, so it slides in from the same side.
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: layout.drawerWidth,
    backgroundColor: colors.background,
    paddingLeft: spacing.lg,
  },
  header: {
    height: layout.drawerHeaderHeight,
    paddingBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginRight: spacing.lg,
  },
  headerTitle: { ...type.bodySmall, color: colors.text, textAlign: 'center' },
  list: { flex: 1, marginRight: spacing.lg },
  listContent: { paddingVertical: spacing.md, rowGap: spacing.md },
  muted: { ...type.message, color: colors.muted, paddingVertical: spacing.lg, textAlign: 'center' },
  row: {
    height: layout.drawerRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  rowTitle: { flex: 1 },
  rowText: { ...type.message, color: colors.text },
  rowTextActive: { fontFamily: type.brandName.fontFamily },
  footer: { paddingTop: spacing.md, marginRight: spacing.lg },
  newChatButton: {
    height: 34,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  newChatText: { ...type.body, color: colors.text, textAlign: 'center' },
})
