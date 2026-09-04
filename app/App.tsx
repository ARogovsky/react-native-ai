import 'react-native-gesture-handler'
import { useState, useEffect } from 'react'
import { useFonts } from 'expo-font'
// Import per weight, not from the package root: the root re-exports every weight and
// italic, which pulled ~6 MB of unused TTFs into the bundle.
import { Inter_300Light } from '@expo-google-fonts/inter/300Light'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { ThemeContext } from './src/context'
import * as themes from './src/theme'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LogBox, View, ActivityIndicator, Text } from 'react-native'
import { ClerkProvider, ClerkLoaded, ClerkLoading, Show } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { AuthScreen } from './src/auth/AuthScreen'
import { SignedInApp } from './src/SignedInApp'
import { ConnectivityGate } from './src/screens/no-internet'
import { getStrings, hydrateLang } from './src/lib/i18n'
import { hydrateRemoteCopy } from './src/lib/remoteCopy'

LogBox.ignoreLogs(['No native splash screen registered'])

export default function App() {
  // The ELLI design is the product look; the other themes stay available for debugging.
  const [theme, setTheme] = useState<string>('elli')
  const [fontsLoaded] = useFonts({
    // Inter is the typeface the handoff uses for every text style.
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    'Geist-Regular': require('./assets/fonts/Geist-Regular.otf'),
    'Geist-Light': require('./assets/fonts/Geist-Light.otf'),
    'Geist-Bold': require('./assets/fonts/Geist-Bold.otf'),
    'Geist-Medium': require('./assets/fonts/Geist-Medium.otf'),
    'Geist-Black': require('./assets/fonts/Geist-Black.otf'),
    'Geist-SemiBold': require('./assets/fonts/Geist-SemiBold.otf'),
    'Geist-Thin': require('./assets/fonts/Geist-Thin.otf'),
    'Geist-UltraLight': require('./assets/fonts/Geist-UltraLight.otf'),
    'Geist-UltraBlack': require('./assets/fonts/Geist-UltraBlack.otf'),
  })

  useEffect(() => {
    AsyncStorage.getItem('rnai-theme')
      .then((saved) => {
        if (saved) setTheme(saved)
      })
      .catch(() => {})
  }, [])

  // Restores the language picked in the profile; until it resolves the app shows the
  // locale-derived default, which is what a first launch gets anyway.
  useEffect(() => {
    void hydrateLang()
  }, [])

  // Copy a clinician edits in the cabinet, served by GET /api/config. Cached from the last
  // launch, so this only ever replaces text that is already on screen.
  useEffect(() => {
    void hydrateRemoteCopy()
  }, [])

  function _setTheme(next: string) {
    setTheme(next)
    AsyncStorage.setItem('rnai-theme', next).catch(() => {})
  }

  if (!fontsLoaded) return null
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!
  if (!publishableKey) {
    throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set')
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeContext.Provider
          value={{ theme: getTheme(theme), themeName: theme, setTheme: _setTheme }}
        >
          {/* The handoff's "No internet connection" frame covers ANY screen and clears
              itself once the link is back, so the gate wraps both auth states. It adds no
              provider and reads no safe-area insets — see src/screens/no-internet.tsx. */}
          <ConnectivityGate>
            <ClerkLoading>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 12, color: '#666' }}>{getStrings().loading}</Text>
              </View>
            </ClerkLoading>
            <ClerkLoaded>
              <Show when="signed-out">
                <AuthScreen />
              </Show>
              <Show when="signed-in">
                <SignedInApp />
              </Show>
            </ClerkLoaded>
          </ConnectivityGate>
        </ThemeContext.Provider>
      </GestureHandlerRootView>
    </ClerkProvider>
  )
}

function getTheme(theme: string): any {
  let current
  Object.keys(themes).forEach((_theme) => {
    if (_theme.includes(theme)) {
      current = (themes as any)[_theme]
    }
  })
  return current
}
