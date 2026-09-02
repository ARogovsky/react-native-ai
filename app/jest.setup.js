// Jest setup for the ELLI mobile app.
// Keep minimal; per-test mocks live in the test files.

// AsyncStorage has no native module under Jest, and importing it throws. The language
// store (src/lib/i18n.ts) and the favourites list both persist through it, so the mock
// the package ships is registered once here instead of in every suite.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
