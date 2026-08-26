import { NavigationContainer } from '@react-navigation/native'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import {
  SafeAreaProvider,
  initialWindowMetrics,
  type Metrics,
} from 'react-native-safe-area-context'
import { ChatProvider } from './ChatProvider'
import { ChatMenu } from './components/ChatMenu'
import { Main } from './main'

/**
 * The whole signed-in tree, in one place so it can be rendered in a test.
 *
 * SafeAreaProvider must wrap everything that reads insets: ChatMenu lives outside the
 * navigator, and when the provider sat inside <Main /> the drawer's useSafeAreaInsets()
 * threw "No safe area value available" the moment the signed-in tree mounted — i.e.
 * immediately after a successful login, which looked like broken authentication.
 *
 * `initialMetrics` comes from the native module at startup so children render on the
 * first frame; tests pass metrics explicitly because that module is not available there.
 */
export function SignedInApp({
  initialMetrics = initialWindowMetrics,
}: {
  initialMetrics?: Metrics | null
}) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics ?? undefined}>
      <ChatProvider>
        <ActionSheetProvider>
          <NavigationContainer>
            <Main />
          </NavigationContainer>
        </ActionSheetProvider>
        <ChatMenu />
      </ChatProvider>
    </SafeAreaProvider>
  )
}
