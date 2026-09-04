import { View, Text, StyleSheet, ImageBackground, Pressable, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import { useChat } from '../ChatProvider'
import { useLang } from '../lib/i18n'
import { colors, images, layout, radii, spacing, type } from '../design/tokens'

/**
 * Main screen — `main.*` in the layout spec: photo background under a #1A1A1A 36%
 * overlay, the CONTINUE call to action, and a 120-tall bottom bar (radius 35 on the top
 * corners, 20 of padding, 20 gap) with the agent name, the last topic and the profile
 * entry point.
 */
export function Home() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { sessions, selectSession, newChat } = useChat()
  const { t } = useLang()
  const { user } = useUser()

  const lastSession = sessions[0]
  const topic = lastSession?.title || ''

  async function onContinue() {
    if (lastSession) {
      await selectSession(lastSession.id)
    } else {
      newChat()
    }
    navigation.navigate('Chat')
  }

  return (
    <ImageBackground source={images.mainBackground} style={styles.screen} resizeMode="cover">
      <View style={styles.scrim} />

      <Pressable
        testID="home-continue"
        accessibilityRole="button"
        onPress={onContinue}
        style={styles.continueArea}
      >
        {/* Spec (Transitions): CONTINUE / ПРОДОВЖИТИ must stay on ONE line — on a narrow
            screen the glyphs shrink instead of wrapping. */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.continueText}
        >
          {t.continueConversation}
        </Text>
      </Pressable>

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <View style={styles.panelText}>
          <Text style={styles.brandName}>ELLI</Text>
          <View style={styles.topicRow}>
            <Text style={styles.topicLabel}>{t.topicLabel}</Text>
            <Text numberOfLines={1} style={styles.topicValue}>
              {topic}
            </Text>
          </View>
        </View>

        <Pressable
          testID="home-profile"
          accessibilityRole="button"
          accessibilityLabel={t.profile}
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          {/* Clerk always serves an imageUrl (generated initials when nothing was
              uploaded); the bundled asset only covers the moment before the user loads. */}
          <Image
            testID="home-avatar"
            source={user?.imageUrl ? { uri: user.imageUrl } : images.avatarPlaceholder}
            style={styles.avatar}
          />
          {/* Same rule as CONTINUE: one line, shrink instead of wrapping. */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.profileLabel}
          >
            {t.profile}
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.text },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  continueArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  continueText: { ...type.hero, color: colors.onPhoto, textAlign: 'center' },
  panel: {
    minHeight: layout.mainPanelHeight,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.panel,
    borderTopRightRadius: radii.panel,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xl,
  },
  panelText: { flex: 1, rowGap: 9 },
  brandName: { ...type.brandName, color: colors.text },
  topicRow: { flexDirection: 'row', alignItems: 'flex-end', columnGap: spacing.xs },
  topicLabel: { ...type.message, color: colors.text },
  topicValue: { ...type.message, color: colors.text, flex: 1 },
  // Spec: profile button is a vertical auto-layout with a 2 gap under the 40 avatar.
  profileButton: { width: layout.sendButton, alignItems: 'center', rowGap: 2 },
  avatar: {
    width: layout.sendButton,
    height: layout.sendButton,
    borderRadius: radii.avatar,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  profileLabel: { ...type.micro, color: colors.text, textAlign: 'center' },
})
