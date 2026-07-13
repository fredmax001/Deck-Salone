import { Link } from 'react-router-dom';
import FadeIn from '@/components/FadeIn';

const productScreens = [
  {
    title: 'Home',
    image: '/images/about/mobile-home.png',
    className: 'lg:translate-y-10',
  },
  {
    title: 'Discover',
    image: '/images/about/mobile-discover.png',
    className: '',
  },
  {
    title: 'DJ Dashboard',
    image: '/images/about/desktop-dashboard-dj.png',
    className: 'lg:translate-y-16',
  },
  {
    title: 'Mix Hub',
    image: '/images/about/mobile-mixes.png',
    className: 'lg:translate-y-4',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-black">
      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 sm:pb-24 overflow-hidden">
        <div className="container-main">
          <FadeIn>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-text-primary max-w-4xl">
              About{' '}
              <span className="text-gold">Deck Salone</span>
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section className="py-16 sm:py-20 bg-black-elevated">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Founder Photo */}
            <FadeIn direction="right">
              <div className="relative">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-white/10">
                  <img
                    src="/images/founder.jpg"
                    alt="Frederick Julian Max-Macauley (DJ Fred Max) — Founder of Deck Salone"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-3 left-4 right-4 bg-black/90 backdrop-blur-sm border border-gold/30 rounded-lg px-4 py-2.5 text-center">
                  <p className="text-gold text-xs font-semibold uppercase tracking-wide">
                    Frederick Julian Max-Macauley
                  </p>
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">
                    Founder & DJ Fred Max
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* About Text */}
            <FadeIn direction="left" delay={0.2}>
              <div className="space-y-5 text-text-secondary text-sm sm:text-base leading-relaxed">
                <p>
                  Deck Salone is Sierra Leone's official DJ ecosystem — a platform built
                  to empower DJs, connect the entertainment industry, and celebrate
                  the country's vibrant music culture.
                </p>
                <p>
                  Created as the home for Sierra Leone's DJ community, Deck Salone
                  brings together DJs, promoters, event organizers, venues, brands,
                  and music fans on one digital platform. Whether you're looking to
                  discover new talent, book a professional DJ, upload mixes, build
                  your profile, or follow top-ranked DJs, Deck Salone makes it simple.
                </p>
                <p>
                  Our mission is to create more opportunities for DJs by making them
                  more visible, more accessible, and better connected to the people
                  and businesses that need them — both within Sierra Leone and across
                  the global DJ community. We believe every talented DJ deserves a
                  platform to showcase their skills, grow their audience, and build a
                  successful career, no matter where they are in the world.
                </p>
                <p>
                  Founded by{' '}
                  <span className="text-gold font-medium">
                    Frederick Julian Max-Macauley (DJ Fred Max)
                  </span>
                  , Deck Salone was created to modernize the DJ industry in Sierra
                  Leone and provide a professional platform that connects talent with
                  opportunity locally and internationally.
                </p>
                <p className="text-text-muted text-sm">
                  Deck Salone is proudly developed and operated under{' '}
                  <span className="text-gold">Sound It Entertainment</span>, a
                  leading entertainment and technology company dedicated to building
                  innovative platforms that support music, events, and creative
                  communities across Africa and beyond.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── PLATFORM PREVIEW ─── */}
      <section className="py-16 sm:py-20 bg-black">
        <div className="container-main">
          <FadeIn className="mb-10 sm:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-text-primary max-w-4xl">
              Discover the{' '}
              <span className="text-gold">Best DJs</span>
            </h2>
            <p className="mt-4 text-text-secondary max-w-2xl leading-relaxed">
              The first digital platform connecting DJs, promoters, and fans across
              Sierra Leone. Upload mixes, get booked, track rankings, and be part of
              the movement.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {productScreens.map((screen, i) => (
              <FadeIn key={screen.title} delay={i * 0.08}>
                <figure className={`group ${screen.className}`}>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black-surface shadow-card">
                    <img
                      src={screen.image}
                      alt={`${screen.title} page screenshot`}
                      className="h-[420px] sm:h-[480px] lg:h-[520px] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {screen.title}
                  </figcaption>
                </figure>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT WE DO ─── */}
      <section className="py-16 sm:py-20 bg-black-elevated">
        <div className="container-main">
          <FadeIn className="text-center mb-12">
            <p className="section-label mb-3">What We Do</p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight text-text-primary">
              More Than a Directory
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Discover Talent',
                desc: 'Browse profiles, listen to mixes, and find the perfect DJ for any event or vibe.',
              },
              {
                title: 'Book DJs',
                desc: 'Connect directly with DJs, check availability, and secure bookings seamlessly.',
              },
              {
                title: 'Upload Mixes',
                desc: 'DJs can share their mixes, build a following, and get discovered by fans and promoters.',
              },
              {
                title: 'Live Rankings',
                desc: 'Track the top-performing DJs in Sierra Leone based on streams, bookings, and votes.',
              },
              {
                title: 'DJ Battles',
                desc: 'Go head-to-head in weekly battles. Upload your best mix and let the community decide.',
              },
              {
                title: 'Event Listings',
                desc: 'Find upcoming events, open DJ slots, and get your name on the lineup.',
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.08}>
                <div className="bg-black-surface border border-white/5 rounded-2xl p-6 h-full hover:border-gold/20 transition-all duration-300">
                  <h3 className="font-display text-base font-semibold uppercase text-text-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-24 bg-black">
        <div className="container-main text-center">
          <FadeIn>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-text-primary">
              Ready to Join the Movement?
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/discover"
                className="px-8 py-3 bg-gold-gradient text-black font-semibold uppercase tracking-wide rounded-full text-sm hover:scale-[1.02] transition-transform"
              >
                Discover DJs
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 border border-white/30 text-text-primary font-semibold uppercase tracking-wide rounded-full text-sm hover:border-gold/50 hover:text-gold transition-all"
              >
                Join as DJ
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
