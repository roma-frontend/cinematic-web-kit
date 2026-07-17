'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/lib/seo';

interface VoiceToSiteCardProps {
  locale: Locale;
  onTranscript?: (text: string) => void;
}

const translations = {
  ru: {
    title: 'Голос → Сайт',
    subtitle: 'Расскажите о вашем сайте голосом, и AI создаст его',
    startBtn: 'Начать запись',
    stopBtn: 'Остановить',
    listening: 'Слушаю...',
    processing: 'Обрабатываю...',
    transcript: 'Расшифровка',
    generateBtn: 'Создать сайт',
    notSupported: 'Ваш браузер не поддерживает распознавание речи',
    error: 'Ошибка распознавания речи',
    hint: 'Говорите чётко и естественно. Например: "Создай сайт для кофейни с тёплой атмосферой, меню и формой бронирования"',
  },
  en: {
    title: 'Voice → Site',
    subtitle: 'Tell AI about your site using voice',
    startBtn: 'Start recording',
    stopBtn: 'Stop',
    listening: 'Listening...',
    processing: 'Processing...',
    transcript: 'Transcript',
    generateBtn: 'Generate site',
    notSupported: 'Your browser does not support speech recognition',
    error: 'Speech recognition error',
    hint: 'Speak clearly and naturally. For example: "Create a site for a coffee shop with warm atmosphere, menu and booking form"',
  },
  hy: {
    title: 'Voice → Site',
    subtitle: 'Tell AI about your site using voice',
    startBtn: 'Start recording',
    stopBtn: 'Stop',
    listening: 'Listening...',
    processing: 'Processing...',
    transcript: 'Transcript',
    generateBtn: 'Generate site',
    notSupported: 'Your browser does not support speech recognition',
    error: 'Speech recognition error',
    hint: 'Speak clearly and naturally. For example: "Create a site for a coffee shop with warm atmosphere, menu and booking form"',
  },
};

export function VoiceToSiteCard({ locale, onTranscript }: VoiceToSiteCardProps) {
  const t = translations[locale];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale === 'ru' ? 'ru-RU' : locale === 'hy' ? 'hy-AM' : 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript((prev) => prev + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(t.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [locale, t.error]);

  const startListening = () => {
    if (!recognitionRef.current) return;

    setError(null);
    setTranscript('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleGenerate = () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    onTranscript?.(transcript);
    setTimeout(() => setIsProcessing(false), 1000);
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">{t.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t.notSupported}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      <div className="mb-4 flex gap-2">
        {!isListening ? (
          <Button onClick={startListening} className="flex-1" size="sm">
            <Mic className="mr-2 h-4 w-4" />
            {t.startBtn}
          </Button>
        ) : (
          <Button
            onClick={stopListening}
            variant="destructive"
            className="flex-1"
            size="sm"
          >
            <MicOff className="mr-2 h-4 w-4" />
            {t.stopBtn}
          </Button>
        )}
      </div>

      {isListening && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 p-2 text-xs text-primary">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {t.listening}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {transcript && (
        <div className="mb-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t.transcript}
          </label>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-2 text-xs">
            {transcript}
          </div>
        </div>
      )}

      {transcript && (
        <Button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full"
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.processing}
            </>
          ) : (
            t.generateBtn
          )}
        </Button>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{t.hint}</p>
    </Card>
  );
}
