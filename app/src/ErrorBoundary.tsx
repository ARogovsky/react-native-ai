import React from 'react'
import { ScrollView, Text } from 'react-native'

// Renders any uncaught render/runtime JS error on screen instead of a black void.
// Native-module crashes still close the app (those need device logs), but JS errors
// (thrown config checks, provider init, render errors) become visible here.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Also goes to logcat/console for adb if available.
    console.error('ELLI ErrorBoundary:', error, info)
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#ffffff' }}
          contentContainerStyle={{ padding: 24, paddingTop: 80 }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#c0392b', marginBottom: 12 }}>
            App failed to start
          </Text>
          <Text selectable style={{ fontSize: 15, color: '#000', marginBottom: 12 }}>
            {String(error?.message || error)}
          </Text>
          <Text selectable style={{ fontSize: 12, color: '#666' }}>
            {error?.stack}
          </Text>
        </ScrollView>
      )
    }
    return this.props.children as React.ReactElement
  }
}
