import React from 'react'
import { Keyboard, Platform, ScrollView } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'

/**
 * The keyboard covering an input has broken two Device Farm runs (1c2b2201, 876c438c), both
 * times because a screen scrolled on a state change but not when the keyboard actually
 * appeared. This asserts the mechanism itself: the screen subscribes to the keyboard-show
 * event and scrolls in response. It fails if that listener is dropped.
 */

jest.mock('@clerk/expo/legacy', () => ({
  useSignUp: () => ({ isLoaded: true, signUp: {}, setActive: jest.fn() }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: jest.fn().mockResolvedValue({ status: 'complete' }) },
    setActive: jest.fn(),
  }),
}))
jest.mock('@clerk/expo/google', () => ({
  useSignInWithGoogle: () => ({ startGoogleAuthenticationFlow: jest.fn() }),
}))
jest.mock('@clerk/expo/apple', () => ({
  useSignInWithApple: () => ({ startAppleAuthenticationFlow: jest.fn() }),
}))

import { AuthScreen } from '../src/auth/AuthScreen'

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'

describe('keyboard reachability', () => {
  it('the login screen subscribes to the keyboard-show event', () => {
    const spy = jest.spyOn(Keyboard, 'addListener')
    render(<AuthScreen />)

    const events = spy.mock.calls.map(([event]) => event)
    expect(events).toContain(SHOW_EVENT)
    spy.mockRestore()
  })

  it('the login screen scrolls to the end when the keyboard opens', () => {
    jest.useFakeTimers()
    const listeners: Record<string, () => void> = {}
    const spy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(((event: string, handler: () => void) => {
        listeners[event] = handler
        return { remove: jest.fn() }
      }) as never)

    const view = render(<AuthScreen />)
    // Open the email step so there is a field on screen at all.
    fireEvent.press(view.getByTestId('auth-legal'))
    fireEvent.press(view.getByTestId('auth-email-start'))

    const scroll = view.UNSAFE_getByType(ScrollView)
    const scrollToEnd = jest.fn()
    ;(scroll.instance as unknown as { scrollToEnd: unknown }).scrollToEnd = scrollToEnd

    listeners[SHOW_EVENT]?.()
    jest.advanceTimersByTime(200)

    expect(scrollToEnd).toHaveBeenCalled()

    spy.mockRestore()
    jest.useRealTimers()
  })
})
