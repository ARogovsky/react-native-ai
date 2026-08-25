import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Chat, Home, Profile } from './screens'

const Stack = createNativeStackNavigator()

/**
 * The handoff has no tab bar: Main screen is the entry point, Chat and Profile are
 * pushed on top and carry their own top bars.
 */
export function Main() {
  return (
    <SafeAreaProvider>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Chat" component={Chat} />
        <Stack.Screen
          name="Profile"
          component={Profile}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </SafeAreaProvider>
  )
}
