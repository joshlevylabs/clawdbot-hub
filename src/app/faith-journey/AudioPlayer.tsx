'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Loader } from 'lucide-react'

interface AudioPlayerProps {
  lessonId: string
  lessonDate: string
  traditionName: string
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export default function AudioPlayer({ lessonId, lessonDate, traditionName }: AudioPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [charCount, setCharCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Reset when lesson changes
  useEffect(() => {
    setState('idle')
    setAudioUrl(null)
    setCurrentTime(0)
    setDuration(0)
    setCharCount(null)
    setError(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [lessonId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const generateAudio = async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/faith/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessonId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const data = await response.json()
      setAudioUrl(data.audioUrl)
      
      if (data.charCount) {
        setCharCount(data.charCount)
      }

      // Create audio element and start playing
      const audio = new Audio(data.audioUrl)
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })

      audio.addEventListener('ended', () => {
        setState('idle')
        setCurrentTime(0)
      })

      audio.addEventListener('error', () => {
        setState('error')
        setError('Audio playback failed')
      })

      await audio.play()
      setState('playing')

    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
    }
  }

  const handlePlayPause = async () => {
    if (state === 'idle' && !audioUrl) {
      await generateAudio()
    } else if (state === 'playing' && audioRef.current) {
      audioRef.current.pause()
      setState('paused')
    } else if (state === 'paused' && audioRef.current) {
      await audioRef.current.play()
      setState('playing')
    } else if (audioUrl) {
      // Replay existing audio
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })

      audio.addEventListener('ended', () => {
        setState('idle')
        setCurrentTime(0)
      })

      await audio.play()
      setState('playing')
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-[#13131B] border border-[#2A2A38] rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={state === 'loading'}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-[#D4A020] hover:bg-[#E5B032] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {state === 'loading' ? (
            <Loader className="w-5 h-5 text-black animate-spin" />
          ) : state === 'playing' ? (
            <Pause className="w-5 h-5 text-black" />
          ) : (
            <Play className="w-5 h-5 text-black ml-0.5" />
          )}
        </button>

        <div className="flex-grow">
          {state === 'idle' && !error && (
            <div className="flex items-center gap-2 text-slate-300">
              <Volume2 className="w-4 h-4" />
              <span>🎙️ Listen with Joshua&apos;s Voice</span>
            </div>
          )}

          {state === 'loading' && (
            <div className="flex items-center gap-2 text-slate-300">
              <span>Generating audio...</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-4 bg-[#D4A020] rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {(state === 'playing' || state === 'paused') && (
            <>
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500">
                  {traditionName} • {lessonDate}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
              
              <div className="relative">
                <div className="w-full h-2 bg-[#2A2A38] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D4A020] to-[#E5B032] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      {charCount && (
        <div className="mt-3 text-xs text-slate-500 border-t border-[#2A2A38] pt-3">
          {charCount.toLocaleString()} characters • ~{Math.round(charCount / 1000)} minutes
        </div>
      )}
    </div>
  )
}