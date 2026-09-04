/**
 * ELLI design tokens.
 *
 * Source of truth: the handoff in `ui/ELLI_Design_Handoff` —
 * `04_Specs/ELLI_layout_and_style_spec.xlsx` (sheets Layout Spec / Colors & Typography /
 * Effects) and `05_Description/ELLI_description_and_flows.xlsx`. Those values were pulled
 * out of Figma itself; the handoff README warns that the earlier round had been sampled
 * from the PNG exports and drifted, so nothing here is eyeballed from a screenshot.
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
  /** secondary copy: chat placeholder, rename field, delete-modal body */
  textSecondary: '#7B716C',
  /** log out row */
  mutedStrong: '#5B5450',
  /** bookmark icon in the history drawer, both states */
  bookmark: '#9C908A',
  /** login button label + tagline */
  brand: '#723710',
  /** destructive action label */
  danger: '#991B1B',
  /** hairline dividers: #1A1A1A @20% */
  divider: 'rgba(26, 26, 26, 0.20)',
  /** modal button border: #1A1A1A @28% */
  border: 'rgba(26, 26, 26, 0.28)',
  /** colour overlay over the main-screen and error photos: #1A1A1A @36% */
  scrim: 'rgba(26, 26, 26, 0.36)',
  /** text on top of the photo */
  onPhoto: '#FFFBF7',
  /** darkening behind the language / delete / rename cards: #000000 @25% */
  backdrop: 'rgba(0, 0, 0, 0.25)',
  /** the history drawer LIGHTENS what is behind it instead: #FFFDFB @40% */
  drawerBackdrop: 'rgba(255, 253, 251, 0.40)',
  /** glassmorphism fill of the chat round buttons and the input bar */
  glass: 'rgba(255, 255, 255, 0.80)',
  /** hairline that gives the glass surfaces their edge */
  glassBorder: 'rgba(255, 255, 255, 0.50)',
  glassBarBorder: 'rgba(255, 255, 255, 0.60)',
} as const

/**
 * Effects sheet of the spec. RN maps these to `boxShadow` (supported on the New
 * Architecture, RN 0.76+; ignored, not fatal, if a build falls back to Paper). Real
 * backdrop blur would need a native BlurView, so the glass surfaces use the documented
 * translucent fill plus edge and shadow, which is what carries the effect on a cream
 * background.
 */
export const shadows = {
  /** login buttons: inset 2px -1px 9px #F8DECD */
  loginButton: 'inset 2px -1px 9px #F8DECD',
  /** language / delete / rename cards: 0 4px 4px rgba(26,26,26,0.28) */
  modalCard: '0px 4px 4px rgba(26, 26, 26, 0.28)',
  /** feedback, error-home and modal buttons: 0 2px 4px rgba(0,0,0,0.25) */
  button: '0px 2px 4px rgba(0, 0, 0, 0.25)',
  /** chat header buttons: 2px 2px 10px rgba(0,0,0,0.05) */
  glassButton: '2px 2px 10px rgba(0, 0, 0, 0.05)',
  /** chat input bar: 0 10px 25px rgba(0,0,0,0.12) */
  glassBar: '0px 10px 25px rgba(0, 0, 0, 0.12)',
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
  /** Login: root gap 100, buttons group capped at 500 wide, buttons 50 tall */
  loginGap: 100,
  loginGroupMaxWidth: 500,
  loginButtonHeight: 50,
  /** Top form: 95 tall, content pushed down by 45 */
  topBarHeight: 95,
  topBarPaddingTop: 45,
  /** Round icon buttons in the top bar */
  topButton: 45,
  /** Row icons and chevrons on Profile / the language modal */
  rowIcon: 24,
  /** Bottom form: 86 tall with 30 of safe-area padding */
  bottomBarPaddingBottom: 30,
  /** Chat input pill and the footer it sits in (footer corners are 39) */
  inputHeight: 56,
  sendButton: 40,
  chatFooterRadius: 39,
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
  /** Profile: settings container has 60 of padding top/bottom and a 60 gap */
  profileAvatar: 80,
  profileRowHeight: 45,
  profileSectionGap: 60,
  feedbackButtonHeight: 40,
  /** No internet: wifi-off glyph is 120x120 */
  wifiIcon: 120,
} as const

export const fonts = {
  regular: 'Inter_400Regular',
  light: 'Inter_300Light',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
} as const

/** Text styles, named after where the design uses them. */
export const type = {
  /** CONTINUE on the main screen — H1 in the spec: Inter 500, 40/58, tracking 6 */
  hero: { fontFamily: fonts.medium, fontSize: 40, lineHeight: 58, letterSpacing: 6 },
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
