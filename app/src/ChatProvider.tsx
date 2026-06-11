import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from '@clerk/expo'
import { v4 as uuid } from 'uuid'
import { streamElliChat } from './lib/api'
import {
  ChatSession,
  listSessions,
  getSession,
  renameSession as apiRename,
  deleteSession as apiDelete,
} from './lib/sessions'
import { getFavorites, toggleFavorite as toggleFav } from './lib/favorites'

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

interface ChatContextValue {
  sessions: ChatSession[]
  favorites: string[]
  currentSessionId: string | null
  messages: ChatMsg[]
  loading: boolean // streaming a response
  sessionsLoading: boolean
  menuOpen: boolean
  openMenu: () => void
  closeMenu: () => void
  refreshSessions: () => Promise<void>
  selectSession: (id: string) => Promise<void>
  newChat: () => void
  removeSession: (id: string) => Promise<void>
  rename: (id: string, title: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  send: (prompt: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue>({} as ChatContextValue)
export const useChat = () => useContext(ChatContext)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const openMenu = useCallback(() => setMenuOpen(true), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const list = await listSessions(token)
      setSessions(list)
    } catch {
      /* surfaced elsewhere */
    } finally {
      setSessionsLoading(false)
    }
  }, [getToken])

  // Initial load when signed in.
  useEffect(() => {
    if (isSignedIn) {
      refreshSessions()
      getFavorites().then(setFavorites)
    } else {
      setSessions([])
      setMessages([])
      setCurrentSessionId(null)
    }
  }, [isSignedIn, refreshSessions])

  const selectSession = useCallback(
    async (id: string) => {
      setMenuOpen(false)
      try {
        const token = await getToken()
        if (!token) return
        const session = await getSession(token, id)
        const msgs: ChatMsg[] = (session.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        }))
        setMessages(msgs)
        setCurrentSessionId(id)
      } catch {
        /* ignore */
      }
    },
    [getToken]
  )

  const newChat = useCallback(() => {
    setMenuOpen(false)
    setMessages([])
    setCurrentSessionId(null)
  }, [])

  const removeSession = useCallback(
    async (id: string) => {
      const token = await getToken()
      if (!token) return
      await apiDelete(token, id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (id === currentSessionId) newChat()
    },
    [getToken, currentSessionId, newChat]
  )

  const rename = useCallback(
    async (id: string, title: string) => {
      const token = await getToken()
      if (!token) return
      const updated = await apiRename(token, id, title)
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)))
    },
    [getToken]
  )

  const toggleFavorite = useCallback(async (id: string) => {
    const next = await toggleFav(id)
    setFavorites(next)
  }, [])

  const send = useCallback(
    async (prompt: string) => {
      const clean = prompt.trim()
      if (!clean || loading) return

      // Optimistic: user msg + empty assistant msg we stream into (always the last item).
      setMessages((prev) => [
        ...prev,
        { role: 'user' as const, content: clean },
        { role: 'assistant' as const, content: '' },
      ])
      setLoading(true)

      const patchAssistant = (content: string, error = false) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next.length - 1
          if (last >= 0 && next[last].role === 'assistant') {
            next[last] = { role: 'assistant', content, error }
          }
          return next
        })
      }

      let token: string | null = null
      try {
        token = await getToken()
      } catch {
        token = null
      }
      if (!token) {
        patchAssistant('', true)
        setLoading(false)
        return
      }

      let acc = ''
      const createdNewSession = !currentSessionId
      streamElliChat({
        prompt: clean,
        sessionId: currentSessionId,
        token,
        idempotencyKey: uuid(),
        onEvent: (event) => {
          switch (event.type) {
            case 'session':
              if (!currentSessionId) setCurrentSessionId(event.sessionId)
              break
            case 'delta':
              acc += event.text
              patchAssistant(acc)
              break
            case 'resources':
              acc = acc ? `${acc}\n\n${event.text}` : event.text
              patchAssistant(acc)
              break
            case 'error':
              if (!acc) patchAssistant('', true)
              break
            case 'done':
              setLoading(false)
              // Refresh list so a newly created session / updated title appears.
              if (createdNewSession) refreshSessions()
              break
          }
        },
        onError: () => {
          if (!acc) patchAssistant('', true)
          setLoading(false)
        },
        onClose: () => setLoading(false),
      })
    },
    [getToken, currentSessionId, loading, refreshSessions]
  )

  return (
    <ChatContext.Provider
      value={{
        sessions,
        favorites,
        currentSessionId,
        messages,
        loading,
        sessionsLoading,
        menuOpen,
        openMenu,
        closeMenu,
        refreshSessions,
        selectSession,
        newChat,
        removeSession,
        rename,
        toggleFavorite,
        send,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
