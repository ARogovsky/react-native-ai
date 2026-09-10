// Jest setup for the ELLI mobile app.
// Keep minimal; per-test mocks live in the test files.

// AsyncStorage has no native module under Jest, and importing it throws. The language
// store (src/lib/i18n.ts) and the favourites list both persist through it, so the mock
// the package ships is registered once here instead of in every suite.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// react-native-keyboard-controller is a native module: under Jest it has no view manager and
// no keyboard events. The package ships its own mock, which maps KeyboardAwareScrollView to a
// plain ScrollView and KeyboardAvoidingView to a View, so screens still render and the
// keyboard state reads as "hidden".
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest')
)
