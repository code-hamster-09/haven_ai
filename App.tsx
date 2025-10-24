import { initLlama, LlamaContext } from "@pocketpalai/llama.rn";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { borderRadius, colors, spacing, typography } from './src/styles/theme';
import { getLlamaModelPath, getOptimizedLlamaInitParams } from './src/utils/llamaUtils';

// Определение типа для сообщения в чате
interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export default function App() {
  const [log, setLog] = useState("🚀 Инициализация...\n");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [restartKey, setRestartKey] = useState(0); // Используется для сброса useEffect
  const [llamaContext, setLlamaContext] = useState<LlamaContext | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Состояние для сообщений чата
  const scrollViewRef = useRef<ScrollView>(null); // Референс для прокрутки ScrollView

  const append = (msg: string) => setLog((l) => l + msg + "\n");

  useEffect(() => {
    (async () => {
      try {
        append("🔍 debug: старт useEffect");

        append("Загружаю путь к модели Llama...");
        const modelPath = await getLlamaModelPath((progress) => {
          setDownloadProgress(progress);
        });

        if (!modelPath) {
          append("Ошибка: Не удалось получить путь к модели Llama.");
          return;
        }

        append("Инициализирую модель Llama...");
        const t0 = Date.now();
        const optimizedParams = await getOptimizedLlamaInitParams();
        const ctx = await initLlama(
          {
            model: modelPath,
            ...optimizedParams,
            use_progress_callback: true,
          },
          (_progress: number) => {
            // Здесь можно обновлять прогресс инициализации, если нужно
            // console.log('progress: ', _progress);
          },
        );
        const t1 = Date.now();
        append(`Модель Llama инициализирована за ${t1 - t0} мс.`);
        setLlamaContext(ctx);
        append("Модель Llama успешно инициализирована!");
        setMessages([{ id: Date.now().toString(), text: "Привет! Я Haven AI, ваш оффлайн помощник. Как я могу вам помочь?", isUser: false }]); // Первое сообщение от модели
      } catch (err: any) {
        append("Fatal error: " + (err.message || String(err)));
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Произошла фатальная ошибка при инициализации модели.", isUser: false }]);
      }
    })();
  }, [restartKey]);

  useEffect(() => {
    // Автоматическая прокрутка к последнему сообщению
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!llamaContext || !promptInput.trim()) return;

    const userMessageId = Date.now().toString();
    const newUserMessage: ChatMessage = { id: userMessageId, text: promptInput.trim(), isUser: true };
    setMessages(prev => [...prev, newUserMessage]);
    setPromptInput(""); // Очищаем поле ввода сразу после отправки

    try {
      const formattedPrompt = `<|im_start|>system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.<|im_end|>\n<|im_start|>user\n${newUserMessage.text}<|im_end|>\n<|im_start|>assistant\n`;

      const completionParams = {
        prompt: formattedPrompt,
        n_predict: 200,
        temperature: 0.7,
        stop: ["<|im_end|>", "<|im_start|>assistant", "\n"],
      };

      let currentModelResponse = "";
      let lastTextLength = 0;
      const modelMessageId = (Date.now() + 1).toString(); // ID для ответа модели
      setMessages(prev => [...prev, { id: modelMessageId, text: "", isUser: false }]); // Добавляем пустое сообщение модели

      await llamaContext.completion(completionParams, (partialText) => {
        const currentPartial = (typeof partialText === 'object' && partialText !== null) ? (partialText.content ?? partialText.output_text ?? partialText.text ?? JSON.stringify(partialText)) : partialText;
        const newPart = currentPartial.slice(lastTextLength);
        currentModelResponse += newPart;
        lastTextLength = currentPartial.length;

        // Обновляем последнее сообщение в состоянии messages
        setMessages(prev => prev.map(msg =>
          msg.id === modelMessageId ? { ...msg, text: currentModelResponse } : msg
        ));
      });
      append("FINAL (completion) получено."); // Отладочное сообщение
    } catch (e: any) {
      const errorMessage = "Ошибка генерации с Llama: " + (e.message || String(e));
      append(errorMessage);
      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId ? msg : (msg.id === (Date.now() + 1).toString() ? { ...msg, text: currentModelResponse + "\n\n" + errorMessage } : msg)
      ));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{"Haven AI"}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        {!llamaContext && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.medium, color: colors.textPrimary }]}>Инициализация модели...</Text>
            {downloadProgress > 0 && !isNaN(downloadProgress) && (
              <Text style={[typography.small, { marginTop: spacing.small, color: colors.textSecondary }]}>Прогресс загрузки: {downloadProgress.toFixed(0)}%</Text>
            )}
          </View>
        )}

        {llamaContext && (
          <View style={styles.chatMessagesContainer}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userMessageBubble : styles.modelMessageBubble,
                ]}
              >
                <Text style={[typography.chatMessage, message.isUser ? styles.userMessageText : styles.modelMessageText]}>
                  {message.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {llamaContext && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            onChangeText={setPromptInput}
            value={promptInput}
            placeholder="Отправить сообщение..."
            placeholderTextColor={colors.textPrimary}
            editable={!!llamaContext}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!llamaContext || !promptInput.trim()) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!llamaContext || !promptInput.trim()}
          >
            {/* <Text style={styles.sendButtonText}>➜</Text> */}
            <Image
        source={require('./src/assets/images/message.png')} // Путь к вашему PNG
        style={styles.sendButtonIcon}
      />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.medium,
    backgroundColor: colors.headerBackground,
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius.medium,
    borderBottomRightRadius: borderRadius.medium,
    paddingBottom: spacing.large,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.headerText,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  chatMessagesContainer: {
    flex: 1,
  },
  messageBubble: {
    padding: spacing.medium,
    borderRadius: borderRadius.large,
    marginBottom: spacing.small,
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  userMessageBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    backgroundColor: colors.userMessageBackground,
  },
  modelMessageBubble: {
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.modelMessageBackground,
  },
  userMessageText: {
    ...typography.chatMessage,
    color: colors.textPrimary,
  },
  modelMessageText: {
    ...typography.chatMessage,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.small,
    margin: spacing.medium,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.cardBackground, // Фон для поля ввода
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 150,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
  },
  sendButton: {
    borderRadius: borderRadius.large, // Сделать круглой
    width: 40, // Фиксированная ширина
    height: 40, // Фиксированная высота
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.small,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: colors.buttonText,
  },
});
