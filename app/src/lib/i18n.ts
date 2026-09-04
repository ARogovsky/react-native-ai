import { useSyncExternalStore } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'

// UA-first pilot: default uk, with ru + en. Other locales fall back to en.
export type Lang = 'uk' | 'ru' | 'en'

const SUPPORTED: Lang[] = ['uk', 'ru', 'en']

export function detectLang(): Lang {
  try {
    for (const loc of getLocales()) {
      const code = (loc.languageCode || '').toLowerCase()
      if (SUPPORTED.includes(code as Lang)) return code as Lang
    }
  } catch {
    /* getLocales can throw before native module is ready */
  }
  return 'uk'
}

interface Strings {
  greeting: string
  inputPlaceholder: string
  send: string
  typing: string
  newChat: string
  signOut: string
  yourChats: string
  noChats: string
  rename: string
  delete: string
  cancel: string
  save: string
  deleteConfirm: string
  // Auth screen
  authTitle: string
  emailLabel: string
  emailPlaceholder: string
  sendCode: string
  codeLabel: string
  codePlaceholder: string
  verify: string
  authHint: string
  genericError: string
  // Social login
  continueWithGoogle: string
  continueWithApple: string
  orSeparator: string
  // Design handoff copy (EN/UA strings taken verbatim from the Figma frames)
  back: string
  thinking: string
  continueConversation: string
  topicLabel: string
  profile: string
  history: string
  language: string
  opportunities: string
  leaveFeedback: string
  feedbackSubtitle: string
  logOut: string
  knowThyself: string
  continueWithEmail: string
  deleteTitle: string
  deleteHint: string
  confirmDelete: string
  declineDelete: string
  renameTitle: string
  renamePlaceholder: string
  ok: string
  somethingWentWrong: string
  goHome: string
  noInternet: string
  // Legal acceptance (required by the Clerk instance for every sign-up strategy)
  legalAccept: string
  legalTerms: string
  legalPrivacy: string
  legalRequired: string
  // Password fallback
  continueWithPassword: string
  passwordLabel: string
  passwordPlaceholder: string
  signInAction: string
  // Profile actions
  feedbackHint: string
  // Shown by App.tsx before Clerk has loaded
  loading: string
  // Localised replacements for Clerk's English error messages
  codeIncorrect: string
  passwordIncorrect: string
  accountNotFound: string
  accountExists: string
  passwordWeak: string
  emailInvalid: string
}

const STRINGS: Record<Lang, Strings> = {
  uk: {
    greeting: 'Привіт, я Elli, твій персональний психолог. Чим можу допомогти?',
    inputPlaceholder: 'Введіть ваше повідомлення тут...',
    send: 'Надіслати',
    typing: 'Elli друкує...',
    newChat: 'Новий чат',
    signOut: 'Вийти',
    yourChats: 'Ваші чати',
    noChats: 'Немає збережених чатів',
    rename: 'Перейменувати',
    delete: 'Видалити',
    cancel: 'Скасувати',
    save: 'Зберегти',
    deleteConfirm: 'Видалити цей чат?',
    authTitle: 'Вхід до Elli',
    emailLabel: 'Електронна пошта',
    emailPlaceholder: 'you@example.com',
    sendCode: 'Надіслати код',
    codeLabel: 'Код підтвердження',
    codePlaceholder: 'Код з листа',
    verify: 'Підтвердити',
    authHint: 'Ми надішлемо код підтвердження на вашу пошту.',
    genericError: 'Сталася помилка. Спробуйте ще раз.',
    continueWithGoogle: 'Увійти через Google',
    continueWithApple: 'Увійти через Apple',
    orSeparator: 'або',
    back: 'Назад',
    thinking: 'Elli думає ...',
    continueConversation: 'ПРОДОВЖИТИ',
    topicLabel: 'Тема:',
    profile: 'Профіль',
    history: 'Історія',
    language: 'Мова',
    opportunities: 'Можливості',
    leaveFeedback: 'Залишити відгук',
    feedbackSubtitle: 'Щоб покращити нашу якість',
    logOut: 'Вийти',
    knowThyself: 'Пізнай Себе',
    continueWithEmail: 'Увійти через пошту',
    deleteTitle: 'Ви впевнені, що хочете видалити?',
    deleteHint: 'Якщо ви видалите чат, ELLI втратить контекст',
    confirmDelete: 'Так, видалити чат',
    declineDelete: 'Ні',
    renameTitle: 'Перейменувати розмову',
    renamePlaceholder: 'Назва розмови',
    ok: 'Ок',
    somethingWentWrong: 'Щось пішло не так',
    goHome: 'Головна',
    noInternet: 'Відсутнє підключення до інтернету',
    legalAccept: 'Я приймаю',
    legalTerms: 'Умови користування',
    legalPrivacy: 'Політику конфіденційності',
    legalRequired: 'Щоб продовжити, прийміть Умови та Політику конфіденційності.',
    continueWithPassword: 'Увійти з паролем',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Ваш пароль',
    signInAction: 'Увійти',
    feedbackHint: 'Відкриється сторінка зворотного зв’язку',
    loading: 'Завантаження…',
    codeIncorrect: 'Код невірний або вже не діє. Спробуйте ще раз.',
    passwordIncorrect: 'Невірний пароль.',
    accountNotFound: 'Такої пошти ще немає. Створимо новий акаунт?',
    accountExists: 'Акаунт із такою поштою вже існує. Увійдіть замість реєстрації.',
    passwordWeak: 'Пароль занадто простий або короткий. Виберіть надійніший.',
    emailInvalid: 'Перевірте адресу пошти.',
  },
  ru: {
    greeting: 'Привет, я Elli, твой персональный психолог. Чем могу помочь?',
    inputPlaceholder: 'Введите ваше сообщение здесь...',
    send: 'Отправить',
    typing: 'Elli печатает...',
    newChat: 'Новый чат',
    signOut: 'Выйти',
    yourChats: 'Ваши чаты',
    noChats: 'Нет сохранённых чатов',
    rename: 'Переименовать',
    delete: 'Удалить',
    cancel: 'Отмена',
    save: 'Сохранить',
    deleteConfirm: 'Удалить этот чат?',
    authTitle: 'Вход в Elli',
    emailLabel: 'Электронная почта',
    emailPlaceholder: 'you@example.com',
    sendCode: 'Отправить код',
    codeLabel: 'Код подтверждения',
    codePlaceholder: 'Код из письма',
    verify: 'Подтвердить',
    authHint: 'Мы отправим код подтверждения на вашу почту.',
    genericError: 'Произошла ошибка. Попробуйте ещё раз.',
    continueWithGoogle: 'Войти через Google',
    continueWithApple: 'Войти через Apple',
    orSeparator: 'или',
    back: 'Назад',
    thinking: 'Elli думает ...',
    continueConversation: 'ПРОДОЛЖИТЬ',
    topicLabel: 'Тема:',
    profile: 'Профиль',
    history: 'История',
    language: 'Язык',
    opportunities: 'Возможности',
    leaveFeedback: 'Оставить отзыв',
    feedbackSubtitle: 'Чтобы улучшить наше качество',
    logOut: 'Выйти',
    knowThyself: 'Познай Себя',
    continueWithEmail: 'Войти через почту',
    deleteTitle: 'Вы уверены, что хотите удалить?',
    deleteHint: 'Если вы удалите чат, ELLI потеряет контекст',
    confirmDelete: 'Да, удалить чат',
    declineDelete: 'Нет',
    renameTitle: 'Переименовать разговор',
    renamePlaceholder: 'Название разговора',
    ok: 'Ок',
    somethingWentWrong: 'Что-то пошло не так',
    goHome: 'Главная',
    noInternet: 'Нет подключения к интернету',
    legalAccept: 'Я принимаю',
    legalTerms: 'Условия использования',
    legalPrivacy: 'Политику конфиденциальности',
    legalRequired: 'Чтобы продолжить, примите Условия и Политику конфиденциальности.',
    continueWithPassword: 'Войти с паролем',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Ваш пароль',
    signInAction: 'Войти',
    feedbackHint: 'Откроется страница обратной связи',
    loading: 'Загрузка…',
    codeIncorrect: 'Код неверный или уже не действует. Попробуйте ещё раз.',
    passwordIncorrect: 'Неверный пароль.',
    accountNotFound: 'Такой почты ещё нет. Создадим новый аккаунт?',
    accountExists: 'Аккаунт с такой почтой уже существует. Войдите вместо регистрации.',
    passwordWeak: 'Пароль слишком простой или короткий. Выберите надёжнее.',
    emailInvalid: 'Проверьте адрес почты.',
  },
  en: {
    greeting: "Hi, I'm Elli, your personal psychologist. How can I help you?",
    inputPlaceholder: 'Type your message here...',
    send: 'Send',
    typing: 'Elli is typing...',
    newChat: 'New chat',
    signOut: 'Sign out',
    yourChats: 'Your chats',
    noChats: 'No saved chats',
    rename: 'Rename',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    deleteConfirm: 'Delete this chat?',
    authTitle: 'Sign in to Elli',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    sendCode: 'Send code',
    codeLabel: 'Verification code',
    codePlaceholder: 'Code from email',
    verify: 'Verify',
    authHint: "We'll email you a verification code.",
    genericError: 'Something went wrong. Please try again.',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    orSeparator: 'or',
    back: 'Back',
    thinking: 'Elli is thinking ...',
    continueConversation: 'CONTINUE',
    topicLabel: 'Topic:',
    profile: 'Profile',
    history: 'History',
    language: 'Language',
    opportunities: 'Opportunities',
    leaveFeedback: 'Leave Feedback',
    feedbackSubtitle: 'To improve our quality',
    logOut: 'Log out',
    knowThyself: 'Know Thyself',
    continueWithEmail: 'Continue with Email',
    deleteTitle: 'Are you sure you want to delete?',
    deleteHint: 'If you delete the chat, ELLI will lose the context',
    confirmDelete: 'Yes, delete chat',
    declineDelete: 'No',
    renameTitle: 'Rename Conversation',
    renamePlaceholder: 'Conversation name',
    ok: 'Ok',
    somethingWentWrong: 'Something went wrong',
    goHome: 'home',
    noInternet: 'No internet connection',
    legalAccept: 'I accept the',
    legalTerms: 'Terms of Service',
    legalPrivacy: 'Privacy Policy',
    legalRequired: 'Please accept the Terms and the Privacy Policy to continue.',
    continueWithPassword: 'Continue with Password',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    signInAction: 'Sign in',
    feedbackHint: 'Opens the feedback page',
    loading: 'Loading…',
    codeIncorrect: 'That code is wrong or has expired. Please try again.',
    passwordIncorrect: 'Wrong password.',
    accountNotFound: 'No account for this email yet. Shall we create one?',
    accountExists: 'An account with this email already exists. Sign in instead.',
    passwordWeak: 'That password is too short or too common. Pick a stronger one.',
    emailInvalid: 'Please check the email address.',
  },
}

export { STRINGS }

// ---------------------------------------------------------------------------
// Runtime language, switchable from the profile.
//
// The language used to be `export const lang = detectLang()`, resolved once at import:
// the profile modal could show the choice but changing it did nothing, because every
// screen had already captured `t`. Now the current language lives in this module and
// components subscribe to it, so a switch re-renders the whole tree.
//
// The choice is persisted; the device locale is only the initial guess.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'elli-lang'

let currentLang: Lang = detectLang()
const listeners = new Set<() => void>()

/**
 * Strings the API serves from the cabinet (src/lib/remoteCopy.ts). They win over the bundled
 * ones so a clinician can reword a screen without a store release; anything not overridden
 * keeps the compiled text, and the merged result is cached per language so `t` stays a stable
 * object between renders (useSyncExternalStore compares by reference).
 */
type RemoteStrings = { [K in keyof Strings]?: Partial<Record<Lang, Strings[K]>> }

let remoteStrings: RemoteStrings = {}
let mergedCache: Partial<Record<Lang, Strings>> = {}

function stringsFor(lang: Lang): Strings {
  const cached = mergedCache[lang]
  if (cached) return cached

  const merged: Strings = { ...STRINGS[lang] }
  for (const [key, byLang] of Object.entries(remoteStrings)) {
    const value = byLang?.[lang]
    if (typeof value === 'string' && value) {
      ;(merged as unknown as Record<string, string>)[key] = value
    }
  }

  mergedCache[lang] = merged
  return merged
}

/** Applies remote copy and re-renders every subscriber. */
export function setRemoteStrings(next: RemoteStrings): void {
  remoteStrings = next
  mergedCache = {}
  emit()
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function getLang(): Lang {
  return currentLang
}

/** Strings for the current language. For class components and non-React modules. */
export function getStrings(): Strings {
  return stringsFor(currentLang)
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && SUPPORTED.includes(value as Lang)
}

/** Switches the language and remembers it. A storage failure must not block the UI. */
export async function setLang(next: Lang): Promise<void> {
  if (!isLang(next) || next === currentLang) return
  currentLang = next
  emit()
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* the switch still applies for this session */
  }
}

/** Loads the stored choice. Called once on startup, before the tree is shown. */
export async function hydrateLang(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (isLang(stored) && stored !== currentLang) {
      currentLang = stored
      emit()
    }
  } catch {
    /* keep the locale-derived default */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Subscribes a component to the current language. */
export function useLang(): { lang: Lang; t: Strings; setLang: typeof setLang } {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  // stringsFor, not STRINGS: remote copy from the cabinet overrides the bundled text.
  return { lang, t: stringsFor(lang), setLang }
}
