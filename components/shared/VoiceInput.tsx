'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send } from 'lucide-react';

interface Props {
  onSubmit: (text: string) => Promise<void> | void;
  disabled?: boolean;
}

export function VoiceInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    await onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответьте клиенту..."
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button onClick={handleSubmit} disabled={disabled}>
          <Send className="h-4 w-4" />
        </Button>
        <Button variant={listening ? 'default' : 'outline'} size="icon" onClick={toggleListening} disabled={disabled || !recognitionRef.current}>
          {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-slate-500">Можно говорить или писать. Cmd/Ctrl+Enter — отправить.</p>
    </div>
  );
}
