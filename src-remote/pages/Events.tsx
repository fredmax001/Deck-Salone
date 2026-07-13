import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  List,
  LayoutGrid,
  Music,
  Loader2,
} from 'lucide-react';
import { useEvents, useEventTypes } from '@/hooks/useEvents';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const CITIES = [
  'All Cities',
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
const SORT_OPTIONS = ['Soonest', 'Alphabetical'];

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.getDate().toString().padStart(2, '0'),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function DJAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initial = name.charAt(0);
  const colors = ['#D4A24A', '#8B5CF6', '#22C55E', '#3B82F6', '#EF4444', '#F97316'];
  const color = colors[name.length % colors.length];
  return (
    <div
      className="rounded-full flex items-center justify-center text-[8px] font-bold text-black uppercase flex-shrink-0 border border-black"
      style={{ width: size, height: size, backgroundColor: color }}
      title={name}
    >
      {initial}
    </div>
  );
}

function toEventItem(event: any): EventItem {
  const { date, month, dayName, time } = formatEventDate(event.date);
  return {
    id: event.id,
    title: event.title,
    date,
    month,
    dayName,
    time,
    endTime: event.endTime || 'Late',
    venue: event.venue || event.location?.split(',')[0] || 'TBA',
    city: event.city || 'Unknown',
    type: event.type || 'Event',
    image: event.image || '/placeholder.jpg',
    djs: event.dj ? [event.dj.stageName] : [],
    djCount: event.slots || 0,
    ticketUrl: event.ticketUrl || null,
    dj: event.dj || null,
  };
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  month: string;
  dayName: string;
  time: string;
  endTime: string;
  venue: string;
  city: string;
  type: string;
  image: string;
  djs: string[];
  djCount: number;
  ticketUrl: string | null;
  dj: { id: string; stageName: string; avatar?: string } | null;
}

export default function Events() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('All Types');
  const [activeCity, setActiveCity] = useState('All Cities');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('Soonest');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const { data: eventsData, isLoading, error } = useEvents({ limit: 50, status: 'upcoming' });
  const { data: typesData = [] } = useEventTypes();
  const { data: openSlotsData } = useEvents({ isOpenSlot: true, limit: 6 });

  const eventTypes = useMemo(() => ['All Types', ...typesData.map((t: any) => t.name || t)], [typesData]);

  const events = useMemo(() => {
    let result = (eventsData?.data || [])
      .filter((event: any) => event.djId && event.dj);

    if (activeType !== 'All Types') {
      result = result.filter((e: any) => e.type.toLowerCase() === activeType.toLowerCase());
    }
    if (activeCity !== 'All Cities') {
      result = result.filter((e: any) => e.city === activeCity);
    }
    if (sortBy === 'Alphabetical') {
      result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    }
    // 'Soonest' uses the API's default date-ascending order

    return result.map(toEventItem);
  }, [eventsData, activeType, activeCity, sortBy]);

  const featured = events.slice(0, 2);
  const openSlots = (openSlotsData?.data || []).map(toEventItem);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-400 font-medium">Failed to load events</p>
          <p className="text-text-muted text-sm mt-2">{error instanceof Error ? error.message : 'Please try again.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* Hero */}
      <section className="relative w-full py-16 lg:py-20">
        <div className="max-w-container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <motion.div className="flex-1" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.span variants={fadeUp} className="text-gold text-xs font-semibold uppercase tracking-widest">EVENTS</motion.span>
              <motion.h1 variants={fadeUp} className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary uppercase tracking-tight mt-3">
                WHAT&apos;S HAPPENING IN SIERRA LEONE
              </motion.h1>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="relative w-full lg:w-[45%] max-w-md">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="relative">
                {events.length > 0 ? (
                  <img
                    src={events[0].image}
                    alt={events[0].title}
                    className="w-full rounded-2xl object-cover border-[3px] border-gold cursor-pointer"
                    style={{ aspectRatio: '16/10' }}
                    onClick={() => navigate(`/events/${events[0].id}`)}
                  />
                ) : (
                  <div className="w-full rounded-2xl border-[3px] border-gold bg-gradient-to-br from-gold/20 to-black flex items-center justify-center" style={{ aspectRatio: '16/10' }}>
                    <Music size={48} className="text-gold/40" />
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-gold text-black text-xs font-bold uppercase rounded-lg">
                  UPCOMING
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-container mx-auto px-6 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-black-elevated rounded-xl p-4 lg:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {eventTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                    activeType === type
                      ? 'bg-gold/10 text-gold border border-gold/50 scale-100'
                      : 'text-text-muted border border-dark-gray hover:text-text-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-dark-gray hidden sm:block" />
            <select value={activeCity} onChange={(e) => setActiveCity(e.target.value)} className="h-8 px-3 bg-black-surface border border-dark-gray rounded-lg text-xs text-text-primary focus:outline-none focus:border-gold cursor-pointer">
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-8 px-3 bg-black-surface border border-dark-gray rounded-lg text-xs text-text-primary focus:outline-none focus:border-gold cursor-pointer">
              {SORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowCalendar((v) => !v)} className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${showCalendar ? 'bg-gold/10 text-gold border border-gold/50' : 'text-text-muted border border-dark-gray hover:text-text-primary'}`}>
              <Calendar size={12} /> Calendar
            </button>
          </div>
        </motion.div>
      </section>

      {/* Featured */}
      {!showCalendar && featured.length > 0 && (
        <section className="max-w-container mx-auto px-6 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featured.map((ev: EventItem, i: number) => (
              <motion.div
                key={ev.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                onClick={() => navigate(`/events/${ev.id}`)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-gold/30 transition-all duration-300 aspect-[16/10] sm:aspect-[2/1]"
              >
                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                <div className="absolute inset-0 bg-hero-overlay" />
                <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                  <span className="inline-block px-2 py-0.5 bg-gold-gradient text-black text-[9px] font-bold uppercase rounded-full mb-2">FEATURED</span>
                  <h3 className="font-display text-lg lg:text-xl font-semibold text-text-primary uppercase tracking-tight">{ev.title}</h3>
                  <p className="text-xs font-mono text-gold mt-1">{ev.dayName}, {ev.month} {ev.date} &bull; {ev.time}</p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-1"><MapPin size={10} /> {ev.venue}, {ev.city}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Events List/Grid */}
      {!showCalendar && (
        <section className="max-w-container mx-auto px-6 pt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-text-primary uppercase tracking-tight">UPCOMING EVENTS</h2>
            <div className="flex items-center bg-black-elevated rounded-lg p-0.5 border border-dark-gray">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gold/20 text-gold' : 'text-text-muted hover:text-text-primary'}`}><List size={14} /></button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gold/20 text-gold' : 'text-text-muted hover:text-text-primary'}`}><LayoutGrid size={14} /></button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {events.map((ev: EventItem, i: number) => (
                  <EventListRow key={ev.id} event={ev} index={i} onClick={() => navigate(`/events/${ev.id}`)} />
                ))}
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((ev: EventItem, i: number) => (
                  <EventGridCard key={ev.id} event={ev} index={i} onClick={() => navigate(`/events/${ev.id}`)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Open DJ Slots */}
      <section className="mt-16 py-16 bg-black-elevated">
        <div className="max-w-container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2"><Music size={14} className="text-gold" /><span className="text-gold text-[10px] font-semibold uppercase tracking-wider">OPEN DJ SLOTS</span></div>
              <h2 className="font-display text-2xl lg:text-3xl font-semibold text-text-primary uppercase tracking-tight mt-1">DJs WANTED</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {openSlots.map((slot: EventItem, i: number) => (
              <DJSlotCard key={slot.id} slot={slot} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Calendar */}
      {showCalendar && (
        <section className="max-w-container mx-auto px-6 pt-8 pb-16">
          <CalendarView month={calendarMonth} onChangeMonth={setCalendarMonth} events={events} onEventClick={(id) => navigate(`/events/${id}`)} />
        </section>
      )}
    </div>
  );
}

function EventListRow({ event, index, onClick }: { event: EventItem; index: number; onClick?: () => void }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: index * 0.08 }} onClick={onClick} className="group flex items-center gap-4 bg-black-elevated rounded-xl p-4 border border-white/5 hover:bg-medium-gray hover:translate-x-1 transition-all duration-200 cursor-pointer">
      <div className="flex flex-col items-center justify-center w-16 flex-shrink-0">
        <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">{event.month}</span>
        <span className="font-mono text-2xl font-bold text-text-primary leading-none mt-0.5">{event.date}</span>
        <span className="text-[10px] text-text-muted mt-0.5">{event.dayName}</span>
      </div>
      <img src={event.image} alt={event.title} className="w-[100px] h-[70px] rounded-lg object-cover flex-shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">{event.title}</h4>
        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><MapPin size={10} /> {event.venue}, {event.city}</p>
        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Clock size={10} /> {event.time}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex -space-x-1">
            {event.djs.slice(0, 3).map((dj, di) => <DJAvatar key={di} name={dj} size={20} />)}
          </div>
          <span className="inline-block px-2 py-0.5 text-[9px] font-medium text-gold border border-gold/30 rounded-full">{event.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:block px-3 py-1.5 bg-gold-gradient text-black text-[10px] font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
          >
            Get Tickets
          </a>
        ) : (
          <span className="hidden sm:block px-3 py-1.5 bg-white/10 text-text-muted text-[10px] font-bold uppercase rounded-full cursor-not-allowed">
            No Tickets
          </span>
        )}
      </div>
    </motion.div>
  );
}

function EventGridCard({ event, index, onClick }: { event: EventItem; index: number; onClick?: () => void }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: index * 0.06 }} onClick={onClick} className="group relative rounded-xl overflow-hidden bg-black-elevated border border-white/5 hover:border-gold/30 transition-all duration-300">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-gold text-black text-[9px] font-bold uppercase rounded-full">{event.type}</div>
      </div>
      <div className="p-4">
        <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">{event.title}</h4>
        <p className="text-xs font-mono text-gold mt-1">{event.month} {event.date} &bull; {event.time}</p>
        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><MapPin size={10} /> {event.venue}, {event.city}</p>
        {event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 block text-center w-full py-1.5 bg-gold-gradient text-black text-[10px] font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
          >
            Get Tickets
          </a>
        ) : (
          <span className="mt-3 block text-center w-full py-1.5 bg-white/10 text-text-muted text-[10px] font-bold uppercase rounded-full cursor-not-allowed">
            No Tickets
          </span>
        )}
      </div>
    </motion.div>
  );
}

function DJSlotCard({ slot, index }: { slot: EventItem; index: number }) {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative bg-black rounded-xl p-5 border-l-[3px] border-l-gold border border-white/5">
      <h4 className="font-display text-sm font-semibold text-gold uppercase">{slot.title}</h4>
      <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><Calendar size={10} /> {slot.dayName}, {slot.month} {slot.date}</p>
      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1"><MapPin size={10} /> {slot.venue}, {slot.city}</p>
      <p className="text-xs text-text-primary mt-2"><span className="text-text-muted">Open slots:</span> {slot.djCount}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-text-muted">Apply to DJ</span>
        <motion.button
          className="px-4 py-1.5 bg-gold-gradient text-black text-[10px] font-bold uppercase rounded-full"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => setShowMessage(true)}
        >
          Apply Now
        </motion.button>
      </div>
      {showMessage && (
        <p className="mt-2 text-[10px] text-gold">
          Applications coming soon. Contact the event organizer for now.
        </p>
      )}
    </motion.div>
  );
}

function CalendarView({ month, onChangeMonth, events, onEventClick }: { month: number; onChangeMonth: (m: number) => void; events: EventItem[]; onEventClick?: (id: string) => void }) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const eventDays = useMemo(() => {
    const map: Record<number, EventItem[]> = {};
    events.forEach((ev) => {
      const day = parseInt(ev.date, 10);
      if (ev.month === monthNames[month].toUpperCase().slice(0, 3)) {
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, month, monthNames]);

  const today = new Date();
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => onChangeMonth(Math.max(0, month - 1))} className="p-2 text-text-muted hover:text-text-primary transition-colors"><ChevronRight size={16} className="rotate-180" /></button>
        <h3 className="font-display text-xl font-semibold text-text-primary uppercase">{monthNames[month]} {year}</h3>
        <button onClick={() => onChangeMonth(Math.min(11, month + 1))} className="p-2 text-text-muted hover:text-text-primary transition-colors"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {dayHeaders.map((d) => <div key={d} className="text-center py-2 text-[11px] font-semibold text-text-muted uppercase">{d}</div>)}
      </div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] lg:min-h-[100px] bg-black-elevated/30 p-1.5" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventDays[day] || [];
          return (
            <motion.div key={day} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.01 }} className={`min-h-[80px] lg:min-h-[100px] p-1.5 border border-white/[0.03] transition-colors hover:bg-black-elevated ${dayEvents.length ? 'bg-gold/[0.02]' : 'bg-black/50'}`}>
              <div className="flex items-center justify-center w-6 h-6 mx-auto">
                {isToday(day) ? <span className="w-6 h-6 rounded-full bg-gold text-black text-[11px] font-bold flex items-center justify-center">{day}</span> : <span className="text-[11px] font-mono text-text-primary">{day}</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick?.(ev.id)}
                    className="flex items-center gap-1 px-1 py-0.5 rounded bg-black-surface/50 cursor-pointer hover:bg-gold/10 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                    <span className="text-[9px] text-gold truncate hidden lg:block">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && <p className="text-[9px] text-text-muted pl-1">+{dayEvents.length - 2} more</p>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
