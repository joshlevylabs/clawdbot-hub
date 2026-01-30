"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic,
  Play,
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

// Teleprompter Component with Voice Sync
function Teleprompter({ 
  script, 
  onClose 
}: { 
  script: string; 
  onClose: () => void;
}) {
  const [fontSize, setFontSize] = useState(32);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [voiceSync, setVoiceSync] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wordsRef = useRef<string[]>([]);

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

  // Manual scroll mode
  useEffect(() => {
    if (isScrolling && !voiceSync && containerRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += 1;
        }
      }, 100 - scrollSpeed);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isScrolling, scrollSpeed, voiceSync]);

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
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().replace(/[^\w\s]/g, '');
      const spokenWords = transcript.split(/\s+/).filter(w => w.length > 0);
      
      // Find matches in script and advance position
      if (spokenWords.length > 0) {
        const lastSpoken = spokenWords[spokenWords.length - 1];
        const searchStart = Math.max(0, currentWordIndex - 5);
        const searchEnd = Math.min(wordsRef.current.length, currentWordIndex + 20);
        
        for (let i = searchStart; i < searchEnd; i++) {
          if (wordsRef.current[i] === lastSpoken || wordsRef.current[i].startsWith(lastSpoken)) {
            if (i > currentWordIndex) {
              setCurrentWordIndex(i);
              // Scroll to keep up
              if (containerRef.current) {
                const scrollPerWord = containerRef.current.scrollHeight / wordsRef.current.length;
                containerRef.current.scrollTop = i * scrollPerWord * 0.8;
              }
            }
            break;
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access for voice sync.');
        setVoiceSync(false);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (voiceSync && isListening) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}

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
                    <span className="text-slate-500 text-sm">Speed</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={scrollSpeed}
                      onChange={(e) => setScrollSpeed(Number(e.target.value))}
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
                    <span className="text-slate-500 text-sm">Speed:</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={scrollSpeed}
                      onChange={(e) => setScrollSpeed(Number(e.target.value))}
                      className="w-24 accent-primary-500"
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
      
      {/* Script content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 pt-24"
        style={{ transform: transformStyle }}
      >
        <div 
          className="max-w-4xl mx-auto text-white leading-relaxed whitespace-pre-wrap"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
        >
          {script}
        </div>
        {/* Extra padding at bottom for scroll */}
        <div className="h-[80vh]" />
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
    </div>
  );
}

// Episode Card
function EpisodeCard({ 
  episode, 
  onView, 
  onTeleprompter,
  expanded,
  onToggle,
}: { 
  episode: Episode; 
  onView: () => void;
  onTeleprompter: () => void;
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
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex gap-2">
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

// Main Page
export default function PodcastPage() {
  const [index, setIndex] = useState<PodcastIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editingScript, setEditingScript] = useState<string>('');
  const [teleprompterScript, setTeleprompterScript] = useState<string | null>(null);
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
              {index?.episodes.slice().reverse().map(episode => (
                <EpisodeCard 
                  key={episode.number}
                  episode={episode}
                  expanded={expandedEpisode === episode.number}
                  onToggle={() => setExpandedEpisode(expandedEpisode === episode.number ? null : episode.number)}
                  onView={() => loadScript(episode)}
                  onTeleprompter={() => openTeleprompter(episode)}
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
