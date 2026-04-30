'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navbar from '@/components/navbar';
import VenueTypeBadge from '@/components/VenueTypeBadge';
import { RiCalendarEventLine, RiTimeLine, RiTicketLine, RiMapPinLine, RiSearchLine } from 'react-icons/ri';

const EVENT_TYPES = [
  { value: 'all',           label: 'All Events' },
  { value: 'dj_night',     label: 'DJ Night' },
  { value: 'live_music',   label: 'Live Music' },
  { value: 'themed_night', label: 'Themed Night' },
  { value: 'happy_hour',   label: 'Happy Hour' },
  { value: 'private_party',label: 'Private Party' },
  { value: 'gala',         label: 'Gala' },
  { value: 'wine_tasting', label: 'Wine Tasting' },
  { value: 'other',        label: 'Other' },
];

const EVENT_TYPE_EMOJI = {
  live_music: '🎸', dj_night: '🎧', private_party: '🎉', sports_viewing: '⚽',
  themed_night: '🎭', wine_tasting: '🍷', gala: '✨', happy_hour: '🍹', other: '📅'
};

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const venueId = searchParams.get('venueId');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        let url = `/api/events?upcoming=true&limit=50`;
        if (typeFilter !== 'all') url += `&type=${typeFilter}`;
        if (venueId) url += `&venueId=${venueId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (e) {
        console.error('Events fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [typeFilter, venueId]);

  const filtered = search
    ? events.filter(ev => ev.name.toLowerCase().includes(search.toLowerCase()) ||
        ev.venueId?.restaurantName?.toLowerCase().includes(search.toLowerCase()))
    : events;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className="min-h-screen" style={{ background: '#0C0B10' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 px-4" style={{ background: 'linear-gradient(180deg, #161520 0%, #0C0B10 100%)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold tracking-[0.3em] uppercase mb-3"
            style={{ color: '#C9A84C' }}
          >
            Velvet Events
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight"
            style={{ color: '#F5F0E8', fontFamily: 'serif', lineHeight: 1.05 }}
          >
            Upcoming <span style={{ color: '#C9A84C' }}>Events</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg max-w-xl mx-auto"
            style={{ color: '#9B96A8' }}
          >
            Discover DJ nights, live music, galas and more at the finest venues.
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 max-w-lg mx-auto relative"
          >
            <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#C9A84C' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events or venues..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm outline-none"
              style={{ background: '#161520', color: '#F5F0E8', border: '1px solid rgba(201,168,76,0.25)' }}
            />
          </motion.div>
        </div>
      </section>

      {/* Type filter */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 flex-wrap">
          {EVENT_TYPES.map(et => (
            <button
              key={et.value}
              onClick={() => setTypeFilter(et.value)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: typeFilter === et.value ? 'rgba(201,168,76,0.15)' : '#161520',
                color: typeFilter === et.value ? '#C9A84C' : '#9B96A8',
                border: `1px solid ${typeFilter === et.value ? '#C9A84C' : '#1E1D2A'}`
              }}
            >
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events grid */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(201,168,76,0.2)', borderTop: '2px solid #C9A84C' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <RiCalendarEventLine style={{ fontSize: '64px', color: '#1E1D2A', margin: '0 auto 16px' }} />
            <p style={{ color: '#F5F0E8' }} className="text-xl font-semibold">No events found</p>
            <p style={{ color: '#9B96A8' }} className="mt-2">Check back soon for upcoming events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ev, i) => (
              <motion.div
                key={ev._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/events/${ev._id}`)}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
                style={{ background: '#161520', border: '1px solid #1E1D2A' }}
              >
                {/* Event image or gradient header */}
                <div className="h-40 relative overflow-hidden flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, #161520, #0C0B10)` }}>
                  {ev.images?.[0] ? (
                    <img src={ev.images[0]} alt={ev.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <span className="text-6xl">{EVENT_TYPE_EMOJI[ev.type] || '📅'}</span>
                  )}
                  {ev.coverCharge > 0 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(12,11,16,0.85)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
                      ฿{ev.coverCharge} cover
                    </div>
                  )}
                  {ev.coverCharge === 0 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                      Free Entry
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-base mb-1 line-clamp-1" style={{ color: '#F5F0E8' }}>{ev.name}</h3>

                  {ev.venueId && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <RiMapPinLine style={{ color: '#9B96A8', fontSize: '13px', flexShrink: 0 }} />
                      <span className="text-xs truncate" style={{ color: '#9B96A8' }}>{ev.venueId.restaurantName}</span>
                      {ev.venueId.venueType && (
                        <VenueTypeBadge venueType={ev.venueId.venueType} size="sm" />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #1E1D2A' }}>
                    <div className="flex items-center gap-1.5">
                      <RiCalendarEventLine style={{ color: '#C9A84C', fontSize: '13px' }} />
                      <span className="text-xs" style={{ color: '#9B96A8' }}>{formatDate(ev.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RiTimeLine style={{ color: '#C9A84C', fontSize: '13px' }} />
                      <span className="text-xs" style={{ color: '#9B96A8' }}>{ev.startTime}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C0B10' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(201,168,76,0.2)', borderTop: '2px solid #C9A84C' }} />
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}
