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
  },
}

export const lang = detectLang()
export const t: Strings = STRINGS[lang]
