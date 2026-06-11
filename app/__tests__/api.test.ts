// jest hoists jest.mock above imports, so the fake class must be defined INSIDE the
// factory. We expose instances via a `mock`-prefixed holder (allowed by jest scoping).
const mockSSE: { last: any } = { last: null }

jest.mock('react-native-sse', () => {
  class MockEventSource {
    url: string
    options: any
    listeners: Record<string, Array<(ev: any) => void>> = {}
    closed = false
    constructor(url: string, options: any) {
      this.url = url
      this.options = options
      mockSSE.last = this
    }
    addEventListener(type: string, cb: (ev: any) => void) {
      ;(this.listeners[type] ||= []).push(cb)
    }
    removeAllEventListeners() {
      this.listeners = {}
    }
    close() {
      this.closed = true
    }
    emit(type: string, ev: any) {
      ;(this.listeners[type] || []).forEach((cb) => cb(ev))
    }
  }
  return { __esModule: true, default: MockEventSource }
})

import { streamElliChat } from '../src/lib/api'

const msg = (obj: unknown) => ({ data: JSON.stringify(obj) })

describe('streamElliChat', () => {
  beforeEach(() => {
    mockSSE.last = null
  })

  it('sends Bearer + Idempotency-Key + body to /api/openai', () => {
    streamElliChat({ prompt: 'hi', sessionId: 's1', token: 'tok', idempotencyKey: 'idem-1', onEvent: () => {} })
    const es = mockSSE.last
    expect(es.url).toMatch(/\/api\/openai$/)
    expect(es.options.method).toBe('POST')
    expect(es.options.headers.Authorization).toBe('Bearer tok')
    expect(es.options.headers['Idempotency-Key']).toBe('idem-1')
    expect(JSON.parse(es.options.body)).toEqual({ prompt: 'hi', sessionId: 's1' })
  })

  it('forwards parsed events and closes on done', () => {
    const events: any[] = []
    const onClose = jest.fn()
    streamElliChat({ prompt: 'hi', token: 'tok', onEvent: (e) => events.push(e), onClose })
    const es = mockSSE.last

    es.emit('message', msg({ type: 'session', sessionId: 'abc' }))
    es.emit('message', msg({ type: 'delta', text: 'Hel' }))
    es.emit('message', msg({ type: 'delta', text: 'lo' }))
    expect(onClose).not.toHaveBeenCalled()

    es.emit('message', msg({ type: 'done', messageId: 'm1' }))
    expect(events.map((e) => e.type)).toEqual(['session', 'delta', 'delta', 'done'])
    expect(es.closed).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores keepalive / non-JSON lines', () => {
    const events: any[] = []
    streamElliChat({ prompt: 'x', token: 't', onEvent: (e) => events.push(e) })
    const es = mockSSE.last
    es.emit('message', { data: '' })
    es.emit('message', { data: ': ping' })
    es.emit('message', { data: 'not json' })
    expect(events).toHaveLength(0)
  })

  it('reports error event and closes', () => {
    const events: any[] = []
    const onClose = jest.fn()
    streamElliChat({ prompt: 'x', token: 't', onEvent: (e) => events.push(e), onClose })
    const es = mockSSE.last
    es.emit('message', msg({ type: 'error', message: 'generation_failed' }))
    expect(events[0]).toEqual({ type: 'error', message: 'generation_failed' })
    expect(es.closed).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces transport errors via onError and closes', () => {
    const onError = jest.fn()
    const onClose = jest.fn()
    streamElliChat({ prompt: 'x', token: 't', onEvent: () => {}, onError, onClose })
    const es = mockSSE.last
    es.emit('error', { message: 'boom' })
    expect(onError).toHaveBeenCalledWith('boom')
    expect(es.closed).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})
