import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useAuth } from '@clerk/expo'
import { v4 as uuid } from 'uuid'
import { streamElliChat, ElliStream } from './lib/api'
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

/** Floor between two session-list fetches; kills accidental refresh storms. */
const SESSION_REFRESH_MIN_INTERVAL_MS = 1500
/**
 * No SSE event for this long means the connection is dead: the backend sends a
 * keepalive every 15s, so 45s of silence is not a slow model. react-native-sse can
 * end an XHR without emitting anything at all (iOS drops the socket -> xhr.status 0),
 * which would otherwise leave the UI waiting forever.
 */
const STREAM_STALL_TIMEOUT_MS = 45000

export function ChatProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth()

  // @clerk/expo's useAuth returns a NEW getToken on every render: it wraps the stable
  // one from @clerk/react in a plain arrow function, without useCallback. Listing it as
  // a dependency therefore changes identity on every render, so an effect that depends
  // on it re-runs on every render — and since the effect sets state, the loop never
  // ends. That shipped as a request storm (~25 GET /api/sessions per second).
  // Keep it in a ref and depend on this stable accessor instead.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const authToken = useCallback(() => getTokenRef.current(), [])

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // In-flight chat stream + its stall watchdog, so we can always close/settle them.
  const streamRef = useRef<ElliStream | null>(null)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current)
      streamRef.current?.close()
      streamRef.current = null
    },
    []
  )

  const openMenu = useCallback(() => setMenuOpen(true), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Collapse concurrent/rapid refreshes into one request.
  const refreshInFlight = useRef(false)
  const lastRefreshAt = useRef(0)

  const refreshSessions = useCallback(async () => {
    if (refreshInFlight.current) return
    if (Date.now() - lastRefreshAt.current < SESSION_REFRESH_MIN_INTERVAL_MS) return
    refreshInFlight.current = true
    lastRefreshAt.current = Date.now()
    setSessionsLoading(true)
    try {
      const token = await authToken()
      if (!token) return
      const list = await listSessions(token)
      setSessions(list)
    } catch {
      /* surfaced elsewhere */
    } finally {
      refreshInFlight.current = false
      setSessionsLoading(false)
    }
  }, [authToken])

  // Initial load when signed in. Depends on `isSignedIn` only: adding callbacks here is
  // what caused the render loop, and `refreshSessions` is stable by construction.
  useEffect(() => {
    if (isSignedIn) {
      refreshSessions()
      getFavorites().then(setFavorites)
    } else {
      setSessions([])
      setMessages([])
      setCurrentSessionId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  const selectSession = useCallback(
    async (id: string) => {
      setMenuOpen(false)
      try {
        const token = await authToken()
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
    [authToken]
  )

  const newChat = useCallback(() => {
    setMenuOpen(false)
    setMessages([])
    setCurrentSessionId(null)
  }, [])

  const removeSession = useCallback(
    async (id: string) => {
      const token = await authToken()
      if (!token) return
      await apiDelete(token, id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (id === currentSessionId) newChat()
    },
    [authToken, currentSessionId, newChat]
  )

  const rename = useCallback(
    async (id: string, title: string) => {
      const token = await authToken()
      if (!token) return
      const updated = await apiRename(token, id, title)
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)))
    },
    [authToken]
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
        token = await authToken()
      } catch {
        token = null
      }
      if (!token) {
        patchAssistant('', true)
        setLoading(false)
        return
      }

      let acc = ''
      let settled = false
      let turnSessionId = currentSessionId
      const createdNewSession = !currentSessionId

      const clearWatchdog = () => {
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current)
          watchdogRef.current = null
        }
      }

      // Single exit point: whatever happens to the stream, `loading` gets cleared.
      // It used to be cleared only on done/error, so a silent drop bricked the chat
      // (every later send returns early while `loading` is true).
      const settle = (failed: boolean) => {
        if (settled) return
        settled = true
        clearWatchdog()
        streamRef.current = null
        setLoading(false)
        if (failed && !acc) patchAssistant('', true)
      }

      // A dropped stream is not a lost answer: the backend persists the final turn in a
      // `finally` block. Pull it from the server instead of showing an error.
      const recover = async () => {
        if (!turnSessionId) {
          settle(true)
          return
        }
        try {
          const t = await authToken()
          const session = t ? await getSession(t, turnSessionId) : null
          const last = [...(session?.messages || [])].reverse().find((m) => m.role === 'assistant')
          if (last?.content) {
            acc = last.content
            patchAssistant(last.content)
            settle(false)
            return
          }
        } catch {
          /* fall through to the error bubble */
        }
        settle(true)
      }

      const armWatchdog = () => {
        clearWatchdog()
        watchdogRef.current = setTimeout(() => {
          // Closing fires onClose below, which reconciles with the server.
          streamRef.current?.close()
        }, STREAM_STALL_TIMEOUT_MS)
      }

      armWatchdog()
      streamRef.current = streamElliChat({
        prompt: clean,
        sessionId: currentSessionId,
        token,
        idempotencyKey: uuid(),
        onEvent: (event) => {
          armWatchdog() // any traffic, including keepalives, resets the stall clock
          switch (event.type) {
            case 'session':
              turnSessionId = event.sessionId
              if (!currentSessionId) setCurrentSessionId(event.sessionId)
              break
            case 'delta':
              acc += event.text
              patchAssistant(acc)
              break
            case 'reset':
              // Backend discarded the generated answer (guardrail); replacement
              // text arrives as fresh deltas right after this.
              acc = ''
              patchAssistant('')
              break
            case 'resources':
              acc = acc ? `${acc}\n\n${event.text}` : event.text
              patchAssistant(acc)
              break
            case 'error':
              if (!acc) patchAssistant('', true)
              break
            case 'done':
              settle(false)
              // Refresh list so a newly created session / updated title appears.
              if (createdNewSession) refreshSessions()
              break
          }
        },
        // Transport errors and stream-ends-without-done both land in onClose, which the
        // client always calls exactly once.
        onClose: () => {
          if (!settled) void recover()
        },
      })
    },
    [authToken, currentSessionId, loading, refreshSessions]
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
