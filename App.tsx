import { initLlama, LlamaContext } from "@pocketpalai/llama.rn";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"; // Добавляем ActivityIndicator и StyleSheet
import { borderRadius, colors, spacing, typography } from './src/styles/theme'; // Импортируем стили
import { getLlamaModelPath, getOptimizedLlamaInitParams } from './src/utils/llamaUtils';

export default function App() {
  const [log, setLog] = useState("🚀 Инициализация...\n");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [restartKey, setRestartKey] = useState(0);
  const [llamaContext, setLlamaContext] = useState<LlamaContext | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [promptInput, setPromptInput] = useState(""); // Новое состояние для поля ввода промпта

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

      } catch (err:any) {
        append("Fatal error: " + (err.message || String(err)));
      }
    })();
  }, [restartKey]);

  return (
    <SafeAreaView style={styles.container}> {/* Применяем стиль контейнера */}
      <ScrollView contentContainerStyle={styles.scrollViewContent}> {/* Применяем стиль для контента скролла */}
        {/* Индикаторы загрузки/инициализации */}
        {!llamaContext && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.medium, color: colors.textSecondary }]}>Инициализация модели...</Text>
            {downloadProgress > 0 && !isNaN(downloadProgress) && (
              <Text style={[typography.small, { marginTop: spacing.small, color: colors.textSecondary }]}>Прогресс загрузки: {downloadProgress.toFixed(0)}%</Text>
            )}
          </View>
        )}

        {/* Лог для отладки (можно оставить пока, потом удалить) */}
        {/* <Text style={{ fontFamily: "monospace" }}>{log}</Text> */}
        {/* {downloadProgress > 0 && !isNaN(downloadProgress) && <Text style={{ fontFamily: "monospace", marginTop: 5 }}>Прогресс загрузки: {downloadProgress.toFixed(0)}%</Text>} */}

        {llamaContext && (
          <View style={styles.chatContainer}> {/* Контейнер для чата */}

            {/* Здесь будут сообщения чата */}
            <Text style={styles.messageText}>{streamingText}</Text> {/* Отображаем стриминговый текст */}

            <View style={styles.inputContainer}> {/* Контейнер для поля ввода и кнопки */}
              <TextInput
                style={styles.textInput} // Применяем стили к TextInput
                onChangeText={setPromptInput}
                value={promptInput}
                placeholder="Введите ваш промпт здесь..."
                placeholderTextColor={colors.textSecondary}
                editable={!!llamaContext}
              />
              <Button
                title="Отправить"
                onPress={async () => {
                  if (!llamaContext || !promptInput.trim()) return;
                  append("Генерирую текст с Llama..."); // Можно удалить после визуализации
                  setStreamingText("");
                  try {
                    const userPrompt = promptInput;
                    const formattedPrompt = `<|im_start|>system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;

                    const completionParams = {
                      prompt: formattedPrompt,
                      n_predict: 200,
                      temperature: 0.7,
                      stop: ["<|im_end|>", "<|im_start|>assistant", "\n"],
                    };
                    let acc = "";
                    let lastText = "";
                    const result = await llamaContext.completion(completionParams, (partialText) => {
                      const currentPartial = (typeof partialText === 'object' && partialText !== null) ? (partialText.content ?? partialText.output_text ?? partialText.text ?? JSON.stringify(partialText)) : partialText;
                      const newPart = currentPartial.slice(lastText.length);
                      acc += newPart;
                      setStreamingText(prev => prev + newPart);
                      lastText = currentPartial;
                    });
                    // Вместо отдельного FINAL (completion), убедимся, что streamingText уже полный
                    if (streamingText.trim() !== (result.completion || result.text || "").trim()) {
                      // Если по какой-то причине streamingText не содержит полный ответ, обновим его
                      setStreamingText(result.completion || result.text || JSON.stringify(result) || "");
                    }
                    append("FINAL (completion) получено."); // Отладочное сообщение
                    setPromptInput("");
                  } catch (e: any) {
                    append("Ошибка генерации с Llama: " + (e.message || String(e)));
                  }
                }}
                disabled={!llamaContext || !promptInput.trim()}
                color={colors.primary} // Применяем цвет кнопки
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messageText: {
    ...typography.body,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.medium,
    padding: spacing.medium,
    marginBottom: spacing.small,
    alignSelf: 'flex-start', // Для ответов модели
    maxWidth: '80%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.medium,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  textInput: {
    flex: 1,
    height: 50,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.medium,
    marginRight: spacing.small,
    ...typography.body,
    backgroundColor: colors.cardBackground,
  },
});
