/**
 * ELLI design tokens.
 *
 * Every value here was read out of the Figma export (`ui/ELLI App design (1).fig`,
 * decoded locally), not eyeballed from the PNGs: colours come from the file's colour
 * variables, sizes/paddings/radii from the frame properties of the `APP` canvas.
 * Design frame is 390x844 pt, so numbers are points and map 1:1 to RN units.
 */

export const colors = {
  /** page background (LightAmber-ish app surface) */
  background: '#FFFBF7',
  /** login page background + input surfaces */
  surface: '#FFFDFB',
  /** top/bottom bars: #FFFDFB @3% */
  barOverlay: 'rgba(255, 253, 251, 0.03)',
  /** assistant bubble + secondary buttons */
  bubbleAgent: '#FFEDD5',
  /** feedback button */
  accent: '#FED7AA',
  /** primary text */
  text: '#302620',
  /** text inside modals / on accent buttons */
  textStrong: '#24160D',
  /** placeholders, "thinking", input borders */
  muted: '#BEB1A8',
  /** log out row */
  mutedStrong: '#5B5450',
  /** login button label + tagline */
  brand: '#723710',
  /** destructive action label */
  danger: '#991B1B',
  /** hairline dividers: #1A1A1A @20% */
  divider: 'rgba(26, 26, 26, 0.20)',
  /** modal button border: #1A1A1A @28% */
  border: 'rgba(26, 26, 26, 0.28)',
  /** scrim over the main-screen photo: #1A1A1A @60% */
  scrim: 'rgba(26, 26, 26, 0.60)',
  /** text on top of the photo */
  onPhoto: '#FFFBF7',
  backdrop: 'rgba(0, 0, 0, 0.35)',
} as const

export const radii = {
  bubble: 18,
  control: 15,
  modal: 20,
  pill: 30,
  panel: 35,
  cta: 36,
  card: 16,
  avatar: 50,
} as const

export const spacing = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 15,
  xl: 20,
  xxl: 30,
} as const

export const layout = {
  /** Top form: 95 tall, content pushed down by 45 */
  topBarHeight: 95,
  topBarPaddingTop: 45,
  /** Round icon buttons in the top bar */
  topButton: 45,
  /** Bottom form: 86 tall with 30 of safe-area padding */
  bottomBarPaddingBottom: 30,
  /** Chat input pill */
  inputHeight: 56,
  sendButton: 40,
  /** Message bubbles are 320 wide on a 390 frame; the far side keeps a 60 inset */
  bubbleMaxWidth: 320,
  bubbleOppositeInset: 60,
  /** History drawer */
  drawerWidth: 260,
  drawerContentWidth: 230,
  drawerHeaderHeight: 89,
  drawerRowHeight: 30,
  drawerIcon: 20,
  /** Modals */
  modalWidth: 300,
  modalButtonHeight: 30,
  renameInputHeight: 26,
  /** Main screen bottom panel */
  mainPanelHeight: 120,
  /** Profile */
  profileAvatar: 80,
  profileRowHeight: 45,
} as const

export const fonts = {
  regular: 'Inter_400Regular',
  light: 'Inter_300Light',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
} as const

/** Text styles, named after where the design uses them. */
export const type = {
  /** CONTINUE on the main screen */
  hero: { fontFamily: fonts.medium, fontSize: 48, lineHeight: 58, letterSpacing: 6 },
  /** ELLI on the main panel */
  brandName: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 28, letterSpacing: 2 },
  /** Name Surname on profile */
  profileName: { fontFamily: fonts.medium, fontSize: 21, lineHeight: 24 },
  /** Login buttons */
  loginButton: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 38 },
  /** Know Thyself */
  tagline: { fontFamily: fonts.regular, fontSize: 20, lineHeight: 24, letterSpacing: 7.2 },
  /** Error / no-internet headline (18px, 18% tracking) */
  headline: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 38, letterSpacing: 3.24 },
  /** Row labels: Language, Opportunities, New Chat, modal buttons */
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  /** Modal titles and secondary buttons */
  bodySmall: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  /** Message text, topic names, rename field */
  message: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  /** Modal hint text */
  caption: { fontFamily: fonts.light, fontSize: 12, lineHeight: 16 },
  /** History row topic */
  captionRegular: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  /** Profile label under the avatar */
  micro: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  /** Feedback button subtitle */
  nano: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 10 },
} as const

export const images = {
  mainBackground: require('../../assets/design/main-screen-bg.jpg'),
  errorBackground: require('../../assets/design/error-bg.jpg'),
  avatarPlaceholder: require('../../assets/design/avatar-placeholder.png'),
  logo: require('../../assets/design/elli-logo.png'),
}
