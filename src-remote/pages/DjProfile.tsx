import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Crown,
  Star,
  Play,
  Heart,
  MessageCircle,

  Music,
  Headphones,
  Calendar,
  Clock,
  Instagram,
  Twitter,
  Facebook,
  Mail,
  Globe,
  Phone,
  ThumbsUp,
  Check,
  X,
  TrendingUp,
  Loader2,
  UserPlus,
  UserCheck,
  Zap,
} from "lucide-react";
import { cn, imageFallback } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useDJ, useDJs, useFollowDj, useIsFollowingDj } from "@/hooks/useDJs";
import { useReviews } from "@/hooks/useReviews";
import { useRankingHistory } from "@/hooks/useRankings";
import { useCreateBooking, type BookingData } from "@/hooks/useBookings";
import ShareButton from "@/components/ShareButton";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

/* ───── Types (mirror backend shape) ───── */
interface StreamingPlatform {
  platform: string;
  followers: number;
  streams: number;
}

interface Mix {
  id: string;
  title: string;
  coverImage?: string;
  duration?: string | number;
  plays: number;
  likes?: number;
  createdAt: string;
  category?: string;
  genre?: string;
  audioUrl?: string;
  audioSource?: string;
  dj?: { id: string; stageName: string; avatar?: string; city?: string };
}

interface HighlightItem {
  id: string;
  mixId: string;
  sortOrder: number;
  mix: Mix;
}

interface SetSummary {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  genre?: string;
  isPublic: boolean;
  createdAt: string;
  mixCount: number;
}

interface ReupItem {
  id: string;
  mixId: string;
  createdAt: string;
  mix: Mix;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { email: string };
}

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  status: string;
  ticketUrl?: string | null;
}

interface DJ {
  id: string;
  username?: string;
  userId?: string;
  stageName: string;
  fullName?: string;
  avatar: string;
  coverBanner?: string;
  bio?: string;
  city: string;
  country: string;
  genres: string[];
  equipment: string[];
  languages: string[];
  awards: string[];
  startYear: number;
  bookingFeeMin: number;
  bookingFeeMax: number;
  currency: string;
  verified: boolean;
  rankingPosition: number;
  rankingScore: number;
  digitalScore: number;
  industryScore: number;
  communityScore: number;
  totalFollowers: number;
  totalStreams: number;
  totalMixes: number;
  totalBookings: number;
  totalEvents: number;
  averageRating: number;
  badges: string[];
  user: { email: string };
  streamingPlatforms: StreamingPlatform[];
  mixes: Mix[];
  reviews: Review[];
  events: Event[];
  photos?: { id: string; url: string; caption?: string }[];
  socialLinks?: Record<string, string>;
  streamingLinks?: Record<string, string>;
  website?: string;
  whatsappNumber?: string;
  subscriptionTier?: 'free' | 'pro' | 'legend';
  monthlyListeners: number;
  highlights: HighlightItem[];
  sets: SetSummary[];
  reups: ReupItem[];
}

interface RankingHistoryPoint {
  id: string;
  week: string;
  position: number;
  score: number;
  createdAt: string;
}

/* ───── Helpers ───── */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatCompact(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFee(min: number, max: number, currency: string): string {
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);
  return `${currency} ${fmt(min)} - ${fmt(max)}`;
}

function getInitials(email: string): string {
  const name = email?.split("@")[0] || "";
  return name.charAt(0).toUpperCase();
}

function getDisplayName(email: string): string {
  const name = email?.split("@")[0] || "Anonymous";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function parseBudget(value: string): number {
  const numeric = parseFloat(value);
  if (!isNaN(numeric)) return numeric;
  switch (value) {
    case "1K-5K":
      return 1000;
    case "5K-10K":
      return 5000;
    case "10K-20K":
      return 10000;
    case "20K+":
      return 20000;
    default:
      return 0;
  }
}

function parseDuration(value: string): number {
  const numeric = parseInt(value, 10);
  if (!isNaN(numeric)) return numeric;
  switch (value) {
    case "1-3":
      return 2;
    case "3-5":
      return 4;
    case "5+":
      return 6;
    default:
      return 3;
  }
}

/* ───── Animation variants ───── */
const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ───── Star Rating Component ───── */
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(
            "",
            star <= rating
              ? "fill-gold text-gold"
              : star - 0.5 <= rating
              ? "fill-gold/50 text-gold"
              : "text-[#2A2A2A]"
          )}
        />
      ))}
    </div>
  );
}

/* ───── Booking Modal ───── */
function BookingModal({
  isOpen,
  onClose,
  dj,
}: {
  isOpen: boolean;
  onClose: () => void;
  dj: DJ;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const createBooking = useCreateBooking();

  const [form, setForm] = useState({
    eventType: "",
    date: "",
    location: "",
    city: dj.city,
    guests: "",
    budget: "",
    duration: "3",
    details: "",
    contactName: "",
    contactPhone: "",
    contactEmail: currentUser?.email || "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...prev,
        city: dj.city,
        contactEmail: currentUser?.email || prev.contactEmail,
      }));
    }
  }, [isOpen, dj.city, currentUser?.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createBooking.isPending) return;

    const notes = [
      form.guests && `Guests: ${form.guests}`,
      `Contact: ${form.contactName} | ${form.contactPhone} | ${form.contactEmail}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const data: BookingData = {
      djId: dj.id,
      eventType: form.eventType,
      eventDate: form.date,
      eventLocation: [form.location, form.city].filter(Boolean).join(', '),
      duration: parseDuration(form.duration),
      budget: form.budget ? parseBudget(form.budget) : 0,
      notes,
      requirements: form.details,
    };

    createBooking.mutate(data, {
      onSuccess: () => {
        setTimeout(onClose, 1500);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-[560px] bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1E1E1E] transition-colors"
          >
            <X size={20} className="text-text-muted" />
          </button>

          <h2 className="font-display text-xl sm:text-2xl font-semibold text-text-primary uppercase tracking-tight">
            Request Booking
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Book {dj.stageName} for your event
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Event Type */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Event Type
              </label>
              <select
                required
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                <option value="">Select event type</option>
                <option value="Wedding">Wedding</option>
                <option value="Club Night">Club Night</option>
                <option value="Corporate">Corporate Event</option>
                <option value="Private Party">Private Party</option>
                <option value="Festival">Festival</option>
                <option value="Birthday">Birthday</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date & Location row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Event Date
                </label>
                <input
                  required
                  type="date"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Location
                </label>
                <input
                  required
                  type="text"
                  placeholder="City or Venue"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                City
              </label>
              <input
                required
                type="text"
                placeholder="City"
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            {/* Guests, Budget, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Expected Guests
                </label>
                <select
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                >
                  <option value="">Select range</option>
                  <option value="50">50 - 100</option>
                  <option value="100">100 - 250</option>
                  <option value="250">250 - 500</option>
                  <option value="500">500 - 1000</option>
                  <option value="1000">1000+</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Budget Range
                </label>
                <select
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                >
                  <option value="">Select range</option>
                  <option value="1K-5K">SLE 1K - 5K</option>
                  <option value="5K-10K">SLE 5K - 10K</option>
                  <option value="10K-20K">SLE 10K - 20K</option>
                  <option value="20K+">SLE 20K+</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Duration
                </label>
                <select
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                >
                  <option value="1">1 - 3 hours</option>
                  <option value="3">3 - 5 hours</option>
                  <option value="5">5+ hours</option>
                </select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Contact Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="Your name"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Contact Phone
                </label>
                <input
                  required
                  type="tel"
                  placeholder="Your phone number"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Contact Email
              </label>
              <input
                required
                type="email"
                placeholder="Your email"
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Additional Details
              </label>
              <textarea
                rows={4}
                placeholder="Tell us more about your event, special requirements, preferred music style, etc."
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all resize-none"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>

            {/* Feedback */}
            {createBooking.isSuccess && (
              <div className="rounded-lg bg-green/15 text-green px-4 py-3 text-sm">
                Booking request sent successfully!
              </div>
            )}
            {createBooking.isError && (
              <div className="rounded-lg bg-red-500/15 text-red-400 px-4 py-3 text-sm">
                {createBooking.error instanceof Error
                  ? createBooking.error.message
                  : "Failed to send booking request. Please try again."}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={createBooking.isPending}
                className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-semibold text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createBooking.isPending}
                className="flex-1 px-6 py-3 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {createBooking.isPending && <Loader2 size={16} className="animate-spin" />}
                {createBooking.isPending ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ───── Tab Components ───── */
function OverviewTab({ dj }: { dj: DJ }) {
  const hasSocialLinks =
    dj.socialLinks &&
    Object.values(dj.socialLinks).some((v) => v && v.trim());

  const hasStreamingLinks =
    dj.streamingLinks &&
    Object.values(dj.streamingLinks).some((v) => v && v.trim());

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left Column */}
      <div className="space-y-8">
        {/* About */}
        {dj.bio && (
          <section>
            <span className="section-label">About</span>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-relaxed text-text-secondary">{dj.bio}</p>
            </div>
          </section>
        )}

        {/* Genres */}
        <section>
          <span className="section-label">Genres</span>
          <div className="mt-4 flex flex-wrap gap-2">
            {dj.genres.map((genre) => (
              <span
                key={genre}
                className="px-4 py-1.5 rounded-full border border-[rgba(255,255,255,0.2)] text-sm text-text-primary"
              >
                {genre}
              </span>
            ))}
          </div>
        </section>

        {/* Equipment */}
        {dj.equipment.length > 0 && (
          <section>
            <span className="section-label">Equipment</span>
            <div className="mt-4 space-y-3">
              {dj.equipment.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-text-secondary">
                  <Headphones size={16} className="text-gold" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages */}
        {dj.languages.length > 0 && (
          <section>
            <span className="section-label">Languages</span>
            <p className="mt-4 text-sm text-text-secondary">{dj.languages.join(", ")}</p>
          </section>
        )}

        {/* Awards */}
        {dj.awards.length > 0 && (
          <section>
            <span className="section-label">Awards</span>
            <div className="mt-4 space-y-3">
              {dj.awards.map((award) => (
                <div key={award} className="flex items-center gap-3 text-sm text-gold">
                  <Crown size={16} />
                  <span>{award}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Booking Info Card */}
        <div className="bg-[#111111] border border-[rgba(212,162,74,0.15)] rounded-2xl p-6">
          <span className="section-label">Booking Information</span>
          <div className="mt-4">
            <p className="font-mono-data text-2xl font-semibold text-gold">
              {formatFee(dj.bookingFeeMin, dj.bookingFeeMax, dj.currency)}
            </p>
            <p className="mt-1 text-xs text-text-muted">per event</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
            </span>
            <span className="text-sm text-text-secondary">Available for bookings</span>
          </div>
          <p className="mt-2 text-xs text-text-muted">Typically responds within 24 hours</p>
        </div>

        {/* Streaming Platforms */}
        {dj.streamingPlatforms.length > 0 && (
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
            <span className="section-label">Streaming Platforms</span>
            <div className="mt-4 space-y-3">
              {dj.streamingPlatforms.map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Music size={18} className="text-gold" />
                    <span className="text-sm text-text-secondary capitalize">
                      {platform.platform.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </div>
                  <span className="font-mono-data text-sm text-gold">
                    {formatCompact(platform.followers)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
            <span className="section-label">Social Media</span>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {dj.socialLinks?.instagram && (
                <a
                  href={dj.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center text-text-muted hover:text-gold hover:bg-[rgba(212,162,74,0.1)] transition-colors"
                  title="Instagram"
                >
                  <Instagram size={18} />
                </a>
              )}
              {dj.socialLinks?.twitter && (
                <a
                  href={dj.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center text-text-muted hover:text-gold hover:bg-[rgba(212,162,74,0.1)] transition-colors"
                  title="X (Twitter)"
                >
                  <Twitter size={18} />
                </a>
              )}
              {dj.socialLinks?.tiktok && (
                <a
                  href={dj.socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center text-text-muted hover:text-gold hover:bg-[rgba(212,162,74,0.1)] transition-colors"
                  title="TikTok"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </a>
              )}
              {dj.socialLinks?.youtube && (
                <a
                  href={dj.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center text-text-muted hover:text-gold hover:bg-[rgba(212,162,74,0.1)] transition-colors"
                  title="YouTube"
                >
                  <Play size={18} />
                </a>
              )}
              {dj.socialLinks?.facebook && (
                <a
                  href={dj.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center text-text-muted hover:text-gold hover:bg-[rgba(212,162,74,0.1)] transition-colors"
                  title="Facebook"
                >
                  <Facebook size={18} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Streaming Links */}
        {hasStreamingLinks && (
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
            <span className="section-label">Streaming Platforms</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  { key: 'audiomack', label: 'Audiomack' },
                  { key: 'mixcloud', label: 'Mixcloud' },
                  { key: 'soundcloud', label: 'SoundCloud' },
                  { key: 'youtube', label: 'YouTube' },
                  { key: 'hearthis', label: 'Hearthis.at' },
                  { key: 'appleMusic', label: 'Apple Music' },
                  { key: 'spotify', label: 'Spotify' },
                ] as const
              ).map(
                ({ key, label }) =>
                  dj.streamingLinks?.[key] && (
                    <a
                      key={key}
                      href={dj.streamingLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-[#181818] border border-[rgba(255,255,255,0.08)] text-xs text-text-secondary hover:text-gold hover:border-gold/30 transition-colors"
                    >
                      <Music size={12} className="inline mr-1.5 text-gold" />
                      {label}
                    </a>
                  )
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
          <span className="section-label">Contact</span>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Mail size={16} className="text-gold" />
              <span>{dj.user.email}</span>
            </div>
            {dj.website && (
              <a
                href={dj.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-text-secondary hover:text-gold transition-colors"
              >
                <Globe size={16} className="text-gold" />
                <span>{dj.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {dj.whatsappNumber && (
              <a
                href={`https://wa.me/${dj.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-text-secondary hover:text-gold transition-colors"
              >
                <Phone size={16} className="text-gold" />
                <span>{dj.whatsappNumber}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MixesTab({ dj }: { dj: DJ }) {
  const [likedMixes, setLikedMixes] = useState<string[]>([]);

  const toggleLike = (id: string) => {
    setLikedMixes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Streaming platforms bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["All", "YouTube", "Audiomack", "Mixcloud", "SoundCloud"].map(
          (platform, i) => (
            <button
              key={platform}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                i === 0
                  ? "bg-[rgba(212,162,74,0.15)] text-gold border border-gold/30"
                  : "border border-[rgba(255,255,255,0.1)] text-text-muted hover:text-text-primary hover:border-[rgba(255,255,255,0.3)]"
              )}
            >
              {platform}
            </button>
          )
        )}
      </div>

      {/* Mix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dj.mixes.map((mix, i) => (
          <motion.div
            key={mix.id}
            className="group bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-[rgba(212,162,74,0.3)] hover:-translate-y-1 hover:shadow-card transition-all duration-300"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            {/* Artwork */}
            <div className="relative aspect-square overflow-hidden">
              <img
                src={mix.coverImage || "/mix-placeholder.jpg"}
                alt={mix.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              {/* Play button on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => {
                    if (mix.audioUrl) {
                      window.dispatchEvent(new CustomEvent('play-mix', { 
                        detail: { track: mix, queue: dj.mixes.filter((m: any) => m.audioUrl) } 
                      }));
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                  disabled={!mix.audioUrl}
                >
                  <Play size={20} className="text-black ml-0.5" fill="black" />
                </button>
              </div>
              {/* Duration badge */}
              {mix.duration && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-gold text-black text-xs font-mono-data font-semibold">
                  {mix.duration}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h4 className="font-display text-sm font-semibold uppercase text-text-primary truncate">
                {mix.title}
              </h4>
              <p className="mt-1 text-xs text-text-muted uppercase tracking-wider">
                {formatDate(mix.createdAt)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Play size={12} />
                  <span className="font-mono-data">{formatCompact(mix.plays)}</span>
                </div>
                <button
                  onClick={() => toggleLike(mix.id)}
                  className="p-1.5 rounded-full hover:bg-[#1E1E1E] transition-colors"
                >
                  <Heart
                    size={16}
                    className={cn(
                      "transition-colors",
                      likedMixes.includes(mix.id)
                        ? "fill-red text-red"
                        : "text-text-muted"
                    )}
                  />
                </button>
              </div>
              {/* Mini waveform */}
              <div className="mt-3 h-10 flex items-end gap-[2px]">
                {Array.from({ length: 30 }).map((_, wi) => {
                  const height = 20 + Math.sin(wi * 0.8) * 15 + Math.random() * 15;
                  return (
                    <div
                      key={wi}
                      className="flex-1 rounded-full bg-[#1E1E1E] group-hover:bg-gold/30 transition-colors"
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {dj.mixes.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <Music size={48} className="mx-auto mb-4 opacity-50" />
          <p>No mixes yet</p>
        </div>
      )}
    </motion.div>
  );
}

function PhotosTab({ dj }: { dj: DJ }) {
  const photos = dj.photos || [];

  if (photos.length === 0) {
    return (
      <motion.div
        className="text-center py-20 text-text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p>No photos yet</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {photos.map((photo, i) => (
        <motion.div
          key={photo.id}
          className="group relative aspect-square rounded-xl overflow-hidden bg-[#111111] border border-[rgba(255,255,255,0.05)]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <img
            src={photo.url}
            alt={photo.caption || `${dj.stageName} photo`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.jpg'; }}
          />
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-xs text-white/80 truncate">{photo.caption}</p>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function StatsTab({ dj }: { dj: DJ }) {
  const { data: rankingHistory = [], isLoading } = useRankingHistory(dj.id);

  const rankingChartData = useMemo(
    () =>
      [...rankingHistory]
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
        .map((point: RankingHistoryPoint, i: number) => ({
          label: `W${i + 1}`,
          position: point.position,
        })),
    [rankingHistory]
  );

  const metrics = [
    { label: "Total Streams", value: formatCompact(dj.totalStreams), color: "gold" },
    { label: "Followers", value: formatCompact(dj.totalFollowers), color: "text-primary" },
    { label: "Mixes", value: formatNumber(dj.totalMixes), color: "text-primary" },
    { label: "Bookings", value: formatNumber(dj.totalBookings), color: "text-primary" },
    { label: "Events", value: formatNumber(dj.totalEvents), color: "text-primary" },
    { label: "Avg Rating", value: dj.averageRating.toFixed(1), color: "gold" },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left Column - Charts */}
      <div className="space-y-8">
        {/* Metrics Grid */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
          <h3 className="section-label mb-6">Key Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-[#181818] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 text-center"
              >
                <p
                  className={cn(
                    "font-mono-data text-xl font-semibold",
                    metric.color === "gold" ? "text-gold" : "text-text-primary"
                  )}
                >
                  {metric.value}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Trend */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Ranking Trend
            </span>
            <span className="flex items-center gap-1 text-xs text-green">
              <TrendingUp size={14} />
              Trending Up
            </span>
          </div>
          {isLoading ? (
            <div className="h-[150px] flex items-center justify-center text-text-muted">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : rankingChartData.length > 0 ? (
            <>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="label" stroke="#6B6B6B" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="#6B6B6B"
                      fontSize={10}
                      tickLine={false}
                      reversed
                      domain={[1, "dataMax + 1"]}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        background: "#111111",
                        border: "1px solid #2A2A2A",
                        borderRadius: 8,
                        color: "#F5F5F5",
                      }}
                    />
                    <Bar dataKey="position" fill="#D4A24A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                <span>{rankingChartData.length} weeks ago</span>
                <span>This week</span>
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-text-muted text-sm">
              No ranking history available
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Key Metrics */}
      <div className="space-y-6">
        {/* Score Circle */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 text-center">
          <span className="font-mono-data text-5xl font-bold text-gold">
            {dj.rankingScore}
          </span>
          <p className="mt-1 text-xs text-text-muted uppercase tracking-wider">
            Ranking Score
          </p>

          {/* Circular progress */}
          <div className="mt-6 flex justify-center">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#1E1E1E"
                strokeWidth="8"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#D4A24A"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 52 * (1 - Math.min(dj.rankingScore, 100) / 100),
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
          </div>

          {/* Breakdown */}
          <div className="mt-6 space-y-4">
            {[
              { label: "Digital Score", value: dj.digitalScore, max: 100 },
              { label: "Industry Score", value: dj.industryScore, max: 100 },
              { label: "Community Score", value: dj.communityScore, max: 100 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="font-mono-data text-gold">
                    {item.value}/{item.max}
                  </span>
                </div>
                <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gold-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / item.max) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewsTab({ dj }: { dj: DJ }) {
  const { data: reviews = [], isLoading } = useReviews(dj.id);
  const [helpfulReviews, setHelpfulReviews] = useState<string[]>([]);

  const toggleHelpful = (id: string) => {
    setHelpfulReviews((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const ratingDistribution = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review: Review) => {
      const rounded = Math.min(5, Math.max(1, Math.round(review.rating)));
      dist[rounded as keyof typeof dist] += 1;
    });
    return dist;
  }, [reviews]);

  const maxCount = Math.max(1, ...Object.values(ratingDistribution));
  const ratingCount = reviews.length;

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left - Review Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <>
            {reviews.map((review: Review, i: number) => (
              <motion.div
                key={review.id}
                className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {/* Reviewer info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1E1E1E] flex items-center justify-center text-sm font-semibold text-gold">
                      {getInitials(review.user.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {getDisplayName(review.user.email)}
                      </p>
                      <p className="text-xs text-text-muted">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} size={14} />
                </div>

                {/* Comment */}
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {review.comment}
                </p>

                {/* Helpful */}
                <button
                  onClick={() => toggleHelpful(review.id)}
                  className={cn(
                    "mt-3 flex items-center gap-1.5 text-xs transition-colors",
                    helpfulReviews.includes(review.id)
                      ? "text-gold"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  <ThumbsUp size={14} />
                  Helpful ({helpfulReviews.includes(review.id) ? 1 : 0})
                </button>
              </motion.div>
            ))}

            {reviews.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>No reviews yet</p>
              </div>
            )}

            {reviews.length > 0 && (
              <button className="w-full py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-semibold text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                Load More Reviews
              </button>
            )}
          </>
        )}
      </div>

      {/* Right - Rating Summary */}
      <div className="lg:sticky lg:top-24 h-fit">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
          {/* Average */}
          <div className="text-center">
            <p className="font-mono-data text-5xl font-bold text-gold">{dj.averageRating.toFixed(1)}</p>
            <div className="mt-2 flex justify-center">
              <StarRating rating={Math.round(dj.averageRating)} size={24} />
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {ratingCount} reviews
            </p>
          </div>

          {/* Distribution bars */}
          <div className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution];
              const percent = (count / maxCount) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-3">{star}</span>
                  <Star size={10} className="text-gold" />
                  <div className="flex-1 h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gold-gradient"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * (5 - star) }}
                    />
                  </div>
                  <span className="font-mono-data text-xs text-text-muted w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Write Review */}
          <button className="mt-6 w-full py-3 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform">
            Write a Review
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EventsTab({ dj }: { dj: DJ }) {
  const [eventsSubTab, setEventsSubTab] = useState<"upcoming" | "past">("upcoming");

  const now = new Date();
  const upcoming = dj.events.filter((event) => new Date(event.date) >= now);
  const past = dj.events.filter((event) => new Date(event.date) < now);
  const events = eventsSubTab === "upcoming" ? upcoming : past;

  const statusColors: Record<string, string> = {
    Confirmed: "bg-green/15 text-green",
    CONFIRMED: "bg-green/15 text-green",
    Pending: "bg-orange/15 text-orange",
    PENDING: "bg-orange/15 text-orange",
    Completed: "bg-[#1E1E1E] text-text-muted",
    COMPLETED: "bg-[#1E1E1E] text-text-muted",
    CANCELLED: "bg-red-500/15 text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Sub-tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-[rgba(255,255,255,0.05)]">
        {(["upcoming", "past"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setEventsSubTab(tab)}
            className={cn(
              "pb-3 text-sm font-medium capitalize transition-colors relative",
              eventsSubTab === tab ? "text-gold" : "text-text-muted hover:text-text-primary"
            )}
          >
            {tab}
            {eventsSubTab === tab && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                layoutId="eventSubTab"
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Events list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={eventsSubTab}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {events.map((event, i) => {
            const date = new Date(event.date);
            const day = date.getDate();
            const month = date.toLocaleDateString("en-US", { month: "short" });
            return (
              <motion.div
                key={event.id}
                className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {/* Date block */}
                <div className="flex items-center sm:flex-col sm:items-center sm:w-16 gap-2 sm:gap-0">
                  <span className="font-mono-data text-2xl sm:text-3xl font-bold text-gold">
                    {day}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {month}
                  </span>
                </div>

                {/* Event info */}
                <div className="flex-1">
                  <h4 className="font-display text-base font-semibold uppercase text-text-primary">
                    {event.title}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <MapPin size={12} />
                      {event.venue}
                      {event.city && `, ${event.city}`}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock size={12} />
                      {date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Status / Tickets */}
                <div className="flex items-center gap-3">
                  {event.ticketUrl ? (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-gold-gradient text-black hover:scale-[1.02] transition-transform"
                    >
                      Get Tickets
                    </a>
                  ) : null}
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      statusColors[event.status] || "bg-[#1E1E1E] text-text-muted"
                    )}
                  >
                    {event.status}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {events.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No {eventsSubTab} events</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function SimilarDJsSection({ currentDj }: { currentDj: DJ }) {
  const { data, isLoading } = useDJs({
    city: currentDj.city,
    genre: currentDj.genres[0],
    limit: 4,
  });

  const similar = (data?.data || [])
    .filter((dj: DJ) => dj.id !== currentDj.id)
    .slice(0, 4);

  if (isLoading || similar.length === 0) return null;

  return (
    <div className="container-main pb-16 sm:pb-24">
      <div className="mb-8">
        <span className="section-label">You Might Also Like</span>
        <h2 className="mt-2 font-display text-xl sm:text-2xl font-semibold uppercase text-text-primary">
          Similar DJs
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similar.map((djItem: DJ, i: number) => (
          <motion.a
            key={djItem.id}
            href={`/dj/${djItem.username || djItem.id}`}
            className="group bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-[rgba(212,162,74,0.3)] hover:-translate-y-1 hover:shadow-card transition-all duration-300"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={djItem.avatar}
                alt={djItem.stageName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gold border-2 border-black flex items-center justify-center">
                <span className="font-mono-data text-xs font-bold text-black">
                  {djItem.rankingPosition}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-display text-sm font-semibold uppercase text-text-primary">
                {djItem.stageName}
              </h4>
              <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
                <MapPin size={11} />
                {djItem.city}, {djItem.country}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {djItem.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.1)] text-[10px] text-text-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-mono-data text-xs text-text-primary">{formatCompact(djItem.totalFollowers)}</p>
                  <p className="text-[9px] text-text-muted uppercase">Followers</p>
                </div>
                <div>
                  <p className="font-mono-data text-xs text-text-primary">{djItem.totalMixes}</p>
                  <p className="text-[9px] text-text-muted uppercase">Mixes</p>
                </div>
                <div>
                  <p className="font-mono-data text-xs text-gold">{djItem.averageRating.toFixed(1)}</p>
                  <p className="text-[9px] text-text-muted uppercase">Rating</p>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

function DjFollowButton({ djId, djUserId }: { djId: string; djUserId?: string }) {
  const { user } = useAuthStore();
  const { data: followStatus } = useIsFollowingDj(djId);
  const { follow, unfollow } = useFollowDj(djId);

  const [localError, setLocalError] = useState<string | null>(null);
  // Local override to persist follow state across buggy backend invalidations
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);

  const isFollowing = localFollowing ?? followStatus?.following ?? false;

  // Don't show follow button if user is not logged in or is the DJ themselves
  if (!user || (djUserId && user.id === djUserId)) return null;

  const handleClick = () => {
    setLocalError(null);
    const nextState = !isFollowing;
    setLocalFollowing(nextState);

    if (nextState) {
      follow.mutate(undefined, {
        onError: (err) => {
          setLocalFollowing(false);
          setLocalError(err instanceof Error ? err.message : 'Failed to follow');
        },
      });
    } else {
      unfollow.mutate(undefined, {
        onError: (err) => {
          setLocalFollowing(true);
          setLocalError(err instanceof Error ? err.message : 'Failed to unfollow');
        },
      });
    }
  };

  const isLoading = follow.isPending || unfollow.isPending;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex-1 sm:flex-auto px-4 py-2.5 rounded-full text-sm font-semibold uppercase hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-70",
          isFollowing
            ? "bg-[rgba(212,162,74,0.15)] text-gold border border-gold/30"
            : "border border-[rgba(255,255,255,0.2)] text-text-primary hover:bg-[rgba(255,255,255,0.05)]"
        )}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck size={16} />
            Following
          </>
        ) : (
          <>
            <UserPlus size={16} />
            Follow
          </>
        )}
      </button>
      {localError && (
        <span className="text-[10px] text-red-400 text-center">{localError}</span>
      )}
    </div>
  );
}

/* ───── Main DJ Profile Page ───── */
export default function DjProfile() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuthStore();
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleMessageClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/dj/${dj?.username || dj?.id || identifier}` } });
      return;
    }
    navigate('/dashboard/messages', { state: { contactUserId: dj?.userId } });
  };

  const {
    data: dj,
    isLoading,
    isError,
    error,
  } = useDJ(identifier) as { data: DJ | undefined; isLoading: boolean; isError: boolean; error: Error | null };

  // Redirect old /dj/{id} URLs to canonical /dj/{username}
  useEffect(() => {
    if (dj?.username && identifier && identifier.toLowerCase() !== dj.username.toLowerCase()) {
      navigate(`/dj/${dj.username}`, { replace: true });
    }
  }, [dj, identifier, navigate]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "mixes", label: "Mixes", count: dj?.totalMixes },
      { key: "photos", label: "Photos", count: dj?.photos?.length },
      { key: "stats", label: "Stats" },
      { key: "reviews", label: "Reviews", count: dj?.reviews?.length },
      { key: "events", label: "Events" },
    ],
    [dj]
  );

  // Sticky tab state
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHeader(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-text-muted">
          <Loader2 size={48} className="animate-spin text-gold" />
          <p className="text-sm uppercase tracking-wider">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !dj) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 text-center">
          <p className="text-red-400 font-medium">Failed to load DJ profile</p>
          <p className="mt-2 text-sm text-text-muted">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* ══════ Section 1: Profile Header ══════ */}

      {/* Cover Banner */}
      <motion.div
        className="relative w-full h-[200px] sm:h-[280px] overflow-hidden rounded-b-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src={dj.coverBanner || "/cover-placeholder.jpg"}
          alt={`${dj.stageName} cover`}
          onError={imageFallback}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-overlay" />
        {dj.subscriptionTier === 'legend' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-yellow-400/10 to-transparent pointer-events-none mix-blend-screen" />
        )}
      </motion.div>

      {/* Content Layer */}
      <div className="container-main -mt-[60px] relative z-10">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <motion.div
            className="relative shrink-0 self-center sm:self-auto"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            <div className={cn(
              "w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-full border-[3px] overflow-hidden bg-[#111111] relative z-10",
              dj.subscriptionTier === 'legend' 
                ? "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                : "border-gold"
            )}>
              {dj.subscriptionTier === 'legend' && (
                <div className="absolute inset-0 rounded-full border border-yellow-400/50 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
              )}
              <img
                src={dj.avatar || '/default-avatar.jpg'}
                alt={dj.stageName}
                onError={imageFallback}
                className="w-full h-full object-cover"
              />
            </div>
            {dj.verified && (
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-green flex items-center justify-center border-2 border-black z-20">
                <Check size={14} className="text-white" strokeWidth={3} />
              </div>
            )}
          </motion.div>

          {/* Profile Info */}
          <motion.div
            className="flex-1 text-center sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {/* Name */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="font-display text-2xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                {dj.stageName}
              </h1>
              {dj.subscriptionTier === 'legend' && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-yellow-400/20 to-amber-500/20 text-yellow-400 text-xs font-black uppercase tracking-widest border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                  <Crown className="w-4 h-4" />
                  Legend
                </span>
              )}
              {dj.subscriptionTier === 'pro' && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold/20 text-gold text-xs font-bold uppercase tracking-widest border border-gold/30">
                  <Zap className="w-4 h-4" />
                  Pro
                </span>
              )}
            </div>

            {/* Real name */}
            {dj.fullName && (
              <p className="mt-1 text-sm text-text-secondary">{dj.fullName}</p>
            )}

            {/* Badges Row */}
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {dj.badges
                .filter((b) => b !== 'Verified DJ')
                .map((badge, i) => (
                  <motion.span
                    key={badge}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wighter border border-gold/30 text-gold bg-[rgba(212,162,74,0.1)]"
                    )}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      delay: 0.7 + i * 0.1,
                    }}
                  >
                    {badge}
                  </motion.span>
                ))}
            </div>

            {/* Meta Row */}
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-text-muted">
              <div className="flex flex-wrap gap-1.5">
                {dj.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 rounded-full border border-gold/40 text-[10px] text-gold"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <span className="hidden sm:inline text-text-muted">·</span>
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {dj.city}, {dj.country}
              </span>
              <span className="hidden sm:inline text-text-muted">·</span>
              <span>Active Since {dj.startYear ? `'${dj.startYear.toString().slice(-2)}'` : ''}</span>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <DjFollowButton djId={dj.id} djUserId={dj.userId} />
            <button
              onClick={() => setIsBookingOpen(true)}
              className="flex-1 sm:flex-auto px-6 py-2.5 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              Book Now
            </button>
            <div className="flex gap-2">
              {dj.whatsappNumber ? (
                <a
                  href={`https://wa.me/${dj.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-auto px-4 py-2.5 rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-medium text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={16} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              ) : user?.id && dj.userId && user.id === dj.userId ? null : (
                <button
                  onClick={handleMessageClick}
                  className="flex-1 sm:flex-auto px-4 py-2.5 rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-medium text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  <span className="hidden sm:inline">Message</span>
                </button>
              )}
              <ShareButton
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/dj/${dj.username || dj.id}`}
                title={`Check out ${dj.stageName} on The Deck Salone`}
                description={dj.bio?.slice(0, 160) || ''}
                size="md"
              />
            </div>
          </motion.div>
        </div>

        {/* ═══ Quick Stats Bar ═══ */}
        <motion.div
          className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 bg-[#111111] rounded-xl px-4 sm:px-6 py-4 border border-[rgba(255,255,255,0.05)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          {[
            { label: "NATIONAL RANK", value: `#${dj.rankingPosition}`, color: "gold" },
            { label: "RANKING SCORE", value: dj.rankingScore, color: "gold" },
            { label: "FOLLOWERS", value: formatCompact(dj.totalFollowers), color: "text-primary" },
            { label: "MIXES", value: dj.totalMixes, color: "text-primary" },
            { label: "RATING", value: dj.averageRating.toFixed(1), color: "gold", showStar: true },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className={cn(
                  "font-mono-data text-base sm:text-xl font-semibold",
                  stat.color === "gold" ? "text-gold" : "text-text-primary"
                )}
              >
                {stat.showStar && <Star size={14} className="inline fill-gold text-gold mr-1 -mt-1" />}
                {stat.value}
              </p>
              <p className="mt-0.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ══════ Section 2: Profile Tabs ══════ */}
      <div
        className={cn(
          "sticky top-16 lg:top-28 z-40 mt-8 transition-all duration-300",
          scrolledPastHeader
            ? "bg-black/95 backdrop-blur-lg border-b border-[rgba(255,255,255,0.05)] shadow-nav"
            : "bg-black border-b border-[rgba(255,255,255,0.05)]"
        )}
      >
        <div className="container-main">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative px-4 py-3 sm:px-6 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.key ? "text-gold" : "text-text-muted hover:text-text-primary"
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {typeof tab.count === "number" && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#181818] text-[10px] text-text-secondary">
                      {tab.count}
                    </span>
                  )}
                </span>
                {activeTab === tab.key && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                    layoutId="profileTab"
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ Tab Content ══════ */}
      <div className="container-main py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && <OverviewTab dj={dj} />}
            {activeTab === "mixes" && <MixesTab dj={dj} />}
            {activeTab === "photos" && <PhotosTab dj={dj} />}
            {activeTab === "stats" && <StatsTab dj={dj} />}
            {activeTab === "reviews" && <ReviewsTab dj={dj} />}
            {activeTab === "events" && <EventsTab dj={dj} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ══════ Section 9: Similar DJs ══════ */}
      <SimilarDJsSection currentDj={dj} />

      {/* ══════ Booking Modal ══════ */}
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} dj={dj} />


    </div>
  );
}
