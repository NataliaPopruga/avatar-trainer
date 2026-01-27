import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

function PhotoUpload({ onAvatarCreated, isLoading, setIsLoading }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setError(null);

    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Пожалуйста, загрузите изображение');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.post('/api/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        onAvatarCreated(response.data.avatarId, response.data.avatarUrl);
      } else {
        setError('Ошибка при создании аватара');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.error || 'Ошибка при загрузке файла. Попробуйте еще раз.'
      );
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Загрузите ваше фото
        </h2>
        <p className="text-gray-600">
          Выберите качественное фото лица для создания AI-аватара
        </p>
      </div>

      {preview && !isLoading && (
        <div className="mb-6">
          <img
            src={preview}
            alt="Preview"
            className="mx-auto rounded-lg shadow-lg max-w-md w-full"
          />
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
            <p className="text-lg text-gray-700">Создание аватара...</p>
            <p className="text-sm text-gray-500 mt-2">
              Это может занять несколько секунд
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {preview ? (
                <ImageIcon className="w-16 h-16 text-primary-600" />
              ) : (
                <Upload className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <p className="text-lg text-gray-700 mb-2">
              {preview
                ? 'Фото загружено! Обработка...'
                : 'Перетащите фото сюда или нажмите для выбора'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Поддерживаются форматы: JPG, PNG, WEBP (до 10MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Выбрать файл
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Совет:</strong> Для лучшего результата используйте фото с хорошим
          освещением, где лицо четко видно и занимает большую часть кадра.
        </p>
      </div>
    </div>
  );
}

export default PhotoUpload;
