import { motion } from 'framer-motion';
import { Lock, Eye, Server, Share2, Mail, UserCheck } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const sections = [
  {
    icon: Eye,
    title: 'Information We Collect',
    content: `We collect information you provide directly, such as your name, email address, profile information, and payment details. We also collect usage data including IP addresses, device information, and browsing activity on the platform.`,
  },
  {
    icon: Lock,
    title: 'How We Use Your Information',
    content: `We use your information to provide and improve our services, process transactions, communicate with you, personalize your experience, and ensure platform security. We analyze usage patterns to improve the platform's features and performance.`,
  },
  {
    icon: Server,
    title: 'Data Storage and Security',
    content: `Your data is stored on secure servers with industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, or destruction.`,
  },
  {
    icon: Share2,
    title: 'Information Sharing',
    content: `We do not sell your personal information. We may share data with trusted service providers who assist in operating our platform, or when required by law. DJs' public profiles and mixes are visible to all users.`,
  },
  {
    icon: UserCheck,
    title: 'Your Rights',
    content: `You have the right to access, correct, or delete your personal information. You can update your profile at any time or request account deletion by contacting our support team.`,
  },
  {
    icon: Mail,
    title: 'Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at privacy@decksalone.com or through our Help Center.`,
  },
];

export default function Privacy() {
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
                Legal
              </span>
            </motion.div>
            <motion.h1
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Privacy <span className="text-gradient-gold">Policy</span>
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            {sections.map((section, index) => (
              <FadeIn key={section.title} delay={0.1 * index}>
                <div className="mb-10 p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-text-primary uppercase tracking-tight">
                        {section.title}
                      </h2>
                      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}

            <FadeIn delay={0.7}>
              <div className="p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5">
                <h2 className="font-display text-lg font-semibold text-text-primary uppercase tracking-tight">
                  Cookies
                </h2>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  We use cookies and similar technologies to enhance your browsing experience, analyze traffic, and personalize content. You can control cookie preferences through your browser settings.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
