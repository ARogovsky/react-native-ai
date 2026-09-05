/**
 * Renders the real login screen.
 *
 * The prod Clerk instance requires `legal_accepted` on every sign-up strategy
 * (GET https://clerk.e-lli.com/v1/environment -> sign_up.legal_consent_enabled: true) and
 * `password.required: true`. Without those the sign-up stays `missing_requirements`, no
 * session is created, and the screen only showed "Something went wrong".
 */

const mockSignUpCreate = jest.fn().mockResolvedValue({ status: 'missing_requirements' })
const mockPrepareVerification = jest.fn().mockResolvedValue({})
const mockSignInCreate = jest.fn()
const mockSetActiveSignIn = jest.fn().mockResolvedValue(undefined)

jest.mock('@clerk/expo/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockSignUpCreate,
      prepareEmailAddressVerification: mockPrepareVerification,
    },
    setActive: jest.fn(),
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: mockSignInCreate, prepareFirstFactor: jest.fn() },
    setActive: mockSetActiveSignIn,
  }),
}))

jest.mock('@clerk/expo/google', () => ({
  useSignInWithGoogle: () => ({ startGoogleAuthenticationFlow: jest.fn() }),
}))

jest.mock('@clerk/expo/apple', () => ({
  useSignInWithApple: () => ({ startAppleAuthenticationFlow: jest.fn() }),
}))

import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { AuthScreen } from '../src/auth/AuthScreen'
import { getStrings } from '../src/lib/i18n'

const t = getStrings()

function identifierNotFound() {
  return Object.assign(new Error('not found'), {
    errors: [{ code: 'form_identifier_not_found', message: 'not found' }],
  })
}

describe('auth screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignUpCreate.mockResolvedValue({ status: 'missing_requirements' })
  })

  it('blocks every sign-in option until the legal checkbox is ticked', () => {
    const view = render(<AuthScreen />)

    expect(view.getByTestId('auth-google').props.accessibilityState.disabled).toBe(true)
    expect(view.getByTestId('auth-email-start').props.accessibilityState.disabled).toBe(true)

    // The password link stays pressable so the reason can be explained instead of a
    // dead-looking screen.
    fireEvent.press(view.getByTestId('auth-password-start'))
    expect(view.getByTestId('auth-error').props.children).toBe(t.legalRequired)
    expect(view.queryByTestId('auth-password')).toBeNull()

    fireEvent.press(view.getByTestId('auth-legal'))
    expect(view.getByTestId('auth-google').props.accessibilityState.disabled).toBe(false)
    expect(view.getByTestId('auth-email-start').props.accessibilityState.disabled).toBe(false)
  })

  it('sends legalAccepted and a password when registering a new address', async () => {
    mockSignInCreate.mockRejectedValueOnce(identifierNotFound())
    const view = render(<AuthScreen />)

    fireEvent.press(view.getByTestId('auth-legal'))
    fireEvent.press(view.getByTestId('auth-email-start'))
    fireEvent.changeText(view.getByTestId('auth-email'), 'new.user@example.com')
    fireEvent.press(view.getByTestId('auth-send-code'))

    // Unknown address -> registration step asking for a password.
    const passwordInput = await waitFor(() => view.getByTestId('auth-password'))
    fireEvent.changeText(passwordInput, 'S3cret-pass-1')
    fireEvent.press(view.getByTestId('auth-register'))

    await waitFor(() =>
      expect(mockSignUpCreate).toHaveBeenCalledWith({
        emailAddress: 'new.user@example.com',
        password: 'S3cret-pass-1',
        legalAccepted: true,
      })
    )
    expect(mockPrepareVerification).toHaveBeenCalledWith({ strategy: 'email_code' })
  })

  it('keeps identifier + password as the fallback sign-in', async () => {
    mockSignInCreate.mockResolvedValueOnce({ status: 'complete', createdSessionId: 'sess_1' })
    const view = render(<AuthScreen />)

    fireEvent.press(view.getByTestId('auth-legal'))
    fireEvent.press(view.getByTestId('auth-password-start'))
    fireEvent.changeText(view.getByTestId('auth-email'), 'old.user@example.com')
    fireEvent.changeText(view.getByTestId('auth-password'), 'S3cret-pass-1')
    fireEvent.press(view.getByTestId('auth-password-submit'))

    await waitFor(() =>
      expect(mockSignInCreate).toHaveBeenCalledWith({
        identifier: 'old.user@example.com',
        password: 'S3cret-pass-1',
      })
    )
    await waitFor(() => expect(mockSetActiveSignIn).toHaveBeenCalledWith({ session: 'sess_1' }))
  })

  /**
   * The handoff's 100 gap is measured on an 844-tall frame. Applied literally on a shorter
   * device it pushed the email field under the keyboard and the Device Farm run could not
   * reach `auth-email` at all (run 1c2b2201). The gap must scale with the frame instead.
   */
  it('shrinks the root gap on frames shorter than the design', () => {
    const { Dimensions, ScrollView } = require('react-native')
    const view = render(<AuthScreen />)

    const scroll = view.UNSAFE_getByType(ScrollView)
    const gaps = [scroll.props.contentContainerStyle]
      .flat(2)
      .filter(Boolean)
      .map((style: any) => style.rowGap)
      .filter((gap: unknown) => typeof gap === 'number')

    expect(gaps.length).toBeGreaterThan(0)
    const applied = gaps[gaps.length - 1]
    if (Dimensions.get('window').height >= 844) {
      expect(applied).toBe(100)
    } else {
      expect(applied).toBeLessThan(100)
    }
  })
})
