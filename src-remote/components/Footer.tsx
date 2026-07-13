import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Twitter, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black py-12 lg:ml-[300px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="Deck Salone" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-text-primary">Deck Salone</span>
            </Link>
            <p className="text-sm text-text-muted">
              The premier platform for Sierra Leonean DJs to share mixes, connect with fans, and grow their careers.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/decksalone" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-gold transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/decksalone" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-gold transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://facebook.com/decksalone" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-gold transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/decksalone" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-gold transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gold">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/discover" className="text-sm text-text-muted hover:text-text-primary transition-colors">Discover</Link></li>
              <li><Link to="/rankings" className="text-sm text-text-muted hover:text-text-primary transition-colors">Rankings</Link></li>
              <li><Link to="/mixes" className="text-sm text-text-muted hover:text-text-primary transition-colors">Mix Hub</Link></li>
              <li><Link to="/events" className="text-sm text-text-muted hover:text-text-primary transition-colors">Events</Link></li>
              <li><Link to="/battles" className="text-sm text-text-muted hover:text-text-primary transition-colors">Battles</Link></li>
            </ul>
          </div>

          {/* For DJs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gold">For DJs</h3>
            <ul className="space-y-2">
              <li><Link to="/register" className="text-sm text-text-muted hover:text-text-primary transition-colors">Join as DJ</Link></li>
              <li><Link to="/dashboard" className="text-sm text-text-muted hover:text-text-primary transition-colors">DJ Dashboard</Link></li>
              <li><Link to="/request-dj" className="text-sm text-text-muted hover:text-text-primary transition-colors">Request a DJ</Link></li>
              <li><Link to="/about" className="text-sm text-text-muted hover:text-text-primary transition-colors">About Us</Link></li>
              <li><Link to="/blog" className="text-sm text-text-muted hover:text-text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gold">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-text-muted">
                <Phone className="h-4 w-4 text-gold shrink-0" />
                <a href="https://wa.me/23272011156" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
                  +232 72 011 156
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-text-muted">
                <Mail className="h-4 w-4 text-gold shrink-0" />
                <a href="mailto:support@decksalone.com" className="hover:text-text-primary transition-colors">
                  support@decksalone.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-text-muted">
                <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span>Freetown, Sierra Leone</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {currentYear} Deck Salone. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-text-muted hover:text-text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs text-text-muted hover:text-text-primary transition-colors">Privacy</Link>
            <Link to="/help" className="text-xs text-text-muted hover:text-text-primary transition-colors">Help</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
