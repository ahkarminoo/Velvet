'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCalendarEventLine, RiAddLine, RiEditLine, RiDeleteBinLine,
  RiFlashlightLine, RiTimeLine, RiTicketLine, RiRefreshLine
} from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import EventCreator from './EventCreator';

const VELVET = {
  black: '#0C0B10', surface: '#161520', border: '#1E1D2A',
  gold: '#C9A84C', goldLight: '#E8C97A', cream: '#F5F0E8', muted: '#9B96A8',
  purple: '#7C3AED'
};

const STATUS_STYLES = {
  draft:     { label: 'Draft',     bg: 'rgba(155,150,168,0.15)', color: '#9B96A8' },
  published: { label: 'Published', bg: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239,68,68,0.15)',   color: '#EF4444' },
  completed: { label: 'Completed', bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C' },
};

const EVENT_TYPE_EMOJI = {
  live_music: '🎸', dj_night: '🎧', private_party: '🎉', sports_viewing: '⚽',
  themed_night: '🎭', wine_tasting: '🍷', gala: '✨', happy_hour: '🍹', other: '📅'
};

export default function EventManager({ restaurantId, token, floorplans = [], zones = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    if (!restaurantId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${restaurantId}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('EventManager fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, token]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handlePublish = async (eventId) => {
    try {
      const res = await fetch(`/api/venues/${restaurantId}/events/${eventId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Event published!');
      fetchEvents();
    } catch (e) {
      toast.error(e.message || 'Failed to publish');
    }
  };

  const handleCancel = async (eventId) => {
    if (!confirm('Cancel this event?')) return;
    try {
      const res = await fetch(`/api/venues/${restaurantId}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Event cancelled');
      fetchEvents();
    } catch (e) {
      toast.error(e.message || 'Failed to cancel');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const isUpcoming = (ev) => new Date(ev.date) >= new Date();

  const filtered = filter === 'all' ? events :
    filter === 'upcoming' ? events.filter(isUpcoming) :
    events.filter(ev => ev.status === filter);

  if (showCreator || editingEvent) {
    return (
      <EventCreator
        restaurantId={restaurantId}
        token={token}
        floorplans={floorplans}
        zones={zones}
        editingEvent={editingEvent}
        onSaved={() => { setShowCreator(false); setEditingEvent(null); fetchEvents(); }}
        onClose={() => { setShowCreator(false); setEditingEvent(null); }}
      />
    );
  }

  return (
    <div style={{ color: VELVET.cream }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: VELVET.cream }}>Events</h2>
          <p className="text-sm mt-0.5" style={{ color: VELVET.muted }}>Create and manage venue events</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchEvents} className="p-2 rounded-xl transition-opacity hover:opacity-60"
            style={{ background: VELVET.surface, color: VELVET.muted }}>
            <RiRefreshLine size={18} />
          </button>
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: VELVET.gold, color: '#0C0B10' }}
          >
            <RiAddLine /> Create Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: events.length, color: VELVET.muted },
          { label: 'Published', value: events.filter(e => e.status === 'published').length, color: '#10B981' },
          { label: 'Upcoming', value: events.filter(isUpcoming).length, color: VELVET.gold },
          { label: 'Drafts', value: events.filter(e => e.status === 'draft').length, color: VELVET.purple },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: VELVET.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['all', 'upcoming', 'published', 'draft', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={{
              background: filter === f ? 'rgba(201,168,76,0.15)' : VELVET.surface,
              color: filter === f ? VELVET.gold : VELVET.muted,
              border: `1px solid ${filter === f ? VELVET.gold : VELVET.border}`
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: VELVET.gold, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}>
          <RiCalendarEventLine style={{ fontSize: '48px', color: VELVET.muted, margin: '0 auto 12px' }} />
          <p style={{ color: VELVET.cream }}>No events yet</p>
          <p className="text-sm mt-1" style={{ color: VELVET.muted }}>Create your first event to get started</p>
          <button
            onClick={() => setShowCreator(true)}
            className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: VELVET.gold, color: '#0C0B10' }}
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(ev => {
              const st = STATUS_STYLES[ev.status] || STATUS_STYLES.draft;
              const upcoming = isUpcoming(ev);
              return (
                <motion.div
                  key={ev._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-5 rounded-2xl"
                  style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Emoji + type */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ background: 'rgba(201,168,76,0.1)' }}>
                      {EVENT_TYPE_EMOJI[ev.type] || '📅'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate" style={{ color: VELVET.cream }}>{ev.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        {upcoming && ev.status === 'published' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                            Upcoming
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-sm" style={{ color: VELVET.muted }}>
                          <RiCalendarEventLine size={14} />
                          {formatDate(ev.date)}
                        </span>
                        <span className="flex items-center gap-1 text-sm" style={{ color: VELVET.muted }}>
                          <RiTimeLine size={14} />
                          {ev.startTime} – {ev.endTime}
                        </span>
                        {ev.coverCharge > 0 && (
                          <span className="flex items-center gap-1 text-sm" style={{ color: VELVET.gold }}>
                            <RiTicketLine size={14} />
                            ฿{ev.coverCharge} cover
                          </span>
                        )}
                        {ev.capacity > 0 && (
                          <span className="text-sm" style={{ color: VELVET.muted }}>
                            {ev.currentBookings}/{ev.capacity} capacity
                          </span>
                        )}
                      </div>

                      {ev.floorplanIds?.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: VELVET.muted }}>
                          {ev.floorplanIds.length} floorplan{ev.floorplanIds.length > 1 ? 's' : ''} active
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ev.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(ev._id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                          style={{ background: VELVET.gold, color: '#0C0B10' }}
                        >
                          <RiFlashlightLine /> Publish
                        </button>
                      )}
                      <button
                        onClick={() => setEditingEvent(ev)}
                        className="p-2 rounded-xl transition-opacity hover:opacity-60"
                        style={{ background: 'rgba(201,168,76,0.1)', color: VELVET.gold }}
                        title="Edit event"
                      >
                        <RiEditLine size={16} />
                      </button>
                      {ev.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(ev._id)}
                          className="p-2 rounded-xl transition-opacity hover:opacity-60"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        >
                          <RiDeleteBinLine size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
