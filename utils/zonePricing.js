import Zone from '@/models/Zone';
import Event from '@/models/Event';

/**
 * Zone & Event aware pricing
 * Priority: event zone override > zone base price > global dynamic price
 */

export async function calculateZonePrice({ tableId, zoneId, eventId, date, baseGlobalPrice = 100 }) {
  try {
    // 1. Load zone if provided or look up by tableId
    let zone = null;
    if (zoneId) {
      zone = await Zone.findById(zoneId).lean();
    }

    // 2. Load event if provided
    let event = null;
    if (eventId) {
      event = await Event.findById(eventId).lean();
    }

    // 3. Determine base price
    let basePrice = baseGlobalPrice;
    let zoneName = '';
    let minimumSpend = 0;
    let depositRequired = false;
    let depositAmount = 0;

    if (zone) {
      basePrice = zone.pricing.basePrice > 0 ? zone.pricing.basePrice : baseGlobalPrice;
      zoneName = zone.name;
      minimumSpend = zone.pricing.minimumSpend || 0;
      depositRequired = zone.pricing.depositRequired || false;
      depositAmount = zone.pricing.depositAmount || 0;
    }

    // 4. Apply peak multiplier (weekend/time-based)
    let peakMultiplier = 1.0;
    if (zone && date) {
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri/Sat
      if (isWeekend) {
        peakMultiplier = zone.pricing.peakMultiplier || 1.0;
      }
    }

    // 5. Apply event overrides
    let eventCoverCharge = 0;
    let eventPriceMultiplier = 1.0;
    let isExclusive = false;

    if (event) {
      eventCoverCharge = event.coverCharge || 0;

      if (zone && event.zoneOverrides?.length > 0) {
        const override = event.zoneOverrides.find(
          o => o.zoneId?.toString() === zone._id?.toString()
        );
        if (override) {
          eventPriceMultiplier = override.priceMultiplier || 1.0;
          if (override.minimumSpend > minimumSpend) {
            minimumSpend = override.minimumSpend;
          }
          isExclusive = override.isExclusive || false;
        }
      }
    }

    // 6. Final price calculation
    const finalPrice = Math.round(basePrice * peakMultiplier * eventPriceMultiplier);

    return {
      success: true,
      basePrice,
      finalPrice,
      zoneName,
      minimumSpend,
      depositRequired,
      depositAmount,
      eventCoverCharge,
      isExclusive,
      breakdown: {
        zoneBase: basePrice,
        peakMultiplier,
        eventMultiplier: eventPriceMultiplier
      }
    };
  } catch (error) {
    console.error('Zone pricing error:', error);
    return {
      success: false,
      basePrice: baseGlobalPrice,
      finalPrice: baseGlobalPrice,
      zoneName: '',
      minimumSpend: 0,
      depositRequired: false,
      depositAmount: 0,
      eventCoverCharge: 0,
      isExclusive: false,
      error: error.message
    };
  }
}

/**
 * Get zone for a table on a given floorplan
 */
export async function getZoneForTable(tableId, floorplanId, restaurantId) {
  try {
    const zone = await Zone.findOne({
      floorplanId,
      restaurantId,
      tableIds: tableId,
      isActive: true
    }).lean();
    return zone;
  } catch {
    return null;
  }
}

/**
 * Get active event for a venue on a given date/time
 */
export async function getActiveEvent(venueId, date, time) {
  try {
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const events = await Event.find({
      venueId,
      status: 'published',
      date: { $gte: bookingDate, $lt: nextDay }
    }).lean();

    if (!events.length) return null;

    // Find matching by time if provided
    if (time) {
      const [reqH, reqM] = time.split(':').map(Number);
      const reqMins = reqH * 60 + reqM;

      const matched = events.find(ev => {
        const [sh, sm] = ev.startTime.split(':').map(Number);
        const [eh, em] = ev.endTime.split(':').map(Number);
        const startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60; // past midnight
        return reqMins >= startMins && reqMins <= endMins;
      });

      return matched || events[0];
    }

    return events[0];
  } catch {
    return null;
  }
}
