'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Mic, ArrowLeft, FlipHorizontal, FlipVertical, Loader2,
} from 'lucide-react';

// WPS speed utilities
const MIN_WPS = 0.5;
const MAX_WPS = 12;
const sliderToWps = (slider: number): number => {
  const normalized = slider / 100;
  return MIN_WPS * Math.pow(MAX_WPS / MIN_WPS, normalized);
};

// Web Speech API types — use `any` to avoid conflicts with podcast page declarations
/* eslint-disable @typescript-eslint/no-explicit-any */

function TeleprompterView({ script, onClose }: { script: string; onClose: () => void }) {
  const [fontSize, setFontSize] = useState(32);
  const [speedSlider, setSpeedSlider] = useState(50);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [voiceSync, setVoiceSync] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [recognitionStatus, setRecognitionStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const [lastHeardWord, setLastHeardWord] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const accumulatedScrollRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const wordsRef = useRef<string[]>([]);
  const controlsTimeoutRef = useRef<number | null>(null);

  const currentWps = sliderToWps(speedSlider);

  useEffect(() => {
    const checkDevice = () => { setIsMobile(window.innerWidth < 768); };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isScrolling || voiceSync) setShowControls(false);
    }, 4000);
  }, [isScrolling, voiceSync]);

  useEffect(() => {
    if (isScrolling || voiceSync) resetControlsTimer();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isScrolling, voiceSync, resetControlsTimer]);

  useEffect(() => {
    wordsRef.current = script.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  }, [script]);

  useEffect(() => {
    const updateScrollHeight = () => {
      if (contentRef.current && containerRef.current) {
        setScrollHeight(Math.max(1, contentRef.current.scrollHeight - containerRef.current.clientHeight));
      }
    };
    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    return () => window.removeEventListener('resize', updateScrollHeight);
  }, [script, fontSize]);

  // Auto-scroll
  useEffect(() => {
    if (isScrolling && !voiceSync && !isUserScrolling && containerRef.current && wordsRef.current.length > 0) {
      const pixelsPerWord = scrollHeight / wordsRef.current.length;
      const pixelsPerSecond = pixelsPerWord * currentWps;
      const intervalMs = 1000 / 60;
      const pixelsPerFrame = pixelsPerSecond / 60;
      accumulatedScrollRef.current = 0;
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          accumulatedScrollRef.current += pixelsPerFrame;
          if (accumulatedScrollRef.current >= 1) {
            const scrollAmount = Math.floor(accumulatedScrollRef.current);
            accumulatedScrollRef.current -= scrollAmount;
            isProgrammaticScrollRef.current = true;
            containerRef.current.scrollTop += scrollAmount;
            requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
          }
        }
      }, intervalMs);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    return () => { if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current); };
  }, [isScrolling, currentWps, voiceSync, isUserScrolling, scrollHeight]);

  const handleUserScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = window.setTimeout(() => setIsUserScrolling(false), 2000);
  };

  // Audio level visualization
  useEffect(() => {
    if (!voiceSync || !isListening) {
      if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setAudioLevel(0);
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.slice(2, 30).reduce((a, b) => a + b, 0) / 28;
        setAudioLevel(Math.min(1, avg / 128));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    }).catch(() => { setVoiceSync(false); setIsListening(false); });
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [voiceSync, isListening]);

  // Voice sync
  useEffect(() => {
    if (!voiceSync || !isListening) { if (recognitionRef.current) recognitionRef.current.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceSync(false); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      setRecognitionStatus('listening');
      const result = event.results[event.results.length - 1];
      const words = result[0].transcript.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w: string) => w.length > 0);
      if (words.length > 0) setLastHeardWord(words.slice(-2).join(' '));
      const toCheck = words.slice(-3);
      const start = Math.max(0, currentWordIndex - 10);
      const end = Math.min(wordsRef.current.length, currentWordIndex + 50);
      for (const w of toCheck) {
        if (w.length < 3) continue;
        for (let i = start; i < end; i++) {
          const sw = wordsRef.current[i];
          if (sw === w || (sw.length > 3 && sw.startsWith(w)) || (w.length > 3 && w.startsWith(sw))) {
            if (i > currentWordIndex) {
              setCurrentWordIndex(i);
              if (containerRef.current && contentRef.current) {
                const pos = (i / wordsRef.current.length) * (contentRef.current.scrollHeight - containerRef.current.clientHeight);
                containerRef.current.scrollTo({ top: Math.max(0, pos - containerRef.current.clientHeight * 0.3), behavior: 'smooth' });
              }
              return;
            }
          }
        }
      }
    };
    recognition.onerror = (event: any) => {
      setRecognitionStatus('error');
      if (event.error === 'not-allowed') { setVoiceSync(false); setIsListening(false); }
    };
    recognition.onend = () => { if (voiceSync && isListening) try { recognition.start(); } catch {} };
    recognitionRef.current = recognition;
    try { recognition.start(); setRecognitionStatus('listening'); } catch { setRecognitionStatus('error'); }
    return () => { recognition.stop(); };
  }, [voiceSync, isListening, currentWordIndex]);

  // Keyboard
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsScrolling(s => !s); }
      if (e.key === 'ArrowUp') setFontSize(s => Math.min(80, s + 4));
      if (e.key === 'ArrowDown') setFontSize(s => Math.max(16, s - 4));
      if (e.key === 'h') setMirrorH(m => !m);
      if (e.key === 'v') setMirrorV(m => !m);
      if (e.key === 'c') setShowControls(c => !c);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const transform = `${mirrorH ? 'scaleX(-1)' : ''} ${mirrorV ? 'scaleY(-1)' : ''}`.trim() || 'none';

  const toggleVoiceSync = () => {
    if (!voiceSync) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { alert('Voice sync requires Chrome, Edge, or Brave.'); return; }
      setVoiceSync(true); setIsListening(true); setIsScrolling(false); setCurrentWordIndex(0);
    } else { setVoiceSync(false); setIsListening(false); }
  };

  // Extract spoken parts (lines starting with >)
  const spokenLines = script.split('\n')
    .filter(l => l.startsWith('>') || l.startsWith('*('))
    .map(l => l.replace(/^>\s*/, '').replace(/^\*\(/, '(').replace(/\)\*$/, ')'))
    .join('\n\n');
  const displayScript = spokenLines || script;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-sm p-3 md:p-4 border-b border-slate-800"
          onClick={resetControlsTimer}>
          {isMobile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button onClick={onClose} className="flex items-center gap-2 text-slate-400 p-2 -ml-2">
                  <ArrowLeft className="w-6 h-6" /><span>Exit</span>
                </button>
                <button onClick={toggleVoiceSync}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${voiceSync ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
                  <Mic className="w-5 h-5" />{voiceSync ? 'Listening...' : 'Voice Sync'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-500 text-sm">Size</span>
                  <input type="range" min="20" max="60" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 accent-primary-500 h-8" />
                </div>
                {!voiceSync && (
                  <button onClick={() => setIsScrolling(s => !s)}
                    className={`px-6 py-3 rounded-lg font-medium text-lg ${isScrolling ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {isScrolling ? '⏸' : '▶'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!voiceSync && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-emerald-400 text-sm font-mono w-16">{currentWps.toFixed(1)} wps</span>
                    <input type="range" min="0" max="100" value={speedSlider} onChange={e => setSpeedSlider(Number(e.target.value))} className="flex-1 accent-primary-500 h-8" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setMirrorH(m => !m)} className={`p-3 rounded-lg ${mirrorH ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <FlipHorizontal className="w-5 h-5" />
                  </button>
                  <button onClick={() => setMirrorV(m => !m)} className={`p-3 rounded-lg ${mirrorV ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <FlipVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" /><span>Exit Teleprompter</span>
              </button>
              <div className="flex items-center gap-6">
                <button onClick={toggleVoiceSync}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${voiceSync ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                  <Mic className="w-4 h-4" />{voiceSync ? 'Listening...' : 'Voice Sync'}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">Size:</span>
                  <input type="range" min="20" max="80" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-24 accent-primary-500" />
                  <span className="text-slate-400 text-sm w-8">{fontSize}</span>
                </div>
                {!voiceSync && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-sm font-mono">{currentWps.toFixed(1)} wps</span>
                    <input type="range" min="0" max="100" value={speedSlider} onChange={e => setSpeedSlider(Number(e.target.value))} className="w-28 accent-primary-500" />
                  </div>
                )}
                {!voiceSync && (
                  <button onClick={() => setIsScrolling(s => !s)}
                    className={`px-4 py-2 rounded-lg font-medium ${isScrolling ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                    {isScrolling ? '⏸ Pause' : '▶ Start'}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setMirrorH(m => !m)} className={`p-2 rounded-lg ${mirrorH ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button onClick={() => setMirrorV(m => !m)} className={`p-2 rounded-lg ${mirrorV ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Voice sync status bar */}
          {voiceSync && (
            <div className="mt-2 flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-100" style={{ width: `${audioLevel * 100}%` }} />
              </div>
              <span className={`text-xs ${recognitionStatus === 'listening' ? 'text-emerald-400' : recognitionStatus === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
                {recognitionStatus === 'listening' ? '🎤 Listening' : recognitionStatus === 'error' ? '❌ Error' : '⏳ Starting...'}
              </span>
              {lastHeardWord && <span className="text-xs text-slate-600 italic">"{lastHeardWord}"</span>}
              <span className="text-xs text-slate-600 ml-auto">{currentWordIndex}/{wordsRef.current.length} words</span>
            </div>
          )}
        </div>
      )}

      {/* Tap to show controls */}
      {!showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 h-16"
          onClick={() => setShowControls(true)} />
      )}

      {/* Script content */}
      <div ref={containerRef} onScroll={handleUserScroll}
        className="flex-1 overflow-y-auto px-8 md:px-16 lg:px-32 pt-32 pb-[50vh]"
        style={{ transform }}>
        <div ref={contentRef} className="max-w-4xl mx-auto text-white leading-relaxed"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}>
          {displayScript.split('\n').map((line, i) => {
            if (line.trim() === '') return <div key={i} style={{ height: `${fontSize * 0.8}px` }} />;
            if (line.startsWith('(') && line.endsWith(')'))
              return <p key={i} className="text-amber-500/60 italic" style={{ fontSize: `${fontSize * 0.6}px` }}>{line}</p>;
            return <p key={i} className="mb-4">{line}</p>;
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
        <div className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: containerRef.current ? `${(containerRef.current.scrollTop / Math.max(1, scrollHeight)) * 100}%` : '0%' }} />
      </div>
    </div>
  );
}

function TeleprompterLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scriptId = searchParams.get('script');
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptId) { setError('No script ID provided'); return; }
    fetch(`/api/marketing/scripts/${scriptId}`, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.json(); })
      .then(data => setScript(data.script))
      .catch(() => setError('Script not found'));
  }, [scriptId]);

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-slate-400">
      <div className="text-center">
        <p className="text-xl mb-4">{error}</p>
        <button onClick={() => router.push('/marketing')} className="text-primary-400 hover:underline">← Back to Marketing</button>
      </div>
    </div>
  );

  if (!script) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
    </div>
  );

  return <TeleprompterView script={script} onClose={() => router.push('/marketing')} />;
}

export default function TeleprompterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    }>
      <TeleprompterLoader />
    </Suspense>
  );
}
