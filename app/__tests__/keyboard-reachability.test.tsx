import fs from 'fs'
import path from 'path'
import React from 'react'
import { Keyboard, ScrollView } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'

/**
 * The keyboard covering an input has broken three Device Farm runs (1c2b2201, 876c438c,
 * 25aac233) — every time because the screen decided by timer whether a field was above the
 * keyboard, and on Android the timer lost the race.
 *
 * Both screens now hand that job to react-native-keyboard-controller, which follows the native
 * keyboard animation. This suite asserts the new mechanism is wired AND that the timer-based
 * one has not come back: no screen may subscribe to keyboardWillShow / keyboardDidShow itself.
 *
 * The library is replaced by the mock it ships (jest.setup.js): KeyboardAwareScrollView renders
 * as a ScrollView and KeyboardAvoidingView as a View, both with our props passed through.
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

// Chat screen dependencies that need a native module or a navigator.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({ showActionSheetWithOptions: jest.fn() }),
}))
jest.mock('../src/components/SendIcon', () => ({ SendIcon: () => null }))
jest.mock('../src/ChatProvider', () => ({
  useChat: () => ({
    messages: [],
    send: jest.fn(),
    loading: false,
    openMenu: jest.fn(),
  }),
}))

import { AuthScreen } from '../src/auth/AuthScreen'
import { Chat } from '../src/screens/chat'

/** Events the hand-rolled workaround used to subscribe to. */
const SHOW_EVENTS = ['keyboardWillShow', 'keyboardDidShow']

describe('keyboard reachability', () => {
  it('the login form lives in a keyboard-aware scroll container', () => {
    const view = render(<AuthScreen />)

    // The library's mock renders KeyboardAwareScrollView as a ScrollView, so the element the
    // screen created is read back by type: its props are exactly the ones the screen passed to
    // the keyboard-aware container.
    const container = view.UNSAFE_getByType(ScrollView)
    expect(container.props.testID).toBe('auth-scroll')
    // bottomOffset exists only on KeyboardAwareScrollView: the distance the focused field keeps
    // from the keyboard edge after the library scrolls it into view.
    expect(typeof container.props.bottomOffset).toBe('number')
    expect(container.props.bottomOffset).toBeGreaterThan(0)

    // The fields are inside that container, not next to it.
    fireEvent.press(view.getByTestId('auth-legal'))
    fireEvent.press(view.getByTestId('auth-email-start'))
    expect(view.getByTestId('auth-email')).toBeTruthy()
  })

  it('the login screen no longer subscribes to keyboard-show events itself', () => {
    const spy = jest.spyOn(Keyboard, 'addListener')
    render(<AuthScreen />)

    const events = spy.mock.calls.map(([event]) => event)
    expect(events.filter((event) => SHOW_EVENTS.includes(event as string))).toHaveLength(0)
    spy.mockRestore()
  })

  it('the chat list is the keyboard-aware chat scroll view, lifting on every open', () => {
    const spy = jest.spyOn(Keyboard, 'addListener')
    const view = render(<Chat />)

    // The library's mock renders KeyboardChatScrollView as a ScrollView; the props read back are
    // the ones the screen passed. A container that animates the layout instead (the old
    // KeyboardAvoidingView with behavior="translate-with-padding") leaves the bottom of a
    // scrollable conversation under the keyboard, which is what was reported.
    const list = view.UNSAFE_getByType(ScrollView)
    expect(list.props.testID).toBe('chat-list')
    expect(list.props.keyboardLiftBehavior).toBe('always')
    // The bar rides the keyboard, so its height is EXTRA scrollable space, not an offset that
    // shrinks the keyboard push. As `offset` it left the last bubble under the bar.
    expect(list.props.offset).toBeUndefined()
    expect(list.props.extraContentPadding.value).toBeGreaterThan(0)

    expect(view.getByTestId('chat-input')).toBeTruthy()
    expect(view.getByTestId('chat-send')).toBeTruthy()

    const events = spy.mock.calls.map(([event]) => event)
    expect(events.filter((event) => SHOW_EVENTS.includes(event as string))).toHaveLength(0)
    spy.mockRestore()
  })

  /**
   * KeyboardAwareScrollView / KeyboardAvoidingView only follow the keyboard when
   * KeyboardProvider is above them, and without it they silently do nothing — no crash, no
   * warning, which is the failure mode that is expensive to notice on a device.
   *
   * App.tsx cannot be mounted here: babel-preset-expo inlines EXPO_PUBLIC_* at transform time,
   * so the Clerk key check inside it cannot be satisfied from a test. The composition is
   * therefore asserted on the source: the provider must enclose BOTH auth states.
   */
  it('App.tsx keeps KeyboardProvider above both auth states', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8')

    expect(source).toMatch(
      /<KeyboardProvider[\s\S]*<Show when="signed-out">[\s\S]*<Show when="signed-in">[\s\S]*<\/KeyboardProvider>/
    )
  })
})
