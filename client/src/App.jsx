import { useState } from 'react';
import PhotoUpload from './components/PhotoUpload';
import AvatarPreview from './components/AvatarPreview';
import VideoGenerator from './components/VideoGenerator';
import { Upload, Sparkles, Video } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  const [avatarId, setAvatarId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAvatarCreated = (id, url) => {
    setAvatarId(id);
    setAvatarUrl(url);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Avatar Creator
          </h1>
          <p className="text-xl text-gray-600">
            Создай свой AI-аватар и генерируй видео за секунды
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center">
            <StepIndicator
              number={1}
              label="Загрузка фото"
              active={step >= 1}
              completed={step > 1}
              icon={Upload}
            />
            <div className={`h-1 w-16 mx-2 rounded transition-colors ${
              step > 1 ? 'bg-primary-600' : 'bg-gray-200'
            }`}></div>
            <StepIndicator
              number={2}
              label="Создание аватара"
              active={step >= 2}
              completed={step > 2}
              icon={Sparkles}
            />
            <div className={`h-1 w-16 mx-2 rounded transition-colors ${
              step > 2 ? 'bg-primary-600' : 'bg-gray-200'
            }`}></div>
            <StepIndicator
              number={3}
              label="Генерация видео"
              active={step >= 3}
              completed={false}
              icon={Video}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {step === 1 && (
              <PhotoUpload
                onAvatarCreated={handleAvatarCreated}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {step === 2 && avatarUrl && (
              <AvatarPreview
                avatarId={avatarId}
                avatarUrl={avatarUrl}
                onNext={() => setStep(3)}
                onBack={handleBack}
              />
            )}

            {step === 3 && avatarId && (
              <VideoGenerator
                avatarId={avatarId}
                onBack={handleBack}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Создано с использованием AI технологий</p>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ number, label, active, completed, icon: Icon }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? (
          <span className="text-xl">✓</span>
        ) : (
          <Icon className="w-6 h-6" />
        )}
      </div>
      <span
        className={`mt-2 text-sm font-medium ${
          active ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default App;
