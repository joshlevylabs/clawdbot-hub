"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic,
  Play,
  Pause,
  Edit3,
  ExternalLink,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Save,
  X,
  Monitor,
  FlipHorizontal,
  FlipVertical,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Settings2,
  Volume2,
  SkipBack,
  SkipForward,
  Headphones,
} from "lucide-react";

// Web Speech API types
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent;
  error: SpeechRecognitionErrorEvent;
  end: Event;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Episode {
  number: number;
  title: string;
  pillar: string;
  filename: string;
  created: string;
  finalized?: string;
  status: string;
}

interface PodcastIndex {
  episodes: Episode[];
  lastEpisodeNumber: number;
  pillarCounts: Record<string, number>;
  lastUpdated: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

const PLATFORM_LINKS = [
  { name: "Spotify", url: "https://podcasters.spotify.com/", icon: "🎧" },
  { name: "Apple Podcasts", url: "https://podcastsconnect.apple.com/", icon: "🍎" },
  { name: "YouTube", url: "https://studio.youtube.com/", icon: "▶️" },
  { name: "Beehiiv Newsletter", url: "https://app.beehiiv.com/", icon: "📧" },
  { name: "Medium", url: "https://medium.com/", icon: "✍️" },
  { name: "Riverside.fm", url: "https://riverside.fm/", icon: "🎬" },
  { name: "Buffer", url: "https://buffer.com/", icon: "📱" },
];

// WPS speed utilities - logarithmic scale for fine control
// Slider value 0-100 maps to 0.5-6 WPS logarithmically
const MIN_WPS = 0.5;
const MAX_WPS = 6;
const sliderToWps = (slider: number): number => {
  // Logarithmic mapping: more precision at lower speeds
  const normalized = slider / 100; // 0-1
  return MIN_WPS * Math.pow(MAX_WPS / MIN_WPS, normalized);
};
const wpsToSlider = (wps: number): number => {
  // Inverse of above
  return 100 * Math.log(wps / MIN_WPS) / Math.log(MAX_WPS / MIN_WPS);
};

// Teleprompter Component with Voice Sync
function Teleprompter({ 
  script, 
  onClose 
}: { 
  script: string; 
  onClose: () => void;
}) {
  const [fontSize, setFontSize] = useState(32);
  const [speedSlider, setSpeedSlider] = useState(50); // 0-100 slider value
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const wordsRef = useRef<string[]>([]);
  
  // Calculate current WPS from slider
  const currentWps = sliderToWps(speedSlider);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Parse script into words for voice sync
  useEffect(() => {
    wordsRef.current = script.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  }, [script]);
  
  // Track scroll height for WPS calculation
  useEffect(() => {
    const updateScrollHeight = () => {
      if (contentRef.current && containerRef.current) {
        // Total scrollable distance (content height minus visible viewport)
        const totalHeight = contentRef.current.scrollHeight - containerRef.current.clientHeight;
        setScrollHeight(Math.max(1, totalHeight));
      }
    };
    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    return () => window.removeEventListener('resize', updateScrollHeight);
  }, [script, fontSize]);

  // Manual scroll mode - WPS-based scrolling
  useEffect(() => {
    if (isScrolling && !voiceSync && !isUserScrolling && containerRef.current && wordsRef.current.length > 0) {
      // Calculate pixels per second based on WPS
      // Total scroll distance / total words = pixels per word
      // pixels per word * WPS = pixels per second
      const pixelsPerWord = scrollHeight / wordsRef.current.length;
      const pixelsPerSecond = pixelsPerWord * currentWps;
      
      // Update at 60fps for smooth scrolling
      const intervalMs = 1000 / 60;
      const pixelsPerFrame = pixelsPerSecond / 60;
      
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          isProgrammaticScrollRef.current = true;
          containerRef.current.scrollTop += pixelsPerFrame;
          // Reset flag after scroll event fires
          requestAnimationFrame(() => {
            isProgrammaticScrollRef.current = false;
          });
        }
      }, intervalMs);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isScrolling, currentWps, voiceSync, isUserScrolling, scrollHeight]);

  // Handle user scroll - pause auto-scroll temporarily
  // Only triggers on actual user interaction, not programmatic scrolling
  const handleUserScroll = () => {
    // Ignore programmatic scrolls from auto-scroll
    if (isProgrammaticScrollRef.current) return;
    
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    // Resume auto-scroll after 2 seconds of no scrolling
    userScrollTimeoutRef.current = window.setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  };

  // Audio level visualization for voice sync
  useEffect(() => {
    if (!voiceSync || !isListening) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      return;
    }

    // Set up audio context for level visualization
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      // AudioContext may need to be resumed after user gesture
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 512; // Higher resolution
      analyser.smoothingTimeConstant = 0.3; // Faster response
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // Focus on voice frequencies (85-255 Hz range, indices ~2-15)
        const voiceRange = dataArray.slice(2, 30);
        const avg = voiceRange.reduce((a, b) => a + b, 0) / voiceRange.length;
        setAudioLevel(Math.min(1, avg / 128)); // More sensitive
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    }).catch(err => {
      console.error('Failed to get audio stream:', err);
      alert('Could not access microphone. Please allow microphone access and try again.');
      setVoiceSync(false);
      setIsListening(false);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [voiceSync, isListening]);

  // Voice sync using Web Speech API
  useEffect(() => {
    if (!voiceSync || !isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice sync not supported in this browser. Try Chrome.');
      setVoiceSync(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setRecognitionStatus('listening');
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().replace(/[^\w\s]/g, '');
      const spokenWords = transcript.split(/\s+/).filter(w => w.length > 0);
      
      // Show what was heard
      if (spokenWords.length > 0) {
        setLastHeardWord(spokenWords.slice(-2).join(' '));
      }
      
      // Find matches in script and advance position
      if (spokenWords.length > 0) {
        // Check last few spoken words for better matching
        const wordsToCheck = spokenWords.slice(-3);
        const searchStart = Math.max(0, currentWordIndex - 10);
        const searchEnd = Math.min(wordsRef.current.length, currentWordIndex + 50);
        
        for (const spokenWord of wordsToCheck) {
          if (spokenWord.length < 3) continue; // Skip short words
          
          for (let i = searchStart; i < searchEnd; i++) {
            const scriptWord = wordsRef.current[i];
            // Match if words are equal or one starts with the other (for partial recognition)
            if (scriptWord === spokenWord || 
                (scriptWord.length > 3 && scriptWord.startsWith(spokenWord)) ||
                (spokenWord.length > 3 && spokenWord.startsWith(scriptWord))) {
              if (i > currentWordIndex) {
                setCurrentWordIndex(i);
                // Scroll to keep current position at ~30% from top
                if (containerRef.current && contentRef.current) {
                  const contentHeight = contentRef.current.scrollHeight - containerRef.current.clientHeight;
                  const scrollPosition = (i / wordsRef.current.length) * contentHeight;
                  containerRef.current.scrollTo({
                    top: Math.max(0, scrollPosition - containerRef.current.clientHeight * 0.3),
                    behavior: 'smooth'
                  });
                }
                return; // Found a match, stop searching
              }
            }
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setRecognitionStatus('error');
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access for voice sync.');
        setVoiceSync(false);
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // This is normal, just restart
        setRecognitionStatus('listening');
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (voiceSync && isListening) {
        try { 
          recognition.start(); 
          setRecognitionStatus('listening');
        } catch {
          setRecognitionStatus('error');
        }
      }
    };

    recognitionRef.current = recognition;
    try { 
      recognition.start(); 
      setRecognitionStatus('listening');
    } catch {
      setRecognitionStatus('error');
      alert('Failed to start speech recognition. Try using Chrome browser.');
    }

    return () => {
      recognition.stop();
    };
  }, [voiceSync, isListening, currentWordIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsScrolling(s => !s); }
      if (e.key === 'ArrowUp') setFontSize(s => Math.min(80, s + 4));
      if (e.key === 'ArrowDown') setFontSize(s => Math.max(16, s - 4));
      if (e.key === 'h') setMirrorH(m => !m);
      if (e.key === 'v') setMirrorV(m => !m);
      if (e.key === 'c') setShowControls(c => !c);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const transformStyle = `${mirrorH ? 'scaleX(-1)' : ''} ${mirrorV ? 'scaleY(-1)' : ''}`.trim() || 'none';

  const toggleVoiceSync = () => {
    if (!voiceSync) {
      // Check browser support
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Voice sync requires Chrome, Edge, or Brave browser. Safari does not support speech recognition.');
        return;
      }
      
      if (isSafari) {
        alert('Safari has limited voice sync support. For best results, use Chrome or Brave.');
      }
      
      setVoiceSync(true);
      setIsListening(true);
      setIsScrolling(false);
      setCurrentWordIndex(0);
    } else {
      setVoiceSync(false);
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Controls bar - responsive */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-sm p-3 md:p-4 border-b border-slate-800">
          {/* Mobile layout */}
          {isMobile ? (
            <div className="space-y-3">
              {/* Top row: Exit + Voice Sync */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={onClose}
                  className="flex items-center gap-2 text-slate-400 active:text-white p-2 -ml-2"
                >
                  <ArrowLeft className="w-6 h-6" />
                  <span>Exit</span>
                </button>
                
                <button 
                  onClick={toggleVoiceSync}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    voiceSync 
                      ? 'bg-amber-600 text-white animate-pulse' 
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  {voiceSync ? 'Listening...' : 'Voice Sync'}
                </button>
              </div>
              
              {/* Middle row: Size + Play/Pause */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-500 text-sm">Size</span>
                  <input 
                    type="range" 
                    min="20" 
                    max="60" 
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 accent-primary-500 h-8"
                  />
                </div>
                
                {!voiceSync && (
                  <button 
                    onClick={() => setIsScrolling(s => !s)}
                    className={`px-6 py-3 rounded-lg font-medium text-lg ${
                      isScrolling 
                        ? 'bg-red-600 text-white' 
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isScrolling ? '⏸' : '▶'}
                  </button>
                )}
              </div>
              
              {/* Bottom row: Speed + Mirror */}
              <div className="flex items-center gap-3">
                {!voiceSync && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-emerald-400 text-sm font-mono w-16">{currentWps.toFixed(1)} wps</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={speedSlider}
                      onChange={(e) => setSpeedSlider(Number(e.target.value))}
                      className="flex-1 accent-primary-500 h-8"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setMirrorH(m => !m)}
                    className={`p-3 rounded-lg ${mirrorH ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    <FlipHorizontal className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setMirrorV(m => !m)}
                    className={`p-3 rounded-lg ${mirrorV ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    <FlipVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop layout */
            <div className="flex items-center justify-between">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Exit Teleprompter</span>
              </button>
              
              <div className="flex items-center gap-6">
                {/* Voice Sync */}
                <button 
                  onClick={toggleVoiceSync}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    voiceSync 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {voiceSync ? 'Listening...' : 'Voice Sync'}
                </button>
                
                {/* Font size */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">Size:</span>
                  <input 
                    type="range" 
                    min="20" 
                    max="80" 
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-24 accent-primary-500"
                  />
                  <span className="text-slate-400 text-sm w-8">{fontSize}</span>
                </div>
                
                {/* Scroll speed - only show when not in voice sync */}
                {!voiceSync && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-sm font-mono">{currentWps.toFixed(1)} wps</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={speedSlider}
                      onChange={(e) => setSpeedSlider(Number(e.target.value))}
                      className="w-28 accent-primary-500"
                    />
                  </div>
                )}
                
                {/* Play/Pause - only for manual mode */}
                {!voiceSync && (
                  <button 
                    onClick={() => setIsScrolling(s => !s)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isScrolling 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isScrolling ? 'Pause' : 'Play'}
                  </button>
                )}
                
                {/* Mirror controls */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setMirrorH(m => !m)}
                    className={`p-2 rounded-lg transition-colors ${mirrorH ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="Mirror Horizontal (H)"
                  >
                    <FlipHorizontal className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setMirrorV(m => !m)}
                    className={`p-2 rounded-lg transition-colors ${mirrorV ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="Mirror Vertical (V)"
                  >
                    <FlipVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="text-slate-500 text-xs">
                Space: Play/Pause • ↑↓: Size • H/V: Mirror • C: Toggle Controls • Esc: Exit
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Voice level indicator - bottom center, always visible */}
      {voiceSync && isListening && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-3 bg-black/90 rounded-2xl px-5 py-3 border border-emerald-500/30">
            <div className="flex items-end gap-1 h-8">
              {[0.15, 0.3, 0.5, 0.7, 0.85, 1.0, 0.85, 0.7, 0.5, 0.3, 0.15].map((threshold, i) => (
                <div 
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-50"
                  style={{
                    height: `${Math.max(6, audioLevel > threshold * 0.4 ? (8 + audioLevel * 24) : 6)}px`,
                    backgroundColor: audioLevel > 0.05 ? '#10b981' : '#475569',
                    opacity: audioLevel > threshold * 0.25 ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <div className="text-left min-w-[120px]">
              <div className={`text-sm font-medium ${recognitionStatus === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {recognitionStatus === 'error' ? '⚠️ Error' : recognitionStatus === 'listening' ? '🎤 Listening' : 'Starting...'}
              </div>
              {lastHeardWord && (
                <div className="text-xs text-amber-400 truncate max-w-[120px]">"{lastHeardWord}"</div>
              )}
              <div className="text-xs text-slate-500">Word {currentWordIndex + 1} / {wordsRef.current.length}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Script content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8"
        style={{ 
          transform: transformStyle,
          paddingTop: showControls ? (isMobile ? '180px' : '100px') : '40px',
        }}
        onScroll={handleUserScroll}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
      >
        <div ref={contentRef}>
          <div 
            className="max-w-4xl mx-auto text-white leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
          >
            {script}
          </div>
          {/* Extra padding at bottom for scroll */}
          <div className="h-[80vh]" />
        </div>
      </div>
      
      {/* Click to toggle controls */}
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="absolute top-4 right-4 p-2 bg-slate-800/50 rounded-lg text-slate-400 hover:text-white"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      )}
      
      {/* User scrolling indicator */}
      {isUserScrolling && isScrolling && !voiceSync && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-600/90 text-white text-sm px-4 py-2 rounded-full">
          Auto-scroll paused — will resume when you stop scrolling
        </div>
      )}
    </div>
  );
}

// Audio Player Component
function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <audio 
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-3 mb-3">
        <Headphones className="w-5 h-5 text-primary-400" />
        <span className="text-sm text-slate-300 font-medium">{title}</span>
        <span className="text-xs text-slate-500 ml-auto">{formatTime(duration)}</span>
      </div>
      
      {/* Progress bar */}
      <div className="mb-3">
        <input 
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(duration - currentTime)}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button 
          onClick={() => skip(-15)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Back 15s"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button 
          onClick={togglePlay}
          className="p-4 bg-primary-600 hover:bg-primary-700 rounded-full text-white transition-colors"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        
        <button 
          onClick={() => skip(30)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Forward 30s"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <button 
          onClick={changePlaybackRate}
          className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded transition-colors ml-4"
          title="Playback Speed"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

// Episode Card
function EpisodeCard({ 
  episode, 
  onView, 
  onTeleprompter,
  onPlayAudio,
  hasAudio,
  expanded,
  onToggle,
}: { 
  episode: Episode; 
  onView: () => void;
  onTeleprompter: () => void;
  onPlayAudio: () => void;
  hasAudio: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-primary-400">#{String(episode.number).padStart(3, '0')}</span>
          <div className="text-left">
            <h3 className="font-medium text-slate-100">{episode.title}</h3>
            <p className="text-sm text-slate-500">
              {episode.pillar} • {episode.created}
              {episode.status === 'finalized' && <span className="ml-2 text-emerald-400">✓ Finalized</span>}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-wrap gap-2">
          {hasAudio && (
            <button 
              onClick={onPlayAudio}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm text-white"
            >
              <Headphones className="w-4 h-4" />
              Listen
            </button>
          )}
          <button 
            onClick={onView}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
          >
            <Edit3 className="w-4 h-4" />
            View/Edit Script
          </button>
          <button 
            onClick={onTeleprompter}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white"
          >
            <Monitor className="w-4 h-4" />
            Teleprompter
          </button>
        </div>
      )}
    </div>
  );
}

// Script Editor Modal
function ScriptEditor({ 
  episode, 
  script, 
  onSave, 
  onClose,
  onTeleprompter,
}: { 
  episode: Episode; 
  script: string; 
  onSave: (content: string) => void;
  onClose: () => void;
  onTeleprompter: () => void;
}) {
  const [content, setContent] = useState(script);
  const [saving, setSaving] = useState(false);
  const hasChanges = content !== script;
  
  const handleSave = async () => {
    setSaving(true);
    await onSave(content);
    setSaving(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      <div className="border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h2 className="font-semibold text-slate-100">Episode {episode.number}: {episode.title}</h2>
            <p className="text-sm text-slate-500">{episode.filename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onTeleprompter}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
          >
            <Monitor className="w-4 h-4" />
            Teleprompter
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasChanges 
                ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 bg-slate-900 text-slate-200 p-6 font-mono text-sm resize-none focus:outline-none"
        placeholder="Script content..."
      />
    </div>
  );
}

// Episode audio mapping
const EPISODE_AUDIO: Record<number, string> = {
  1: '/audio/podcast/episode-001.mp3',
};

// Main Page
export default function PodcastPage() {
  const [index, setIndex] = useState<PodcastIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editingScript, setEditingScript] = useState<string>('');
  const [teleprompterScript, setTeleprompterScript] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ episode: Episode; src: string } | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  
  // Load index
  const loadIndex = useCallback(async () => {
    try {
      const res = await fetch('/api/podcast');
      if (res.ok) {
        const data = await res.json();
        setIndex(data.index);
        setTodos(data.todos || []);
      }
    } catch (error) {
      console.error('Failed to load podcast index:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadIndex();
  }, [loadIndex]);
  
  // Load script for editing
  const loadScript = async (episode: Episode) => {
    try {
      const res = await fetch(`/api/podcast?filename=${episode.filename}`);
      if (res.ok) {
        const data = await res.json();
        setEditingScript(data.content);
        setEditingEpisode(episode);
      }
    } catch (error) {
      console.error('Failed to load script:', error);
    }
  };
  
  // Save script
  const saveScript = async (content: string) => {
    if (!editingEpisode) return;
    try {
      await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'saveScript',
          filename: editingEpisode.filename,
          content,
        }),
      });
      setEditingScript(content);
    } catch (error) {
      console.error('Failed to save script:', error);
    }
  };
  
  // Open teleprompter
  const openTeleprompter = async (episode: Episode) => {
    try {
      const res = await fetch(`/api/podcast?filename=${episode.filename}`);
      if (res.ok) {
        const data = await res.json();
        // Extract just the spoken parts (lines starting with >)
        const lines = data.content.split('\n');
        const spokenParts = lines
          .filter((line: string) => line.startsWith('>') || line.startsWith('*['))
          .map((line: string) => line.replace(/^>\s*/, '').replace(/^\*\[/, '[').replace(/\]\*$/, ']'))
          .join('\n\n');
        setTeleprompterScript(spokenParts || data.content);
      }
    } catch (error) {
      console.error('Failed to load script for teleprompter:', error);
    }
  };
  
  // Todo functions
  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const newTodos = [...todos, todo];
    setTodos(newTodos);
    setNewTodo('');
    await fetch('/api/podcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveTodos', todos: newTodos }),
    });
  };
  
  const toggleTodo = async (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(newTodos);
    await fetch('/api/podcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveTodos', todos: newTodos }),
    });
  };
  
  const deleteTodo = async (id: string) => {
    const newTodos = todos.filter(t => t.id !== id);
    setTodos(newTodos);
    await fetch('/api/podcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveTodos', todos: newTodos }),
    });
  };

  // Teleprompter mode
  if (teleprompterScript !== null) {
    return (
      <Teleprompter 
        script={teleprompterScript} 
        onClose={() => setTeleprompterScript(null)} 
      />
    );
  }

  // Script editor mode
  if (editingEpisode) {
    return (
      <ScriptEditor 
        episode={editingEpisode}
        script={editingScript}
        onSave={saveScript}
        onClose={() => setEditingEpisode(null)}
        onTeleprompter={() => {
          const lines = editingScript.split('\n');
          const spokenParts = lines
            .filter(line => line.startsWith('>') || line.startsWith('*['))
            .map(line => line.replace(/^>\s*/, '').replace(/^\*\[/, '[').replace(/\]\*$/, ']'))
            .join('\n\n');
          setTeleprompterScript(spokenParts || editingScript);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Mic className="w-7 h-7 text-primary-500" />
            The Builder's Frequency
          </h1>
          <p className="text-slate-500 mt-1">Podcast dashboard • Scripts • Teleprompter</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Episodes */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            Episodes
          </h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : index?.episodes.length === 0 ? (
            <div className="bg-slate-850 rounded-xl border border-slate-800 p-8 text-center">
              <Mic className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No episodes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Audio Player */}
              {playingAudio && (
                <div className="relative">
                  <button 
                    onClick={() => setPlayingAudio(null)}
                    className="absolute -top-2 -right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-white z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <AudioPlayer 
                    src={playingAudio.src} 
                    title={`Episode ${playingAudio.episode.number}: ${playingAudio.episode.title}`} 
                  />
                </div>
              )}
              
              {index?.episodes.slice().reverse().map(episode => (
                <EpisodeCard 
                  key={episode.number}
                  episode={episode}
                  expanded={expandedEpisode === episode.number}
                  hasAudio={!!EPISODE_AUDIO[episode.number]}
                  onToggle={() => setExpandedEpisode(expandedEpisode === episode.number ? null : episode.number)}
                  onView={() => loadScript(episode)}
                  onTeleprompter={() => openTeleprompter(episode)}
                  onPlayAudio={() => {
                    const src = EPISODE_AUDIO[episode.number];
                    if (src) setPlayingAudio({ episode, src });
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Links */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              Platforms
            </h3>
            <div className="space-y-2">
              {PLATFORM_LINKS.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors group"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-slate-300 group-hover:text-white">{link.name}</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 ml-auto" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Todos */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-4">
            <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              To-Dos
            </h3>
            
            <div className="space-y-2 mb-3">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleTodo(todo.id)}>
                    {todo.completed 
                      ? <CheckSquare className="w-4 h-4 text-emerald-400" />
                      : <Square className="w-4 h-4 text-slate-500" />
                    }
                  </button>
                  <span className={`flex-1 text-sm ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {todo.text}
                  </span>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {todos.length === 0 && (
                <p className="text-slate-500 text-sm">No tasks yet</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add a task..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
              <button 
                onClick={addTodo}
                className="p-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
