import React from 'react'
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, images, spacing, type } from './design/tokens'
import { t } from './lib/i18n'

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
          <Text style={styles.headline}>{t.somethingWentWrong}</Text>
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
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, rowGap: spacing.lg },
  headline: { ...type.headline, color: colors.onPhoto, textAlign: 'center' },
  message: { ...type.body, color: colors.onPhoto, textAlign: 'center' },
  stack: { ...type.caption, color: colors.onPhoto, opacity: 0.7 },
})
