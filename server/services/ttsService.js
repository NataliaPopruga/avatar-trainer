const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

class TTSService {
  constructor() {
    this.isMacOS = process.platform === 'darwin';
    this.text = ''; // Для доступа в getAudioDuration
  }

  async generateSpeech(text, outputPath, voice = 'default', language = 'ru') {
    try {
      this.text = text; // Сохраняем для использования в getAudioDuration
      // Используем Google TTS API (работает везде и надежнее)
      // Можно попробовать say на macOS, но Google TTS более стабилен
      return await this.generateWithGoogleTTS(text, outputPath, language);
    } catch (error) {
      console.error('TTS generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async generateWithSay(text, outputPath, voice) {
    return new Promise((resolve, reject) => {
      // Выбираем голос в зависимости от параметра
      let voiceOption = '';
      if (voice === 'male') {
        voiceOption = '-v Alex'; // Мужской голос на macOS
      } else if (voice === 'female') {
        voiceOption = '-v Samantha'; // Женский голос на macOS
      } else {
        voiceOption = '-v Milena'; // Русский женский голос
      }

      // Генерируем речь через 'say' и сохраняем в файл
      // Используем временный файл с расширением .aiff
      const tempAiffPath = outputPath.replace(/\.[^.]+$/, '.aiff');
      const command = `say ${voiceOption} -o "${tempAiffPath}" --data-format=LEF32@22050 "${text}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Say command error:', error);
          // Если say не работает, пробуем Google TTS
          this.generateWithGoogleTTS(text, outputPath, 'ru')
            .then(resolve)
            .catch(reject);
          return;
        }

        // Проверяем, что файл создан
        if (!fs.existsSync(tempAiffPath)) {
          console.error('Say output file not found:', tempAiffPath);
          this.generateWithGoogleTTS(text, outputPath, 'ru')
            .then(resolve)
            .catch(reject);
          return;
        }

        // Конвертируем .aiff в .wav через FFmpeg
        const wavPath = outputPath.endsWith('.aiff') 
          ? outputPath.replace('.aiff', '.wav')
          : outputPath.replace(/\.[^.]+$/, '.wav');
        
        // Используем временный файл для конвертации
        const tempWavPath = wavPath + '.temp';
        this.convertToWav(tempAiffPath, tempWavPath)
          .then(() => {
            // Перемещаем временный файл в финальный
            if (fs.existsSync(tempWavPath)) {
              if (fs.existsSync(wavPath)) {
                fs.unlinkSync(wavPath);
              }
              fs.renameSync(tempWavPath, wavPath);
            }
            // Удаляем временный .aiff файл
            if (fs.existsSync(tempAiffPath)) {
              fs.unlinkSync(tempAiffPath);
            }
            resolve(wavPath);
          })
          .catch((err) => {
            console.error('Conversion error:', err);
            // Если конвертация не удалась, используем оригинальный файл
            if (fs.existsSync(tempWavPath)) {
              fs.unlinkSync(tempWavPath);
            }
            resolve(outputPath);
          });
      });
    });
  }

  async convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const ffmpegPath = path.join(os.homedir(), 'ffmpeg', 'ffmpeg');
      const ffmpeg = fs.existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
      
      const command = `${ffmpeg} -i "${inputPath}" -ar 22050 -ac 1 "${outputPath}" -y`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async generateWithGoogleTTS(text, outputPath, language = 'ru') {
    try {
      // Используем бесплатный Google TTS API
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${language}&client=tw-ob`;
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Сохраняем аудио
      fs.writeFileSync(outputPath, response.data);
      
      // Конвертируем в WAV если нужно
      if (!outputPath.endsWith('.wav')) {
        const wavPath = outputPath.replace(/\.[^.]+$/, '.wav');
        const tempWavPath = wavPath + '.temp';
        await this.convertToWav(outputPath, tempWavPath);
        if (fs.existsSync(tempWavPath)) {
          if (fs.existsSync(wavPath)) {
            fs.unlinkSync(wavPath);
          }
          fs.renameSync(tempWavPath, wavPath);
        }
        if (fs.existsSync(outputPath) && outputPath !== wavPath) {
          fs.unlinkSync(outputPath);
        }
        return wavPath;
      }

      return outputPath;
    } catch (error) {
      console.error('Google TTS error:', error);
      throw error;
    }
  }

  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      // Используем ffmpeg для получения длительности (более надежно)
      const ffmpegPath = path.join(os.homedir(), 'ffmpeg', 'ffmpeg');
      const ffmpegCmd = fs.existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
      
      // Используем ffmpeg для получения длительности
      const command = `${ffmpegCmd} -i "${audioPath}" 2>&1 | grep Duration | cut -d ' ' -f 4 | sed s/,//`;
      
      exec(command, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          // Если не удалось получить длительность, используем оценку
          // Примерно 150 символов в секунду для русской речи
          const estimatedDuration = Math.max(3, (this.text || '').length / 10);
          console.log(`Using estimated duration: ${estimatedDuration} seconds`);
          resolve(estimatedDuration);
        } else {
          // Парсим время в формате HH:MM:SS.mmm
          const timeStr = stdout.trim();
          const parts = timeStr.split(':');
          if (parts.length === 3) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            const duration = hours * 3600 + minutes * 60 + seconds;
            resolve(duration > 0 ? duration : 5);
          } else {
            resolve(5); // По умолчанию 5 секунд
          }
        }
      });
    });
  }
}

module.exports = new TTSService();
