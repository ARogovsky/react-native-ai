import React from 'react'
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, images, radii, shadows, spacing, type } from './design/tokens'
import { getStrings } from './lib/i18n'

/**
 * Renders any uncaught render/runtime JS error instead of a black void, styled after the
 * "EN ERROR" frame: photo background under a 60% scrim with the headline on top.
 * Native-module crashes still close the app (those need device logs).
 *
 * The raw message/stack stays visible below the headline — this is a pilot build and the
 * owner needs it to report failures.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('ELLI ErrorBoundary:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children as React.ReactElement

    return (
      <ImageBackground source={images.errorBackground} style={styles.screen} resizeMode="cover">
        <View style={styles.scrim} />
        <ScrollView contentContainerStyle={styles.content}>
          {/* A class component cannot use the language hook; read the current strings
              directly — the crash screen never needs to re-render on a switch. */}
          <Text style={styles.headline}>{getStrings().somethingWentWrong}</Text>
          {/* Spec: peach "Home" button, radius 30, padding 2/20. No navigator exists above
              this component, so "home" here means: drop the error and re-mount the app,
              which lands on the main screen. */}
          <Pressable
            testID="error-home"
            accessibilityRole="button"
            onPress={() => this.setState({ error: null })}
            style={styles.homeButton}
          >
            <Text style={styles.homeLabel}>{getStrings().goHome}</Text>
          </Pressable>
          <Text selectable style={styles.message}>
            {String(error?.message || error)}
          </Text>
          <Text selectable style={styles.stack}>
            {error?.stack}
          </Text>
        </ScrollView>
      </ImageBackground>
    )
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.text },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  // Spec: error root is a vertical auto-layout with a 10 gap.
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, rowGap: spacing.md },
  headline: { ...type.headline, color: colors.onPhoto, textAlign: 'center' },
  homeButton: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: 2,
    marginBottom: spacing.md,
    boxShadow: shadows.button,
  },
  homeLabel: { ...type.body, color: colors.textStrong, textAlign: 'center' },
  message: { ...type.body, color: colors.onPhoto, textAlign: 'center' },
  stack: { ...type.caption, color: colors.onPhoto, opacity: 0.7 },
})
