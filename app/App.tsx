import 'react-native-gesture-handler'
import { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { Main } from './src/main'
import { useFonts } from 'expo-font'
import { ThemeContext } from './src/context'
import * as themes from './src/theme'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LogBox, View, ActivityIndicator, Text } from 'react-native'
import { ClerkProvider, ClerkLoaded, ClerkLoading, Show } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { AuthScreen } from './src/auth/AuthScreen'
import { ChatProvider } from './src/ChatProvider'
import { ChatMenu } from './src/components/ChatMenu'

LogBox.ignoreLogs(['No native splash screen registered'])

export default function App() {
  const [theme, setTheme] = useState<string>('light')
  const [fontsLoaded] = useFonts({
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
          <ClerkLoading>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 12, color: '#666' }}>Loading…</Text>
            </View>
          </ClerkLoading>
          <ClerkLoaded>
            <Show when="signed-out">
              <AuthScreen />
            </Show>
            <Show when="signed-in">
              <ChatProvider>
                <ActionSheetProvider>
                  <NavigationContainer>
                    <Main />
                  </NavigationContainer>
                </ActionSheetProvider>
                <ChatMenu />
              </ChatProvider>
            </Show>
          </ClerkLoaded>
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
