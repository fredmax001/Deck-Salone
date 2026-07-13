import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Disc3, Trophy, User, Heart, Upload, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const mainItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Discover", path: "/discover", icon: Compass },
  { label: "Mixes", path: "/mixes", icon: Disc3 },
  { label: "Battles", path: "/battles", icon: Trophy },
];

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Do not show bottom nav on admin routes
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const isDj = user?.role === "DJ";
  const profilePath = isAuthenticated ? (isDj ? "/dashboard/profile" : "/user/profile") : "/register";
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split("@")[0] || "Account";
  const avatarUrl = user?.djProfile?.avatar || user?.avatar || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  const isMainActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-black/90">
        <div className="flex items-center justify-around h-14 px-2">
          {mainItems.map((item) => {
            const isActive = isMainActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center w-full h-full space-y-1"
              >
                <item.icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? "text-gold" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    isActive ? "text-gold" : "text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-0.5 bg-gold rounded-b-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {isAuthenticated && user ? (
            <Sheet>
              <SheetTrigger asChild>
                <button className="relative flex h-full w-full flex-col items-center justify-center space-y-1">
                  <Avatar className="h-6 w-6 border border-gold/30">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-gold/20 text-[9px] font-bold text-gold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium text-text-muted">Me</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-black-surface border-t border-dark-gray px-4 pb-8">
                <SheetHeader className="pb-2">
                  <SheetTitle className="text-text-primary text-sm font-semibold uppercase tracking-wider">Account</SheetTitle>
                </SheetHeader>

                <div className="grid grid-cols-4 gap-3 pt-4">
                  <SheetClose asChild>
                    <Link to={profilePath} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-text-secondary hover:bg-black-surface hover:text-gold">
                      <User className="h-6 w-6" />
                      <span className="text-xs font-medium">Profile</span>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to={isDj ? "/dashboard/mixes" : "/user/activity"} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-text-secondary hover:bg-black-surface hover:text-gold">
                      <Heart className="h-6 w-6" />
                      <span className="text-xs font-medium">Likes</span>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to={isDj ? "/dashboard/sets" : "/mixes"} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-text-secondary hover:bg-black-surface hover:text-gold">
                      <Radio className="h-6 w-6" />
                      <span className="text-xs font-medium">Sets</span>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to={isDj ? "/dashboard/mixes" : "/user/activity"} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-text-secondary hover:bg-black-surface hover:text-gold">
                      <Upload className="h-6 w-6" />
                      <span className="text-xs font-medium">Uploads</span>
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link
              to="/register"
              className="relative flex h-full w-full flex-col items-center justify-center space-y-1"
            >
              <Avatar className="h-6 w-6 border border-white/20">
                <AvatarImage src="" alt="Sign Up" />
                <AvatarFallback className="bg-white/10 text-[9px] font-bold text-text-muted">
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-text-muted">Sign Up</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
