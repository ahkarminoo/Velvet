'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCalendarEventLine, RiTimeLine, RiTicketLine, RiArrowRightLine } from 'react-icons/ri';
import { useRouter } from 'next/navigation';

const EVENT_TYPE_LABELS = {
  live_music: 'Live Music', dj_night: 'DJ Night', private_party: 'Private Party',
  sports_viewing: 'Sports', themed_night: 'Themed Night', wine_tasting: 'Wine Tasting',
  gala: 'Gala', happy_hour: 'Happy Hour', other: 'Event'
};

const EVENT_TYPE_COLORS = {
  live_music: '#c9a961', dj_night: '#9b7340', private_party: '#EC4899',
  sports_viewing: '#10B981', themed_night: '#F59E0B', wine_tasting: '#DC2626',
  gala: '#0EA5E9', happy_hour: '#FF4F18', other: '#8b847a'
};

export default function EventListingSection({ venueId, selectedDate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!venueId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        let url = `/api/venues/${venueId}/events?public=true&upcoming=true`;
        const res = await window.fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (e) {
        console.error('EventListing fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [venueId]);

  // Highlight event that matches selected date
  useEffect(() => {
    if (!selectedDate || !events.length) { setActiveEvent(null); return; }
    const found = events.find(ev => {
      const evDate = new Date(ev.date).toISOString().split('T')[0];
      return evDate === selectedDate;
    });
    setActiveEvent(found || null);
  }, [selectedDate, events]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-sm" style={{ color: '#8b847a' }}>
      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#c9a961', borderTopColor: 'transparent' }} />
      Loading events...
    </div>
  );

  if (!events.length) return null;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#c9a961' }}>
        Upcoming Events
      </h3>

      {/* Active event banner */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(201, 169, 97, 0.12)', border: '1px solid rgba(201, 169, 97, 0.3)' }}
          >
            <RiCalendarEventLine style={{ color: '#c9a961', fontSize: '20px', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: '#c9a961' }}>Event on selected date</p>
              <p className="font-semibold text-sm truncate" style={{ color: '#f5efe3' }}>{activeEvent.name}</p>
              <p className="text-xs" style={{ color: '#8b847a' }}>{activeEvent.startTime} – {activeEvent.endTime}</p>
            </div>
            {activeEvent.coverCharge > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(201, 169, 97, 0.2)', color: '#c9a961' }}>
                ฿{activeEvent.coverCharge} cover
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {events.slice(0, 4).map(ev => {
          const color = EVENT_TYPE_COLORS[ev.type] || '#8b847a';
          const isActive = activeEvent?._id === ev._id;
          return (
            <motion.div
              key={ev._id}
              whileHover={{ x: 4 }}
              onClick={() => router.push(`/events/${ev._id}`)}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: isActive ? 'rgba(201, 169, 97, 0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(201, 169, 97, 0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}22` }}>
                <RiCalendarEventLine style={{ color, fontSize: '16px' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#f5efe3' }}>{ev.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: '#8b847a' }}>{formatDate(ev.date)}</span>
                  <span className="text-xs" style={{ color: '#8b847a' }}>·</span>
                  <span className="text-xs" style={{ color: '#8b847a' }}>{ev.startTime}</span>
                  {ev.coverCharge > 0 && <>
                    <span className="text-xs" style={{ color: '#8b847a' }}>·</span>
                    <span className="text-xs font-medium" style={{ color }}>฿{ev.coverCharge}</span>
                  </>}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${color}22`, color }}>
                {EVENT_TYPE_LABELS[ev.type] || 'Event'}
              </span>
              <RiArrowRightLine style={{ color: '#8b847a', fontSize: '14px', flexShrink: 0 }} />
            </motion.div>
          );
        })}
      </div>

      {events.length > 4 && (
        <button
          onClick={() => router.push(`/events?venueId=${venueId}`)}
          className="mt-3 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: '#c9a961' }}
        >
          View all {events.length} events <RiArrowRightLine />
        </button>
      )}
    </div>
  );
}
