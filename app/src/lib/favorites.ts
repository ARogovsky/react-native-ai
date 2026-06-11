import AsyncStorage from '@react-native-async-storage/async-storage'

// Client-only favorite flags (mirrors elli2's localStorage behaviour).
const KEY = 'elli-favorite-sessions'

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export async function toggleFavorite(id: string): Promise<string[]> {
  const current = await getFavorites()
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function isFavorite(id: string, favorites: string[]): boolean {
  return favorites.includes(id)
}
