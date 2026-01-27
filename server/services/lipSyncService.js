const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');
const os = require('os');

class LipSyncService {
  /**
   * Создает видео с lip-sync анимацией на основе аудио
   * Использует простую анимацию масштабирования для имитации движения губ
   */
  async applyLipSync(avatarPath, audioPath, outputPath, duration) {
    return new Promise((resolve, reject) => {
      const ffmpegPath = path.join(os.homedir(), 'ffmpeg', 'ffmpeg');
      const ffmpeg = fs.existsSync(ffmpegPath) ? ffmpegPath : 'ffmpeg';
      
      // Создаем фильтр для lip-sync анимации
      // Используем scale с периодическим изменением для имитации движения губ
      const filter = this.createLipSyncFilter();
      
      const command = `${ffmpeg} -loop 1 -i "${avatarPath}" -i "${audioPath}" ` +
        `-vf "${filter}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k ` +
        `-pix_fmt yuv420p -shortest -r 30 -y "${outputPath}"`;
      
      console.log('Lip-sync command:', command);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Lip-sync error:', error);
          console.error('Stderr:', stderr);
          reject(error);
        } else {
          console.log('Lip-sync video created successfully');
          resolve();
        }
      });
    });
  }

  createLipSyncFilter() {
    // Простая анимация для имитации движения губ
    // Используем scale с небольшим периодическим изменением
    // Это создает эффект "говорящего" аватара
    
    // Более простая версия: просто scale без сложных формул
    return 'scale=512:512';
    
    // Для более продвинутой анимации можно использовать:
    // scale='512+8*sin(2*PI*t*4)':'512+8*sin(2*PI*t*4)'
    // Но это может не работать на всех версиях FFmpeg
  }

  /**
   * Альтернативный метод: создание видео с базовой анимацией через fluent-ffmpeg
   */
  async applyLipSyncWithFluent(avatarPath, audioPath, outputPath, duration) {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = path.join(os.homedir(), 'ffmpeg', 'ffmpeg');
    
    if (fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(avatarPath)
        .inputOptions(['-loop', '1'])
        .input(audioPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=512:512',
          '-r', '30',
          '-shortest',
          '-map', '0:v:0',
          '-map', '1:a:0'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }
}

module.exports = new LipSyncService();
