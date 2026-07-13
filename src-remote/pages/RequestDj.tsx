import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Music, DollarSign, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateGig } from '@/hooks/useGigs';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Festival',
  'Club',
  'Corporate',
  'Private Party',
  'House Party',
  'Beach Party',
  'Religious Event',
  'School Event',
  'Graduation',
];

const MUSIC_STYLES = [
  'Afrobeats',
  'Amapiano',
  'Dancehall',
  'Hip Hop',
  'R&B',
  'House',
  'Reggae',
  'Salone Mix',
  'Throwbacks',
  'Gospel',
  'Club Mixes',
  'Wedding Mixes',
];

const EQUIPMENT_OPTIONS = [
  'DJ Only',
  'Speakers',
  'Lighting',
  'Microphone',
  'MC',
  'Full Setup',
];

const CITIES = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Koidu Town',
  'Port Loko',
  'Lunsar',
  'Waterloo',
  'Kabala',
  'Magburaka',
  'Kailahun',
  'Moyamba',
  'Pujehun',
  'Bonthe',
  'Kambia',
];

export default function RequestDj() {
  const navigate = useNavigate();
  const createGig = useCreateGig();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventType: '',
    eventDate: '',
    startTime: '',
    durationHours: '',
    location: '',
    city: '',
    budgetMin: '',
    budgetMax: '',
    musicStyles: [] as string[],
    equipmentNeeded: [] as string[],
    notes: '',
  });

  const toggle = (field: 'musicStyles' | 'equipmentNeeded', value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventType || !form.eventDate || !form.location) return;

    try {
      await createGig.mutateAsync({
        ...form,
        durationHours: form.durationHours ? Number(form.durationHours) : undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      });
      setSubmitted(true);
    } catch {
      // error handled by mutation
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[80dvh] bg-black flex items-center justify-center px-6 py-24">
        <Card className="max-w-md w-full bg-black-elevated border-dark-gray">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green" />
            </div>
            <h1 className="text-xl font-display font-bold text-text-primary uppercase tracking-wide">
              Request Received
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              We&apos;ve sent your request to matching DJs. You&apos;ll hear back soon.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => navigate('/discover')} className="bg-gold text-black hover:bg-gold-light">
                Browse DJs
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="border-dark-gray text-text-primary hover:bg-black-surface">
                Submit another request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80dvh] bg-black px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="text-gold text-xs font-semibold uppercase tracking-widest">DJ Marketplace</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary uppercase tracking-tight mt-2">
            Request a DJ
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black-elevated border-dark-gray">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary mb-2 block">Event Type *</Label>
                    <select
                      required
                      value={form.eventType}
                      onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                      className="w-full bg-black-surface border border-dark-gray rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
                    >
                      <option value="">Select event type</option>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-text-secondary mb-2 block">Event Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        type="date"
                        required
                        value={form.eventDate}
                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                        className="pl-10 bg-black-surface border-dark-gray text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-text-secondary mb-2 block">Start Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        className="pl-10 bg-black-surface border-dark-gray text-text-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-text-secondary mb-2 block">Duration (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.durationHours}
                      onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
                      placeholder="4"
                      className="bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary mb-2 block">City</Label>
                    <select
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-black-surface border border-dark-gray rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
                    >
                      <option value="">Select city</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Event Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      required
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Venue or address"
                      className="pl-10 bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary mb-2 block">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      Budget Min (SLE)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.budgetMin}
                      onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                      placeholder="2500"
                      className="bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary mb-2 block">Budget Max (SLE)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.budgetMax}
                      onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                      placeholder="5000"
                      className="bg-black-surface border-dark-gray text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-text-secondary mb-3 block">
                    <Music className="w-3 h-3 inline mr-1" />
                    Music Styles
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => toggle('musicStyles', style)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs border transition-colors',
                          form.musicStyles.includes(style)
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-black-surface border-dark-gray text-text-secondary hover:border-gold/30'
                        )}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-text-secondary mb-3 block">Equipment Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggle('equipmentNeeded', eq)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs border transition-colors',
                          form.equipmentNeeded.includes(eq)
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-black-surface border-dark-gray text-text-secondary hover:border-gold/30'
                        )}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Additional Notes</Label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    placeholder="Tell DJs more about your event, preferred vibe, special requests..."
                    className="w-full rounded-lg bg-black-surface border border-dark-gray text-text-primary text-sm p-3 placeholder:text-text-muted focus:border-gold focus:outline-none resize-none"
                  />
                </div>

                <div className="border-t border-dark-gray pt-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Contact Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-text-secondary mb-2 block">Your Name</Label>
                      <Input
                        value={form.clientName}
                        onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                        placeholder="John Doe"
                        className="bg-black-surface border-dark-gray text-text-primary"
                      />
                    </div>
                    <div>
                      <Label className="text-text-secondary mb-2 block">Email</Label>
                      <Input
                        type="email"
                        value={form.clientEmail}
                        onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                        placeholder="you@example.com"
                        className="bg-black-surface border-dark-gray text-text-primary"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-text-secondary mb-2 block">Phone</Label>
                      <Input
                        value={form.clientPhone}
                        onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                        placeholder="+232..."
                        className="bg-black-surface border-dark-gray text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                {createGig.isError && (
                  <p className="text-sm text-red-400">
                    {(createGig.error as any)?.response?.data?.error || 'Failed to submit request'}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={createGig.isPending}
                  className="w-full bg-gold text-black hover:bg-gold-light font-semibold uppercase"
                >
                  {createGig.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Find Me a DJ
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
