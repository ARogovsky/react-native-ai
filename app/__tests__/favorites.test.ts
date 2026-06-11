let mockStore: Record<string, string> = {}

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in mockStore ? mockStore[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore[k] = v
    }),
  },
}))

import { getFavorites, toggleFavorite, isFavorite } from '../src/lib/favorites'

describe('favorites', () => {
  beforeEach(() => {
    mockStore = {}
  })

  it('returns [] when nothing stored', async () => {
    expect(await getFavorites()).toEqual([])
  })

  it('toggles a favorite on and off and persists', async () => {
    let favs = await toggleFavorite('s1')
    expect(favs).toEqual(['s1'])
    expect(await getFavorites()).toEqual(['s1'])

    favs = await toggleFavorite('s2')
    expect(favs.sort()).toEqual(['s1', 's2'])

    favs = await toggleFavorite('s1')
    expect(favs).toEqual(['s2'])
  })

  it('isFavorite checks membership', () => {
    expect(isFavorite('a', ['a', 'b'])).toBe(true)
    expect(isFavorite('c', ['a', 'b'])).toBe(false)
  })

  it('survives corrupted storage', async () => {
    mockStore['elli-favorite-sessions'] = '{not json'
    expect(await getFavorites()).toEqual([])
  })
})
