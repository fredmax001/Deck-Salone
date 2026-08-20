import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Calendar,
  Upload,
  Loader2,
  CheckCircle,
  ChevronRight,
  Headphones,
  Users,
  Chrome,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import PasswordStrength from '@/components/PasswordStrength';

/* ─── Constants ─── */
const CITIES = [
  'Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu Town', 'Port Loko',
  'Lunsar', 'Waterloo', 'Kabala', 'Magburaka', 'Kailahun', 'Moyamba',
  'Pujehun', 'Bonthe', 'Kambia', 'Other',
] as const;

const GENRES = [
  'Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel',
  'Salone Mix', 'Club Mix', 'Throwback', 'Reggae', 'R&B',
] as const;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const API_URL = import.meta.env.VITE_API_URL || '/api';
const googleLoginUrl = `${API_URL.replace('/api', '')}/api/auth/google`;
const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

/* ─── Schemas ─── */

// DJ Step 1
const djStep1Schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/\d/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  stageName: z.string().min(2, 'Stage name must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  terms: z.literal(true),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// DJ Step 2
const djStep2Schema = z.object({
  city: z.string().min(1, 'Please select a city'),
  genres: z.array(z.string()).min(1, 'Select at least one genre'),
  startYear: z
    .string()
    .min(1, 'Year started is required')
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1980 && num <= new Date().getFullYear();
    }, 'Enter a valid year (e.g., 2015)'),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
});

// User (simple, single step)
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/\d/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.literal(true),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type DjStep1Form = z.infer<typeof djStep1Schema>;
type DjStep2Form = z.infer<typeof djStep2Schema>;
type UserForm = z.infer<typeof userSchema>;

/* ─── Variants ─── */
const pageVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -20 : 20, opacity: 0 }),
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

const inputCls = (hasErr?: boolean) =>
  `w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${hasErr ? 'border-red' : 'border-medium-gray'}`;

const iconCls = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none';

/* ─── Register Page ─── */
export default function Register() {
  // Which account type the user chose: null = not chosen yet, 'DJ' or 'USER'
  const [accountType, setAccountType] = useState<'DJ' | 'USER' | null>(null);
  const [step, setStep] = useState(1); // only relevant for DJ flow
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [bioLength, setBioLength] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /* ─── DJ Step 1 Form ─── */
  const {
    register: regDj1,
    handleSubmit: handleDj1,
    watch: watchDj1,
    formState: { errors: errDj1 },
  } = useForm<DjStep1Form>({ resolver: zodResolver(djStep1Schema as never) });

  /* ─── DJ Step 2 Form ─── */
  const {
    register: regDj2,
    handleSubmit: handleDj2,
    formState: { errors: errDj2 },
    setValue: setDj2Value,
  } = useForm<DjStep2Form>({
    resolver: zodResolver(djStep2Schema),
    defaultValues: { genres: [], startYear: '' },
  });

  /* ─── User Form ─── */
  const {
    register: regUser,
    handleSubmit: handleUserSubmit,
    watch: watchUser,
    formState: { errors: errUser },
  } = useForm<UserForm>({ resolver: zodResolver(userSchema as never) });

  const djPasswordValue = watchDj1('password') || '';
  const userPasswordValue = watchUser('password') || '';

  /* ─── Handlers ─── */
  const onDjStep1 = useCallback(() => {
    setDirection(1);
    setStep(2);
  }, []);

  const onDjStep2 = useCallback(
    async (data: DjStep2Form) => {
      setIsSubmitting(true);
      setError(null);
      const step1 = watchDj1();

      const result = await register(step1.email, step1.password, 'DJ', step1.phone);
      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error || 'Registration failed');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('stageName', step1.stageName);
        formData.append('fullName', step1.fullName);
        formData.append('city', data.city);
        data.genres.forEach((g) => formData.append('genres', g));
        formData.append('startYear', data.startYear);
        if (data.bio) formData.append('bio', data.bio);
        const avatarFromInput = avatarInputRef.current?.files?.[0];
        if (avatarFromInput) formData.append('avatar', avatarFromInput);
        await api.post('/djs', formData);
        await useAuthStore.getState().fetchMe();
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.response?.data?.error || 'Could not create DJ profile');
        return;
      }

      setIsSubmitting(false);
      setCompleted(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    },
    [register, navigate, watchDj1]
  );

  const onUserSubmit = useCallback(
    async (data: UserForm) => {
      setIsSubmitting(true);
      setError(null);

      const result = await register(data.email, data.password, 'USER', data.phone);
      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error || 'Registration failed');
        return;
      }

      // Update the user's name via /users/profile
      try {
        await api.put('/users/profile', { name: data.name });
        await useAuthStore.getState().fetchMe();
      } catch {
        // name update failing is not fatal
      }

      setIsSubmitting(false);
      setCompleted(true);
      setTimeout(() => navigate('/discover'), 1500);
    },
    [register, navigate]
  );

  const toggleGenre = useCallback(
    (genre: string) => {
      setSelectedGenres((prev) => {
        const updated = prev.includes(genre)
          ? prev.filter((g) => g !== genre)
          : prev.length < 3
          ? [...prev, genre]
          : prev;
        setDj2Value('genres', updated, { shouldValidate: true });
        return updated;
      });
    },
    [setDj2Value]
  );

  /* ─── Completion Screen ─── */
  if (completed) {
    return (
      <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="bg-black-surface border border-dark-gray rounded-2xl p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <CheckCircle className="w-16 h-16 text-green mx-auto" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease }}
            className="mt-6 text-[28px] font-semibold uppercase tracking-tight text-text-primary font-display"
          >
            Welcome to Deck Salone!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease }}
            className="mt-3 text-text-secondary"
          >
            {user?.role === 'DJ'
              ? 'Your profile is now live. Start uploading mixes and get discovered.'
              : 'Your account is ready. Start exploring DJs, mixes, and events.'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4, ease }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href={user?.role === 'DJ' ? '/dashboard' : '/user/dashboard'}
              className="inline-flex items-center justify-center h-[48px] px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
            >
              {user?.role === 'DJ' ? 'Go to Dashboard' : 'Explore Deck Salone'}
            </a>
            {user?.role === 'DJ' && (
              <a
                href="/mixes"
                className="inline-flex items-center justify-center h-[48px] px-8 bg-black-elevated text-text-primary font-semibold text-sm uppercase tracking-wide rounded-full border border-dark-gray hover:bg-medium-gray transition-colors"
              >
                Upload a Mix
              </a>
            )}
          </motion.div>
        </motion.div>
      </AuthLayout>
    );
  }

  /* ─── Account Type Picker ─── */
  if (!accountType) {
    return (
      <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
        <div className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="text-center mb-8">
            <h1 className="text-[28px] sm:text-[36px] font-semibold uppercase tracking-tight text-text-primary font-display">
              Join Deck Salone
            </h1>
            <p className="mt-2 text-sm text-text-muted">How do you want to join?</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* DJ option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAccountType('DJ')}
              className="group relative flex items-center gap-5 p-6 rounded-2xl border-2 border-dark-gray hover:border-gold bg-black-elevated hover:bg-gold/5 transition-all duration-200 text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/25 transition-colors">
                <Headphones className="w-7 h-7 text-gold" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary uppercase tracking-wide">I'm a DJ</div>
                <div className="text-sm text-text-secondary mt-0.5">
                  Create your DJ profile, upload mixes, list events & get booked
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-gold ml-auto flex-shrink-0 transition-colors" />
            </motion.button>

            {/* User option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAccountType('USER')}
              className="group relative flex items-center gap-5 p-6 rounded-2xl border-2 border-dark-gray hover:border-gold bg-black-elevated hover:bg-gold/5 transition-all duration-200 text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/25 transition-colors">
                <Users className="w-7 h-7 text-gold" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary uppercase tracking-wide">Not a DJ</div>
                <div className="text-sm text-text-secondary mt-0.5">
                  Discover DJs, book for events, follow your favourites & explore mixes
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-gold ml-auto flex-shrink-0 transition-colors" />
            </motion.button>
          </div>

          {hasGoogleAuth && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-dark-gray" />
                <span className="text-xs uppercase tracking-wider text-text-muted">or</span>
                <div className="h-px flex-1 bg-dark-gray" />
              </div>

              <a
                href={googleLoginUrl}
                className="w-full h-[48px] rounded-full border border-dark-gray bg-black-elevated text-text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:border-gold/50 transition-colors"
              >
                <Chrome className="w-5 h-5" />
                Continue with Google
              </a>
            </>
          )}

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  /* ─── USER Sign Up (simple, single step) ─── */
  if (accountType === 'USER') {
    return (
      <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
        <div className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-gold" />
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-semibold uppercase tracking-tight text-text-primary font-display">
              Create Your Account
            </h1>
            <p className="mt-2 text-sm text-text-muted">Quick setup — no DJ info needed</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg bg-red/10 border border-red/30 text-red text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleUserSubmit(onUserSubmit)} className="flex flex-col gap-5">
            {/* Name */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Your Name</label>
              <div className="relative">
                <User className={iconCls} />
                <input
                  type="text"
                  placeholder="Your full name"
                  {...regUser('name')}
                  className={inputCls(!!errUser.name)}
                />
              </div>
              {errUser.name && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                  {errUser.name.message}
                </motion.p>
              )}
            </motion.div>

            {/* Email */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <div className="relative">
                <Mail className={iconCls} />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...regUser('email')}
                  className={inputCls(!!errUser.email)}
                />
              </div>
              {errUser.email && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                  {errUser.email.message}
                </motion.p>
              )}
            </motion.div>

            {/* Phone */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Phone Number <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className={iconCls} />
                <input
                  type="tel"
                  placeholder="+232 XX XXX XXXX"
                  {...regUser('phone')}
                  className="w-full h-[48px] bg-black-surface border border-medium-gray rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)]"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <Lock className={iconCls} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...regUser('password')}
                  className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${errUser.password ? 'border-red' : 'border-medium-gray'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errUser.password && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                  {errUser.password.message}
                </motion.p>
              )}
              <PasswordStrength password={userPasswordValue} />
            </motion.div>

            {/* Confirm Password */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className={iconCls} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...regUser('confirmPassword')}
                  className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${errUser.confirmPassword ? 'border-red' : 'border-medium-gray'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errUser.confirmPassword && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                  {errUser.confirmPassword.message}
                </motion.p>
              )}
            </motion.div>

            {/* Terms */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...regUser('terms')}
                  className="accent-gold w-4 h-4 mt-0.5 rounded"
                />
                <span className="text-sm text-text-secondary leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-gold hover:text-gold-light underline">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-gold hover:text-gold-light underline">Privacy Policy</a>
                </span>
              </label>
              {errUser.terms && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                  {errUser.terms.message as string}
                </motion.p>
              )}
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeUpItem} initial="hidden" animate="show" className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setAccountType(null)}
                className="w-full h-[44px] text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                ← Back
              </button>
            </motion.div>

            <p className="text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-gold hover:text-gold-light font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </AuthLayout>
    );
  }

  /* ─── DJ Sign Up (2 steps, unchanged) ─── */
  return (
    <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
      <div className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center mx-auto mb-4">
            <Headphones className="w-6 h-6 text-gold" />
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-semibold uppercase tracking-tight text-text-primary font-display">
            {step === 1 ? 'DJ Registration' : 'Complete Your Profile'}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {step === 1 ? 'Create your DJ account' : 'Tell us about your DJ style'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-lg bg-red/10 border border-red/30 text-red text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Step {step} of 2</span>
            <span className="text-xs font-medium text-gold">{step === 1 ? 'Account' : 'Profile'}</span>
          </div>
          <div className="h-1.5 bg-dark-gray rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {/* ─── DJ Step 1 ─── */}
          {step === 1 && (
            <motion.form
              key="dj-step1"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease }}
              onSubmit={handleDj1(onDjStep1)}
              className="flex flex-col gap-5"
            >
              {/* Stage Name */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Stage Name / DJ Name</label>
                <div className="relative">
                  <Headphones className={iconCls} />
                  <input
                    type="text"
                    placeholder="DJ YourName"
                    {...regDj1('stageName')}
                    className={inputCls(!!errDj1.stageName)}
                  />
                </div>
                {errDj1.stageName && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.stageName.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Full Name */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
                <div className="relative">
                  <User className={iconCls} />
                  <input
                    type="text"
                    placeholder="Your full legal name"
                    {...regDj1('fullName')}
                    className={inputCls(!!errDj1.fullName)}
                  />
                </div>
                {errDj1.fullName && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.fullName.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Email */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="dj@example.com"
                    {...regDj1('email')}
                    className={inputCls(!!errDj1.email)}
                  />
                </div>
                {errDj1.email && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.email.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Phone */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Phone Number <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className={iconCls} />
                  <input
                    type="tel"
                    placeholder="+232 XX XXX XXXX"
                    {...regDj1('phone')}
                    className="w-full h-[48px] bg-black-surface border border-medium-gray rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)]"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                <div className="relative">
                  <Lock className={iconCls} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...regDj1('password')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${errDj1.password ? 'border-red' : 'border-medium-gray'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errDj1.password && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.password.message}
                  </motion.p>
                )}
                <PasswordStrength password={djPasswordValue} />
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className={iconCls} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...regDj1('confirmPassword')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${errDj1.confirmPassword ? 'border-red' : 'border-medium-gray'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errDj1.confirmPassword && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.confirmPassword.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Terms */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" {...regDj1('terms')} className="accent-gold w-4 h-4 mt-0.5 rounded" />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-gold hover:text-gold-light underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="text-gold hover:text-gold-light underline">Privacy Policy</a>
                  </span>
                </label>
                {errDj1.terms && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj1.terms.message as string}
                  </motion.p>
                )}
              </motion.div>

              {/* Continue */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show" className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType(null)}
                  className="w-full h-[44px] text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  ← Back
                </button>
              </motion.div>

              <p className="text-center text-sm text-text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-gold hover:text-gold-light font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </motion.form>
          )}

          {/* ─── DJ Step 2 ─── */}
          {step === 2 && (
            <motion.form
              key="dj-step2"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease }}
              onSubmit={handleDj2(onDjStep2)}
              className="flex flex-col gap-5"
            >
              {/* City */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">City</label>
                <div className="relative">
                  <MapPin className={iconCls} />
                  <select
                    {...regDj2('city')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] appearance-none cursor-pointer ${errDj2.city ? 'border-red' : 'border-medium-gray'}`}
                  >
                    <option value="" className="bg-black-surface">Select your city</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city} className="bg-black-surface">{city}</option>
                    ))}
                  </select>
                </div>
                {errDj2.city && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj2.city.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Genres */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Primary Genres <span className="text-text-muted font-normal">(max 3)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <motion.button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all duration-150 ${isSelected ? 'bg-gold/15 border-gold text-gold' : 'border-medium-gray text-text-secondary hover:text-text-primary hover:border-text-muted'}`}
                      >
                        <span className="flex items-center gap-1.5">
                          {isSelected && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1}} className="text-gold">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </motion.span>
                          )}
                          {genre}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <input type="hidden" {...regDj2('genres')} />
                {errDj2.genres && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj2.genres.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Year Started */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Year Started DJing</label>
                <div className="relative">
                  <Calendar className={iconCls} />
                  <input
                    type="number"
                    min={1980}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2015"
                    {...regDj2('startYear')}
                    className={inputCls(!!errDj2.startYear)}
                  />
                </div>
                {errDj2.startYear && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-sm text-red">
                    {errDj2.startYear.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Bio */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Bio <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us about yourself and your style..."
                  {...regDj2('bio')}
                  onChange={(e) => {
                    regDj2('bio').onChange(e);
                    setBioLength(e.target.value.length);
                  }}
                  className="w-full bg-black-surface border border-medium-gray rounded-lg p-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] resize-none"
                />
                <p className="mt-1 text-xs text-text-muted text-right">{bioLength}/500</p>
              </motion.div>

              {/* Profile Photo */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Profile Photo</label>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setAvatarPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      setAvatarPreview(null);
                    }
                  }}
                />
                <div
                  className="border-2 border-dashed border-medium-gray rounded-xl p-6 text-center hover:border-gold transition-colors cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border border-gold/30" />
                  ) : (
                    <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
                  )}
                  <p className="text-sm text-text-secondary">{avatarPreview ? 'Change photo' : 'Click to upload photo'}</p>
                  <p className="text-xs text-text-muted mt-1">JPG, PNG (max 5MB)</p>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show" className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create DJ Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDirection(-1); setStep(1); }}
                  className="w-full h-[44px] text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Back
                </button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
