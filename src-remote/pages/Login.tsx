import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Loader2,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

/* ─── Schema ─── */
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ─── Framer Motion easing ─── */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

/* ─── Login Page ─── */
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setError(null);
    const result = await login(data.email, data.password);
    setIsSubmitting(false);
    if (result.success) {
      const user = useAuthStore.getState().user;
      if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
        navigate('/admin');
      } else if (user?.role === 'DJ') {
        // On mobile/tablet, DJs land on the public platform and open the dashboard from the profile menu.
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        navigate(isMobile ? '/discover' : '/dashboard');
      } else {
        navigate('/discover');
      }
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const googleLoginUrl = `${API_URL.replace('/api', '')}/api/auth/google`;
  const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <AuthLayout
      quote="Join verified DJs shaping the sound of Sierra Leone."
      statLine="Upload mixes, get booked, grow your audience"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] sm:text-[36px] font-semibold uppercase tracking-tight text-text-primary font-display">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to your account
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

        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          {/* Email */}
          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="dj@example.com"
                {...register('email')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                  errors.email
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-sm text-red"
              >
                {errors.email.message}
              </motion.p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                  errors.password
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-sm text-red"
              >
                {errors.password.message}
              </motion.p>
            )}
          </motion.div>

          {/* Forgot password */}
          <motion.div variants={fadeUpItem} className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-gold hover:text-gold-light transition-colors"
            >
              Forgot Password?
            </Link>
          </motion.div>

          {/* Sign In button */}
          <motion.div variants={fadeUpItem}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </motion.div>

          {/* Divider */}
          {hasGoogleAuth && (
            <>
              <motion.div
                variants={fadeUpItem}
                className="relative flex items-center gap-3 py-1"
              >
                <div className="flex-1 h-px bg-dark-gray" />
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  OR
                </span>
                <div className="flex-1 h-px bg-dark-gray" />
              </motion.div>

              {/* Social login buttons */}
              <motion.div variants={fadeUpItem}>
                <a
                  href={googleLoginUrl}
                  className="w-full h-[44px] bg-white text-black text-sm font-medium rounded-lg flex items-center justify-center gap-2.5 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </a>
              </motion.div>
            </>
          )}

          <motion.div variants={fadeUpItem}>
            <button
              type="button"
              className="w-full h-[44px] bg-black-elevated text-text-primary text-sm font-medium rounded-lg border border-dark-gray flex items-center justify-center gap-2.5 hover:bg-medium-gray transition-colors"
            >
              <Phone className="w-5 h-5" />
              Continue with Phone
            </button>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={fadeUpItem}
            className="text-center text-sm text-text-secondary mt-2"
          >
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-gold hover:text-gold-light font-medium transition-colors"
            >
              Join as DJ
            </Link>
          </motion.p>
        </motion.form>
      </motion.div>
    </AuthLayout>
  );
}
