import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Search, ChevronDown, MessageSquare, BookOpen, Wrench, Music, CreditCard } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const faqs = [
  {
    category: 'Getting Started',
    icon: BookOpen,
    questions: [
      {
        q: 'What is Deck Salone?',
        a: 'Deck Salone is the first official digital ecosystem for DJs in Sierra Leone and across Africa. It connects DJs with fans, event organizers, and opportunities to grow their careers.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click the "Register" button in the navigation bar, fill in your details, and verify your email. DJ accounts require additional verification to ensure authenticity.',
      },
      {
        q: 'Is Deck Salone free to use?',
        a: 'Yes! Fan accounts are completely free. DJs can start with a free profile and upgrade to premium plans for advanced features like analytics and booking management.',
      },
    ],
  },
  {
    category: 'For DJs',
    icon: Music,
    questions: [
      {
        q: 'How do I upload my mixes?',
        a: 'Navigate to your DJ Dashboard, click on "Mixes," and use the upload feature. Supported formats include MP3, WAV, and M4A up to 50MB per file.',
      },
      {
        q: 'How do I get booked for events?',
        a: 'Complete your profile with a bio, photo, and sample mixes. Event organizers can then find you through the Discover page and send booking requests directly.',
      },
      {
        q: 'What are DJ Battles?',
        a: 'DJ Battles are weekly competitions where two DJs compete head-to-head. The community votes for their favorite mix, and winners earn points on the Battle Leaderboard.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    icon: CreditCard,
    questions: [
      {
        q: 'How do I update my profile?',
        a: 'Go to your Dashboard and click "Profile." You can update your bio, photo, social links, and other details from there.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept Orange Money, Africell Money, and major credit cards for premium subscriptions and event bookings.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from your Dashboard under "Subscription." Your premium features will remain active until the end of your current billing period.',
      },
    ],
  },
  {
    category: 'Technical Support',
    icon: Wrench,
    questions: [
      {
        q: 'My mix upload failed. What should I do?',
        a: 'Check that your file is under 50MB and in a supported format (MP3, WAV, M4A). If the problem persists, try clearing your browser cache or contact support.',
      },
      {
        q: 'How do I report a bug?',
        a: 'Email us at support@decksalone.com with a description of the issue, steps to reproduce it, and screenshots if possible.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'We are working on mobile apps for iOS and Android. For now, the website is fully responsive and works great on mobile browsers.',
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left group"
      >
        <span className="font-display text-sm font-semibold text-text-primary group-hover:text-gold transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0 ml-4 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-text-secondary leading-relaxed pr-8">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFaqs = faqs.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  const categoriesToShow = activeCategory
    ? filteredFaqs.filter((cat) => cat.category === activeCategory)
    : filteredFaqs;

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
                Support
              </span>
            </motion.div>
            <motion.h1
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Help <span className="text-gradient-gold">Center</span>
            </motion.h1>
            {/* Search */}
            <motion.div
              className="mt-8 max-w-lg mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black-surface border border-dark-gray rounded-xl pl-12 pr-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CATEGORY FILTERS ═══════════════ */}
      <section className="py-8 border-b border-white/5">
        <div className="container-main">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                activeCategory === null
                  ? 'bg-gold text-black'
                  : 'bg-black-surface border border-white/10 text-text-secondary hover:border-gold/30 hover:text-text-primary'
              }`}
            >
              All Topics
            </button>
            {faqs.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category === activeCategory ? null : cat.category)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeCategory === cat.category
                    ? 'bg-gold text-black'
                    : 'bg-black-surface border border-white/10 text-text-secondary hover:border-gold/30 hover:text-text-primary'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ SECTIONS ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="container-main">
          <div className="max-w-3xl mx-auto space-y-8">
            {categoriesToShow.length === 0 ? (
              <FadeIn>
                <div className="text-center py-16">
                  <HelpCircle className="w-12 h-12 text-text-muted mx-auto" />
                  <h3 className="mt-4 font-display text-xl text-text-primary">No results found</h3>
                  <p className="mt-2 text-text-secondary text-sm">
                    Try a different search term or browse all categories.
                  </p>
                </div>
              </FadeIn>
            ) : (
              categoriesToShow.map((category, catIndex) => (
                <FadeIn key={category.category} delay={0.1 * catIndex}>
                  <div className="bg-black-elevated rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                        <category.icon className="w-4 h-4 text-gold" />
                      </div>
                      <h2 className="font-display text-base font-semibold text-text-primary uppercase tracking-tight">
                        {category.category}
                      </h2>
                    </div>
                    <div className="px-5 sm:px-6">
                      {category.questions.map((item, qIndex) => (
                        <FAQItem key={qIndex} question={item.q} answer={item.a} />
                      ))}
                    </div>
                  </div>
                </FadeIn>
              ))
            )}
          </div>

          {/* Contact CTA */}
          <FadeIn delay={0.4}>
            <div className="mt-12 max-w-3xl mx-auto p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5 text-center">
              <MessageSquare className="w-8 h-8 text-gold mx-auto" />
              <h3 className="mt-4 font-display text-lg font-semibold text-text-primary uppercase">
                Still need help?
              </h3>
              <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
                Our support team is here to assist you. Reach out and we&apos;ll get back to you within 24 hours.
              </p>
              <a
                href="mailto:support@decksalone.com"
                className="inline-block mt-5 px-6 py-3 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform"
              >
                Contact Support
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
