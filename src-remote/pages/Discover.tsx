import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Users,
  Music2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import { useDJs, useDJGenres } from '@/hooks/useDJs';
import { imageFallback } from '@/lib/utils';

/* ─────────────────── Types ─────────────────── */

interface DJ {
  id: string;
  username?: string;
  stageName: string;
  avatar: string;
  city: string;
  country: string;
  genres: string[];
  verified: boolean;
  totalFollowers: number;
  totalMixes: number;
  averageRating: number;
  rankingPosition: number;
  bookingFeeMin: number;
  bookingFeeMax: number;
  currency: string;
  startYear: number;
  equipment: string[];
}

type DJsResponse = {
  data: DJ[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

/* ─────────────────── Constants ─────────────────── */

const EQUIPMENT = ['Pioneer DJ', 'Serato', 'Traktor', 'Rekordbox'];

const CITIES = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Koidu Town',
  'Port Loko',
  'Lunsar',
  'Waterloo',
  'Kabala',
  'Magburaka',
  'Kailahun',
  'Moyamba',
  'Pujehun',
  'Bonthe',
  'Kambia',
];

const SORT_OPTIONS = [
  { label: 'Rank (Default)', value: 'ranking' },
  { label: 'Most Followers', value: 'followers' },
  { label: 'Most Mixes', value: 'mixes' },
  { label: 'Highest Rated', value: 'rating' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/* ─────────────────── Easing ─────────────────── */

const easeSmooth = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ─────────────────── Helpers ─────────────────── */

function formatFollowers(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return n.toLocaleString();
}

function formatPrice(dj: DJ) {
  const min = dj.bookingFeeMin;
  const max = dj.bookingFeeMax;
  if (max && max > min) {
    return `SLE ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  return `SLE ${min.toLocaleString()}+`;
}

/* ─────────────────── DJ Card ─────────────────── */

function DJCard({ dj, index }: { dj: DJ; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: easeSmooth }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative bg-black-elevated rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card hover:border-gold/30"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={dj.avatar || '/default-avatar.jpg'}
          alt={dj.stageName}
          onError={imageFallback}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

        {/* Rank Badge */}
        <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center border-2 border-gold shadow-lg">
          <span className="font-mono text-sm font-bold text-black">{dj.rankingPosition}</span>
        </div>

        {/* Verified Badge */}
        {dj.verified && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-5 h-5 text-green" />
          </div>
        )}

        {/* Book Button on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-3 right-3"
            >
              <Link
                to={`/dj/${dj.username || dj.id}`}
                className="inline-flex items-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full border border-gold text-gold bg-black/60 backdrop-blur-sm hover:bg-gold hover:text-black transition-colors duration-200"
              >
                Book
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Genre Pills */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {dj.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-white/10 text-text-secondary"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Name */}
        <h3 className="font-display text-base font-semibold uppercase tracking-tight text-text-primary flex items-center gap-1.5">
          {dj.stageName}
        </h3>

        {/* City */}
        <div className="flex items-center gap-1 mt-1 mb-3">
          <MapPin className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">{dj.city}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-0.5">
              <Users className="w-3 h-3" />
            </div>
            <span className="font-mono text-xs font-semibold text-text-primary">
              {formatFollowers(dj.totalFollowers)}
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-0.5">
              <Music2 className="w-3 h-3" />
            </div>
            <span className="font-mono text-xs font-semibold text-text-primary">{dj.totalMixes}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-0.5">
              <Star className="w-3 h-3" />
            </div>
            <span className="font-mono text-xs font-semibold text-text-primary">
              {dj.averageRating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">From</span>
          <span className="font-mono text-xs font-semibold text-gold">{formatPrice(dj)}</span>
        </div>

        {/* View Profile */}
        <Link
          to={`/dj/${dj.username || dj.id}`}
          className="block mt-3 text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-light transition-colors"
        >
          View Profile
        </Link>
      </div>
    </motion.div>
  );
}

/* ─────────────────── Filter Chip ─────────────────── */

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gold/40 text-gold bg-gold/5"
    >
      {label}
      <button onClick={onRemove} className="hover:text-text-primary transition-colors">
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
}

/* ─────────────────── Empty State ─────────────────── */

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-16 h-16 rounded-full bg-black-surface flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="font-display text-xl font-semibold uppercase tracking-tight text-text-primary mb-2">
        NO DJS FOUND
      </h3>
      <p className="text-text-secondary text-sm text-center max-w-sm mb-6">
        Try adjusting your filters or search for something different.
      </p>
      <button
        onClick={onClear}
        className="px-6 py-2.5 rounded-full border border-white/20 text-text-primary text-sm font-medium hover:border-gold hover:text-gold transition-colors"
      >
        Clear All Filters
      </button>
    </motion.div>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [ratingMin, setRatingMin] = useState(0);
  const [sortBy, setSortBy] = useState<SortValue>('ranking');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const ITEMS_PER_PAGE = 12;

  /* ── Data ── */
  const djsQuery = useDJs({
    search: searchQuery || undefined,
    city: selectedCity || undefined,
    genre: activeGenre !== 'All' ? activeGenre : undefined,
    sortBy,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const genresQuery = useDJGenres();

  /* ── Debug logging ── */
  useEffect(() => {
    if (djsQuery.error) {
      console.error('[Discover] DJs query failed:', djsQuery.error);
    }
  }, [djsQuery.error]);

  useEffect(() => {
    if (djsQuery.data) {
      console.log('[Discover] DJs query success:', {
        count: (djsQuery.data as DJsResponse)?.data?.length ?? 0,
        meta: (djsQuery.data as DJsResponse)?.meta,
      });
    }
  }, [djsQuery.data]);

  const djsData = djsQuery.data as DJsResponse | undefined;
  const genreOptions = useMemo(
    () => ['All', ...((genresQuery.data as string[] | undefined) ?? [])],
    [genresQuery.data]
  );

  /* ── Client-side filters (equipment & rating aren't supported server-side) ── */
  const displayedDjs = useMemo(() => {
    const djs = djsData?.data ?? [];
    return djs.filter((dj) => {
      if (dj.averageRating < ratingMin) return false;
      if (
        selectedEquipment.length > 0 &&
        !selectedEquipment.some((eq) => dj.equipment.includes(eq))
      ) {
        return false;
      }
      return true;
    });
  }, [djsData, ratingMin, selectedEquipment]);

  const totalPages = djsData?.meta?.totalPages ?? 0;
  const serverTotal = djsData?.meta?.total ?? 0;

  /* ── Active Filters ── */
  const activeFilters = useMemo(() => {
    const filters: { label: string; remove: () => void }[] = [];
    if (activeGenre !== 'All')
      filters.push({
        label: activeGenre,
        remove: () => setActiveGenre('All'),
      });
    if (selectedCity)
      filters.push({
        label: selectedCity,
        remove: () => setSelectedCity(''),
      });
    selectedEquipment.forEach((eq) =>
      filters.push({
        label: eq,
        remove: () =>
          setSelectedEquipment((prev) => prev.filter((e) => e !== eq)),
      })
    );
    if (ratingMin > 1)
      filters.push({
        label: `${ratingMin}+ Stars`,
        remove: () => setRatingMin(1),
      });
    return filters;
  }, [activeGenre, selectedCity, selectedEquipment, ratingMin]);

  const clearAllFilters = () => {
    setActiveGenre('All');
    setSelectedCity('');
    setSelectedEquipment([]);
    setRatingMin(1);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const toggleCity = (city: string) => {
    setSelectedCity((prev) => (prev === city ? '' : city));
    setCurrentPage(1);
  };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
    setCurrentPage(1);
  };

  const handleGenreClick = (genre: string) => {
    setActiveGenre(genre);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSortSelect = (value: SortValue) => {
    setSortBy(value);
    setSortOpen(false);
    setCurrentPage(1);
  };

  const sortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? sortBy;

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* ════════ Section 1: Hero ════════ */}
      <section className="bg-black-elevated pt-24 pb-12">
        <div className="container-main">
          <FadeIn delay={0.1}>
            <p className="section-label text-center mb-3">DISCOVER</p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold uppercase tracking-tight text-text-primary text-center">
              FIND YOUR PERFECT DJ
            </h1>
          </FadeIn>
          {/* Search Bar */}
          <FadeIn delay={0.4}>
            <div className="max-w-2xl mx-auto mt-8">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gold pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by DJ name, genre, or city..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-12 pr-28 py-3.5 bg-black-surface border border-dark-gray rounded-full text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all"
                />
                <button className="absolute right-2 px-5 py-2 bg-gold-gradient text-black text-sm font-semibold uppercase rounded-full hover:scale-[1.02] transition-transform">
                  Search
                </button>
              </div>
            </div>
          </FadeIn>

          {/* Genre Filter Pills */}
          <FadeIn delay={0.5}>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {genreOptions.map((genre, i) => (
                <motion.button
                  key={genre}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.04, ease: easeSmooth }}
                  onClick={() => handleGenreClick(genre)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-200 ${
                    activeGenre === genre
                      ? 'bg-gold-gradient text-black'
                      : 'bg-transparent border border-white/20 text-text-secondary hover:text-text-primary hover:border-white/40'
                  }`}
                >
                  {genre}
                </motion.button>
              ))}
            </div>
          </FadeIn>

          {/* Advanced Filters Toggle */}
          <FadeIn delay={0.7}>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:text-gold-light transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Advanced Filters
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </FadeIn>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: easeSmooth }}
                className="overflow-hidden"
              >
                <div className="max-w-4xl mx-auto mt-6 bg-black-surface rounded-xl border border-dark-gray p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* City */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                        City
                      </h4>
                      <div className="space-y-2">
                        {CITIES.map((city) => (
                          <label
                            key={city}
                            className="flex items-center gap-2.5 cursor-pointer group"
                            onClick={() => toggleCity(city)}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                selectedCity === city
                                  ? 'bg-gold border-gold'
                                  : 'border-dark-gray group-hover:border-text-muted'
                              }`}
                            >
                              {selectedCity === city && (
                                <CheckCircle2 className="w-3 h-3 text-black" />
                              )}
                            </div>
                            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                              {city}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                        Min Rating
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRatingMin(r);
                              setCurrentPage(1);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              ratingMin === r
                                ? 'bg-gold/15 text-gold border border-gold'
                                : 'bg-transparent text-text-muted border border-dark-gray hover:border-white/20'
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            {r}+
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Equipment */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                        Equipment
                      </h4>
                      <div className="space-y-2">
                        {EQUIPMENT.map((eq) => (
                          <label
                            key={eq}
                            className="flex items-center gap-2.5 cursor-pointer group"
                            onClick={() => toggleEquipment(eq)}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                selectedEquipment.includes(eq)
                                  ? 'bg-gold border-gold'
                                  : 'border-dark-gray group-hover:border-text-muted'
                              }`}
                            >
                              {selectedEquipment.includes(eq) && (
                                <CheckCircle2 className="w-3 h-3 text-black" />
                              )}
                            </div>
                            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                              {eq}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-dark-gray">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowAdvanced(false)}
                      className="px-6 py-2 bg-gold-gradient text-black text-sm font-semibold uppercase rounded-full hover:scale-[1.02] transition-transform"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ════════ Section 2: Active Filters Bar ════════ */}
      <section className="bg-black border-b border-white/5 py-3 sticky top-16 lg:top-28 z-40">
        <div className="container-main flex flex-wrap items-center gap-3">
          {/* Active filter chips */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <AnimatePresence>
              {activeFilters.map((filter) => (
                <FilterChip
                  key={filter.label}
                  label={filter.label}
                  onRemove={filter.remove}
                />
              ))}
            </AnimatePresence>
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-text-muted hover:text-gold transition-colors ml-2"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Result Count */}
          <span className="font-mono text-xs text-text-muted hidden sm:block">
            Showing {displayedDjs.length} of {serverTotal} DJs
          </span>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary bg-black-surface border border-dark-gray rounded-full hover:border-white/20 transition-colors"
            >
              Sort: {sortLabel}
              <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-2 bg-black-elevated border border-dark-gray rounded-xl shadow-card py-2 min-w-48 z-50"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSortSelect(opt.value)}
                      className={`block w-full text-left px-4 py-2 text-xs transition-colors ${
                        sortBy === opt.value
                          ? 'text-gold bg-gold/10'
                          : 'text-text-secondary hover:text-text-primary hover:bg-black-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ════════ Section 3: DJ Grid ════════ */}
      <section className="py-8">
        <div className="container-main">
          <AnimatePresence mode="wait">
            {djsQuery.isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </motion.div>
            ) : djsQuery.error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-16 h-16 rounded-full bg-black-surface flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-display text-xl font-semibold uppercase tracking-tight text-text-primary mb-2">
                  FAILED TO LOAD DJS
                </h3>
                <p className="text-text-secondary text-sm text-center max-w-sm mb-6">
                  {(djsQuery.error as Error)?.message || 'Something went wrong. Please try again.'}
                </p>
                <button
                  onClick={() => djsQuery.refetch()}
                  className="px-6 py-2.5 rounded-full border border-white/20 text-text-primary text-sm font-medium hover:border-gold hover:text-gold transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            ) : displayedDjs.length === 0 ? (
              <EmptyState key="empty" onClear={clearAllFilters} />
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                <AnimatePresence>
                  {displayedDjs.map((dj, i) => (
                    <DJCard key={dj.id} dj={dj} index={i} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ════════ Section 4: Pagination ════════ */}
      {totalPages > 1 && displayedDjs.length > 0 && (
        <section className="pb-8">
          <div className="container-main flex flex-col items-center gap-4">
            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-gold-gradient text-black'
                      : 'text-text-muted hover:text-text-primary hover:bg-black-surface'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-full text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Load More */}
            {currentPage < totalPages && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-8 py-3 rounded-full border border-white/20 text-text-primary text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Load More DJs
              </motion.button>
            )}
          </div>
        </section>
      )}

      {/* ════════ Section 5: CTA Banner ════════ */}
      <section className="bg-black-elevated py-16 mt-8">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-3">
              <FadeIn>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                  ARE YOU A DJ?
                </h2>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="mt-4 text-text-secondary text-sm sm:text-base max-w-lg">
                  Join the platform and get discovered by promoters, fans, and event organizers across Sierra Leone.
                </p>
              </FadeIn>

              <FadeIn delay={0.2}>
                <ul className="mt-6 space-y-3">
                  {[
                    'Create your verified professional profile',
                    'Upload and showcase your mixes',
                    'Track performance with real analytics',
                    'Get booked directly through the platform',
                    'Compete in weekly DJ battles',
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.08, ease: easeSmooth }}
                      className="flex items-center gap-3 text-sm text-text-secondary"
                    >
                      <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </FadeIn>

              <FadeIn delay={0.6}>
                <Link
                  to="/login"
                  className="inline-flex items-center mt-8 px-8 py-3 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
                >
                  Create Free Profile
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Link>
              </FadeIn>
            </div>

            {/* Right Column - Decorative Images */}
            <div className="lg:col-span-2 relative hidden lg:block">
              <FadeIn direction="right" delay={0.3}>
                <div className="relative">
                  <img
                    src="/images/dj-promo/promo-1.jpg"
                    alt="DJ performing"
                    className="w-48 h-60 object-cover rounded-xl border-[3px] border-gold shadow-card"
                    style={{ transform: 'rotate(-3deg)' }}
                  />
                  <img
                    src="/images/dj-promo/promo-2.jpg"
                    alt="DJ at club"
                    className="w-44 h-56 object-cover rounded-xl border-[3px] border-gold shadow-card absolute top-8 left-28"
                    style={{ transform: 'rotate(3deg)' }}
                  />
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
