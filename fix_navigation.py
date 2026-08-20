#!/usr/bin/env python3
"""
Fix playlist visibility across the platform:
  1. Layout.tsx — add Playlists + Feed to web sidebar browseItems
  2. BottomNav.tsx — REMOVE Playlists from mobile bottom nav
  3. Feed.tsx — add Playlists tab
  4. AdminDashboard.tsx — add Playlists management section
"""

import re

# ============================================================
# FIX 1: Layout.tsx — add Playlists & Feed to sidebar
# ============================================================
with open('/opt/deck-salone-v2/app/src/components/Layout.tsx', 'r') as f:
    content = f.read()

# Add Playlists after Mix Hub in browseItems
old_browse = """const browseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Flame },
  { label: 'Ranking', path: '/rankings', icon: BarChart3 },
  { label: 'Mix Hub', path: '/mixes', icon: ListMusic },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Battles', path: '/battles', icon: Trophy },
  { label: 'Request DJ', path: '/request-dj', icon: Users },
];"""

new_browse = """const browseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Flame },
  { label: 'Ranking', path: '/rankings', icon: BarChart3 },
  { label: 'Mix Hub', path: '/mixes', icon: ListMusic },
  { label: 'Playlists', path: '/playlists', icon: Library },
  { label: 'Feed', path: '/feed', icon: Radio },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Battles', path: '/battles', icon: Trophy },
  { label: 'Request DJ', path: '/request-dj', icon: Users },
];"""
content = content.replace(old_browse, new_browse)

# Need to import Library icon if not already imported
if 'Library' not in content.split('from')[0]:
    content = content.replace(
        "import {\n  BarChart3,\n  BookOpen,\n  Calendar,\n  Flame,\n  Headphones,\n  HelpCircle,\n  Home,\n  Info,\n  Library,\n  ListMusic,\n  LogOut,\n  Moon,\n  Radio,\n  Search,\n  Sparkles,\n  Sun,\n  Trophy,\n  Upload,\n  Users,\n  Shield,\n} from 'lucide-react';",
        "import {\n  BarChart3,\n  BookOpen,\n  Calendar,\n  Flame,\n  Headphones,\n  HelpCircle,\n  Home,\n  Info,\n  Library,\n  ListMusic,\n  LogOut,\n  Moon,\n  Radio,\n  Search,\n  Sparkles,\n  Sun,\n  Trophy,\n  Upload,\n  Users,\n  Shield,\n} from 'lucide-react';"
    )

with open('/opt/deck-salone-v2/app/src/components/Layout.tsx', 'w') as f:
    f.write(content)

print('✅ Layout.tsx updated — Playlists & Feed added to sidebar')

# ============================================================
# FIX 2: BottomNav.tsx — remove Playlists, keep Feed
# ============================================================
with open('/opt/deck-salone-v2/app/src/components/BottomNav.tsx', 'r') as f:
    content = f.read()

# Remove Playlists from mainItems (revert to original: baseItems + Feed)
old_main = """  const mainItems = [
    ...baseItems,
    { label: 'Playlists', path: '/playlists', icon: ListMusic },
    { label: 'Feed', path: '/feed', icon: Rss },
  ];"""
new_main = """  const mainItems = [
    ...baseItems,
    { label: 'Feed', path: '/feed', icon: Rss },
  ];"""
content = content.replace(old_main, new_main)

# Remove ListMusic from imports if we added it
content = content.replace(
    "import { Home, Compass, Disc3, Rss, User, ListMusic } from 'lucide-react';",
    "import { Home, Compass, Disc3, Rss, User } from 'lucide-react';"
)

with open('/opt/deck-salone-v2/app/src/components/BottomNav.tsx', 'w') as f:
    f.write(content)

print('✅ BottomNav.tsx updated — Playlists removed from mobile bottom nav')

# ============================================================
# FIX 3: Feed.tsx — add Playlists tab
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'r') as f:
    content = f.read()

# Add ListMusic to imports
content = content.replace(
    "import {\n  Loader2,\n  Music2,\n  Headphones,\n  Calendar,\n  TrendingUp,\n  Compass,\n  MapPin,\n  Clock,\n} from 'lucide-react';",
    "import {\n  Loader2,\n  Music2,\n  Headphones,\n  Calendar,\n  TrendingUp,\n  Compass,\n  MapPin,\n  Clock,\n  ListMusic,\n} from 'lucide-react';"
)

# Add Playlists to tabs
old_tabs = """const tabs: { key: FeedTab; label: string; icon: React.ElementType }[] = [
  { key: 'for-you', label: 'For You', icon: Compass },
  { key: 'djs', label: 'DJs', icon: Headphones },
  { key: 'mixes', label: 'Mixes', icon: Music2 },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
];"""

new_tabs = """const tabs: { key: FeedTab; label: string; icon: React.ElementType }[] = [
  { key: 'for-you', label: 'For You', icon: Compass },
  { key: 'djs', label: 'DJs', icon: Headphones },
  { key: 'mixes', label: 'Mixes', icon: Music2 },
  { key: 'playlists', label: 'Playlists', icon: ListMusic },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
];"""
content = content.replace(old_tabs, new_tabs)

# Add playlists to FeedTab type
content = content.replace(
    "type FeedTab = 'for-you' | 'djs' | 'mixes' | 'events' | 'trending';",
    "type FeedTab = 'for-you' | 'djs' | 'mixes' | 'playlists' | 'events' | 'trending';"
)

# Add playlists query
old_queries = """  const djsQuery = useDJs({ limit: 10 });
  const mixesQuery = useMixes({ limit: 10 });
  const eventsQuery = useEvents({ limit: 10 });
  const trendingQuery = useMixes({ sortBy: 'plays', limit: 10 });"""

new_queries = """  const djsQuery = useDJs({ limit: 10 });
  const mixesQuery = useMixes({ limit: 10 });
  const eventsQuery = useEvents({ limit: 10 });
  const trendingQuery = useMixes({ sortBy: 'plays', limit: 10 });
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);"""
content = content.replace(old_queries, new_queries)

# Add useEffect to fetch playlists
old_state = "export default function Feed() {\n  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');"
new_state = """export default function Feed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');

  useEffect(() => {
    if (activeTab === 'playlists') {
      setPlaylistsLoading(true);
      api.get('/official-playlists')
        .then((res) => { if (res.data.success) setPlaylists(res.data.data); })
        .catch(() => {})
        .finally(() => setPlaylistsLoading(false));
    }
  }, [activeTab]);"""
content = content.replace(old_state, new_state)

# Need to add api import if not present
if 'import api' not in content:
    content = content.replace(
        "import SEOHead from '@/components/SEOHead';",
        "import SEOHead from '@/components/SEOHead';\nimport { api } from '@/lib/api';"
    )

# Update isLoading to include playlists
old_loading = """  const isLoading =
    (activeTab === 'djs' && djsQuery.isLoading) ||
    (activeTab === 'mixes' && mixesQuery.isLoading) ||
    (activeTab === 'events' && eventsQuery.isLoading) ||
    (activeTab === 'trending' && trendingQuery.isLoading) ||
    (activeTab === 'for-you' && (djsQuery.isLoading || mixesQuery.isLoading || eventsQuery.isLoading));"""

new_loading = """  const isLoading =
    (activeTab === 'djs' && djsQuery.isLoading) ||
    (activeTab === 'mixes' && mixesQuery.isLoading) ||
    (activeTab === 'events' && eventsQuery.isLoading) ||
    (activeTab === 'trending' && trendingQuery.isLoading) ||
    (activeTab === 'playlists' && playlistsLoading) ||
    (activeTab === 'for-you' && (djsQuery.isLoading || mixesQuery.isLoading || eventsQuery.isLoading));"""
content = content.replace(old_loading, new_loading)

# Add playlists case to renderContent switch
old_switch = """      case 'trending':
        return trending.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No trending mixes yet.</p>
        ) : (
          <div className="space-y-3">
            {trending.map((mix: any) => (
              <MixFeedCard key={mix.id} mix={mix} />
            ))}
          </div>
        );
      case 'for-you':
      default:"""

new_switch = """      case 'playlists':
        return playlistsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No official playlists yet.</p>
        ) : (
          <div className="space-y-3">
            {playlists.map((pl: any) => (
              <Link key={pl.id} to={`/playlist/${pl.slug}`} className="group">
                <div className="flex items-center gap-3.5 rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/40 p-3.5 transition-all">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gold/20">
                    {pl.coverImage ? (
                      <img src={pl.coverImage.startsWith('http') ? pl.coverImage : `/uploads/${pl.coverImage}`} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-black-surface">
                        <ListMusic className="w-6 h-6 text-gold" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors truncate">{pl.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{pl.description || 'Official Deck Salone curated playlist.'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10 text-text-secondary">
                        {pl._count?.items || pl.items?.length || 0} Mixes
                      </span>
                      {pl.isFeatured && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gold/20 text-gold border border-gold/30">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );
      case 'trending':
        return trending.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No trending mixes yet.</p>
        ) : (
          <div className="space-y-3">
            {trending.map((mix: any) => (
              <MixFeedCard key={mix.id} mix={mix} />
            ))}
          </div>
        );
      case 'for-you':
      default:"""
content = content.replace(old_switch, new_switch)

with open('/opt/deck-salone-v2/app/src/pages/Feed.tsx', 'w') as f:
    f.write(content)

print('✅ Feed.tsx updated — Playlists tab added')

# ============================================================
# FIX 4: AdminDashboard.tsx — add Playlists management
# ============================================================
with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Add 'playlists' to AdminSection type
content = content.replace(
    "type AdminSection =\n  | 'dashboard' | 'djs' | 'rankings' | 'mixes' | 'bookings'\n  | 'users' | 'events' | 'revenue' | 'analytics' | 'platforms'\n  | 'verification' | 'notifications' | 'subscriptions' | 'security'\n  | 'ads' | 'roles' | 'settings' | 'battles' | 'opportunities'\n  | 'halloffame' | 'violations' | 'promo';",
    "type AdminSection =\n  | 'dashboard' | 'djs' | 'rankings' | 'mixes' | 'bookings'\n  | 'users' | 'events' | 'revenue' | 'analytics' | 'platforms'\n  | 'verification' | 'notifications' | 'subscriptions' | 'security'\n  | 'ads' | 'roles' | 'settings' | 'battles' | 'opportunities'\n  | 'halloffame' | 'violations' | 'promo' | 'playlists';"
)

# 2. Add playlists to sidebarItems (after mixes)
old_sidebar = "  { id: 'mixes', label: 'Mixes', icon: Music, group: 'Marketplace' },\n  { id: 'bookings', label: 'Bookings', icon: CalendarCheck, group: 'Operations' },"
new_sidebar = "  { id: 'mixes', label: 'Mixes', icon: Music, group: 'Marketplace' },\n  { id: 'playlists', label: 'Playlists', icon: ListMusic, group: 'Marketplace' },\n  { id: 'bookings', label: 'Bookings', icon: CalendarCheck, group: 'Operations' },"
content = content.replace(old_sidebar, new_sidebar)

# 3. Add playlists to sectionComponents
old_components = "    mixes: <MixesSection />,\n    bookings: <BookingsSection />,"
new_components = "    mixes: <MixesSection />,\n    playlists: <PlaylistsSection />,\n    bookings: <BookingsSection />,"
content = content.replace(old_components, new_components)

# 4. Add PlaylistsSection component before AdminBellButton
playlists_section = '''
/* ─────────────────────── Section: Playlists ─────────────────────── */

function PlaylistsSection() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/official-playlists?featured=false');
      if (res.data.success) {
        setPlaylists(res.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this official playlist?')) return;
    try {
      await api.delete(`/moderator/playlists/${id}`);
      toast.success('Playlist deleted');
      fetchPlaylists();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete playlist');
    }
  };

  const handleTogglePublish = async (pl: any) => {
    try {
      await api.put(`/moderator/playlists/${pl.id}`, { isPublished: !pl.isPublished });
      toast.success(pl.isPublished ? 'Playlist unpublished' : 'Playlist published');
      fetchPlaylists();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update playlist');
    }
  };

  const handleToggleFeature = async (pl: any) => {
    try {
      await api.put(`/moderator/playlists/${pl.id}`, { isFeatured: !pl.isFeatured });
      toast.success(pl.isFeatured ? 'Playlist unfeatured' : 'Playlist featured!');
      fetchPlaylists();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update playlist');
    }
  };

  if (loading) return <LoadingCenter />;
  if (error) return <div className="rounded-2xl border border-red-500/20 p-6 text-center"><p className="text-red-400">{error}</p></div>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Official Playlists"
        subtitle={`Manage ${playlists.length} official playlists`}
        action={
          <button
            onClick={() => navigate('/moderator/playlists')}
            className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <ListMusic className="w-4 h-4" /> Manage in Moderator Console
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Playlists</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{playlists.length}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Published</p>
          <p className="font-mono text-2xl font-bold text-green-400 mt-2">{playlists.filter((p) => p.isPublished).length}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Featured</p>
          <p className="font-mono text-2xl font-bold text-gold mt-2">{playlists.filter((p) => p.isFeatured).length}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Tracks</p>
          <p className="font-mono text-2xl font-bold text-purple-400 mt-2">{playlists.reduce((acc, p) => acc + (p._count?.items || p.items?.length || 0), 0)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <table className="w-full text-left">
          <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
            <tr>
              <th className="p-4">Cover</th>
              <th className="p-4">Title</th>
              <th className="p-4">Mixes</th>
              <th className="p-4">Status</th>
              <th className="p-4">Featured</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((pl: any) => (
              <tr key={pl.id} className="border-b border-white/5 text-sm hover:bg-white/[0.02]">
                <td className="p-4">
                  <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                    {pl.coverImage ? (
                      <img src={pl.coverImage.startsWith('http') ? pl.coverImage : `/uploads/${pl.coverImage}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-bold text-text-primary">{pl.title}</p>
                  <p className="text-xs text-text-muted line-clamp-1">{pl.description || '--'}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Slug: /playlist/{pl.slug}</p>
                </td>
                <td className="p-4 font-mono text-text-primary">{pl._count?.items || pl.items?.length || 0}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleTogglePublish(pl)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      pl.isPublished
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                    }`}
                  >
                    {pl.isPublished ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleFeature(pl)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      pl.isFeatured
                        ? 'bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20'
                        : 'bg-white/5 text-text-muted border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {pl.isFeatured ? '⭐ Featured' : 'Not Featured'}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/playlist/${pl.slug}`)} className="p-2 rounded-lg bg-white/5 text-text-muted hover:bg-white/10" title="View"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => navigate('/moderator/playlists')} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(pl.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {playlists.length === 0 && <EmptyState message="No official playlists found." />}
      </div>
    </div>
  );
}

'''

# Insert before AdminBellButton
content = content.replace('function AdminBellButton', playlists_section + 'function AdminBellButton')

with open('/opt/deck-salone-v2/app/src/pages/AdminDashboard.tsx', 'w') as f:
    f.write(content)

print('✅ AdminDashboard.tsx updated — Playlists management section added')

print('')
print('🎉 ALL NAVIGATION FIXES APPLIED')
