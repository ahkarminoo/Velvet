'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/navbar';
import VenueTypeBadge from '@/components/VenueTypeBadge';
import {
  RiCalendarEventLine, RiTimeLine, RiTicketLine, RiMapPinLine,
  RiArrowLeftLine, RiUserLine, RiShieldCheckLine
} from 'react-icons/ri';

const EVENT_TYPE_EMOJI = {
  live_music: '🎸', dj_night: '🎧', private_party: '🎉', sports_viewing: '⚽',
  themed_night: '🎭', wine_tasting: '🍷', gala: '✨', happy_hour: '🍹', other: '📅'
};

const ZONE_TYPE_LABELS = {
  vip: 'VIP', standard: 'Standard', bar_counter: 'Bar Counter',
  outdoor: 'Outdoor', private: 'Private', dance_floor: 'Dance Floor',
  stage: 'Stage', lounge: 'Lounge'
};

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/events/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setEvent(data.event); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C0B10' }}>
      <div className="w-12 h-12 rounded-full border-2 animate-spin"
        style={{ borderColor: 'rgba(201,168,76,0.15)', borderTop: '2px solid #C9A84C' }} />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0C0B10' }}>
      <p className="text-2xl font-bold" style={{ color: '#F5F0E8' }}>Event not found</p>
      <button onClick={() => router.push('/events')} className="mt-4 text-sm" style={{ color: '#C9A84C' }}>
        ← Back to Events
      </button>
    </div>
  );

  const venue = event.venueId;

  return (
    <div className="min-h-screen" style={{ background: '#0C0B10' }}>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(180deg, #161520 0%, #0C0B10 100%)' }} />

        {event.images?.[0] && (
          <div className="absolute inset-0 z-0">
            <img src={event.images[0]} alt={event.name} className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(12,11,16,0.7) 0%, #0C0B10 100%)' }} />
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-12">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 text-sm transition-opacity hover:opacity-60"
            style={{ color: '#9B96A8' }}>
            <RiArrowLeftLine /> Back to Events
          </button>

          <div className="text-6xl mb-4">{EVENT_TYPE_EMOJI[event.type] || '📅'}</div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
            style={{ color: '#F5F0E8', fontFamily: 'serif', lineHeight: 1.1 }}
          >
            {event.name}
          </motion.h1>

          {event.description && (
            <p className="text-lg max-w-2xl mb-6" style={{ color: '#9B96A8' }}>{event.description}</p>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
              <RiCalendarEventLine />
              {formatDate(event.date)}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
              <RiTimeLine />
              {event.startTime} – {event.endTime}
            </div>
            {event.coverCharge > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
                <RiTicketLine />
                ฿{event.coverCharge} Cover Charge
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                <RiShieldCheckLine />
                Free Entry
              </div>
            )}
            {event.capacity > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: '#161520', color: '#9B96A8', border: '1px solid #1E1D2A' }}>
                <RiUserLine />
                {event.currentBookings}/{event.capacity} capacity
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floorplans */}
          {event.floorplanIds?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: '#161520', border: '1px solid #1E1D2A' }}>
              <h3 className="font-bold mb-3 text-sm uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Event Floorplans
              </h3>
              <div className="space-y-2">
                {event.floorplanIds.map(fp => (
                  <div key={fp._id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(201,168,76,0.15)' }}>
                      <span style={{ color: '#C9A84C', fontSize: '16px' }}>🏗️</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#F5F0E8' }}>{fp.name}</p>
                      {fp.floorplanType && (
                        <p className="text-xs" style={{ color: '#9B96A8' }}>{fp.floorplanType.replace(/_/g, ' ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zone overrides */}
          {event.zoneOverrides?.filter(o => o.zoneId)?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: '#161520', border: '1px solid #1E1D2A' }}>
              <h3 className="font-bold mb-3 text-sm uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Zone Pricing for This Event
              </h3>
              <div className="space-y-2">
                {event.zoneOverrides.filter(o => o.zoneId).map(override => {
                  const zone = override.zoneId;
                  return (
                    <div key={zone._id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: '#0C0B10', border: '1px solid #1E1D2A' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#F5F0E8' }}>{zone.name}</p>
                          <p className="text-xs" style={{ color: '#9B96A8' }}>
                            {ZONE_TYPE_LABELS[zone.type] || zone.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {override.priceMultiplier > 1 && (
                          <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>
                            ×{override.priceMultiplier} pricing
                          </p>
                        )}
                        {override.minimumSpend > 0 && (
                          <p className="text-xs" style={{ color: '#9B96A8' }}>
                            Min spend ฿{override.minimumSpend}
                          </p>
                        )}
                        {override.isExclusive && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(124,58,237,0.15)', color: '#7C3AED' }}>
                            Event only
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Venue sidebar */}
        <div className="space-y-4">
          {venue && (
            <div className="p-5 rounded-2xl" style={{ background: '#161520', border: '1px solid #1E1D2A' }}>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Venue
              </h3>
              {venue.images?.main && (
                <img src={venue.images.main} alt={venue.restaurantName}
                  className="w-full h-32 object-cover rounded-xl mb-3" />
              )}
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold" style={{ color: '#F5F0E8' }}>{venue.restaurantName}</p>
                {venue.venueType && <VenueTypeBadge venueType={venue.venueType} />}
              </div>
              {venue.location?.address && (
                <div className="flex items-start gap-2 mt-2">
                  <RiMapPinLine style={{ color: '#9B96A8', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-sm" style={{ color: '#9B96A8' }}>{venue.location.address}</p>
                </div>
              )}
              {venue.venueSettings?.dresscode && (
                <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: 'rgba(201,168,76,0.08)', color: '#C9A84C' }}>
                  Dress code: {venue.venueSettings.dresscode}
                </div>
              )}
              {venue.venueSettings?.ageRestriction > 0 && (
                <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(201,168,76,0.08)', color: '#C9A84C' }}>
                  Age {venue.venueSettings.ageRestriction}+ only
                </div>
              )}
              <button
                onClick={() => router.push(`/?venue=${venue._id}`)}
                className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: '#C9A84C', color: '#0C0B10' }}
              >
                View Venue & Book
              </button>
            </div>
          )}

          {event.externalTicketUrl && (
            <a href={event.externalTicketUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-80"
              style={{ background: '#161520', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
