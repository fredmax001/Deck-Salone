import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarCheck,
  Trophy,
  Music,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Headphones,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Calendar,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DashboardData {
  overview: {
    totalMixes: number;
    totalStreams: number;
    totalBookings: number;
    totalReviews: number;
    totalFollowers: number;
    averageRating: number;
    rankingPosition: number;
    rankingScore: number;
  };
  recentBookings: any[];
  topMixes: any[];
  recentReviews: any[];
  rankingHistory: { week: string; position: number; score: number }[];
  recentEvents: any[];
  battleEntries: any[];
  payments: any[];
  bookingStatusCounts: { status: string; _count: { status: number } }[];
}

const tooltipStyle = {
  backgroundColor: '#111111',
  border: '1px solid #2A2A2A',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#F5F5F5',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Overview() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    api
      .get('/dashboard')
      .then((res) => {
        if (res.data.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, [isDj]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (!isDj) {
    return <FanDashboard user={user} />;
  }

  const overview = data?.overview;
  const rankingChartData =
    data?.rankingHistory.map((h, i) => ({
      label: `W${i + 1}`,
      position: h.position,
      score: Math.round(h.score),
    })) || [];

  const pendingBookings = data?.recentBookings?.filter((b) => b.status === 'PENDING') || [];
  const confirmedBookings = data?.recentBookings?.filter((b) => b.status === 'CONFIRMED') || [];
  const upcomingEvents = confirmedBookings.slice(0, 3);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Overview
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/bookings">
            <Button variant="outline" className="border-dark-gray text-text-primary hover:bg-black-elevated">
              <CalendarCheck className="w-4 h-4 mr-2" />
              Manage Bookings
            </Button>
          </Link>
          <Link to="/dashboard/mixes">
            <Button className="bg-gold-gradient text-black hover:opacity-90">
              <Music className="w-4 h-4 mr-2" />
              Upload Mix
            </Button>
          </Link>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          icon={CalendarCheck}
          label="Total Bookings"
          value={overview?.totalBookings?.toLocaleString() || '0'}
          change=""
          trend="neutral"
        />
        <KpiCard
          icon={Trophy}
          label="Ranking Position"
          value={`#${overview?.rankingPosition || '-'}`}
          change=""
          trend="neutral"
        />
        <KpiCard
          icon={Headphones}
          label="Total Streams"
          value={overview?.totalStreams?.toLocaleString() || '0'}
          change=""
          trend="neutral"
        />
        <KpiCard
          icon={Users}
          label="Total Followers"
          value={overview?.totalFollowers?.toLocaleString() || '0'}
          change=""
          trend="neutral"
        />
        <KpiCard
          icon={Wallet}
          label="Earnings"
          value={`SLE ${data?.payments?.reduce((sum, p) => sum + (p.amount || 0), 0)?.toLocaleString() || '0'}`}
          change=""
          trend="neutral"
        />
      </motion.div>

      {/* Row 2: Rank Chart + Snapshot */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-black-surface border-dark-gray">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-text-primary">Ranking History</CardTitle>
            <span className="text-sm text-gold font-medium">
              #{overview?.rankingPosition || '-'} · {overview?.rankingScore?.toFixed(1) || '0'} pts
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rankingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="label" stroke="#666" fontSize={12} />
                  <YAxis reversed stroke="#666" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="#D4A24A"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#D4A24A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Rank Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">
                  #{overview?.rankingPosition || '-'}
                </p>
                <p className="text-sm text-text-secondary">Current rank</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Score</span>
                <span className="text-text-primary font-medium">
                  {overview?.rankingScore?.toFixed(1) || '0.0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Reviews</span>
                <span className="text-text-primary font-medium">
                  {overview?.totalReviews || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Rating</span>
                <span className="text-text-primary font-medium">
                  {overview?.averageRating?.toFixed(1) || '0.0'} ★
                </span>
              </div>
            </div>
            <Link to="/dashboard/analytics">
              <Button variant="ghost" className="w-full mt-4 text-gold hover:bg-gold/10">
                View Analytics <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: Recent Bookings + Top Mixes */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black-surface border-dark-gray">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary">Recent Bookings</CardTitle>
            <Link to="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.recentBookings?.length ? (
              <div className="space-y-3">
                {data.recentBookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black-elevated hover:bg-black-surface transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary capitalize truncate">
                        {b.eventType}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {new Date(b.eventDate).toLocaleDateString()} · {b.eventLocation}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs border-0',
                        b.status === 'CONFIRMED' && 'bg-green/10 text-green',
                        b.status === 'PENDING' && 'bg-yellow-500/10 text-yellow-500',
                        b.status === 'COMPLETED' && 'bg-blue/10 text-blue',
                        b.status === 'CANCELLED' && 'bg-red/10 text-red',
                        b.status === 'NEGOTIATING' && 'bg-purple/10 text-purple'
                      )}
                    >
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary mb-2">No bookings yet</p>
                <Link to="/discover">
                  <Button variant="outline" size="sm" className="border-dark-gray text-text-primary">
                    Promote Your Profile
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary">Top Mixes</CardTitle>
            <Link to="/dashboard/mixes">
              <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.topMixes?.length ? (
              <div className="space-y-3">
                {data.topMixes.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black-elevated hover:bg-black-surface transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-medium-gray flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-gold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{m.title}</p>
                        <p className="text-xs text-text-secondary capitalize">{m.genre}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-text-primary font-medium">{m.plays.toLocaleString()}</p>
                      <p className="text-xs text-text-secondary">plays</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary mb-2">No mixes uploaded yet</p>
                <Link to="/dashboard/mixes">
                  <Button variant="outline" size="sm" className="border-dark-gray text-text-primary">
                    Upload Your First Mix
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 4: Upcoming Events + Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-black-surface border-dark-gray">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-black-elevated">
                    <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary capitalize truncate">{e.eventType}</p>
                      <p className="text-xs text-text-secondary">{new Date(e.eventDate).toLocaleDateString()}</p>
                    </div>
                    <Badge className="bg-green/10 text-green border-0 text-xs">Confirmed</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/dashboard/profile">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black-elevated hover:bg-black-surface border border-dark-gray hover:border-gold/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <User className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Edit Profile</p>
                    <p className="text-xs text-text-secondary">Update bio, photos, pricing</p>
                  </div>
                </div>
              </Link>
              <Link to="/dashboard/bookings">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black-elevated hover:bg-black-surface border border-dark-gray hover:border-gold/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <CalendarCheck className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Check Bookings</p>
                    <p className="text-xs text-text-secondary">
                      {pendingBookings.length > 0 ? `${pendingBookings.length} pending requests` : 'No pending requests'}
                    </p>
                  </div>
                </div>
              </Link>
              <Link to="/dashboard/messages">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black-elevated hover:bg-black-surface border border-dark-gray hover:border-gold/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Messages</p>
                    <p className="text-xs text-text-secondary">Chat with clients</p>
                  </div>
                </div>
              </Link>
              <Link to="/dashboard/analytics">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black-elevated hover:bg-black-surface border border-dark-gray hover:border-gold/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <TrendingUp className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">View Analytics</p>
                    <p className="text-xs text-text-secondary">Track performance</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─────────── Fan Dashboard (non-DJ) ─────────── */
function FanDashboard({ user }: { user: any }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto text-center py-12"
    >
      <motion.div variants={itemVariants} className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <User className="w-10 h-10 text-gold" />
      </motion.div>
      <motion.h1 variants={itemVariants} className="text-3xl font-display font-bold text-text-primary uppercase mb-4">
        Welcome, {user?.email?.split('@')[0]}
      </motion.h1>
      <motion.p variants={itemVariants} className="text-text-secondary mb-8">
        You are signed in as a fan / event organizer. Browse DJs, book talent, and explore mixes.
      </motion.p>
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/discover"
          className="inline-flex items-center justify-center h-12 px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
        >
          Discover DJs
        </Link>
        <Link
          to="/booking"
          className="inline-flex items-center justify-center h-12 px-8 border border-dark-gray text-text-primary font-semibold text-sm uppercase tracking-wide rounded-full hover:bg-medium-gray transition-colors"
        >
          Book a DJ
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ─────────── Components ─────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-black-surface border-dark-gray hover:border-gold/20 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gold" />
            </div>
            {trend !== 'neutral' && (
              <div className={cn('flex items-center gap-1 text-xs', trend === 'up' ? 'text-green' : 'text-red')}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{change}</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary font-display">{value}</p>
          <p className="text-sm text-text-secondary mt-1">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
