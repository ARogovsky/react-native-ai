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
import { t } from '../src/lib/i18n'

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
})
