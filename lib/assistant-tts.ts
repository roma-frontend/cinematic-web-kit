'use client';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, lang: string, onEnd?: () => void): void {
  stopSpeaking();
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  const langMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', hy: 'hy-AM' };
  u.lang = langMap[lang] || 'en-US';
  u.rate = 1.0;
  u.pitch = 1.0;
  u.onend = () => { currentUtterance = null; onEnd?.(); };
  u.onerror = () => { currentUtterance = null; onEnd?.(); };
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return typeof window !== 'undefined' && window.speechSynthesis?.speaking === true;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
