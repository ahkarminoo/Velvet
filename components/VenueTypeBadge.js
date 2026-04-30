'use client';

const VENUE_CONFIG = {
  restaurant: { label: 'Restaurant', color: '#FF4F18', bg: 'rgba(255,79,24,0.15)' },
  bar:         { label: 'Bar',        color: '#C9A84C', bg: 'rgba(201,168,76,0.15)' },
  club:        { label: 'Club',       color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
  hotel_restaurant: { label: 'Hotel', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },
  rooftop_bar: { label: 'Rooftop',   color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  lounge:      { label: 'Lounge',    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

export default function VenueTypeBadge({ venueType = 'restaurant', size = 'sm' }) {
  const cfg = VENUE_CONFIG[venueType] || VENUE_CONFIG.restaurant;
  const px = size === 'sm' ? '8px 12px' : '10px 16px';
  const fs = size === 'sm' ? '11px' : '13px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: px,
        borderRadius: '20px',
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}
    >
      {cfg.label}
    </span>
  );
}
