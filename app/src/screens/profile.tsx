import { useState } from 'react'
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useClerk, useUser } from '@clerk/expo'
import { useLang } from '../lib/i18n'
import { LanguageModal } from '../components/LanguageModal'
import { InfoModal } from '../components/InfoModal'
import { colors, images, layout, radii, spacing, type } from '../design/tokens'

/** Where "leave feedback" sends the user: the contact page the web client links to. */
const FEEDBACK_URL = 'https://e-lli.com/contact'

/** Profile screen — "EN Profile" frame. */
export function Profile() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { signOut } = useClerk()
  const { user } = useUser()
  const { t, lang } = useLang()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(false)

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
              <Ionicons name="globe-outline" size={24} color={colors.text} />
              <Text style={styles.rowLabel}>{t.language}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{lang.toUpperCase()}</Text>
              <Ionicons name="chevron-up" size={20} color={colors.text} />
            </View>
          </Pressable>

          <Pressable
            testID="profile-opportunities"
            accessibilityRole="button"
            onPress={() => setOpportunitiesOpen(true)}
            style={styles.row}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="sparkles-outline" size={24} color={colors.text} />
              <Text style={styles.rowLabel}>{t.opportunities}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          testID="profile-feedback"
          accessibilityRole="button"
          accessibilityHint={t.feedbackHint}
          // A failed openURL must not crash the screen; there is nothing else to do here.
          onPress={() => {
            void Linking.openURL(FEEDBACK_URL).catch(() => {})
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
          <Ionicons name="exit-outline" size={24} color={colors.mutedStrong} />
          <Text style={styles.logoutLabel}>{t.logOut}</Text>
        </Pressable>
      </View>

      <LanguageModal visible={languageOpen} onClose={() => setLanguageOpen(false)} />
      <InfoModal
        visible={opportunitiesOpen}
        title={t.opportunitiesTitle}
        body={t.opportunitiesBody}
        onClose={() => setOpportunitiesOpen(false)}
      />
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
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    rowGap: 60,
    alignItems: 'center',
  },
  identity: { rowGap: spacing.md, alignItems: 'center' },
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
  feedbackButton: {
    alignSelf: 'stretch',
    height: layout.sendButton,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackLabel: { ...type.body, color: colors.text, textAlign: 'center' },
  feedbackSubtitle: { ...type.nano, color: colors.text, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  logoutRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  logoutLabel: { ...type.body, color: colors.mutedStrong, letterSpacing: -0.18 },
})
