'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognition(): (typeof globalThis)['SpeechRecognition'] | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
}

export interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const {
    onResult,
    onError,
    lang = 'en-US',
    continuous = true,
    interimResults = true,
  } = options;

  const [isSupported] = useState(() => !!getSpeechRecognition());
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.('Voice input is not supported in this browser.');
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    stopListening();

    const recognition = new Recognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const alternative = result?.[0];
      if (alternative) {
        const transcript = alternative.transcript?.trim() ?? '';
        if (transcript) {
          onResultRef.current?.(transcript, result.isFinal);
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onerror = (event: Event) => {
      const err = event as unknown as { error?: string; message?: string };
      const message = err.error === 'not-allowed'
        ? 'Microphone access was denied.'
        : err.error === 'no-speech'
          ? 'No speech detected.'
          : err.message ?? 'Voice input failed.';
      onErrorRef.current?.(message);
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (e) {
      onErrorRef.current?.('Could not start voice input.');
      setIsListening(false);
    }
  }, [isSupported, continuous, interimResults, lang, stopListening]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
  };
}
