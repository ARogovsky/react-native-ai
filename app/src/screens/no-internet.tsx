import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Network from 'expo-network'
import { useLang } from '../lib/i18n'
import { colors, layout, spacing, type } from '../design/tokens'

/**
 * No internet — `no_internet.*` in the layout spec: full screen, vertical auto-layout
 * with a 30 gap, a 120x120 wifi-off glyph and the status line under it.
 *
 * The Transitions sheet says this appears over ANY screen when the connection drops and
 * disappears by itself when it comes back — no button, no user action. So it is rendered
 * as an overlay above the whole app rather than as a route, and it deliberately reads no
 * safe-area insets: it sits outside SafeAreaProvider (see SignedInApp) and asking for
 * insets there is exactly what crashed builds 8/9.
 */
export function NoInternetScreen() {
  const { t } = useLang()

  return (
    <View style={styles.screen} testID="no-internet">
      <Ionicons name="cloud-offline-outline" size={layout.wifiIcon} color={colors.text} />
      <Text style={styles.status}>{t.noInternet}</Text>
    </View>
  )
}

/**
 * Shows the screen above `children` while the device reports no usable connection.
 *
 * `isInternetReachable` is the field that matters: `isConnected` is true on a Wi-Fi
 * network that leads nowhere. It is `undefined` until the first probe, and undefined
 * counts as online so a cold start never flashes the offline screen.
 */
export function ConnectivityGate({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true

    const apply = (state: Network.NetworkState) => {
      if (!alive) return
      setOffline(state.isInternetReachable === false)
    }

    // The listener only fires on change, so the current state is read once up front.
    void Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => {})
    const subscription = Network.addNetworkStateListener(apply)

    return () => {
      alive = false
      subscription.remove()
    }
  }, [])

  return (
    <>
      {children}
      {offline && <NoInternetScreen />}
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  status: { ...type.headline, color: colors.text, textAlign: 'center' },
})
