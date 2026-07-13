import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  MapPin,
  Star,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Flame,
  Award,
  RefreshCw,
  ChevronUp,
  Music2,
  Globe,
  Loader2,
} from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import { useRankings } from '@/hooks/useRankings';


/* ─────────────────── Easing ─────────────────── */

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ─────────────────── Types ─────────────────── */

interface RankedDJ {
  id: string;
  username?: string;
  rankingPosition: number;
  stageName: string;
  genres: string[];
  city: string;
  country: string;
  rankingScore: number;
  digitalScore: number;
  industryScore: number;
  communityScore: number;
  trend?: number;
  verified: boolean;
  avatar: string;
  totalFollowers: number;
  totalBookings: number;
  totalStreams: number;
}

const CATEGORIES = ['Global', 'By City', 'By Genre', 'Fastest Rising', 'Most Booked', 'Most Streamed'];
const CITIES = ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu Town', 'Port Loko', 'Lunsar', 'Waterloo', 'Kabala', 'Magburaka', 'Kailahun', 'Moyamba', 'Pujehun', 'Bonthe', 'Kambia'];
const GENRES = ['Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel', 'Salone Mix', 'Club Mix', 'Throwback', 'R&B', 'Reggae'];

/* ─────────────────── Helpers ─────────────────── */

function getRankColor(rank: number): string {
  if (rank === 1) return 'text-gold';
  if (rank === 2) return 'text-[#C0C0C0]';
  if (rank === 3) return 'text-[#CD7F32]';
  if (rank <= 10) return 'text-gold/70';
  return 'text-text-muted';
}

function getRankBorder(rank: number): string {
  if (rank <= 3) return 'border-gold';
  return 'border-white/10';
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/* ─────────────────── Components ─────────────────── */

function RankingRow({ dj, index }: { dj: RankedDJ; index: number }) {
  const isTop3 = dj.rankingPosition <= 3;
  const rankColors = ['text-gold', 'text-[#C0C0C0]', 'text-[#CD7F32]'];
  const trend = dj.trend || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: easeSmooth }}
      className={`group flex items-center gap-4 py-3 px-4 rounded-xl transition-colors duration-200 cursor-pointer hover:bg-medium-gray ${
        index % 2 === 0 ? 'bg-black-elevated' : 'bg-black'
      } ${isTop3 ? 'bg-rank-gradient-top' : ''}`}
    >
      <div className="w-12 text-center shrink-0">
        {isTop3 ? (
          <div className="flex flex-col items-center">
            <Trophy className={`w-5 h-5 ${rankColors[dj.rankingPosition - 1]}`} />
            <span className={`font-mono text-sm font-bold ${rankColors[dj.rankingPosition - 1]}`}>{dj.rankingPosition}</span>
          </div>
        ) : (
          <span className={`font-mono text-base font-semibold ${dj.rankingPosition <= 10 ? 'text-gold/70' : 'text-text-muted'}`}>
            {dj.rankingPosition}
          </span>
        )}
      </div>

      <div className="shrink-0">
        <img
          src={dj.avatar || '/placeholder.jpg'}
          alt={dj.stageName}
          className={`w-12 h-12 rounded-full object-cover border-2 ${getRankBorder(dj.rankingPosition)}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate">
            {dj.stageName}
          </span>
          {dj.verified && <CheckCircle2 className="w-4 h-4 text-green shrink-0" />}
          {trend > 3 && <Flame className="w-4 h-4 text-orange shrink-0" />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {dj.genres.slice(0, 3).map((g) => (
            <span key={g} className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full border border-white/10 text-text-muted">
              {g}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <MapPin className="w-3 h-3" />
            {dj.city}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3 w-48 shrink-0">
        <div className="flex-1 h-2 bg-dark-gray rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${Math.min(dj.rankingScore, 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 + index * 0.05, ease: easeSmooth }}
            className="h-full bg-gold-gradient rounded-full"
          />
        </div>
        <span className="font-mono text-sm font-semibold text-gold w-12 text-right">{dj.rankingScore.toFixed(1)}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
        {trend > 0 ? (
          <>
            <ChevronUp className="w-4 h-4 text-green" />
            <span className="font-mono text-xs font-medium text-green">+{trend}%</span>
          </>
        ) : (
          <>
            <TrendingDown className="w-4 h-4 text-red" />
            <span className="font-mono text-xs font-medium text-red">{trend}%</span>
          </>
        )}
      </div>

      <div className="hidden md:block shrink-0">
        <Link
          to={`/dj/${dj.username || dj.id}`}
          className="text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-light transition-colors"
        >
          View
        </Link>
      </div>
    </motion.div>
  );
}

function RankingList({ djs, title, subtitle }: { djs: RankedDJ[]; title: string; subtitle?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <p className="section-label">{title}</p>
        {subtitle}
      </div>
      <div className="space-y-1">
        {djs.map((dj, i) => (
          <RankingRow key={dj.id} dj={dj} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function ByCitySection({ djs }: { djs: RankedDJ[] }) {
  const byCity = useMemo(() => {
    const map: Record<string, RankedDJ[]> = {};
    djs.forEach((dj) => {
      if (!map[dj.city]) map[dj.city] = [];
      map[dj.city].push(dj);
    });
    return CITIES.map((city) => ({ city, djs: (map[city] || []).slice(0, 5) })).filter((c) => c.djs.length > 0);
  }, [djs]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <p className="section-label mb-6">TOP DJS BY CITY</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {byCity.map((cityData, i) => (
          <FadeIn key={cityData.city} delay={i * 0.1}>
            <div className="bg-black-elevated rounded-2xl border border-white/5 p-5 hover:border-gold/20 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gold" />
                <h3 className="font-display text-lg font-semibold uppercase text-text-primary">{cityData.city}</h3>
              </div>
              <p className="font-mono text-xs text-text-muted mb-4">{cityData.djs.length} DJs</p>
              <div className="space-y-3">
                {cityData.djs.map((dj, j) => (
                  <div key={dj.id} className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-bold w-6 ${getRankColor(j + 1)}`}>{j + 1}</span>
                    <img src={dj.avatar || '/placeholder.jpg'} alt={dj.stageName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{dj.stageName}</p>
                      <p className="font-mono text-[10px] text-gold">{dj.rankingScore.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </motion.div>
  );
}

function ByGenreSection({ djs }: { djs: RankedDJ[] }) {
  const byGenre = useMemo(() => {
    return GENRES.map((genre) => ({
      genre,
      djs: djs.filter((dj) => dj.genres.includes(genre)).slice(0, 3),
    })).filter((g) => g.djs.length > 0);
  }, [djs]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <p className="section-label mb-6">TOP DJS BY GENRE</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {byGenre.map((genreData, i) => (
          <FadeIn key={genreData.genre} delay={i * 0.08}>
            <div className="bg-black-elevated rounded-2xl border border-white/5 p-5 hover:border-gold/20 transition-colors">
              <h3 className="font-display text-lg font-semibold uppercase text-text-primary mb-4">{genreData.genre}</h3>
              <div className="space-y-3">
                {genreData.djs.map((dj, j) => (
                  <div key={dj.id} className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-bold w-6 ${getRankColor(j + 1)}`}>{j + 1}</span>
                    <img src={dj.avatar || '/placeholder.jpg'} alt={dj.stageName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{dj.stageName}</p>
                      <p className="font-mono text-[10px] text-gold">{dj.rankingScore.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </motion.div>
  );
}

function FastestRisingSection({ djs }: { djs: RankedDJ[] }) {
  const rising = useMemo(() => {
    return [...djs]
      .filter((dj) => (dj.trend || 0) > 0)
      .sort((a, b) => (b.trend || 0) - (a.trend || 0))
      .slice(0, 5);
  }, [djs]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-4 h-4 text-green" />
        <p className="section-label">FASTEST RISING</p>
      </div>
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <div className="bg-black-elevated min-w-[640px] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">DJ</div>
            <div className="col-span-3 text-center">Change</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-2 text-center">Position</div>
          </div>
          {rising.map((dj, i) => (
            <motion.div
              key={dj.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: easeSmooth }}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-medium-gray/50 transition-colors items-center"
            >
              <div className="col-span-1">
                <span className="font-mono text-base font-bold text-green">{i + 1}</span>
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <img src={dj.avatar || '/placeholder.jpg'} alt={dj.stageName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{dj.stageName}</p>
                  {(dj.trend || 0) > 3 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-green/15 text-green">
                      <Star className="w-3 h-3" />
                      Rising Star
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="font-mono text-lg font-bold text-green">+{dj.trend}%</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="font-mono text-sm font-semibold text-text-primary">{dj.rankingScore.toFixed(1)}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="font-mono text-sm text-text-muted">#{dj.rankingPosition}</span>
              </div>
            </motion.div>
          ))}
          {rising.length === 0 && (
            <div className="px-6 py-8 text-center text-text-muted text-sm">No rising DJs this week</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MostBookedSection({ djs }: { djs: RankedDJ[] }) {
  const booked = useMemo(() => [...djs].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 10), [djs]);
  const maxBookings = Math.max(1, ...booked.map((d) => d.totalBookings));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-4 h-4 text-purple" />
        <p className="section-label">MOST BOOKED</p>
      </div>
      <div className="space-y-4">
        {booked.map((dj, i) => (
          <FadeIn key={dj.id} delay={i * 0.08}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-bold text-text-muted w-6">{i + 1}</span>
              <img src={dj.avatar || '/placeholder.jpg'} alt={dj.stageName} className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
              <span className="text-sm font-medium text-text-primary w-32 truncate">{dj.stageName}</span>
              <div className="flex-1 h-6 bg-dark-gray rounded-md overflow-hidden max-w-md">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(dj.totalBookings / maxBookings) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: easeSmooth }}
                  className="h-full rounded-md"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #8B5CF6 100%)' }}
                />
              </div>
              <span className="font-mono text-sm font-semibold text-purple w-12 text-right">{dj.totalBookings}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </motion.div>
  );
}

function MostStreamedSection({ djs }: { djs: RankedDJ[] }) {
  const streamed = useMemo(() => [...djs].sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 10), [djs]);
  const maxStreams = Math.max(1, ...streamed.map((d) => d.totalStreams));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-2 mb-6">
        <Music2 className="w-4 h-4 text-gold" />
        <p className="section-label">MOST STREAMED</p>
      </div>
      <div className="space-y-4">
        {streamed.map((dj, i) => (
          <FadeIn key={dj.id} delay={i * 0.08}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-bold text-text-muted w-6">{i + 1}</span>
              <img src={dj.avatar || '/placeholder.jpg'} alt={dj.stageName} className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
              <span className="text-sm font-medium text-text-primary w-32 truncate">{dj.stageName}</span>
              <div className="flex-1 h-6 bg-dark-gray rounded-md overflow-hidden max-w-md">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(dj.totalStreams / maxStreams) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: easeSmooth }}
                  className={`h-full rounded-md ${i === 0 ? 'gold-shimmer' : 'bg-gold-gradient'}`}
                />
              </div>
              <span className="font-mono text-sm font-semibold text-gold w-16 text-right">{formatCompact(dj.totalStreams)}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function Rankings() {
  const [activeCategory, setActiveCategory] = useState('Global');
  const { data: globalDjs = [], isLoading, error } = useRankings({ limit: 50 });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-red-400 font-medium">Failed to load rankings</p>
          <p className="text-text-muted text-sm mt-2">{error instanceof Error ? error.message : 'Please try again later.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* Hero */}
      <section className="pt-24 pb-12">
        <div className="container-main">
          <FadeIn delay={0.1}>
            <p className="section-label text-center mb-3">LIVE RANKINGS</p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold uppercase tracking-tight text-text-primary text-center">
              SIERRA LEONE DJ RANKINGS
            </h1>
          </FadeIn>
          <FadeIn delay={0.4}>
            <div className="flex items-center justify-center gap-2 mt-4 text-text-muted">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.5}>
            <div className="max-w-4xl mx-auto mt-8 bg-black-elevated rounded-2xl border border-gold/15 p-6">
              <p className="section-label text-center mb-6">HOW SCORES ARE CALCULATED</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold text-gold">~45%</span>
                  <p className="text-sm font-semibold text-text-primary mt-1">Digital Score</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary mt-3">
                    <li>Streams & Followers</li>
                    <li>Mix Uploads & Plays</li>
                    <li>Platform Engagement</li>
                  </ul>
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold text-purple">~35%</span>
                  <p className="text-sm font-semibold text-text-primary mt-1">Industry Score</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary mt-3">
                    <li>Booking Count</li>
                    <li>Events Played</li>
                    <li>Battle Performance</li>
                  </ul>
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold text-green">~20%</span>
                  <p className="text-sm font-semibold text-text-primary mt-1">Community Score</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary mt-3">
                    <li>User Ratings</li>
                    <li>Reviews & Feedback</li>
                    <li>Verified Reviews</li>
                  </ul>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8">
        <div className="container-main">
          <FadeIn>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-gold-gradient text-black'
                      : 'bg-transparent border border-white/20 text-text-secondary hover:text-text-primary hover:border-white/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </FadeIn>

          {activeCategory === 'Global' && (
            <RankingList
              djs={globalDjs}
              title="GLOBAL TOP 50"
              subtitle={
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-text-muted" />
                  <span className="font-mono text-xs text-text-muted">All Cities</span>
                </div>
              }
            />
          )}

          {activeCategory === 'By City' && <ByCitySection djs={globalDjs} />}
          {activeCategory === 'By Genre' && <ByGenreSection djs={globalDjs} />}
          {activeCategory === 'Fastest Rising' && <FastestRisingSection djs={globalDjs} />}
          {activeCategory === 'Most Booked' && <MostBookedSection djs={globalDjs} />}
          {activeCategory === 'Most Streamed' && <MostStreamedSection djs={globalDjs} />}
        </div>
      </section>

      {/* Most Streamed / Most Booked */}
      {activeCategory === 'Global' && (
        <>
          <section className="py-12 bg-black-elevated">
            <div className="container-main">
              <MostStreamedSection djs={globalDjs} />
            </div>
          </section>
          <section className="py-12">
            <div className="container-main">
              <MostBookedSection djs={globalDjs} />
            </div>
          </section>
        </>
      )}

    </div>
  );
}
