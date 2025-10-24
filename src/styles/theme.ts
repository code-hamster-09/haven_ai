export const colors = {
  primary: '#7A5AF5', // Фиолетовый мягкий (нейронный эффект)
  accent: '#C77DFF',  // Розово-фиолетовый подсветки (акцент)
  background: '#0D1B2A', // Темно-синий (глубокий, уверенный)
  cardBackground: '#1B263B', // Серый нейтральный (фон для карточек/сообщений)
  textPrimary: '#E2E8F0', // Белый / Slate 200 (для текста и контраста)
  textSecondary: '#1B263B', // 
  inputBorder: '#3B3C99', // Фиолетово-синий (для бордера поля ввода)
  buttonText: '#E2E8F0', // Белый / Slate 200 (для текста кнопок)
  headerBackground: '#0D1B2A', // Фон хедера
  headerText: '#E2E8F0', // Текст хедера
  userMessageBackground: '#344762', // Фон сообщений пользователя (справа)
  modelMessageBackground: '#E2E8F0', // Фон сообщений модели (слева)
};

export const spacing = {
  small: 8,
  medium: 16,
  large: 24,
};

export const borderRadius = {
  small: 8,
  medium: 16,
  large: 25,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  body: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  small: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
};
