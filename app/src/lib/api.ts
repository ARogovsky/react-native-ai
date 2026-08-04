import EventSource from 'react-native-sse'
import { DOMAIN } from '../../constants'

// SSE event envelopes emitted by our backend (services/api /api/openai).
export type ElliEvent =
  | { type: 'session'; sessionId: string; userMessageId?: string }
  | { type: 'delta'; text: string }
  /** Guardrail replaced the answer: drop whatever was streamed for this turn. */
  | { type: 'reset' }
  | { type: 'resources'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done'; messageId?: string | null; replay?: boolean }

export interface StreamChatArgs {
  prompt: string
  sessionId?: string | null
  /** Clerk session token (Authorization: Bearer ...). */
  token: string
  /** Dedup key for this submit (UUID). */
  idempotencyKey?: string
  onEvent: (event: ElliEvent) => void
  onError?: (message: string) => void
  /** Called exactly once when the stream is over: `done`, error, or an early close(). */
  onClose?: () => void
}

/** Handle for an open chat stream. `close()` is idempotent and triggers `onClose`. */
export interface ElliStream {
  close: () => void
}

/**
 * Opens an SSE stream to the ELLI chat endpoint and forwards parsed events.
 * Returns a handle so the caller can end the stream early (unmount, stall watchdog);
 * closing that way still runs `onClose`, which callers rely on to stop showing a
 * spinner. Note that react-native-sse emits NOTHING when the underlying XHR dies with
 * status 0 (an iOS socket drop), so callers must also time out on inactivity.
 *
 * Contract (services/api/app/api/openai/route.ts):
 *   POST /api/openai  { prompt, sessionId? }
 *   headers: Authorization: Bearer <clerk>, Idempotency-Key?
 *   events: session -> delta* -> resources? -> done | error  (+ ":" keepalive comments)
 */
export function streamElliChat(args: StreamChatArgs): ElliStream {
  const { prompt, sessionId, token, idempotencyKey, onEvent, onError, onClose } = args

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const es = new EventSource(`${DOMAIN}/api/openai`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, sessionId: sessionId || undefined }),
    // We close the stream ourselves on `done`; don't auto-reconnect.
    pollingInterval: 0,
  })

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    es.removeAllEventListeners()
    es.close()
    onClose?.()
  }

  es.addEventListener('message', (event) => {
    if (!event.data) return
    let parsed: ElliEvent | null = null
    try {
      parsed = JSON.parse(event.data) as ElliEvent
    } catch {
      return // ignore non-JSON (e.g. stray keepalive)
    }
    if (!parsed || typeof (parsed as any).type !== 'string') return

    onEvent(parsed)
    if (parsed.type === 'done' || parsed.type === 'error') {
      close()
    }
  })

  es.addEventListener('error', (event: any) => {
    onError?.(event?.message || 'network_error')
    close()
  })

  return { close }
}
