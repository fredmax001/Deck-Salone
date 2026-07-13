import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  Headphones,
  Loader2,
  Radio,
  MapPin,
} from 'lucide-react';
import { useHomeData } from '@/hooks/useHomeData';

export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="8" fill="#22C55E" />
      <path
        d="M5 8L7 10L11 6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const quickFilters = ['All', 'Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel', 'Salone Mix'];

const genreImages: Record<string, string> = {
  'salone-mix': '/images/genres/salone-mix.jpg',
  afrobeats: '/images/genres/afrobeats.jpg',
  amapiano: '/images/genres/amapiano.jpg',
  dancehall: '/images/genres/dancehall.jpg',
  throwbacks: '/images/genres/throwbacks.jpg',
  'club-mixes': '/images/genres/club-mixes.jpg',
  'wedding-mixes': '/images/genres/wedding-mixes.jpg',
  gospel: '/images/genres/gospel.jpg',
};

function PromoBanner() {
  return (
    <section className="overflow-hidden border border-white/10 bg-black-elevated">
      <div className="grid min-h-[220px] grid-cols-1 md:grid-cols-[0.95fr_1.4fr]">
        <div className="relative hidden overflow-hidden md:block">
          <img src="/images/dj-promo/promo-1.jpg" alt="Deck Salone DJs" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black" />
        </div>
        <div className="flex items-center justify-between gap-6 px-6 py-8 sm:px-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold">Featured Platform</p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase tracking-tight text-text-primary sm:text-4xl">
              Sierra Leone&apos;s DJ Network
            </h1>
          </div>
          <Link
            to="/about"
            className="hidden shrink-0 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase text-black transition-transform hover:scale-[1.02] sm:inline-flex"
          >
            About
          </Link>
        </div>
      </div>
    </section>
  );
}

function FilterChips() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {quickFilters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => {
            if (filter === 'All') navigate('/mixes');
            else navigate(`/mixes?genre=${encodeURIComponent(filter)}`);
          }}
          className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
            filter === 'All'
              ? 'bg-gold text-black'
              : 'border border-white/15 bg-transparent text-text-secondary hover:border-gold/50 hover:text-text-primary'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function DjRail({ djs }: { djs: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">DJs for You</h2>
        </div>
        <Link to="/discover" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {djs.slice(0, 4).map((dj) => (
          <Link key={dj.id} to={`/dj/${dj.username || dj.id}`} className="group">
            <article className="overflow-hidden rounded-xl bg-black-surface">
              <div className="aspect-square overflow-hidden bg-white/5">
                <img
                  src={dj.avatar || '/placeholder.jpg'}
                  alt={dj.stageName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-bold text-text-primary">{dj.stageName}</h3>
                  {dj.verified && <VerifiedBadge className="shrink-0" />}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                  <MapPin className="h-3 w-3" />
                  {dj.city || 'Sierra Leone'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(dj.genres || []).slice(0, 2).map((genre: string) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-text-secondary"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MixRail({ categories }: { categories: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Mix Hub</h2>
        </div>
        <Link to="/mixes" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.slice(0, 4).map((category) => (
          <Link key={category.id} to={`/mixes?category=${category.id}`} className="group">
            <article className="overflow-hidden rounded-xl bg-black-surface">
              <div className="aspect-square overflow-hidden">
                <img
                  src={genreImages[category.id] || '/mix-placeholder.jpg'}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-bold text-text-primary">{category.name}</h3>
                <p className="mt-1 text-xs text-gold">{category.count || 0} mixes</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventRail({ events }: { events: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Events</h2>
        </div>
        <Link to="/events" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {events.slice(0, 3).map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="group">
            <article className="flex items-center gap-4 rounded-xl bg-black-surface p-3">
              <img
                src={event.image || '/cover-placeholder.jpg'}
                alt={event.title}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-text-primary">{event.title}</h3>
                <p className="mt-1 truncate text-xs text-text-muted">{event.city || event.location}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase text-gold">
                  Open
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { featuredDJs, mixCategories, events, isLoading } = useHomeData();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <main className="px-5 py-8 lg:px-12">
      <div className="mx-auto max-w-[1240px] space-y-10">
        <PromoBanner />
        <FilterChips />
        <DjRail djs={featuredDJs.data || []} />
        <MixRail categories={mixCategories.data || []} />
        <EventRail events={events.data || []} />
      </div>
    </main>
  );
}
