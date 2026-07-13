import { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Heart,
  Clock,
  Grid2X2,
  List,
  Search,
  Flame,
  Loader2,
  Upload,
} from 'lucide-react';
import { type MixTrack } from '@/components/MixPlayer';
import { useMixes, useTrendingMixes, useLikeMix, useMixGenres } from '@/hooks/useMixes';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

/* ──────────────────────── Animation helpers ──────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

/* ──────────────────────── Animated Waveform Background ──────────────────────── */
const WaveformBar = memo(function WaveformBar({ delay }: { delay: number }) {
  return (
    <motion.div
      className="w-[2px] bg-gold/15 rounded-full"
      animate={{ height: [20, 40 + Math.random() * 60, 20] }}
      transition={{
        duration: 2 + Math.random() * 1,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
});

const AnimatedWaveform = memo(function AnimatedWaveform() {
  const bars = Array.from({ length: 80 }, (_, i) => i);
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-[2px] overflow-hidden pointer-events-none z-0 pb-8">
      {bars.map((i) => (
        <WaveformBar key={i} delay={i * 0.04} />
      ))}
    </div>
  );
});

/* ──────────────────────── Helpers ──────────────────────── */
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function toMixTrack(mix: any): MixTrack {
  return {
    id: mix.id,
    title: mix.title,
    dj: mix.dj?.stageName || 'Unknown DJ',
    duration: mix.duration || 0,
    cover: mix.coverImage || '/placeholder.jpg',
    genre: mix.genre || mix.category || 'Mix',
    audioUrl: mix.audioUrl,
    audioSource: mix.audioSource,
    originalUrl: mix.originalUrl,
    plays: mix.plays || 0,
    djTier: mix.dj?.subscriptionTier,
  };
}

/* ──────────────────────── MixCard Component ──────────────────────── */
function MixCard({
  mix,
  onPlay,
  index,
  isNew,
}: {
  mix: MixTrack;
  onPlay: (mix: MixTrack) => void;
  index: number;
  isNew?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    if (isAuthenticated) {
      likeMix(mix.id);
    }
  }, [mix.id, isAuthenticated, likeMix]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      className="group"
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl bg-black-elevated border transition-all duration-300 hover:-translate-y-1 hover:shadow-card",
        mix.djTier === 'legend' ? "border-yellow-400/50 hover:border-yellow-400" : "border-white/5 hover:border-gold/30"
      )}>
        <div className="relative aspect-square overflow-hidden">
          {mix.djTier === 'legend' && (
            <div className="absolute inset-0 bg-yellow-400/5 pointer-events-none mix-blend-screen z-10" />
          )}
          <img
            src={mix.cover}
            alt={mix.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            onClick={() => onPlay(mix)}
          >
            <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform">
              <Play size={20} className="text-black ml-0.5" />
            </div>
          </div>
          {isNew && (
            <motion.span
              className="absolute top-2 left-2 px-2 py-0.5 bg-red text-white text-[10px] font-semibold uppercase rounded-full"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              NEW
            </motion.span>
          )}
        </div>

        <div className="p-3">
          <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">
            {mix.title}
          </h4>
          <p className="text-xs text-gold mt-0.5">{mix.dj}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted font-mono">{formatCompact(mix.plays || 0)} plays</span>
              <span className="text-text-muted">|</span>
              <span className="text-[10px] text-text-muted font-mono flex items-center gap-0.5">
                <Clock size={10} />
                {formatDuration(mix.duration)}
              </span>
            </div>
            <button onClick={handleLike} className="p-1 hover:bg-white/5 rounded-full transition-colors">
              <Heart size={14} className={liked ? 'text-red fill-red' : 'text-text-muted'} />
            </button>
          </div>
          <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium text-gold border border-gold/30 rounded-full">
            {mix.genre}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function MixListItem({
  mix,
  onPlay,
  isNew,
}: {
  mix: MixTrack;
  onPlay: (mix: MixTrack) => void;
  isNew?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    if (isAuthenticated) likeMix(mix.id);
  }, [mix.id, isAuthenticated, likeMix]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black-elevated p-3 transition-colors hover:border-gold/30 sm:gap-4">
      <button
        type="button"
        onClick={() => onPlay(mix)}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20"
      >
        <img src={mix.cover} alt={mix.title} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45">
          <Play size={18} className="text-gold" />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-display text-sm font-semibold uppercase text-text-primary sm:text-base">
            {mix.title}
          </h4>
          {isNew && (
            <span className="shrink-0 rounded-full bg-red px-2 py-0.5 text-[9px] font-bold uppercase text-white">
              New
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-gold">{mix.dj}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
          <span>{formatCompact(mix.plays || 0)} plays</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(mix.duration)}
          </span>
          <span className="rounded-full border border-gold/30 px-2 py-0.5 text-gold">{mix.genre}</span>
        </div>
      </div>
      <button onClick={handleLike} className="shrink-0 rounded-full p-2 hover:bg-white/5">
        <Heart size={16} className={liked ? 'fill-red text-red' : 'text-text-muted'} />
      </button>
    </div>
  );
}

/* ──────────────────────── Trending Card ──────────────────────── */
function TrendingCard({ mix, onPlay, index }: { mix: MixTrack; onPlay: (mix: MixTrack) => void; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.08 }}
      className="group flex-shrink-0 w-[260px] sm:w-[280px]"
    >
      <div className={cn(
        "relative aspect-square rounded-xl overflow-hidden mb-2 border-2",
        mix.djTier === 'legend' ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)]" : "border-transparent"
      )}>
        {mix.djTier === 'legend' && (
          <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none mix-blend-screen z-10" />
        )}
        <img src={mix.cover} alt={mix.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" />
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer z-20"
          onClick={() => onPlay(mix)}
        >
          <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform">
            <Play size={20} className="text-black ml-0.5" />
          </div>
        </div>
      </div>
      <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">{mix.title}</h4>
      <p className="text-xs text-gold mt-0.5 flex items-center gap-1">
        {mix.djTier === 'legend' && <Flame size={12} className="text-yellow-400 fill-yellow-400" />}
        {mix.dj}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-text-muted font-mono">{formatCompact(mix.plays || 0)} plays</span>
        <span className="text-text-muted">|</span>
        <span className="text-[10px] text-text-muted font-mono flex items-center gap-0.5">
          <Clock size={10} />
          {formatDuration(mix.duration)}
        </span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
export default function MixHub() {
  const { user } = useAuthStore();
  const [activeGenre, setActiveGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);

  const heroRef = useRef<HTMLDivElement>(null);

  // Read filters from URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const genreParam = params.get('genre');
    if (genreParam) {
      setActiveGenre(genreParam);
    }
  }, []);

  // Sync activeGenre to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeGenre === 'all') {
      url.searchParams.delete('genre');
    } else {
      url.searchParams.set('genre', activeGenre);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeGenre]);

  const { data: genres = [], isLoading: genresLoading } = useMixGenres();
  const { data: trendingData = [], isLoading: trendingLoading } = useTrendingMixes(8);

  const { data: latestData, isLoading: latestLoading } = useMixes({
    genre: activeGenre !== 'all' ? activeGenre : undefined,
    search: searchQuery || undefined,
    sortBy,
    page,
    limit: 12,
  });

  const trending = useMemo(() => (trendingData || []).map(toMixTrack), [trendingData]);
  const latest = useMemo(() => (latestData?.data || []).map(toMixTrack), [latestData]);

  const handlePlay = useCallback((mix: MixTrack) => {
    // Build a queue from all currently visible mixes so next/prev works
    const allVisible = [...trending, ...latest];
    const uniqueQueue = allVisible.filter(
      (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i
    );
    window.dispatchEvent(new CustomEvent('play-mix', { detail: { track: mix, queue: uniqueQueue.length > 1 ? uniqueQueue : undefined } }));
  }, [trending, latest]);

  const isLoading = genresLoading || trendingLoading || latestLoading;
  const featuredMix = trending[0];
  const isDj = user?.role === 'DJ';

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* Hero */}
      <section ref={heroRef} className="relative w-full min-h-[420px] flex items-center overflow-hidden">
        <AnimatedWaveform />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-[1]" />

        <div className="relative z-10 w-full max-w-container mx-auto px-6 py-24">
          <div className="max-w-xl">
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-gold text-xs font-semibold uppercase tracking-widest">
              MIX HUB
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary uppercase tracking-tight mt-3">
              DISCOVER & STREAM THE BEST MIXES
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-6">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search mixes, DJs, or genres..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full h-11 pl-10 pr-4 bg-black-surface border border-dark-gray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors"
                />
              </div>
            </motion.div>
            {isDj && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-4">
                <Link to="/dashboard/mixes" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-black text-xs font-semibold uppercase rounded-full hover:scale-[1.02] transition-transform">
                  <Upload size={14} />
                  Upload Your Mix
                </Link>
              </motion.div>
            )}
          </div>

          {featuredMix && (
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 w-[360px]">
              <div className="p-5 rounded-2xl border border-gold/20 cursor-pointer hover:border-gold/40 transition-colors" style={{ background: '#111111' }} onClick={() => handlePlay(featuredMix)}>
                <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">NOW TRENDING</span>
                <div className="flex items-center gap-4 mt-3">
                  <img src={featuredMix.cover} alt={featuredMix.title} className="w-24 h-24 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">{featuredMix.title}</h4>
                    <p className="text-xs text-gold mt-0.5">{featuredMix.dj}</p>
                    <p className="text-[10px] text-text-muted mt-1 font-mono">{formatCompact(featuredMix.plays || 0)} plays</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Loading */}
      {isLoading && page === 1 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-16 lg:top-28 z-30 bg-black-elevated border-b border-white/5">
        <div className="max-w-container mx-auto px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <span className="text-[10px] uppercase tracking-wider text-text-muted mr-1 shrink-0">Genre</span>
              {genresLoading ? (
                <Loader2 className="w-3 h-3 text-text-muted animate-spin" />
              ) : (
                <>
                  <button
                    onClick={() => { setActiveGenre('all'); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
                      activeGenre === 'all'
                        ? 'bg-gold/10 text-gold border border-gold/50'
                        : 'text-text-muted border border-dark-gray hover:text-text-primary hover:border-medium-gray'
                    }`}
                  >
                    All Genres
                  </button>
                  {genres.map((g: string) => (
                    <button
                      key={g}
                      onClick={() => { setActiveGenre(g); setPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
                        activeGenre === g
                          ? 'bg-gold/10 text-gold border border-gold/50'
                          : 'text-text-muted border border-dark-gray hover:text-text-primary hover:border-medium-gray'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="h-9 rounded-full border border-dark-gray bg-black px-3 text-xs font-medium text-text-secondary outline-none focus:border-gold"
              >
                <option value="newest">Newest</option>
                <option value="popular">Popular</option>
                <option value="trending">Trending</option>
              </select>
              <div className="flex rounded-full border border-dark-gray bg-black p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn('rounded-full p-2 transition-colors', viewMode === 'grid' ? 'bg-gold text-black' : 'text-text-muted hover:text-text-primary')}
                  aria-label="Grid view"
                >
                  <Grid2X2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn('rounded-full p-2 transition-colors', viewMode === 'list' ? 'bg-gold text-black' : 'text-text-muted hover:text-text-primary')}
                  aria-label="List view"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Mixes */}
      <section className="max-w-container mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-red" />
            <span className="text-xs font-semibold text-red uppercase tracking-wider">TRENDING NOW</span>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {trending.map((mix: any, i: any) => (
            <TrendingCard key={mix.id} mix={mix} onPlay={handlePlay} index={i} />
          ))}
          {trending.length === 0 && !trendingLoading && (
            <div className="text-center py-8 w-full">
              <p className="text-text-muted text-sm">No trending mixes yet. Be the first to upload!</p>
            </div>
          )}
        </div>
      </section>

      {/* Latest Uploads */}
      <section className="max-w-container mx-auto px-6 pt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">FRESH DROPS</span>
            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-text-primary uppercase tracking-tight mt-1">LATEST UPLOADS</h2>
          </div>
        </div>
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'space-y-3'}>
          {latest.map((mix: any, i: any) => (
            viewMode === 'grid' ? (
              <MixCard key={mix.id} mix={mix} onPlay={handlePlay} index={i} isNew={i < 3 && page === 1} />
            ) : (
              <MixListItem key={mix.id} mix={mix} onPlay={handlePlay} isNew={i < 3 && page === 1} />
            )
          ))}
          {latest.length === 0 && !latestLoading && (
            <div className="col-span-full text-center py-12">
              <p className="text-text-muted text-sm">
                {activeGenre === 'all'
                  ? 'No mixes uploaded yet.'
                  : `No mixes found for genre "${activeGenre}".`}
              </p>
              {isDj && (
                <Link to="/dashboard/mixes" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-black text-xs font-semibold uppercase rounded-full hover:scale-[1.02] transition-transform">
                  <Upload size={14} />
                  Upload Your Mix
                </Link>
              )}
            </div>
          )}
        </div>
        {(latestData?.meta?.totalPages || 0) > page && (
          <div className="flex justify-center mt-8">
            <button onClick={() => setPage((p) => p + 1)} className="px-6 py-2.5 bg-gold-gradient text-black text-xs font-semibold uppercase rounded-full hover:scale-[1.02] transition-transform">
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
