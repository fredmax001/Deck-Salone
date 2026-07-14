import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  MessageSquare,
  Music,
  ListMusic,
  Camera,
  BarChart3,
  Wallet,
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronRight,
  CreditCard,
  Megaphone,
  BriefcaseBusiness,
  Crown,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import api from '@/lib/api';
import MobileTabBar from '@/components/MobileTabBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useUpgradeModalStore } from '@/stores/upgradeModalStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: Calendar, label: 'Bookings', path: '/dashboard/bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/dashboard/messages' },
  { icon: Music, label: 'Mixes', path: '/dashboard/mixes' },
  { icon: ListMusic, label: 'Sets', path: '/dashboard/sets' },
  { icon: Camera, label: 'Photos', path: '/dashboard/photos' },
  { icon: CalendarDays, label: 'Events', path: '/dashboard/events' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: Wallet, label: 'Earnings', path: '/dashboard/earnings' },
  { icon: User, label: 'Profile', path: '/dashboard/profile' },
  { icon: CreditCard, label: 'Subscription', path: '/dashboard/subscription' },
  { icon: BriefcaseBusiness, label: 'Opportunities', path: '/dashboard/opportunities' },
  { icon: Megaphone, label: 'Promotions', path: '/dashboard/campaigns' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isDj = user?.role === 'DJ';
  const djProfile = user?.djProfile;
  const djName = djProfile?.stageName || user?.email?.split('@')[0] || 'User';
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string>('');
  const avatarUrl = djProfile?.avatar || localAvatarUrl || '';
  const initials = djName.slice(0, 2).toUpperCase();

  // Fetch DJ profile directly if auth store doesn't have avatar yet
  useEffect(() => {
    if (isDj && !djProfile?.avatar) {
      api.get('/djs/me')
        .then((res) => {
          if (res.data.success && res.data.data?.avatar) {
            setLocalAvatarUrl(res.data.data.avatar);
          }
        })
        .catch(() => {}); // 404 means no DJ profile yet
    }
  }, [isDj, djProfile?.avatar]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };



  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Role guard: only DJs may access the DJ dashboard
  useEffect(() => {
    if (user && !isDj) {
      navigate('/user/dashboard', { replace: true });
    }
  }, [user, isDj, navigate]);

  const sidebarWidth = collapsed ? '72px' : '260px';

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
          active
            ? 'bg-gold/10 text-gold'
            : 'text-text-secondary hover:text-text-primary hover:bg-black-elevated'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
          active ? 'bg-gold/20' : 'bg-transparent group-hover:bg-black-surface'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="text-sm font-medium flex-1">{item.label}</span>
        )}
        {!collapsed && active && (
          <ChevronRight className="w-4 h-4 text-gold/60" />
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <Link to="/" className={cn(
        'flex items-center gap-3 px-4 pt-6 pb-4 hover:opacity-80 transition-opacity',
        collapsed && 'justify-center px-2'
      )}>
        <img
          src="/logo.png"
          alt="Deck Salone"
          className="h-10 w-auto object-contain flex-shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">DJ Studio</p>
          </div>
        )}
      </Link>

      {/* DJ Profile Mini */}
      <div className={cn(
        'px-4 py-4 border-b border-dark-gray',
        collapsed && 'px-2 flex justify-center'
      )}>
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'flex-col gap-1'
        )}>
          <div className="relative">
            <Avatar className={cn(
              "w-10 h-10 border-2 relative z-10",
              djProfile?.subscriptionTier === 'legend' 
                ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                : "border-gold/30"
            )}>
              <AvatarImage src={avatarUrl} alt={djName} />
              <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {djProfile?.subscriptionTier === 'legend' && (
              <div className="absolute inset-0 rounded-full border border-yellow-400/50 animate-ping opacity-30 z-0" style={{ animationDuration: '3s' }} />
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                {djName}
                {djProfile?.subscriptionTier === 'legend' && (
                  <Crown size={12} className="text-yellow-400 shrink-0" />
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-text-muted truncate">
                  {isDj ? 'DJ Account' : 'Fan Account'}
                </p>
                {user?.djProfile?.subscriptionTier === 'legend' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-yellow-400/20 text-yellow-400 text-[9px] font-bold uppercase tracking-wider border border-yellow-400/30">
                    <Crown className="w-2.5 h-2.5" />
                    Pro+
                  </span>
                )}
                {user?.djProfile?.subscriptionTier === 'pro' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-gold/20 text-gold text-[9px] font-bold uppercase tracking-wider border border-gold/30">
                    <Zap className="w-2.5 h-2.5" />
                    Pro
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom: Logout */}
      <div className={cn('border-t border-dark-gray p-4', collapsed && 'px-2 flex justify-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 text-text-muted hover:text-red transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-dark-gray transition-all duration-300 z-40 bg-black"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ml-0 lg:ml-[72px] xl:ml-[260px]"
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-dark-gray">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <span className="text-text-secondary">Dashboard</span>
              {location.pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3 text-text-muted" />
                  <span className="text-gold capitalize">
                    {location.pathname.replace('/dashboard/', '').replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </div>

            {/* Center: Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Search bookings, mixes, messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:ring-gold/20"
                />
              </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-text-secondary hover:text-text-primary"
                  >
                    <Bell className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-black-surface border-dark-gray">
                  <div className="p-3 border-b border-dark-gray">
                    <p className="text-sm font-medium text-text-primary">Notifications</p>
                  </div>
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">No new notifications</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-black-elevated">
                    <Avatar className="w-7 h-7 border border-gold/30">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-gold/20 text-gold text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm text-text-primary">{djName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={cn(
            'flex-1 p-4 lg:p-6 overflow-y-auto transition-all duration-300',
            currentTrack ? 'pb-40 lg:pb-24' : 'pb-20 lg:pb-6'
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar items={navItems} />

      {/* Global Upgrade Modal — triggered from any component via useUpgradeModalStore */}
      <GlobalUpgradeModal />
    </div>
  );
}

function GlobalUpgradeModal() {
  const { isOpen, feature, requiredTier, close } = useUpgradeModalStore();
  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={close}
      feature={feature}
      requiredTier={requiredTier}
    />
  );
}
