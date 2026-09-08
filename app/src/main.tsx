import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Chat, Home, Profile } from './screens'

const Stack = createNativeStackNavigator()

/**
 * The handoff has no tab bar: Main screen is the entry point, Chat and Profile are
 * pushed on top and carry their own top bars.
 *
 * SafeAreaProvider lives in SignedInApp, above this navigator, because ChatMenu renders
 * as a sibling of it and also reads insets.
 */
export function Main() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      {/* ANIM-01 / ANIM-02: Main <-> Chat dissolve over 300 ms in both directions. */}
      <Stack.Screen
        name="Chat"
        component={Chat}
        options={{ animation: 'fade', animationDuration: 300 }}
      />
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  )
}
