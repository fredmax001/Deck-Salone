#!/usr/bin/env python3
"""
Add Playlists to the UI:
  1. BottomNav.tsx — add Playlists tab
  2. useHomeData.ts — fetch official playlists
  3. Home.tsx — add PlaylistRail section
"""

# ============================================================
# FIX 1: BottomNav.tsx — add Playlists tab
# ============================================================
with open('/opt/deck-salone-v2/app/src/components/BottomNav.tsx', 'r') as f:
    content = f.read()

# Add ListMusic to imports
content = content.replace(
    "import { Home, Compass, Disc3, Rss, User } from 'lucide-react';",
    "import { Home, Compass, Disc3, Rss, User, ListMusic } from 'lucide-react';"
)

# Add Playlists to mainItems before Feed
old_main = """  const mainItems = [
    ...baseItems,
    { label: 'Feed', path: '/feed', icon: Rss },
  ];"""
new_main = """  const mainItems = [
    ...baseItems,
    { label: 'Playlists', path: '/playlists', icon: ListMusic },
    { label: 'Feed', path: '/feed', icon: Rss },
  ];"""
content = content.replace(old_main, new_main)

with open('/opt/deck-salone-v2/app/src/components/BottomNav.tsx', 'w') as f:
    f.write(content)

print('✅ BottomNav.tsx updated — Playlists tab added')

# ============================================================
# FIX 2: useHomeData.ts — fetch official playlists
# ============================================================
with open('/opt/deck-salone-v2/app/src/hooks/useHomeData.ts', 'r') as f:
    content = f.read()

# Add officialPlaylists query before return
old_return = """  return {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    currentBattle,
    homeAdBoard,
    platformStats,
    isLoading:
      featuredDJs.isLoading ||
      rankings.isLoading ||
      mixCategories.isLoading ||
      events.isLoading ||
      currentBattle.isLoading,
  };"""

new_return = """  const officialPlaylists = useQuery({
    queryKey: ['officialPlaylists', 'home'],
    queryFn: async () => {
      const res = await api.get('/official-playlists?featured=true');
      return res.data.data || [];
    },
  });

  return {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    currentBattle,
    homeAdBoard,
    platformStats,
    officialPlaylists,
    isLoading:
      featuredDJs.isLoading ||
      rankings.isLoading ||
      mixCategories.isLoading ||
      events.isLoading ||
      currentBattle.isLoading ||
      officialPlaylists.isLoading,
  };"""
content = content.replace(old_return, new_return)

with open('/opt/deck-salone-v2/app/src/hooks/useHomeData.ts', 'w') as f:
    f.write(content)

print('✅ useHomeData.ts updated — officialPlaylists query added')

# ============================================================
# FIX 3: Home.tsx — add PlaylistRail + import ListMusic
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/Home.tsx', 'r') as f:
    content = f.read()

# Add ListMusic to imports
content = content.replace(
    "import {\n  ArrowUpRight,\n  Calendar,\n  Headphones,\n  Loader2,\n  Radio,\n  MapPin,\n  Sparkles,\n  CheckCircle2,\n  ArrowRight,\n  Users,\n  Smartphone,\n  Ticket,\n  Play,\n  Trophy,\n  Activity,\n} from 'lucide-react';",
    "import {\n  ArrowUpRight,\n  Calendar,\n  Headphones,\n  Loader2,\n  Radio,\n  MapPin,\n  Sparkles,\n  CheckCircle2,\n  ArrowRight,\n  Users,\n  Smartphone,\n  Ticket,\n  Play,\n  Trophy,\n  Activity,\n  ListMusic,\n} from 'lucide-react';"
)

# Add PlaylistRail component before MixRail
playlist_rail = '''
function PlaylistRail({ playlists }: { playlists: any[] }) {
  if (!playlists || playlists.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListMusic className="h-4 sm:h-5 w-4 sm:w-5 text-gold shrink-0" />
          <h2 className="font-display text-base sm:text-xl font-bold uppercase text-text-primary tracking-wide">Official Playlists</h2>
        </div>
        <Link to="/playlists" className="text-xs font-bold uppercase text-text-muted hover:text-gold flex items-center gap-1 shrink-0">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.slice(0, 3).map((pl: any) => (
          <Link key={pl.id} to={`/playlist/${pl.slug}`} className="group">
            <article className="relative overflow-hidden rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/50 transition-all">
              <div className="relative aspect-video">
                {pl.coverImage ? (
                  <img src={pl.coverImage.startsWith('http') ? pl.coverImage : `/uploads/${pl.coverImage}`} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
                    <ListMusic className="w-10 h-10 text-gold mb-1" />
                    <span className="text-[10px] text-gold font-bold tracking-widest uppercase">Deck Salone Official</span>
                  </div>
                )}
                {pl.isFeatured && (
                  <span className="absolute top-2 left-2 bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ FEATURED</span>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-gold p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
                  <Play className="w-4 h-4 fill-gold" />
                </div>
              </div>
              <div className="p-3.5">
                <h3 className="text-sm font-bold text-white group-hover:text-gold transition truncate">{pl.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{pl.description || 'Official Deck Salone curated playlist.'}</p>
                <p className="text-[10px] text-text-muted mt-1.5">{pl._count?.items || pl.items?.length || 0} Mixes</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

'''

# Insert PlaylistRail before MixRail function
content = content.replace('function MixRail', playlist_rail + 'function MixRail')

# Update Home component to destructure officialPlaylists and render PlaylistRail
old_home = """        {/* Content rails */}
        <FilterChips />
        <DjRail djs={featuredDJs.data || []} />
        <MixRail categories={mixCategories.data || []} />
        <EventRail events={events.data || []} />"""

new_home = """        {/* Content rails */}
        <FilterChips />
        <DjRail djs={featuredDJs.data || []} />
        <PlaylistRail playlists={officialPlaylists.data || []} />
        <MixRail categories={mixCategories.data || []} />
        <EventRail events={events.data || []} />"""
content = content.replace(old_home, new_home)

# Update destructuring to include officialPlaylists
old_destruct = "  const { featuredDJs, mixCategories, events, homeAdBoard, platformStats, isLoading } = useHomeData();"
new_destruct = "  const { featuredDJs, mixCategories, events, homeAdBoard, platformStats, officialPlaylists, isLoading } = useHomeData();"
content = content.replace(old_destruct, new_destruct)

with open('/opt/deck-salone-v2/app/src/pages/Home.tsx', 'w') as f:
    f.write(content)

print('✅ Home.tsx updated — PlaylistRail section added')

print('')
print('🎉 ALL PLAYLIST UI FIXES APPLIED')
