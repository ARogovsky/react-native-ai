import { DOMAIN } from '../../constants'

export interface ApiMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

export interface ChatSession {
  id: string
  title: string
  updatedAt?: string
  createdAt?: string
  messages?: ApiMessage[]
}

async function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parse(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export async function listSessions(token: string): Promise<ChatSession[]> {
  const res = await fetch(`${DOMAIN}/api/sessions`, { headers: await authHeaders(token) })
  const data = await parse(res)
  return (data.sessions || []) as ChatSession[]
}

export async function getSession(token: string, id: string): Promise<ChatSession> {
  const res = await fetch(`${DOMAIN}/api/sessions/${id}`, { headers: await authHeaders(token) })
  const data = await parse(res)
  return data.session as ChatSession
}

export async function createSession(token: string, title: string): Promise<ChatSession> {
  const res = await fetch(`${DOMAIN}/api/sessions`, {
    method: 'POST',
    headers: await authHeaders(token),
    body: JSON.stringify({ title }),
  })
  const data = await parse(res)
  return data.session as ChatSession
}

export async function renameSession(token: string, id: string, title: string): Promise<ChatSession> {
  const res = await fetch(`${DOMAIN}/api/sessions/${id}`, {
    method: 'PUT',
    headers: await authHeaders(token),
    body: JSON.stringify({ title }),
  })
  const data = await parse(res)
  return data.session as ChatSession
}

export async function deleteSession(token: string, id: string): Promise<void> {
  const res = await fetch(`${DOMAIN}/api/sessions/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(token),
  })
  await parse(res)
}
