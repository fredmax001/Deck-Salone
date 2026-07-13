import { useEffect, useCallback, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  ListMusic,
  X,
  Maximize2,
  Repeat,
  Shuffle,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';

function isEmbedSource(source?: string, audioUrl?: string): boolean {
  const sourceLower = (source || '').toLowerCase();
  if (sourceLower === 'hearthis') return false;

  const knownEmbed = ['audiomack', 'youtube', 'soundcloud', 'mixcloud'];
  if (knownEmbed.includes(sourceLower)) return true;
  if (!audioUrl) return false;
  const url = audioUrl.toLowerCase();
  return (
    url.includes('audiomack.com') ||
    url.includes('soundcloud.com') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('mixcloud.com')
  );
}

/* ------------------------------------------------------------------ */
/*  Modern Progress Bar with Waveform Preview (Desktop)               */
/* ------------------------------------------------------------------ */
const ModernProgressBar = memo(function ModernProgressBar({
  progress,
  onSeek,
  currentTime,
  duration,
}: {
  progress: number;
  onSeek: (pct: number) => void;
  currentTime: number;
  duration: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);

  const waveRef = useRef<number[]>([]);
  if (waveRef.current.length === 0) {
    waveRef.current = Array.from({ length: 80 }, (_, i) => {
      const base = Math.sin(i * 0.4) * 0.5 + 0.5;
      return base * 0.6 + Math.random() * 0.4;
    });
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPct(pct);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex items-center gap-3">
      <span className="text-[10px] font-mono text-text-muted/60 w-10 text-right tabular-nums">
        {formatTime(currentTime)}
      </span>
      <div
        ref={barRef}
        className="flex-1 relative h-8 cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        {/* Waveform background */}
        <div className="absolute inset-0 flex items-center gap-[1px] pointer-events-none">
          {waveRef.current.map((height, i) => {
            const barProgress = i / waveRef.current.length;
            const isPlayed = barProgress < progress;
            const isHover = hovered && barProgress < hoverPct;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${height * 24}px`,
                  backgroundColor: isPlayed
                    ? '#D4A24A'
                    : isHover
                    ? 'rgba(212,162,74,0.4)'
                    : 'rgba(255,255,255,0.08)',
                  opacity: isPlayed ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
        {/* Progress line overlay */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="h-[2px] bg-gold/30 rounded-full relative w-full">
            <div
              className="h-full bg-gold rounded-full transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gold rounded-full shadow-[0_0_8px_rgba(212,162,74,0.6)] transition-all duration-100 group-hover:scale-125"
              style={{ left: `${progress * 100}%`, transform: `translate(-50%, -50%)` }}
            />
          </div>
        </div>
        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute -top-6 bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-white/80 pointer-events-none transform -translate-x-1/2"
            style={{ left: `${hoverPct * 100}%` }}
          >
            {formatTime(hoverPct * duration)}
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono text-text-muted/60 w-10 tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Expanded Waveform                                                  */
/* ------------------------------------------------------------------ */
const ExpandedWaveform = memo(function ExpandedWaveform({
  isPlaying,
  progress,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number;
  onSeek: (pct: number) => void;
}) {
  const barCount = 60;
  // Stable base heights per instance
  const baseRef = useRef<number[]>([]);
  if (baseRef.current.length === 0) {
    baseRef.current = Array.from({ length: barCount }, () =>
      Math.floor(Math.random() * 40 + 10)
    );
  }
  // Animated heights – start equal to base
  const [heights, setHeights] = useState<number[]>(() => [...baseRef.current]);

  useEffect(() => {
    if (!isPlaying) {
      setHeights([...baseRef.current]);
      return;
    }
    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map((_h, i) => {
          const variation = (Math.random() - 0.5) * 10;
          return Math.max(6, Math.min(50, baseRef.current[i] + variation));
        })
      );
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleInteraction = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleInteraction(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    handleInteraction(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
  };

  return (
    <div
      className="flex items-end h-[50px] w-full cursor-pointer select-none gap-[2px] px-2"
      onClick={handleClick}
      onTouchStart={handleTouch}
    >
      {heights.map((h, i) => {
        const barProgress = i / barCount;
        const isPlayed = barProgress < progress;
        return (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${h}px`,
              backgroundColor: isPlayed ? '#D4A24A' : 'rgba(255,255,255,0.10)',
              opacity: isPlayed ? 1 : 0.45,
              transition: isPlaying ? 'height 80ms ease, background-color 75ms' : 'none',
            }}
          />
        );
      })}
    </div>
  );
});

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MixPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    currentTime,
    queue,
    play,
    pause,
    togglePlay,
    next,
    prev,
    setVolume,
    setMuted,
    setProgress,
    setCurrentTime,
    setDuration,
    setQueue,
    close,
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTrackedRef = useRef(false);
  const isRepeatingRef = useRef(isRepeating);

  useEffect(() => {
    isRepeatingRef.current = isRepeating;
  }, [isRepeating]);

  const embed = currentTrack ? isEmbedSource(currentTrack.audioSource, currentTrack.audioUrl) : false;

  // Listen for the custom window event so we hook into existing play triggers
  useEffect(() => {
    const handlePlayMix = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Support both legacy { id, title, ... } and new { track, queue } payloads
      if (detail && typeof detail === 'object' && 'track' in detail) {
        const { track, queue: newQueue } = detail as { track: MixTrack; queue?: MixTrack[] };
        if (newQueue && newQueue.length > 1) {
          // Load full queue, then play the selected track (setQueue resets index; play() will set track)
          setQueue(newQueue);
          // Small tick so store updates before play resolves the index
          setTimeout(() => play(track), 0);
        } else {
          play(track);
        }
      } else {
        play(detail as MixTrack);
      }
    };
    window.addEventListener('play-mix', handlePlayMix);
    return () => window.removeEventListener('play-mix', handlePlayMix);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, setQueue]);

  // Handle document title updates
  useEffect(() => {
    if (currentTrack && isPlaying) {
      document.title = `▶ ${currentTrack.title} - Deck Salone`;
    } else {
      document.title = 'Deck Salone - DJ Booking & Mix Streaming';
    }
    return () => {
      document.title = 'Deck Salone - DJ Booking & Mix Streaming';
    };
  }, [currentTrack, isPlaying]);

  // Reset internal tracking on track change
  useEffect(() => {
    setLiked(false);
    setAudioError(null);
    playTrackedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [currentTrack?.id, embed]);

  // Initialize audio element
  useEffect(() => {
    if (!currentTrack?.audioUrl || embed) return;
    const audio = new Audio(currentTrack.audioUrl);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onEnded = () => {
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error('Audio repeat failed:', err);
          setAudioError('Unable to replay this track');
          pause();
        });
      } else {
        // Automatically play next in queue
        next();
      }
    };

    const onError = () => {
      console.error('Audio failed to load:', currentTrack?.audioUrl);
      setAudioError('Audio unavailable');
      pause();
    };

    const onLoadedMetadata = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.current = null;
    };
  }, [currentTrack?.id, currentTrack?.audioUrl, embed, pause, next, setCurrentTime, setProgress, setDuration]);

  // Play / pause synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || embed) return;
    if (isPlaying) {
      if (audio.error || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        audio.load();
      }
      const playPromise = audio.paused || audio.ended ? audio.play() : Promise.resolve();
      playPromise.catch((err) => {
        console.error('Audio playback failed:', err);
        setAudioError('Playback failed. Direct MP3 link might be blocked or expired.');
        pause();
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, embed, pause]);

  // Track play count on backend
  useEffect(() => {
    if (currentTrack && !playTrackedRef.current) {
      playTrackedRef.current = true;
      api.post(`/mixes/${currentTrack.id}/play`).catch(() => {});
    }
  }, [currentTrack?.id]);

  // Volume synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || embed) return;
    audio.muted = isMuted || volume === 0;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, embed]);

  // Fallback timer for mock audio streams (in case of embeds/no direct stream)
  useEffect(() => {
    if (currentTrack?.audioUrl || embed) return;
    if (isPlaying && currentTrack) {
      const interval = setInterval(() => {
        setCurrentTime(currentTime + 1);
        if (currentTime + 1 >= currentTrack.duration) {
          next();
        } else {
          setProgress((currentTime + 1) / currentTrack.duration);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTrack, currentTime, embed, next, setCurrentTime, setProgress]);

  const handleSeek = useCallback(
    (pct: number) => {
      if (!currentTrack || embed) return;
      const newTime = pct * currentTrack.duration;
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
      setProgress(pct);
    },
    [currentTrack, embed, setCurrentTime, setProgress]
  );

  const togglePlayHandler = useCallback(() => {
    if (embed) {
      setIsExpanded(true);
      return;
    }
    setAudioError(null);
    togglePlay();
  }, [embed, togglePlay]);

  const toggleMute = useCallback(() => setMuted(!isMuted), [isMuted, setMuted]);
  const toggleLike = useCallback(() => setLiked((l) => !l), []);

  if (!currentTrack) return null;

  return (
    <>
      {/* Expanded view backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'fixed left-0 right-0 z-[100] transition-all duration-300',
            isExpanded
              ? 'bottom-0 h-[100dvh]'
              // Mobile: floating pill above the mobile tab bar
              // Desktop/Tablet (md+): full-width bar docked flush at the very bottom
              : 'bottom-[76px] h-[72px] mx-4 mb-2 rounded-2xl border border-white/10 md:bottom-0 md:h-[80px] md:mx-0 md:mb-0 md:rounded-none md:border-t md:border-x-0 md:border-b-0 md:border-white/[0.08]'
          )}
        >
          {/* Background and Blur */}
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              borderRadius: isExpanded ? '0px' : 'inherit',
              background: isExpanded
                ? 'linear-gradient(180deg, rgba(5,5,5,0.98) 0%, rgba(10,10,10,0.99) 100%)'
                : 'rgba(15, 15, 15, 0.90)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          />

          {/* Thin Progress bar at top of mini player for Mobile */}
          {!isExpanded && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 rounded-t-2xl md:hidden overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}

          {/* Top highlight gradient on desktop */}
          {!isExpanded && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent hidden md:block" />
          )}

          {/* ─── Compact / Mini Player Layout ─── */}
          {!isExpanded && (
            <div className="relative flex items-center h-full px-4 md:px-6 max-w-container mx-auto">
              {/* Left Column: Cover + Title */}
              <div
                className="flex items-center gap-3 flex-1 md:flex-initial md:w-[30%] min-w-0 cursor-pointer md:cursor-default"
                onClick={() => {
                  if (window.innerWidth < 768) setIsExpanded(true);
                }}
              >
                <div className="relative group flex-shrink-0">
                  <img
                    src={currentTrack.cover || '/placeholder.jpg'}
                    alt={currentTrack.title}
                    className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl object-cover shadow-md"
                  />
                  {isPlaying && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green rounded-full border-2 border-black" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-white truncate leading-tight">
                    {currentTrack.title}
                  </p>
                  <p className="text-[10px] md:text-xs text-gold/80 truncate mt-0.5">{currentTrack.dj}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                  className="p-1.5 rounded-full hover:bg-white/5 transition-colors flex-shrink-0 ml-1 hidden md:block"
                >
                  <Heart
                    size={14}
                    className={liked ? 'text-red fill-red' : 'text-white/30 hover:text-white/60'}
                  />
                </button>
              </div>

              {/* Center Column: Playback Controls (Desktop only) */}
              <div className="hidden md:flex flex-col items-center flex-1 px-6 min-w-0">
                {embed ? (
                  <iframe
                    src={currentTrack.audioUrl}
                    title={`${currentTrack.title} player`}
                    width="100%"
                    height="60"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="rounded-lg max-w-md"
                  />
                ) : (
                  <div className="w-full max-w-lg flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setIsShuffled(!isShuffled)}
                        className={`p-1 transition-colors ${isShuffled ? 'text-gold' : 'text-white/25 hover:text-white/50'}`}
                        title="Shuffle"
                      >
                        <Shuffle size={14} />
                      </button>
                      <button
                        onClick={prev}
                        disabled={queue.length <= 1}
                        className="p-1 text-white/40 hover:text-white/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Previous"
                      >
                        <SkipBack size={16} />
                      </button>
                      <button
                        onClick={togglePlayHandler}
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gold flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_12px_rgba(212,162,74,0.3)]"
                      >
                        {isPlaying ? (
                          <Pause size={14} className="text-black" />
                        ) : (
                          <Play size={14} className="text-black ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={next}
                        disabled={queue.length <= 1}
                        className="p-1 text-white/40 hover:text-white/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Next"
                      >
                        <SkipForward size={16} />
                      </button>
                      <button
                        onClick={() => setIsRepeating(!isRepeating)}
                        className={`p-1 transition-colors ${isRepeating ? 'text-gold' : 'text-white/25 hover:text-white/50'}`}
                        title="Repeat"
                      >
                        <Repeat size={14} />
                      </button>
                    </div>

                    <div className="w-full">
                      <ModernProgressBar
                        progress={progress}
                        onSeek={handleSeek}
                        currentTime={currentTime}
                        duration={currentTrack.duration}
                      />
                    </div>
                    {audioError && (
                      <p className="text-[10px] text-red/80 leading-none">{audioError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Audio Actions */}
              <div className="flex items-center gap-1 md:gap-3 flex-shrink-0 justify-end md:w-[30%]">
                {/* Mobile-only Play/Pause button */}
                <button
                  onClick={togglePlayHandler}
                  className="w-9 h-9 rounded-full bg-gold flex md:hidden items-center justify-center active:scale-90 transition-transform mr-1"
                >
                  {isPlaying ? (
                    <Pause size={14} className="text-black" />
                  ) : (
                    <Play size={14} className="text-black ml-0.5" />
                  )}
                </button>

                {/* Volume slider */}
                <div className="hidden sm:flex items-center gap-2 group mr-2">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <div className="relative w-16 h-1 bg-white/10 rounded-full overflow-hidden group-hover:bg-white/15 transition-colors">
                    <div
                      className="absolute top-0 left-0 h-full bg-gold rounded-full transition-all"
                      style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors hidden md:block"
                  title="Expand"
                >
                  <Maximize2 size={15} />
                </button>
                <button
                  onClick={close}
                  className="p-1.5 text-white/30 hover:text-red transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Expanded Mode Overlay (Web & Mobile) ─── */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full flex flex-col justify-between p-6 md:p-12 relative max-w-xl md:max-w-2xl mx-auto z-[110]"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-full transition-all"
                  >
                    <ChevronDown size={24} />
                  </button>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">
                    Now Playing
                  </p>
                  <button
                    onClick={close}
                    className="p-2 text-white/40 hover:text-red hover:bg-white/5 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Track Album Art / CD Spinner */}
                <div className="flex flex-col items-center justify-center my-6">
                  <motion.div
                    className="w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden shadow-[0_0_80px_rgba(212,162,74,0.15)] border-4 border-white/5 relative"
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={isPlaying ? { duration: 18, repeat: Infinity, ease: 'linear' } : {}}
                  >
                    <img
                      src={currentTrack.cover || '/placeholder.jpg'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover select-none"
                    />
                    {/* Vinyl Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black border border-white/10" />
                  </motion.div>
                </div>

                {/* Track Details */}
                <div className="text-center">
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-white uppercase tracking-tight line-clamp-1">
                    {currentTrack.title}
                  </h3>
                  <p className="text-gold font-semibold text-sm md:text-base mt-1.5">{currentTrack.dj}</p>
                  <span className="inline-block mt-3 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[10px] text-text-secondary uppercase tracking-widest">
                    {currentTrack.genre || 'Salone Mix'}
                  </span>
                </div>

                {/* Embedded Players fallback */}
                {embed ? (
                  <iframe
                    src={currentTrack.audioUrl}
                    title={`${currentTrack.title} player`}
                    width="100%"
                    height="180"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="w-full mt-6 rounded-2xl"
                  />
                ) : (
                  <div className="flex flex-col gap-4 mt-6">
                    {/* Audio Waveform */}
                    <ExpandedWaveform
                      isPlaying={isPlaying}
                      progress={progress}
                      onSeek={handleSeek}
                    />

                    {/* Timeline Tracker */}
                    <div className="flex items-center justify-between text-xs font-mono text-white/30 px-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(currentTrack.duration)}</span>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between px-4 mt-2">
                      <button
                        onClick={() => setIsShuffled(!isShuffled)}
                        className={`p-2 transition-colors ${isShuffled ? 'text-gold' : 'text-white/20'}`}
                      >
                        <Shuffle size={18} />
                      </button>

                      <div className="flex items-center gap-6">
                        <button
                          onClick={prev}
                          disabled={queue.length <= 1}
                          className="p-2 text-white/50 hover:text-white/90 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <SkipBack size={26} />
                        </button>
                        <button
                          onClick={togglePlayHandler}
                          className="w-14 h-14 rounded-full bg-gold flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_24px_rgba(212,162,74,0.4)]"
                        >
                          {isPlaying ? (
                            <Pause size={24} className="text-black" />
                          ) : (
                            <Play size={24} className="text-black ml-1" />
                          )}
                        </button>
                        <button
                          onClick={next}
                          disabled={queue.length <= 1}
                          className="p-2 text-white/50 hover:text-white/90 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <SkipForward size={26} />
                        </button>
                      </div>

                      <button
                        onClick={() => setIsRepeating(!isRepeating)}
                        className={`p-2 transition-colors ${isRepeating ? 'text-gold' : 'text-white/20'}`}
                      >
                        <Repeat size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Volume bar */}
                {!embed && (
                  <div className="flex items-center gap-3 mt-6 px-4">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    {/* Mobile-friendly volume slider — no overflow-hidden clipping */}
                    <div className="relative flex-1 h-8 flex items-center">
                      {/* Visual fill track */}
                      <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full pointer-events-none">
                        <div
                          className="h-full bg-gold rounded-full transition-all duration-75"
                          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                        />
                      </div>
                      {/* Actual slider — full touch area, z-index above visual */}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="relative w-full h-8 opacity-0 cursor-pointer z-10"
                        style={{ touchAction: 'none' }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons footer */}
                <div className="flex items-center justify-center gap-4 mt-6 border-t border-white/5 pt-6">
                  <button
                    onClick={toggleLike}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wider transition-colors',
                      liked
                        ? 'border-red/30 text-red bg-red/5'
                        : 'border-white/10 text-white/40 hover:text-white/80 hover:border-white/20'
                    )}
                  >
                    <Heart size={14} className={liked ? 'fill-red' : ''} />
                    <span>{liked ? 'Liked' : 'Like'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentTrack) return;
                      const url = `${window.location.origin}/mixes`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `${currentTrack.title} by ${currentTrack.dj}`, url });
                        } else {
                          await navigator.clipboard.writeText(url);
                          alert('Share link copied to clipboard!');
                        }
                      } catch {}
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 transition-colors text-xs font-semibold uppercase tracking-wider"
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 transition-colors text-xs font-semibold uppercase tracking-wider">
                    <ListMusic size={14} />
                    <span>Queue</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Re-export MixTrack for other components (like MixHub) importing from here
export type { MixTrack } from '@/stores/playerStore';
