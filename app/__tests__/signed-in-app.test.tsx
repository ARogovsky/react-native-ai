/**
 * Renders the entire signed-in tree the way App.tsx composes it.
 *
 * Guards the crash shipped in build 8/9: ChatMenu renders as a sibling of the navigator
 * and reads useSafeAreaInsets(), which throws "No safe area value available" unless a
 * SafeAreaProvider is above BOTH of them. It surfaced right after a successful login, so
 * it read as an authentication failure.
 */

jest.mock('react-native-sse', () => {
  class MockEventSource {
    addEventListener() {}
    removeAllEventListeners() {}
    close() {}
  }
  return { __esModule: true, default: MockEventSource }
})

jest.mock('../src/lib/sessions', () => ({
  listSessions: jest.fn().mockResolvedValue([]),
  getSession: jest.fn(),
  renameSession: jest.fn(),
  deleteSession: jest.fn(),
}))

jest.mock('../src/lib/favorites', () => ({
  getFavorites: jest.fn().mockResolvedValue([]),
  toggleFavorite: jest.fn().mockResolvedValue([]),
  isFavorite: () => false,
}))

jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ isSignedIn: true, getToken: () => Promise.resolve('token') }),
  useClerk: () => ({ signOut: jest.fn() }),
  useUser: () => ({ user: { fullName: 'Test User', imageUrl: null } }),
}))

import React from 'react'
import { render, act } from '@testing-library/react-native'
import { SignedInApp } from '../src/SignedInApp'
import { t } from '../src/lib/i18n'

// The native safe-area module does not exist under jest, so metrics are supplied here.
// The real SafeAreaProvider is used on purpose: mocking it away would hide exactly the
// missing-provider crash this test exists to catch.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

describe('signed-in app', () => {
  it('mounts the navigator and the history drawer without crashing', async () => {
    const view = render(<SignedInApp initialMetrics={METRICS} />)

    await act(async () => {
      await Promise.resolve()
    })

    // Home screen is the entry point of the stack.
    expect(view.getByText(t.continueConversation)).toBeTruthy()
    // ChatMenu's body ran too — its useSafeAreaInsets() call happens on render, before
    // the hidden Modal short-circuits its children, so a missing provider throws here.
    expect(view.toJSON()).toBeTruthy()
  })
})
