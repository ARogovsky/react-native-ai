import React from 'react'
import { Text } from 'react-native'
import { render, screen, act } from '@testing-library/react-native'

/**
 * The offline frame is new UI, so it gets the same treatment as the signed-in tree: a test
 * that actually mounts it. A green type-check would not notice a screen that throws on
 * render, and this gate now sits above the whole app.
 */

type State = { isConnected: boolean; isInternetReachable: boolean | undefined }
type Listener = (state: State) => void

// `mock`-prefixed: a jest.mock factory may not reference any other out-of-scope variable.
let mockListener: Listener | null = null
let mockInitial: State = { isConnected: true, isInternetReachable: true }

jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => Promise.resolve(mockInitial),
  addNetworkStateListener: (fn: Listener) => {
    mockListener = fn
    return {
      remove: () => {
        mockListener = null
      },
    }
  },
}))

import { ConnectivityGate, NoInternetScreen } from '../src/screens/no-internet'
import { getStrings } from '../src/lib/i18n'

describe('no internet', () => {
  beforeEach(() => {
    mockListener = null
    mockInitial = { isConnected: true, isInternetReachable: true }
  })

  it('renders the status line', () => {
    render(<NoInternetScreen />)
    expect(screen.getByText(getStrings().noInternet)).toBeTruthy()
  })

  it('stays out of the way while the connection is usable', async () => {
    render(
      <ConnectivityGate>
        <Text>app</Text>
      </ConnectivityGate>
    )

    // Let the initial getNetworkStateAsync resolve.
    await act(async () => {})

    expect(screen.getByText('app')).toBeTruthy()
    expect(screen.queryByTestId('no-internet')).toBeNull()
  })

  it('covers the app when the link drops and clears when it returns', async () => {
    render(
      <ConnectivityGate>
        <Text>app</Text>
      </ConnectivityGate>
    )
    await act(async () => {})

    await act(async () => {
      mockListener?.({ isConnected: false, isInternetReachable: false })
    })
    expect(screen.getByTestId('no-internet')).toBeTruthy()

    await act(async () => {
      mockListener?.({ isConnected: true, isInternetReachable: true })
    })
    expect(screen.queryByTestId('no-internet')).toBeNull()
    // The app underneath was never unmounted, so going offline loses no state.
    expect(screen.getByText('app')).toBeTruthy()
  })

  it('treats an unknown reachability as online, so a cold start does not flash', async () => {
    mockInitial = { isConnected: true, isInternetReachable: undefined }
    render(
      <ConnectivityGate>
        <Text>app</Text>
      </ConnectivityGate>
    )
    await act(async () => {})

    expect(screen.queryByTestId('no-internet')).toBeNull()
  })
})
