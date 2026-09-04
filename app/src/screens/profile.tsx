import { useState } from 'react'
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useClerk, useUser } from '@clerk/expo'
import { useLang } from '../lib/i18n'
import { LanguageModal } from '../components/LanguageModal'
import { colors, images, layout, radii, shadows, spacing, type } from '../design/tokens'

/**
 * External destinations, from the Transitions sheet of the handoff: Opportunities opens
 * the site (EN gets /en), Leave Feedback opens that language's Google form. `ru` shares
 * the Ukrainian pair — the site root is Ukrainian and there is no separate ru form.
 */
const LINKS = {
  opportunities: {
    uk: 'https://e-lli.com',
    ru: 'https://e-lli.com',
    en: 'https://e-lli.com/en',
  },
  feedback: {
    uk: 'https://forms.gle/6hhQy7aDVT6Rm3wB9',
    ru: 'https://forms.gle/6hhQy7aDVT6Rm3wB9',
    en: 'https://forms.gle/ng6G7RsiumaFyddw8',
  },
} as const

/** Profile screen — `profile.*` in the layout spec. */
export function Profile() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { signOut } = useClerk()
  const { user } = useUser()
  const { t, lang } = useLang()
  const [languageOpen, setLanguageOpen] = useState(false)

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    ''

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, layout.topBarPaddingTop) }]}>
        <Pressable
          testID="profile-close"
          accessibilityRole="button"
          accessibilityLabel={t.back}
          onPress={() => navigation.goBack()}
          style={styles.roundButton}
        >
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Image
            source={user?.imageUrl ? { uri: user.imageUrl } : images.avatarPlaceholder}
            style={styles.avatar}
          />
          <Text style={styles.name}>{displayName}</Text>
        </View>

        <View style={styles.card}>
          <Pressable
            testID="profile-language"
            accessibilityRole="button"
            onPress={() => setLanguageOpen(true)}
            style={[styles.row, styles.rowDivider]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={layout.rowIcon} color={colors.text} />
              <Text style={styles.rowLabel}>{t.language}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{lang.toUpperCase()}</Text>
              <Ionicons name="chevron-up" size={layout.rowIcon} color={colors.text} />
            </View>
          </Pressable>

          <Pressable
            testID="profile-opportunities"
            accessibilityRole="link"
            accessibilityLabel={t.opportunities}
            // Transitions sheet: this row hands off to the site in the external browser.
            // A failed openURL must not crash the screen.
            onPress={() => {
              void Linking.openURL(LINKS.opportunities[lang]).catch(() => {})
            }}
            style={styles.row}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="sparkles-outline" size={layout.rowIcon} color={colors.text} />
              <Text style={styles.rowLabel}>{t.opportunities}</Text>
            </View>
            <Ionicons name="chevron-forward" size={layout.rowIcon} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          testID="profile-feedback"
          accessibilityRole="button"
          accessibilityHint={t.feedbackHint}
          // A failed openURL must not crash the screen; there is nothing else to do here.
          onPress={() => {
            void Linking.openURL(LINKS.feedback[lang]).catch(() => {})
          }}
          style={styles.feedbackButton}
        >
          <Text style={styles.feedbackLabel}>{t.leaveFeedback}</Text>
          <Text style={styles.feedbackSubtitle}>{t.feedbackSubtitle}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
        <Pressable
          testID="profile-logout"
          accessibilityRole="button"
          onPress={() => signOut()}
          style={styles.logoutRow}
        >
          <Ionicons name="exit-outline" size={layout.rowIcon} color={colors.mutedStrong} />
          <Text style={styles.logoutLabel}>{t.logOut}</Text>
        </Pressable>
      </View>

      <LanguageModal visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: layout.topBarHeight,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
    justifyContent: 'flex-end',
    backgroundColor: colors.barOverlay,
  },
  roundButton: {
    width: layout.topButton,
    height: layout.topButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // Spec: identity block 30 T / 15 B, settings container 60 T / 30 R / 60 B / 30 L, gap 60.
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: layout.profileSectionGap,
    rowGap: layout.profileSectionGap,
    alignItems: 'center',
  },
  identity: { rowGap: spacing.md, alignItems: 'center', paddingTop: spacing.lg },
  avatar: {
    width: layout.profileAvatar,
    height: layout.profileAvatar,
    borderRadius: radii.avatar,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  name: { ...type.profileName, color: colors.text, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: radii.card, overflow: 'hidden' },
  row: {
    height: layout.profileRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLeft: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', columnGap: 7 },
  rowLabel: { ...type.body, color: colors.text },
  rowValue: { ...type.body, color: colors.text },
  // Spec: 330x40 (which is what "stretch" gives inside 30 of side padding on a 390
  // frame), radius 30, peach fill, two lines pulled together by a -6 gap, button shadow.
  feedbackButton: {
    alignSelf: 'stretch',
    height: layout.feedbackButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: -6,
    paddingVertical: 1,
    boxShadow: shadows.button,
  },
  feedbackLabel: { ...type.body, color: colors.text, textAlign: 'center' },
  feedbackSubtitle: { ...type.nano, color: colors.text, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  // Spec: log out row is padded 30 T / 20 R / 30 B / 20 L with a 7 gap after the icon.
  logoutRow: { flexDirection: 'row', alignItems: 'center', columnGap: 7 },
  logoutLabel: { ...type.body, color: colors.mutedStrong, letterSpacing: -0.18 },
})
