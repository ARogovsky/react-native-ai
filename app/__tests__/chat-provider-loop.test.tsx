/**
 * Regression test for the request storm observed in production on 2026-08-04:
 * ~4300 GET /api/sessions in 3 minutes from one device (Cloudflare + ALB metrics).
 *
 * Cause: `@clerk/expo`'s `useAuth` returns a NEW `getToken` function on every render
 * (it wraps @clerk/react's stable getToken in a plain arrow function, no useCallback).
 * Anything that puts `getToken` in a dependency array therefore changes identity on
 * every render, so an effect depending on it re-runs on every render — and because the
 * effect sets state, that render loop never ends.
 *
 * This test mimics that exact wrapper. It must stay green: the session list may be
 * fetched at most once per mount, no matter how many times the provider re-renders.
 */

jest.mock('react-native-sse', () => {
  class MockEventSource {
    addEventListener() {}
    removeAllEventListeners() {}
    close() {}
  }
  return { __esModule: true, default: MockEventSource }
})

const mockListSessions = jest.fn()
const mockGetSession = jest.fn()

jest.mock('../src/lib/sessions', () => ({
  listSessions: (...args: unknown[]) => mockListSessions(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  renameSession: jest.fn(),
  deleteSession: jest.fn(),
}))

// Captures the stream callbacks so a test can simulate what iOS does to a dead socket.
const streamCalls: Array<Record<string, any>> = []
jest.mock('../src/lib/api', () => ({
  streamElliChat: (args: Record<string, any>) => {
    streamCalls.push(args)
    return { close: () => args.onClose?.() }
  },
}))

jest.mock('../src/lib/favorites', () => ({
  getFavorites: jest.fn().mockResolvedValue([]),
  toggleFavorite: jest.fn().mockResolvedValue([]),
  isFavorite: () => false,
}))

// Faithful copy of @clerk/expo's useAuth wrapper: a fresh getToken per render.
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({
    isSignedIn: true,
    getToken: (opts?: unknown) => Promise.resolve('token-' + String(opts ?? '')),
  }),
}))

import React from 'react'
import { Text } from 'react-native'
import { render, act } from '@testing-library/react-native'
import { ChatProvider, useChat } from '../src/ChatProvider'

// Consumes the context and re-renders whenever provider state changes.
function Probe() {
  const { sessions, sessionsLoading } = useChat()
  return <Text>{`${sessions.length}:${sessionsLoading ? 'loading' : 'idle'}`}</Text>
}

let chat: ReturnType<typeof useChat>
function ChatProbe() {
  chat = useChat()
  return <Text>{`${chat.loading ? 'loading' : 'idle'}|${chat.messages.map((m) => m.content).join('/')}`}</Text>
}

// The bug is an endless chain of microtasks (render -> effect -> fetch -> setState ->
// render), which starves timers and would hang the test runner. So after STALL_AFTER
// calls the mock returns a promise that never settles: that breaks the chain, lets the
// runtime go idle, and the assertion below can report the real call count.
const STALL_AFTER = 25

describe('ChatProvider session loading', () => {
  let calls = 0

  beforeEach(() => {
    calls = 0
    mockListSessions.mockReset()
    mockListSessions.mockImplementation(() => {
      calls += 1
      if (calls > STALL_AFTER) return new Promise(() => {})
      return Promise.resolve([])
    })
  })

  it('fetches the session list once per mount, however often the provider re-renders', async () => {
    render(
      <ChatProvider>
        <Probe />
      </ChatProvider>
    )

    // Flush pending promises/state updates several times over.
    for (let i = 0; i < 12; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }

    expect(calls).toBeLessThanOrEqual(1)
  })
})

/**
 * The other half of the production symptom ("app waits forever"): react-native-sse
 * emits no event at all when the XHR dies with status 0, so the stream can end without
 * `done` or `error`. `loading` must still clear, and since the backend always persists
 * the finished turn, the answer must be pulled from the server rather than lost.
 */
describe('ChatProvider stream that ends without done', () => {
  beforeEach(() => {
    streamCalls.length = 0
    mockListSessions.mockReset()
    mockListSessions.mockResolvedValue([])
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue({
      id: 'sess-1',
      title: 'x',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'persisted answer' },
      ],
    })
  })

  it('clears loading and recovers the persisted answer', async () => {
    render(
      <ChatProvider>
        <ChatProbe />
      </ChatProvider>
    )
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await chat.send('hi')
    })
    expect(streamCalls).toHaveLength(1)
    expect(chat.loading).toBe(true)

    // Stream reports the session, streams one delta, then dies silently.
    await act(async () => {
      streamCalls[0].onEvent({ type: 'session', sessionId: 'sess-1' })
      streamCalls[0].onEvent({ type: 'delta', text: 'partial' })
      streamCalls[0].onClose()
      await Promise.resolve()
    })

    expect(chat.loading).toBe(false)
    expect(mockGetSession).toHaveBeenCalledWith(expect.any(String), 'sess-1')
    expect(chat.messages[chat.messages.length - 1]).toEqual({
      role: 'assistant',
      content: 'persisted answer',
      error: false,
    })
  })

  it('allows sending again after a dropped stream', async () => {
    render(
      <ChatProvider>
        <ChatProbe />
      </ChatProvider>
    )
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await chat.send('first')
    })
    await act(async () => {
      streamCalls[0].onEvent({ type: 'session', sessionId: 'sess-1' })
      streamCalls[0].onClose()
      await Promise.resolve()
    })

    await act(async () => {
      await chat.send('second')
    })
    expect(streamCalls).toHaveLength(2)
  })
})
