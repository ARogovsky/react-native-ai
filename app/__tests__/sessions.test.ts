import {
  listSessions,
  getSession,
  createSession,
  renameSession,
  deleteSession,
} from '../src/lib/sessions'

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  ;(globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  })
}

describe('sessions API', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn()
  })

  it('listSessions returns the sessions array with Bearer auth', async () => {
    mockFetchOnce({ success: true, sessions: [{ id: '1', title: 'A' }] })
    const result = await listSessions('tok')
    expect(result).toEqual([{ id: '1', title: 'A' }])
    const [url, opts] = (globalThis.fetch as jest.Mock).mock.calls[0]
    expect(url).toMatch(/\/api\/sessions$/)
    expect(opts.headers.Authorization).toBe('Bearer tok')
  })

  it('listSessions defaults to [] when sessions missing', async () => {
    mockFetchOnce({ success: true })
    expect(await listSessions('tok')).toEqual([])
  })

  it('createSession POSTs the title', async () => {
    mockFetchOnce({ success: true, session: { id: 'x', title: 'New' } })
    const s = await createSession('tok', 'New')
    expect(s).toEqual({ id: 'x', title: 'New' })
    const [url, opts] = (globalThis.fetch as jest.Mock).mock.calls[0]
    expect(url).toMatch(/\/api\/sessions$/)
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ title: 'New' })
  })

  it('getSession hits the /:id route', async () => {
    mockFetchOnce({ success: true, session: { id: 'abc', title: 'T', messages: [] } })
    const s = await getSession('tok', 'abc')
    expect(s.id).toBe('abc')
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/api\/sessions\/abc$/)
  })

  it('renameSession PUTs the new title', async () => {
    mockFetchOnce({ success: true, session: { id: 'abc', title: 'Renamed' } })
    const s = await renameSession('tok', 'abc', 'Renamed')
    expect(s.title).toBe('Renamed')
    const [, opts] = (globalThis.fetch as jest.Mock).mock.calls[0]
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ title: 'Renamed' })
  })

  it('deleteSession issues DELETE', async () => {
    mockFetchOnce({ success: true })
    await deleteSession('tok', 'abc')
    const [url, opts] = (globalThis.fetch as jest.Mock).mock.calls[0]
    expect(url).toMatch(/\/api\/sessions\/abc$/)
    expect(opts.method).toBe('DELETE')
  })

  it('throws on success:false', async () => {
    mockFetchOnce({ success: false, error: 'nope' })
    await expect(listSessions('tok')).rejects.toThrow('nope')
  })

  it('throws on HTTP error', async () => {
    mockFetchOnce({}, false, 500)
    await expect(listSessions('tok')).rejects.toThrow(/500/)
  })
})
