import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

export async function getLlamaModelPath(onProgress?: (progress: number) => void): Promise<string | null> {
  const modelName = "qwen2.5-0.5b-instruct-q5_k_m.gguf";
  const modelUrl = `https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/${modelName}`;

  const localPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;

  try {
    const fileExists = await RNFS.exists(localPath);
    if (!fileExists) {
      console.log(`Скачиваю модель ${modelName}...`);
      const { promise } = RNFS.downloadFile({
        fromUrl: modelUrl,
        toFile: localPath,
        progress: (res) => {
          const percentage = (res.bytesWritten / res.contentLength) * 100;
          if (onProgress) {
            onProgress(percentage);
          }
          // console.log(`Прогресс скачивания: ${percentage.toFixed(2)}%`); // Закомментирован для чистоты
        },
      });
      await promise;
      console.log("Модель успешно скачана!");
    } else {
      console.log("Модель уже существует локально.");
    }
    return localPath;
  } catch (error) {
    console.error("Ошибка при получении пути к модели Llama: ", error);
    return null;
  }
}

export async function getOptimizedLlamaInitParams() {
  let processorCount = 4;
  try {
    if (typeof DeviceInfo.getProcessorCount === "function") {
      processorCount = await DeviceInfo.getProcessorCount();
    } else {
      console.warn("⚠️ DeviceInfo.getProcessorCount не найден — используем значение по умолчанию (4)");
    }
  } catch (e) {
    console.warn("⚠️ Ошибка получения количества процессоров:", e);
  }

  const n_gpu_layers = 0;
  const n_threads = Math.max(1, processorCount - 1);
  const n_ctx = 2048;
  const use_mmap = true;

  console.log("Оптимизированные параметры Llama:", {
    n_ctx,
    n_gpu_layers,
    n_threads,
    use_mmap,
  });

  return {
    n_ctx,
    n_gpu_layers,
    n_threads,
    use_mmap,
  };
}
