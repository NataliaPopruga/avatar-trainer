'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { analyzeAnswer, getAnswerQualityColor, getAnswerQualityLabel } from '@/lib/utils/answerValidation';

interface Props {
  onSubmit: (text: string) => Promise<void> | void;
  disabled?: boolean;
}

export function VoiceInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const recognitionRef = useRef<any>(null);

  const analysis = useMemo(() => {
    if (!text.trim() || text.trim().length < 10) return null;
    return analyzeAnswer(text);
  }, [text]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setText(transcript);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setText('');
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || disabled) return;
    
    // Предупреждение при наличии критических ошибок
    if (analysis && analysis.warnings.length > 0) {
      const proceed = confirm(
        `Внимание! В ответе обнаружены проблемы:\n\n${analysis.warnings.join('\n')}\n\nВсе равно отправить?`
      );
      if (!proceed) return;
    }
    
    await onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ответьте клиенту: признайте проблему, предложите конкретные шаги и укажите сроки..."
            disabled={disabled}
            className={analysis && analysis.warnings.length > 0 ? 'border-rose-300 focus:border-rose-500' : 
                     analysis && analysis.score >= 80 ? 'border-emerald-300 focus:border-emerald-500' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {analysis && text.trim().length >= 10 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className={`text-xs font-medium ${getAnswerQualityColor(analysis.score)}`}>
                {analysis.score}
              </span>
            </div>
          )}
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={disabled || !text.trim()}
          className={analysis && analysis.warnings.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          <Send className="h-4 w-4" />
        </Button>
        <Button variant={listening ? 'default' : 'outline'} size="icon" onClick={toggleListening} disabled={disabled || !recognitionRef.current}>
          {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
      </div>
      
      {analysis && text.trim().length >= 10 && showHints && (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${getAnswerQualityColor(analysis.score)}`}>
                {getAnswerQualityLabel(analysis.score)}
              </span>
              <span className="text-slate-400">({text.trim().length} символов)</span>
            </div>
            <button
              onClick={() => setShowHints(!showHints)}
              className="text-slate-400 hover:text-slate-600"
            >
              {showHints ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          
          {analysis.warnings.length > 0 && (
            <div className="space-y-1">
              {analysis.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-rose-700">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
          
          {analysis.missingElements.length > 0 && (
            <div className="space-y-1">
              <div className="font-medium text-slate-700 mb-1">Отсутствует:</div>
              {analysis.missingElements.map((element, idx) => (
                <div key={idx} className="flex items-start gap-2 text-amber-700">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{element}</span>
                </div>
              ))}
            </div>
          )}
          
          {analysis.suggestions.length > 0 && (
            <div className="space-y-1">
              {analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-600">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
          
          {analysis.score >= 80 && analysis.warnings.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ответ выглядит полноценным и готов к отправке</span>
            </div>
          )}
        </div>
      )}
      
      <p className="text-xs text-slate-500">Можно говорить или писать. Cmd/Ctrl+Enter — отправить.</p>
    </div>
  );
}
