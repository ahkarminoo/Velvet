'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCalendarEventLine, RiTimeLine, RiTicketLine, RiCloseLine,
  RiImageAddLine, RiAddLine, RiDeleteBinLine, RiFlashlightLine
} from 'react-icons/ri';
import { toast } from 'react-hot-toast';

const EVENT_TYPES = [
  { value: 'dj_night',      label: 'DJ Night',       emoji: '🎧' },
  { value: 'live_music',    label: 'Live Music',     emoji: '🎸' },
  { value: 'themed_night',  label: 'Themed Night',   emoji: '🎭' },
  { value: 'happy_hour',    label: 'Happy Hour',     emoji: '🍹' },
  { value: 'private_party', label: 'Private Party',  emoji: '🎉' },
  { value: 'sports_viewing',label: 'Sports Viewing', emoji: '⚽' },
  { value: 'wine_tasting',  label: 'Wine Tasting',   emoji: '🍷' },
  { value: 'gala',          label: 'Gala',           emoji: '✨' },
  { value: 'other',         label: 'Other',          emoji: '📅' },
];

const VELVET = {
  black: '#0C0B10', surface: '#161520', border: '#1E1D2A',
  gold: '#C9A84C', goldLight: '#E8C97A', cream: '#F5F0E8', muted: '#9B96A8'
};

export default function EventCreator({ restaurantId, token, floorplans = [], zones = [], editingEvent = null, onSaved, onClose }) {
  const isEditing = !!editingEvent;
  const [saving, setSaving] = useState(false);

  const toDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().split('T')[0];
  };

  const [form, setForm] = useState(() => {
    if (editingEvent) {
      return {
        name: editingEvent.name || '',
        description: editingEvent.description || '',
        type: editingEvent.type || 'dj_night',
        date: toDateInput(editingEvent.date),
        startTime: editingEvent.startTime || '20:00',
        endTime: editingEvent.endTime || '02:00',
        coverCharge: editingEvent.coverCharge ?? '',
        capacity: editingEvent.capacity ?? '',
        floorplanIds: (editingEvent.floorplanIds || []).map(fp => (fp._id || fp).toString()),
        zoneOverrides: (editingEvent.zoneOverrides || []).map(o => ({
          ...o,
          zoneId: (o.zoneId?._id || o.zoneId)?.toString()
        })),
        bookingDeadline: toDateInput(editingEvent.bookingDeadline),
        externalTicketUrl: editingEvent.externalTicketUrl || ''
      };
    }
    return {
      name: '',
      description: '',
      type: 'dj_night',
      date: '',
      startTime: '20:00',
      endTime: '02:00',
      coverCharge: '',
      capacity: '',
      floorplanIds: floorplans?.length ? [floorplans[0]._id?.toString?.() || floorplans[0]._id] : [],
      zoneOverrides: [],
      bookingDeadline: '',
      externalTicketUrl: ''
    };
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleFloorplan = (fpId) => {
    setForm(prev => {
      const has = prev.floorplanIds.includes(fpId);
      return { ...prev, floorplanIds: has ? prev.floorplanIds.filter(i => i !== fpId) : [...prev.floorplanIds, fpId] };
    });
  };

  const upsertZoneOverride = (zoneId, field, value) => {
    setForm(prev => {
      const existing = prev.zoneOverrides.find(o => o.zoneId === zoneId);
      if (existing) {
        return {
          ...prev,
          zoneOverrides: prev.zoneOverrides.map(o =>
            o.zoneId === zoneId ? { ...o, [field]: value } : o
          )
        };
      }
      return {
        ...prev,
        zoneOverrides: [...prev.zoneOverrides, { zoneId, priceMultiplier: 1.0, minimumSpend: 0, isExclusive: false, [field]: value }]
      };
    });
  };

  const getZoneOverride = (zoneId) =>
    form.zoneOverrides.find(o => o.zoneId === zoneId) || { priceMultiplier: 1.0, minimumSpend: 0, isExclusive: false };

  const handleSave = async (publishNow = false) => {
    if (!form.name || !form.date || !form.startTime || !form.endTime) {
      toast.error('Name, date, start time and end time are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        coverCharge: parseFloat(form.coverCharge) || 0,
        capacity: parseInt(form.capacity) || 0,
        zoneOverrides: form.zoneOverrides.map(o => ({
          ...o,
          priceMultiplier: parseFloat(o.priceMultiplier) || 1.0,
          minimumSpend: parseFloat(o.minimumSpend) || 0
        }))
      };

      const url = isEditing
        ? `/api/venues/${restaurantId}/events/${editingEvent._id}`
        : `/api/venues/${restaurantId}/events`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save event');
      const data = await res.json();
      const eventId = data.event._id || editingEvent._id;

      if (publishNow) {
        await fetch(`/api/venues/${restaurantId}/events/${eventId}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event published!');
      } else {
        toast.success(isEditing ? 'Event updated' : 'Event saved as draft');
      }

      onSaved?.(data.event);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Zones relevant to selected floorplans
  const relevantZones = zones.filter(z => form.floorplanIds.includes(z.floorplanId?.toString?.() || z.floorplanId));

  return (
    <div style={{ background: VELVET.black, minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: VELVET.border }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <RiCalendarEventLine style={{ color: VELVET.gold, fontSize: '20px' }} />
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: VELVET.cream }}>{isEditing ? 'Edit Event' : 'Create Event'}</h2>
            <p className="text-xs" style={{ color: VELVET.muted }}>{isEditing ? editingEvent.name : 'Set up your venue event'}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: VELVET.muted }}>
            <RiCloseLine size={20} />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {/* Event type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: VELVET.muted }}>
            Event Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_TYPES.map(et => (
              <button
                key={et.value}
                type="button"
                onClick={() => update('type', et.value)}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: form.type === et.value ? 'rgba(201,168,76,0.15)' : VELVET.surface,
                  border: `1px solid ${form.type === et.value ? VELVET.gold : VELVET.border}`,
                  color: form.type === et.value ? VELVET.gold : VELVET.muted
                }}
              >
                <div className="text-xl mb-1">{et.emoji}</div>
                <div className="text-xs font-medium">{et.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Event Name *</label>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Friday Night Sessions"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
              onFocus={e => e.target.style.borderColor = VELVET.gold}
              onBlur={e => e.target.style.borderColor = VELVET.border}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="What's happening at this event..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
              onFocus={e => e.target.style.borderColor = VELVET.gold}
              onBlur={e => e.target.style.borderColor = VELVET.border}
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Start *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={e => update('startTime', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>End *</label>
            <input
              type="time"
              value={form.endTime}
              onChange={e => update('endTime', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Deadline</label>
            <input
              type="date"
              value={form.bookingDeadline}
              onChange={e => update('bookingDeadline', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Cover Charge (฿)</label>
            <input
              type="number"
              min="0"
              value={form.coverCharge}
              onChange={e => update('coverCharge', e.target.value)}
              placeholder="0 = free entry"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Capacity</label>
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={e => update('capacity', e.target.value)}
              placeholder="0 = unlimited"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
            />
          </div>
        </div>

        {/* Floorplan selection */}
        {floorplans.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: VELVET.muted }}>
              Active Floorplans for This Event
            </label>
            <div className="space-y-2">
              {floorplans.map(fp => {
                const selected = form.floorplanIds.includes(fp._id?.toString?.() || fp._id);
                return (
                  <button
                    key={fp._id}
                    type="button"
                    onClick={() => toggleFloorplan(fp._id?.toString?.() || fp._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? 'rgba(201,168,76,0.12)' : VELVET.surface,
                      border: `1px solid ${selected ? VELVET.gold : VELVET.border}`
                    }}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0"
                      style={{ borderColor: selected ? VELVET.gold : VELVET.border, background: selected ? VELVET.gold : 'transparent' }}>
                      {selected && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: VELVET.cream }}>{fp.name}</p>
                      {fp.floorplanType && (
                        <p className="text-xs" style={{ color: VELVET.muted }}>{fp.floorplanType.replace(/_/g, ' ')}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zone overrides */}
        {relevantZones.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: VELVET.muted }}>
              Zone Pricing Overrides
            </label>
            <div className="space-y-3">
              {relevantZones.map(zone => {
                const override = getZoneOverride(zone._id?.toString?.() || zone._id);
                return (
                  <div key={zone._id} className="p-4 rounded-xl space-y-3"
                    style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color || VELVET.gold }} />
                      <span className="font-semibold text-sm" style={{ color: VELVET.cream }}>{zone.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: VELVET.gold }}>
                        {zone.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Price Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={override.priceMultiplier}
                          onChange={e => upsertZoneOverride(zone._id?.toString?.() || zone._id, 'priceMultiplier', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Min Spend (฿)</label>
                        <input
                          type="number"
                          min="0"
                          value={override.minimumSpend}
                          onChange={e => upsertZoneOverride(zone._id?.toString?.() || zone._id, 'minimumSpend', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div
                            onClick={() => upsertZoneOverride(zone._id?.toString?.() || zone._id, 'isExclusive', !override.isExclusive)}
                            className="w-10 h-6 rounded-full transition-all relative flex-shrink-0"
                            style={{ background: override.isExclusive ? VELVET.gold : VELVET.border }}
                          >
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
                              style={{ left: override.isExclusive ? '22px' : '4px' }} />
                          </div>
                          <span className="text-xs" style={{ color: VELVET.muted }}>Exclusive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* External ticket URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>
            External Ticket URL (optional)
          </label>
          <input
            value={form.externalTicketUrl}
            onChange={e => update('externalTicketUrl', e.target.value)}
            placeholder="https://tickets.example.com/event"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t flex gap-3" style={{ borderColor: VELVET.border }}>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
          style={{ background: VELVET.surface, color: VELVET.cream, border: `1px solid ${VELVET.border}` }}
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: VELVET.gold, color: '#0C0B10' }}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <><RiFlashlightLine /> Publish Now</>
          )}
        </button>
      </div>
    </div>
  );
}
