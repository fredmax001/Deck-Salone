#!/usr/bin/env python3
import re

filepath = '/Users/djfredmax/Desktop/Deck Salone/app/src/pages/HallOfFame.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add hardcoded legends data after the timelineEvents
legends_data = '''
/* ──────────────────────────── Legacy Legends (not on platform / passed away) ──────────────────────────── */

interface Legend {
  id: string;
  name: string;
  era: string;
  status: 'living' | 'deceased' | 'unknown';
  story: string;
  contribution: string;
  quote?: string;
  image: string;
  city: string;
}

const legacyLegends: Legend[] = [
  {
    id: 'legend-1',
    name: 'DJ Master J',
    era: '1985 — 2005',
    status: 'deceased',
    story: 'One of the first mobile DJs in Freetown, Master J built his own sound system from salvaged parts in the early 1980s. He played at virtually every community event in the capital for two decades, introducing generations to vinyl culture before anyone else had access to imported records. His Saturday night sets at the famous Palm Beach Nightclub became legendary.',
    contribution: 'Introduced vinyl DJ culture to Freetown; built the first community sound system; mentored over 20 DJs who went on to define the scene.',
    quote: 'The music is the message. Without it, we have no voice.',
    image: '/placeholder.jpg',
    city: 'Freetown',
  },
  {
    id: 'legend-2',
    name: 'Selector Brown',
    era: '1990 — Present',
    status: 'living',
    story: 'The godfather of mixtape culture in Sierra Leone. In the mid-1990s, Brown began recording live sets onto cassette tapes and distributing them across the country through market vendors. Before the internet, his tapes were how people in Bo, Kenema, and Makeni discovered new music. He never owned a digital mixer, but his ear for transitions was unmatched.',
    contribution: 'Created the nationwide mixtape distribution network; bridged regional music scenes; preserved hundreds of live sets from the 1990s.',
    image: '/placeholder.jpg',
    city: 'Bo',
  },
  {
    id: 'legend-3',
    name: 'MC Spinna',
    era: '1995 — 2010',
    status: 'deceased',
    story: 'The first DJ to introduce competitive battling to Sierra Leone. In 1995, MC Spinna organized the legendary battle at Lumley Beach that pitted east Freetown DJs against west Freetown selectors. The event drew over 5,000 people and established the competitive DJ culture that still thrives today. He was known for his rapid-fire scratching and unmatched crowd control.',
    contribution: 'Founded the DJ battle culture in Sierra Leone; established the first DJ competition format; inspired the modern battle scene.',
    quote: 'Let the turntables talk.',
    image: '/placeholder.jpg',
    city: 'Freetown',
  },
  {
    id: 'legend-4',
    name: 'Digital K',
    era: '2000 — Present',
    status: 'living',
    story: 'When CDJs arrived in Sierra Leone in the early 2000s, most DJs resisted the change. Digital K embraced it. He was the first to blend digital mixing with traditional vinyl techniques, creating a hybrid style that defined the 2000s era. His groundbreaking work in wedding DJing professionalized the industry, setting standards for equipment and performance quality that elevated the entire scene.',
    contribution: 'Pioneered digital mixing in Sierra Leone; professionalized wedding DJ industry; set equipment standards adopted nationwide.',
    image: '/placeholder.jpg',
    city: 'Makeni',
  },
];
'''

# Insert after timelineEvents closing bracket
insert_after = "The first official digital ecosystem for Sierra Leonean DJs is born, backed by Sound It Entertainment.\n  },\n];"
if insert_after in content:
    content = content.replace(insert_after, insert_after + legends_data)
    print("✓ Added legacy legends data")
else:
    print("✗ Could not find insertion point for legends data")

# 2. Add Legacy Legends section before the Pioneer DJs section
old_pioneers_section = '''      {/* ═══════════════ SECTION 3: PIONEER DJS (REAL DATA) ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-black-elevated">
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <SectionLabel text="THE PIONEERS" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Legends Who Started It All
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-text-secondary max-w-lg mx-auto">
                The founding generation of Sierra Leone&apos;s DJ culture
              </p>
            </FadeIn>
          </div>'''

new_pioneers_section = '''      {/* ═══════════════ SECTION 3: LEGACY LEGENDS (NOT ON PLATFORM) ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-black-elevated">
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <SectionLabel text="THE FOUNDATION" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Legacy Legends
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-text-secondary max-w-lg mx-auto">
                Pioneers who built the culture — some never joined the platform, others have passed on, but their stories must be told.
              </p>
            </FadeIn>
          </div>

          <div className="space-y-20">
            {legacyLegends.map((legend, index) => {
              const isEven = index % 2 === 0;
              return (
                <FadeIn key={legend.id} delay={0.1}>
                  <motion.div
                    className={`flex flex-col gap-8 md:gap-12 items-center ${
                      isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Image Side */}
                    <div className="w-full md:w-5/12 relative group">
                      <div className="aspect-[4/5] rounded-2xl overflow-hidden border-2 border-white/5 relative">
                        <img
                          src={legend.image}
                          alt={legend.name}
                          className="w-full h-full object-cover sepia opacity-70 group-hover:sepia-0 group-hover:opacity-90 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
                        <div className="absolute top-4 left-4">
                          <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                            legend.status === 'deceased'
                              ? 'bg-white/10 text-text-muted border border-white/10'
                              : 'bg-gold/20 text-gold border border-gold/20'
                          }`}>
                            {legend.status === 'deceased' ? 'In Memoriam' : legend.status === 'living' ? 'Living Legend' : 'Status Unknown'}
                          </span>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6">
                          <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-gold text-black rounded-full mb-3">
                            Legacy Legend
                          </span>
                          <h3 className="font-display text-3xl font-bold text-white uppercase tracking-tight">
                            {legend.name}
                          </h3>
                          <p className="font-mono text-sm text-gold mt-1">
                            {legend.era}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            {legend.city}, Sierra Leone
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Story Side */}
                    <div className="w-full md:w-7/12 flex flex-col justify-center">
                      <div className="relative">
                        <span className="absolute -top-8 -left-4 text-6xl text-gold/10 font-display font-bold select-none">
                          &ldquo;
                        </span>
                        <h4 className="text-xl font-semibold text-text-primary mb-4 relative z-10">
                          The Story of {legend.name}
                        </h4>
                        <div className="prose prose-invert max-w-none text-text-secondary leading-loose text-base">
                          <p>{legend.story}</p>
                        </div>

                        {legend.quote && (
                          <div className="mt-6 border-l-2 border-gold/40 pl-4">
                            <p className="text-sm text-gold/80 italic font-serif">
                              &ldquo;{legend.quote}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="mt-8 border-l-2 border-gold/30 pl-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-gold mb-2">
                            Contribution to Culture
                          </p>
                          <p className="text-sm text-text-muted leading-relaxed">
                            {legend.contribution}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4: PIONEER DJS ON PLATFORM ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <SectionLabel text="THE PIONEERS" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Living Legends on Deck Salone
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-text-secondary max-w-lg mx-auto">
                The founding generation of Sierra Leone&apos;s DJ culture, active on the platform today
              </p>
            </FadeIn>
          </div>'''

if old_pioneers_section in content:
    content = content.replace(old_pioneers_section, new_pioneers_section)
    print("✓ Replaced pioneers section with legends + pioneers")
else:
    print("✗ Could not find pioneers section to replace")

# 3. Update the honorary CTA text to be more specific
old_cta = '''Many pioneers who built our culture might not be on the platform, or have passed away. Their stories deserve to be told. Help us document history by nominating a legendary DJ.'''
new_cta = '''Know a pioneer who built Sierra Leone&apos;s DJ culture but never joined the platform? Or someone who has passed away and deserves to be remembered? Help us document their story for future generations.'''

if old_cta in content:
    content = content.replace(old_cta, new_cta)
    print("✓ Updated honorary CTA text")
else:
    print("✗ Could not find CTA text to update")

with open(filepath, 'w') as f:
    f.write(content)

print("Done!")
