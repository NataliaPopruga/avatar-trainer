import { useState } from 'react';
import axios from 'axios';
import { Play, ArrowLeft, Loader2, Download } from 'lucide-react';

function VideoGenerator({ avatarId, onBack, isLoading, setIsLoading }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('default');
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  const exampleTexts = [
    'Привет! Это мой AI-аватар, созданный с помощью современных технологий.',
    'Добро пожаловать на демонстрацию возможностей искусственного интеллекта.',
    'Сегодня я расскажу вам о том, как работает генерация видео с аватарами.',
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Пожалуйста, введите текст для видео');
      return;
    }

    setGenerating(true);
    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/generate-video', {
        avatarId,
        text: text.trim(),
        voice,
      });

      if (response.data.success) {
        setVideoId(response.data.videoId);
        setVideoUrl(`http://localhost:5001${response.data.videoUrl}`);
        setIsPlaceholder(response.data.isPlaceholder || false);
        if (response.data.isPlaceholder) {
          setError(null); // Clear any previous errors
        }
      } else {
        setError('Ошибка при генерации видео');
      }
    } catch (err) {
      console.error('Video generation error:', err);
      setError(
        err.response?.data?.error ||
          'Ошибка при генерации видео. Попробуйте еще раз.'
      );
    } finally {
      setGenerating(false);
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-${videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Создайте видео с вашим аватаром
        </h2>
        <p className="text-gray-600">
          Введите текст, который должен произнести ваш аватар
        </p>
      </div>

      <div className="space-y-6">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Текст для видео
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите текст, который должен произнести аватар..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows="5"
            disabled={generating}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {exampleTexts.map((example, index) => (
              <button
                key={index}
                onClick={() => setText(example)}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                disabled={generating}
              >
                {example.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Голос
          </label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={generating}
          >
            <option value="default">По умолчанию</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !text.trim()}
          className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Генерация видео...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Создать видео
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Video Preview */}
        {videoUrl && (
          <div className="mt-8">
            {isPlaceholder ? (
              <>
                <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                  <img
                    src={videoUrl}
                    alt="Avatar placeholder"
                    className="mx-auto rounded-lg max-w-md w-full mb-4"
                  />
                  <p className="text-sm text-gray-600">
                    Для генерации видео требуется FFmpeg. Установите FFmpeg для полной функциональности.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Скачать изображение
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg"
                    autoPlay
                  >
                    Ваш браузер не поддерживает видео.
                  </video>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Скачать видео
                </button>
              </>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="flex justify-start mt-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
            disabled={generating}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад
          </button>
        </div>
      </div>

      {!isPlaceholder && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>✓ Озвучка и lip-sync включены:</strong> Видео будет создано с автоматической озвучкой текста 
            и базовой синхронизацией. Аватар будет "говорить" ваш текст!
          </p>
        </div>
      )}
    </div>
  );
}

export default VideoGenerator;
