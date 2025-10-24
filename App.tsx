import { initLlama, LlamaContext } from "@pocketpalai/llama.rn";
import React, { useEffect, useState } from "react";
import { Button, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
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
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        <Text style={{ fontFamily: "monospace" }}>{log}</Text>
        {downloadProgress > 0 && !isNaN(downloadProgress) && <Text style={{ fontFamily: "monospace", marginTop: 5 }}>Прогресс загрузки: {downloadProgress.toFixed(0)}%</Text>}
        {streamingText.length > 0 && <Text style={{ fontFamily: "monospace", marginTop: 5 }}>{streamingText}</Text>}
        {/* Кнопка "Перезапустить" убирается или перемещается, пока что удаляем */}
        <Button title="Перезапустить" onPress={() => {
          setLog("🔁 Рестарт...\n");
          setRestartKey(prevKey => prevKey + 1);
          setStreamingText("");
        }} />



        <View style={{ marginTop: 10 }}>
          <TextInput
            style={{
              height: 40,
              borderColor: 'darkgray',
              borderWidth: 1,
              paddingHorizontal: 8,
              marginBottom: 10,
              borderRadius: 5,
            }}
            onChangeText={setPromptInput}
            value={promptInput}
            placeholder="Введите ваш промпт здесь..."
            editable={!!llamaContext} // Недоступно, пока модель не проинициализируется
          />
          <Button
            title="Отправить промпт (Llama)"
            onPress={async () => {
              if (!llamaContext || !promptInput.trim()) return;
              append("Генерирую текст с Llama...");
              setStreamingText("");
              try {
                const userPrompt = promptInput; // Используем текст из поля ввода
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
                append("FINAL (completion): " + (result.completion || result.text || JSON.stringify(result) || "<пусто>"));
                setPromptInput(""); // Очищаем поле ввода после отправки
              } catch (e: any) {
                append("Ошибка генерации с Llama: " + (e.message || String(e)));
              }
            }}
            disabled={!llamaContext || !promptInput.trim()} // Недоступно, пока модель не проинициализируется или поле ввода пусто
          />
        </View>

        
      </ScrollView>
    </SafeAreaView>
  );
}
