'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import Navbar from '@/components/navbar';
import VenueTypeBadge from '@/components/VenueTypeBadge';
import LoginModal from '@/components/LoginModal';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import {
  RiCalendarEventLine, RiTimeLine, RiTicketLine, RiMapPinLine,
  RiArrowLeftLine, RiUserLine, RiShieldCheckLine, RiCloseLine,
  RiCheckboxCircleLine, RiGroupLine, RiTableLine
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

const V = {
  black: '#0C0B10', surface: '#161520', border: '#1E1D2A',
  gold: '#C9A84C', cream: '#F5F0E8', muted: '#9B96A8',
};

function TicketModal({ event, onClose, user, getAuthToken }) {
  const [step, setStep] = useState('choose'); // choose | form | confirm
  const [attendanceType, setAttendanceType] = useState('ga');
  const [guestName, setGuestName] = useState(
    user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
  );
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const remaining = event.capacity > 0 ? event.capacity - event.currentBookings : null;

  const handleGetTicket = async () => {
    if (!guestName.trim()) { setError('Please enter your name'); return; }
    setError('');
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/events/${event._id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ guestName, guestEmail, quantity, attendanceType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to get ticket'); return; }

      const qr = await QRCode.toDataURL(data.ticket.ticketRef, {
        width: 200,
        margin: 2,
        color: { dark: '#0C0B10', light: '#F5F0E8' },
      });
      setQrDataUrl(qr);
      setTicket(data.ticket);
      setStep('confirm');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,11,16,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: V.surface, border: `1px solid ${V.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: `1px solid ${V.border}` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: V.gold }}>
              {step === 'confirm' ? 'Your Ticket' : 'Get Tickets'}
            </p>
            <p className="font-bold mt-0.5" style={{ color: V.cream }}>{event.name}</p>
          </div>
          {step !== 'confirm' && (
            <button onClick={onClose} className="p-2 rounded-xl hover:opacity-60 transition-opacity"
              style={{ background: 'rgba(245,240,232,0.05)', color: V.muted }}>
              <RiCloseLine size={20} />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* STEP: choose */}
          {step === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm mb-4" style={{ color: V.muted }}>How would you like to attend?</p>

              <button
                onClick={() => { setAttendanceType('ga'); setStep('form'); }}
                className="w-full p-4 rounded-2xl text-left transition-all hover:opacity-90 group"
                style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.25)` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.15)' }}>
                    <RiGroupLine size={20} style={{ color: V.gold }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: V.cream }}>General Admission</p>
                    <p className="text-xs mt-0.5" style={{ color: V.muted }}>
                      {event.coverCharge > 0 ? `฿${event.coverCharge} per person · Walk-in / general seating` : 'Free entry · Walk-in / general seating'}
                    </p>
                  </div>
                  {event.coverCharge > 0 && (
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: V.gold }}>฿{event.coverCharge}</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                const eventDate = new Date(event.date).toISOString().split('T')[0];
                router.push(`/restaurants/${event.venueId?._id}/floorplan?date=${eventDate}&time=${event.startTime}&eventId=${event._id}`);
              }}
                className="w-full p-4 rounded-2xl text-left transition-all hover:opacity-90"
                style={{ background: '#1E1D2A', border: `1px solid ${V.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,240,232,0.05)' }}>
                    <RiTableLine size={20} style={{ color: V.cream }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: V.cream }}>Reserve a Table</p>
                    <p className="text-xs mt-0.5" style={{ color: V.muted }}>
                      Pick your table on the floorplan · Includes entry
                    </p>
                  </div>
                </div>
              </button>

              {remaining !== null && (
                <p className="text-xs text-center pt-1" style={{ color: V.muted }}>
                  {remaining} spot{remaining !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
          )}

          {/* STEP: form */}
          {step === 'form' && (
            <div className="space-y-4">
              <button onClick={() => setStep('choose')}
                className="text-xs flex items-center gap-1 mb-2 hover:opacity-60 transition-opacity"
                style={{ color: V.muted }}>
                <RiArrowLeftLine size={12} /> Back
              </button>

              <div className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <RiGroupLine style={{ color: V.gold }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: V.gold }}>General Admission</p>
                  <p className="text-xs" style={{ color: V.muted }}>
                    {event.coverCharge > 0 ? `฿${event.coverCharge} per person` : 'Free entry'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: V.muted }}>Your Name *</label>
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#0C0B10', color: V.cream, border: `1px solid ${V.border}` }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: V.muted }}>Email (optional)</label>
                <input
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#0C0B10', color: V.cream, border: `1px solid ${V.border}` }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: V.muted }}>Number of Guests</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center transition-opacity hover:opacity-60"
                    style={{ background: '#0C0B10', color: V.cream, border: `1px solid ${V.border}` }}>
                    −
                  </button>
                  <span className="text-xl font-bold w-8 text-center" style={{ color: V.cream }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(remaining ?? 10, q + 1))}
                    className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center transition-opacity hover:opacity-60"
                    style={{ background: '#0C0B10', color: V.cream, border: `1px solid ${V.border}` }}>
                    +
                  </button>
                  {event.coverCharge > 0 && (
                    <span className="ml-2 text-sm font-bold" style={{ color: V.gold }}>
                      Total: ฿{event.coverCharge * quantity}
                    </span>
                  )}
                </div>
              </div>

              {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

              <button
                onClick={handleGetTicket}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: V.gold, color: '#0C0B10' }}
              >
                {loading ? 'Confirming...' : event.coverCharge > 0 ? `Confirm · ฿${event.coverCharge * quantity}` : 'Confirm Attendance'}
              </button>
            </div>
          )}

          {/* STEP: confirmation + QR */}
          {step === 'confirm' && ticket && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(16,185,129,0.15)' }}>
                <RiCheckboxCircleLine size={28} style={{ color: '#10B981' }} />
              </div>
              <p className="font-black text-xl mb-0.5" style={{ color: V.cream }}>You're in!</p>
              <p className="text-xs mb-4" style={{ color: V.muted }}>Screenshot or save your ticket ref</p>

              {/* Ticket card */}
              <div className="rounded-2xl overflow-hidden mb-4 text-left"
                style={{ background: '#0C0B10', border: `1px solid ${V.border}` }}>
                {/* Ticket top — QR + details side by side */}
                <div className="flex items-center gap-4 p-4">
                  {qrDataUrl && (
                    <div className="p-2 rounded-xl flex-shrink-0"
                      style={{ background: V.cream }}>
                      <img src={qrDataUrl} alt="ticket QR" className="w-24 h-24 sm:w-28 sm:h-28" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: V.muted }}>
                      General Admission
                    </p>
                    <p className="font-black text-base leading-tight line-clamp-2" style={{ color: V.cream }}>
                      {event.name}
                    </p>
                    <p className="text-xs font-mono font-bold" style={{ color: V.gold }}>
                      {ticket.ticketRef}
                    </p>
                  </div>
                </div>

                {/* Divider with scissors */}
                <div className="flex items-center gap-2 px-4" style={{ borderTop: '1px dashed #1E1D2A' }}>
                  <span className="text-xs py-1.5" style={{ color: V.border }}>✂</span>
                  <div className="flex-1 h-px" style={{ background: 'transparent' }} />
                </div>

                {/* Ticket details */}
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: 'Name', value: ticket.guestName },
                    { label: 'Guests', value: `${ticket.quantity} person${ticket.quantity !== 1 ? 's' : ''}` },
                    { label: 'Date', value: new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { label: 'Time', value: event.startTime },
                    ...(ticket.coverCharge > 0 ? [{ label: 'Cover at door', value: `฿${ticket.coverCharge * ticket.quantity}`, highlight: true }] : []),
                  ].map(({ label, value, highlight }) => (
                    <div key={label}>
                      <p className="text-xs" style={{ color: V.muted }}>{label}</p>
                      <p className="text-sm font-semibold" style={{ color: highlight ? V.gold : V.cream }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs mb-3" style={{ color: V.muted }}>
                Find this ticket in your profile → My Tickets
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: V.gold, color: '#0C0B10' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, getAuthToken } = useFirebaseAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleGetTicketsClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowTicketModal(true);
    }
  };

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

  const isSoldOut = event?.capacity > 0 && event?.currentBookings >= event?.capacity;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: V.black }}>
      <div className="w-12 h-12 rounded-full border-2 animate-spin"
        style={{ borderColor: 'rgba(201,168,76,0.15)', borderTop: '2px solid #C9A84C' }} />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: V.black }}>
      <p className="text-2xl font-bold" style={{ color: V.cream }}>Event not found</p>
      <button onClick={() => router.push('/events')} className="mt-4 text-sm" style={{ color: V.gold }}>
        ← Back to Events
      </button>
    </div>
  );

  const venue = event.venueId;

  return (
    <div className="min-h-screen" style={{ background: V.black }}>
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
            style={{ color: V.muted }}>
            <RiArrowLeftLine /> Back to Events
          </button>

          <div className="text-6xl mb-4">{EVENT_TYPE_EMOJI[event.type] || '📅'}</div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
            style={{ color: V.cream, fontFamily: 'serif', lineHeight: 1.1 }}
          >
            {event.name}
          </motion.h1>

          {event.description && (
            <p className="text-lg max-w-2xl mb-6" style={{ color: V.muted }}>{event.description}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(201,168,76,0.12)', color: V.gold, border: '1px solid rgba(201,168,76,0.25)' }}>
              <RiCalendarEventLine /> {formatDate(event.date)}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(201,168,76,0.12)', color: V.gold, border: '1px solid rgba(201,168,76,0.25)' }}>
              <RiTimeLine /> {event.startTime} – {event.endTime}
            </div>
            {event.coverCharge > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(201,168,76,0.12)', color: V.gold, border: '1px solid rgba(201,168,76,0.25)' }}>
                <RiTicketLine /> ฿{event.coverCharge} Cover Charge
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                <RiShieldCheckLine /> Free Entry
              </div>
            )}
            {event.capacity > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: V.surface, color: V.muted, border: `1px solid ${V.border}` }}>
                <RiUserLine /> {event.currentBookings}/{event.capacity} capacity
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {event.zoneOverrides?.filter(o => o.zoneId)?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: V.surface, border: `1px solid ${V.border}` }}>
              <h3 className="font-bold mb-3 text-sm uppercase tracking-widest" style={{ color: V.gold }}>
                Zone Pricing for This Event
              </h3>
              <div className="space-y-2">
                {event.zoneOverrides.filter(o => o.zoneId).map(override => {
                  const zone = override.zoneId;
                  return (
                    <div key={zone._id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: V.black, border: `1px solid ${V.border}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: V.cream }}>{zone.name}</p>
                          <p className="text-xs" style={{ color: V.muted }}>{ZONE_TYPE_LABELS[zone.type] || zone.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {override.priceMultiplier > 1 && (
                          <p className="text-sm font-bold" style={{ color: V.gold }}>×{override.priceMultiplier} pricing</p>
                        )}
                        {override.minimumSpend > 0 && (
                          <p className="text-xs" style={{ color: V.muted }}>Min spend ฿{override.minimumSpend}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ticket CTA */}
          <div className="p-5 rounded-2xl" style={{ background: V.surface, border: `1px solid ${V.border}` }}>
            <h3 className="font-bold mb-1 text-sm uppercase tracking-widest" style={{ color: V.gold }}>
              Attend This Event
            </h3>
            {event.capacity > 0 && (
              <div className="mt-2 mb-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: V.muted }}>
                  <span>{event.currentBookings} attending</span>
                  <span>{event.capacity - event.currentBookings} spots left</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: V.border }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (event.currentBookings / event.capacity) * 100)}%`,
                      background: V.gold
                    }} />
                </div>
              </div>
            )}
            <button
              onClick={handleGetTicketsClick}
              disabled={isSoldOut}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 mt-3"
              style={{ background: isSoldOut ? V.border : V.gold, color: isSoldOut ? V.muted : '#0C0B10' }}
            >
              {isSoldOut ? 'Sold Out' : event.coverCharge > 0 ? `Get Tickets · ฿${event.coverCharge}` : 'Get Free Ticket'}
            </button>
          </div>

          {/* Venue card */}
          {venue && (
            <div className="p-5 rounded-2xl" style={{ background: V.surface, border: `1px solid ${V.border}` }}>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-widest" style={{ color: V.gold }}>Venue</h3>
              {venue.images?.main && (
                <img src={venue.images.main} alt={venue.restaurantName}
                  className="w-full h-32 object-cover rounded-xl mb-3" />
              )}
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold" style={{ color: V.cream }}>{venue.restaurantName}</p>
                {venue.venueType && <VenueTypeBadge venueType={venue.venueType} />}
              </div>
              {venue.location?.address && (
                <div className="flex items-start gap-2 mt-2">
                  <RiMapPinLine style={{ color: V.muted, flexShrink: 0, marginTop: 2 }} />
                  <p className="text-sm" style={{ color: V.muted }}>{venue.location.address}</p>
                </div>
              )}
              {venue.venueSettings?.dresscode && (
                <div className="mt-3 p-2 rounded-lg text-xs"
                  style={{ background: 'rgba(201,168,76,0.08)', color: V.gold }}>
                  Dress code: {venue.venueSettings.dresscode}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal */}
      <AnimatePresence>
        {showTicketModal && (
          <TicketModal
            event={event}
            onClose={() => setShowTicketModal(false)}
            user={user}
            getAuthToken={getAuthToken}
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => { setShowLoginModal(false); setShowTicketModal(true); }}
      />
    </div>
  );
}
