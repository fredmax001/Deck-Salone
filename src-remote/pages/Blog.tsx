import { motion } from 'framer-motion';
import { Newspaper, Clock, ArrowRight, Sparkles } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const samplePosts = [
  {
    title: 'The Rise of Afrobeats in Sierra Leone',
    excerpt: 'How Afrobeats has transformed the DJ scene and become the dominant sound at parties and events across the country.',
    date: 'Dec 15, 2024',
    category: 'Culture',
    readTime: '5 min read',
  },
  {
    title: 'DJ Battle Arena: Season 1 Recap',
    excerpt: 'A look back at the most exciting battles, the rising stars, and the unforgettable moments from our first competitive season.',
    date: 'Dec 10, 2024',
    category: 'Battles',
    readTime: '8 min read',
  },
  {
    title: 'Tips for Aspiring DJs: Getting Started',
    excerpt: 'From choosing your first equipment to building your brand — essential advice for anyone looking to start their DJ journey.',
    date: 'Dec 5, 2024',
    category: 'Guide',
    readTime: '6 min read',
  },
];

export default function Blog() {
  return (
    <div className="bg-black min-h-[100dvh]">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-20 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="container-main relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Stories & Updates
              </span>
            </motion.div>
            <motion.h1
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              The <span className="text-gradient-gold">Blog</span>
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ═══════════════ COMING SOON BANNER ═══════════════ */}
      <section className="py-8">
        <div className="container-main">
          <FadeIn>
            <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-gold/5 border border-gold/20 rounded-2xl flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-gold flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Coming Soon</p>
                <p className="text-sm text-text-secondary">
                  Our editorial team is working on exclusive content. Check back for weekly updates on DJ culture, tutorials, and platform news.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════ SAMPLE POSTS ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-muted mb-8">
                Latest Posts
              </h2>
            </FadeIn>

            <div className="space-y-6">
              {samplePosts.map((post, index) => (
                <FadeIn key={post.title} delay={0.1 * index}>
                  <motion.article
                    className="group p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5 hover:border-gold/30 transition-all duration-300 cursor-pointer"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gold/10 text-gold rounded-full">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </div>
                      <span className="text-xs text-text-muted">{post.date}</span>
                    </div>

                    <h3 className="font-display text-lg font-semibold text-text-primary group-hover:text-gold transition-colors uppercase tracking-tight">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-sm text-gold font-semibold">
                      <span className="uppercase text-xs tracking-wider">Read more</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.article>
                </FadeIn>
              ))}
            </div>

            {/* Newsletter CTA */}
            <FadeIn delay={0.4}>
              <div className="mt-12 p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5 text-center">
                <Newspaper className="w-8 h-8 text-gold mx-auto" />
                <h3 className="mt-4 font-display text-lg font-semibold text-text-primary uppercase">
                  Subscribe to Updates
                </h3>
                <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
                  Get the latest stories, DJ tips, and platform updates delivered to your inbox.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 bg-black-surface border border-dark-gray rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors"
                  />
                  <button className="px-6 py-3 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-lg hover:scale-[1.02] transition-transform flex-shrink-0">
                    Subscribe
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
