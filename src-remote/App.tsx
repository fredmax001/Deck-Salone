import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import UserDashboardLayout from './components/UserDashboardLayout';
import MixPlayer from './components/MixPlayer';

// Lazy loaded pages for better code splitting
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Rankings = lazy(() => import('./pages/Rankings'));
const DjProfile = lazy(() => import('./pages/DjProfile'));
const Booking = lazy(() => import('./pages/Booking'));
const MixHub = lazy(() => import('./pages/MixHub'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Battles = lazy(() => import('./pages/Battles'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Help = lazy(() => import('./pages/Help'));
const Blog = lazy(() => import('./pages/Blog'));
const About = lazy(() => import('./pages/About'));
const RequestDj = lazy(() => import('./pages/RequestDj'));

/* ─── DJ Dashboard pages ─── */
const DashboardOverview = lazy(() => import('./pages/dashboard/Overview'));
const DashboardBookings = lazy(() => import('./pages/dashboard/Bookings'));
const DashboardMessages = lazy(() => import('./pages/dashboard/Messages'));
const DashboardMixes = lazy(() => import('./pages/dashboard/Mixes'));
const DashboardPhotos = lazy(() => import('./pages/dashboard/Photos'));
const DashboardEvents = lazy(() => import('./pages/dashboard/DjEvents'));
const DashboardAnalytics = lazy(() => import('./pages/dashboard/Analytics'));
const DashboardEarnings = lazy(() => import('./pages/dashboard/Earnings'));
const DashboardProfile = lazy(() => import('./pages/dashboard/Profile'));
const DashboardSettings = lazy(() => import('./pages/dashboard/Settings'));
const DashboardSubscription = lazy(() => import('./pages/dashboard/Subscription'));
const DashboardCampaigns = lazy(() => import('./pages/dashboard/Campaigns'));
const DashboardOpportunities = lazy(() =>
  import('./pages/Opportunities').then((m) => ({ default: m.Opportunities }))
);

/* ─── User Dashboard pages ─── */
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserBookings = lazy(() => import('./pages/user/MyBookings'));
const UserMessages = lazy(() => import('./pages/user/Messages'));
const UserFollowing = lazy(() => import('./pages/user/Following'));
const UserActivity = lazy(() => import('./pages/user/Activity'));
const UserNotifications = lazy(() => import('./pages/user/Notifications'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserSettings = lazy(() => import('./pages/user/UserSettings'));

function AuthInitializer() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return null;
}

/* ──────────────────────── Router ──────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-deck-accent"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deck-accent"></div></div>}>
        <Routes>
          {/* Auth callback (Google OAuth) */}
          <Route path="auth/callback" element={<AuthCallback />} />

          {/* Admin — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']} fallback="/login" />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>

          {/* DJ Dashboard — protected, custom layout (no public navbar/footer) */}
          {/* USER role is excluded and redirected to /user/dashboard */}
          <Route element={<ProtectedRoute excludeRoles={['USER']} fallback="/user/dashboard" />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="dashboard/bookings" element={<DashboardBookings />} />
              <Route path="dashboard/messages" element={<DashboardMessages />} />
              <Route path="dashboard/mixes" element={<DashboardMixes />} />
              <Route path="dashboard/sets" element={<DashboardMixes />} />
              <Route path="dashboard/photos" element={<DashboardPhotos />} />
              <Route path="dashboard/events" element={<DashboardEvents />} />
              <Route path="dashboard/analytics" element={<DashboardAnalytics />} />
              <Route path="dashboard/earnings" element={<DashboardEarnings />} />
              <Route path="dashboard/profile" element={<DashboardProfile />} />
              <Route path="dashboard/subscription" element={<DashboardSubscription />} />
              <Route path="dashboard/opportunities" element={<DashboardOpportunities />} />
              <Route path="dashboard/campaigns" element={<DashboardCampaigns />} />
              <Route path="dashboard/settings" element={<DashboardSettings />} />
            </Route>
          </Route>

          {/* User Dashboard — protected, custom layout (no public navbar/footer) */}
          <Route element={<ProtectedRoute fallback="/login" />}>
            <Route element={<UserDashboardLayout />}>
              <Route path="user/dashboard" element={<UserDashboard />} />
              <Route path="user/bookings" element={<UserBookings />} />
              <Route path="user/messages" element={<UserMessages />} />
              <Route path="user/following" element={<UserFollowing />} />
              <Route path="user/activity" element={<UserActivity />} />
              <Route path="user/notifications" element={<UserNotifications />} />
              <Route path="user/profile" element={<UserProfile />} />
              <Route path="user/settings" element={<UserSettings />} />
            </Route>
          </Route>

          {/* Auth screens (Standalone layout) */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Public site */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="discover" element={<Discover />} />
            <Route path="rankings" element={<Rankings />} />
            <Route path="dj/:identifier" element={<DjProfile />} />
            <Route path="booking" element={<Booking />} />
            <Route path="mixes" element={<MixHub />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="hall-of-fame" element={<HallOfFame />} />
            <Route path="battles" element={<Battles />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="help" element={<Help />} />
            <Route path="blog" element={<Blog />} />
            <Route path="about" element={<About />} />
            <Route path="request-dj" element={<RequestDj />} />
          </Route>
        </Routes>
        <MixPlayer />
      </Suspense>
    </BrowserRouter>
  );
}
