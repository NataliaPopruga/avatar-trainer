import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, Download } from 'lucide-react';

function AvatarPreview({ avatarId, avatarUrl, onNext, onBack }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `http://localhost:5001${avatarUrl}`;
    link.download = `avatar-${avatarId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mr-3" />
          <h2 className="text-3xl font-bold text-gray-900">
            Аватар создан успешно!
          </h2>
        </div>
        <p className="text-gray-600">
          Ваш AI-аватар готов к использованию
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-primary-200 shadow-xl">
            {!imageLoaded && (
              <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                <span className="text-gray-400">Загрузка...</span>
              </div>
            )}
            <img
              src={`http://localhost:5001${avatarUrl}`}
              alt="Avatar"
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
        >
          <Download className="w-5 h-5 mr-2" />
          Скачать аватар
        </button>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Назад
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center"
        >
          Создать видео
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default AvatarPreview;
