import { type FormEvent, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Calendar,
  Flame,
  Headphones,
  Library,
  ListMusic,
  LogOut,
  Radio,
  Search,
  Settings,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

const browseItems = [
  { label: "Discover", path: "/discover", icon: Flame },
  { label: "Ranking", path: "/rankings", icon: BarChart3 },
  { label: "Mix Hub", path: "/mixes", icon: ListMusic },
  { label: "Events", path: "/events", icon: Calendar },
  { label: "Battles", path: "/battles", icon: Trophy },
  { label: "Request DJ", path: "/request-dj", icon: Users },
];

const studioItems = [
  { label: "DJ Dashboard", path: "/dashboard", icon: Headphones },
  { label: "Upload Mix", path: "/dashboard/mixes", icon: Upload },
  { label: "Bookings", path: "/dashboard/bookings", icon: Library },
  { label: "Sets", path: "/dashboard/sets", icon: Radio },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const { user, isAuthenticated, logout } = useAuthStore();
  const isDj = user?.role === "DJ";
  const subscriptionTier = user?.djProfile?.subscriptionTier || "free";
  const shouldShowGetPro = isDj && subscriptionTier === "free";
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split("@")[0] || "Account";
  const avatarUrl = user?.djProfile?.avatar || user?.avatar || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/discover") return location.pathname === "/" || location.pathname === "/discover";
    return location.pathname.startsWith(path);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") || "").trim();
    if (query) {
      navigate(`/discover?search=${encodeURIComponent(query)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-[100dvh] bg-black text-text-primary">
      {/* Desktop Sidebar — hidden on mobile and tablet (lg breakpoint) */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[300px] flex-col border-r border-white/10 bg-black px-7 py-7">
        <Link to="/" className="flex h-14 items-center">
          <img
            src="/logo-web.png"
            alt="Deck Salone"
            className="max-h-11 w-auto max-w-[210px] object-contain"
          />
        </Link>

        <nav className="mt-12 flex-1 space-y-10 overflow-y-auto pb-6">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Browse</p>
            <div className="space-y-2">
              {browseItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-4 rounded-full px-5 py-4 text-base font-bold transition-colors",
                    isActive(item.path)
                      ? "bg-white/10 text-text-primary"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  )}
                >
                  <item.icon className="h-6 w-6 text-gold" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {isDj && (
            <div className="border-t border-white/10 pt-10">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Studio</p>
              <div className="space-y-2">
                {studioItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-4 rounded-full px-5 py-4 text-base font-bold text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
                  >
                    <item.icon className="h-6 w-6 text-gold" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Tablet Sidebar — visible only on md-lg range (tablet) */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 z-40 h-screen w-20 flex-col items-center border-r border-white/10 bg-black py-6">
        <Link to="/" className="flex h-12 items-center justify-center mb-8">
          <img src="/logo-icon.png" alt="Deck Salone" className="h-8 w-8 object-contain" />
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-4 overflow-y-auto pb-6 w-full">
          {browseItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-center rounded-xl w-12 h-12 transition-colors",
                isActive(item.path)
                  ? "bg-white/10 text-text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5 text-gold" />
            </Link>
          ))}
          {isDj && (
            <>
              <div className="w-8 border-t border-white/10 my-2" />
              {studioItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center justify-center rounded-xl w-12 h-12 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
                  title={item.label}
                >
                  <item.icon className="h-5 w-5 text-gold" />
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Tablet profile icon at bottom */}
        <div className="mt-auto pt-4 pb-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-white/10">
                  <Avatar className="h-8 w-8 border border-gold/30">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gold/20 text-[10px] font-bold text-gold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="border-dark-gray bg-black-surface">
                <DropdownMenuItem asChild>
                  <Link to={isDj ? "/dashboard/profile" : "/user/profile"} className="cursor-pointer">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={isDj ? "/dashboard/settings" : "/user/settings"} className="cursor-pointer">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-dark-gray" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/register" className="flex items-center justify-center rounded-xl w-10 h-10 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors" title="Sign Up">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarFallback className="bg-white/10 text-text-muted">
                  <Settings className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </aside>

      <div className="min-h-[100dvh] md:ml-20 lg:ml-[300px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
          <div className="flex items-center gap-2 lg:gap-3">
            <Link to="/" className="flex shrink-0 items-center md:hidden">
              <img src="/logo-icon.png" alt="Deck Salone" className="h-9 w-9 object-contain" />
            </Link>

            {shouldShowGetPro && (
              <Link
                to="/dashboard/subscription"
                className="shrink-0 rounded-full bg-white/10 px-3 py-3 text-[11px] font-bold uppercase text-text-primary transition-colors hover:bg-white/15 sm:px-4 sm:text-xs"
              >
                Get Pro
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto shrink-0 text-text-secondary hover:text-gold md:hidden">
                  <Search className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] border-dark-gray bg-black-surface p-3">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                  <input
                    name="q"
                    type="search"
                    autoFocus
                    placeholder="Search DJs, mixes, genres"
                    className="h-12 w-full rounded-full border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm font-medium text-text-primary outline-none placeholder:text-text-muted focus:border-gold/50"
                  />
                </form>
              </DropdownMenuContent>
            </DropdownMenu>

            <form onSubmit={handleSearch} className="relative mx-auto hidden w-full max-w-xl md:block">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
              <input
                name="q"
                type="search"
                placeholder="Search DJs, mixes, genres"
                className="h-14 w-full rounded-full border border-white/10 bg-white/10 py-4 pl-14 pr-5 text-sm font-medium text-text-primary outline-none placeholder:text-text-muted focus:border-gold/50"
              />
            </form>

            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative shrink-0 text-text-secondary hover:text-text-primary hidden md:flex">
                <Bell className="h-5 w-5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 text-text-secondary hover:text-text-primary md:hidden">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-dark-gray bg-black-surface">
                <DropdownMenuItem asChild>
                  <Link to="/rankings" className="cursor-pointer">Ranking</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/events" className="cursor-pointer">Events</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/request-dj" className="cursor-pointer">Request DJ</Link>
                </DropdownMenuItem>
                {isAuthenticated && (
                  <>
                    <DropdownMenuSeparator className="bg-dark-gray" />
                    <DropdownMenuItem asChild>
                      <Link to={isDj ? "/dashboard/settings" : "/user/settings"} className="cursor-pointer">Settings</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {!isAuthenticated && (
                  <>
                    <DropdownMenuSeparator className="bg-dark-gray" />
                    <DropdownMenuItem asChild>
                      <Link to="/login" className="cursor-pointer">Login</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden h-12 shrink-0 gap-2 rounded-full px-2 hover:bg-white/10 md:flex">
                    <Avatar className="h-9 w-9 border border-gold/30">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-gold/20 text-xs font-bold text-gold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-dark-gray bg-black-surface">
                  <DropdownMenuItem asChild>
                    <Link to={isDj ? "/dashboard/profile" : "/user/profile"} className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={isDj ? "/dashboard/settings" : "/user/settings"} className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="hidden shrink-0 rounded-full border border-white/15 px-4 py-3 text-xs font-bold text-text-primary transition-colors hover:border-gold/50 sm:px-5 sm:text-sm md:inline-flex"
              >
                Login
              </Link>
            )}

            {isDj && (
              <Link
                to="/dashboard/mixes"
                className="hidden h-14 shrink-0 items-center gap-2 rounded-full bg-gold px-5 py-4 text-sm font-bold uppercase text-black transition-transform hover:scale-[1.02] md:inline-flex"
              >
                <Upload className="h-5 w-5" />
                Upload
              </Link>
            )}
          </div>
        </header>

        <main
          className={cn(
            "transition-all duration-300",
            currentTrack ? "pb-44 md:pb-28 lg:pb-28" : "pb-24 md:pb-12 lg:pb-12"
          )}
        >
          <Outlet />
        </main>

        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
