import { useState, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function PaymentDialog({ bookingDetails, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  useEffect(() => {
    const fetchZonePrice = async () => {
      try {
        setIsLoadingPrice(true);

        const { restaurantId, tableId, floorplanId } = bookingDetails;

        if (!restaurantId || !tableId || !floorplanId) {
          // Missing required IDs — show free/no-charge
          setPricing({ success: true, hasZone: false, finalPrice: 0, minimumSpend: 0, depositRequired: false, depositAmount: 0, currency: 'THB', zoneName: null });
          return;
        }

        const res = await fetch(
          `/api/venues/${restaurantId}/zones/table-price?tableId=${encodeURIComponent(tableId)}&floorplanId=${encodeURIComponent(floorplanId)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPricing(data);
            return;
          }
        }

        // Fallback — no pricing info
        setPricing({ success: true, hasZone: false, finalPrice: 0, minimumSpend: 0, depositRequired: false, depositAmount: 0, currency: 'THB', zoneName: null });
      } catch (error) {
        console.error('Zone pricing fetch error:', error);
        setPricing({ success: true, hasZone: false, finalPrice: 0, minimumSpend: 0, depositRequired: false, depositAmount: 0, currency: 'THB', zoneName: null });
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchZonePrice();
  }, [bookingDetails]);

  const handleContinue = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    toast.success('Booking submitted as pending confirmation.');
    onSuccess();
  };

  const tableReservationFee = pricing?.finalPrice || 0;
  const minimumSpend = pricing?.minimumSpend || 0;
  const depositRequired = pricing?.depositRequired || false;
  const depositAmount = pricing?.depositAmount || 0;
  const hasZone = pricing?.hasZone || false;
  const zoneName = pricing?.zoneName;
  const zoneType = pricing?.zoneType;
  const zoneColor = pricing?.zoneColor;

  const ZONE_TYPE_LABELS = {
    standard: 'Standard',
    vip: 'VIP',
    bar_counter: 'Bar Counter',
    outdoor: 'Outdoor',
    private: 'Private',
    dance_floor: 'Dance Floor',
    stage: 'Stage',
    lounge: 'Lounge',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 overflow-y-auto">
      <div className="bg-velvet-surface border border-velvet-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-auto animate-fade-up max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Header */}
        <div className="border-b border-velvet-border p-3 sm:p-4 flex justify-between items-center flex-shrink-0 bg-velvet-surface">
          <h3 className="text-lg sm:text-xl font-bold text-velvet-cream">Review Booking</h3>
          <button
            onClick={onClose}
            className="text-velvet-muted hover:text-velvet-cream transition-colors text-xl sm:text-2xl font-light p-1 rounded-full hover:bg-velvet-surface min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">

          {/* Booking summary */}
          <div className="bg-velvet-black/50 border border-velvet-border rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-velvet-cream mb-2 text-sm sm:text-base">Booking Summary</h4>
            <div className="space-y-1 text-xs sm:text-sm text-velvet-muted">
              <p>Date: {new Date(bookingDetails.date).toLocaleDateString()}</p>
              <p>Time: {bookingDetails.time}</p>
              <p>Table: {bookingDetails.tableId}</p>
              <p>Guests: {bookingDetails.guestCount}</p>
              <p>Duration: {bookingDetails.durationMinutes || 120} minutes</p>
            </div>
          </div>

          {/* Zone pricing card */}
          <div className="rounded-lg border border-velvet-border overflow-hidden">
            {/* Zone badge header */}
            {isLoadingPrice ? (
              <div className="p-4 flex items-center justify-center gap-2 text-velvet-muted text-sm">
                <FaSpinner className="animate-spin" /> Loading zone pricing…
              </div>
            ) : hasZone ? (
              <>
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: zoneColor ? `${zoneColor}22` : '#15130f', borderBottom: `2px solid ${zoneColor || '#2a241b'}` }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zoneColor || '#ccc' }}
                  />
                  <span className="font-semibold text-sm" style={{ color: zoneColor || '#333' }}>
                    {zoneName}
                  </span>
                  {zoneType && (
                    <span
                      className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: zoneColor ? `${zoneColor}33` : '#15130f', color: zoneColor || '#666' }}
                    >
                      {ZONE_TYPE_LABELS[zoneType] || zoneType}
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                  {/* Reservation fee */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-velvet-muted">Table Reservation Fee</span>
                    <span className={`text-sm font-bold ${tableReservationFee > 0 ? 'text-[#c9a961]' : 'text-velvet-muted'}`}>
                      {tableReservationFee > 0 ? `฿${tableReservationFee.toLocaleString()}` : 'Included'}
                    </span>
                  </div>

                  {/* Minimum spend */}
                  {minimumSpend > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-velvet-muted">Minimum Spend</span>
                      <span className="text-sm font-semibold text-amber-600">฿{minimumSpend.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Deposit */}
                  {depositRequired && depositAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-velvet-muted">Deposit Required</span>
                      <span className="text-sm font-semibold text-velvet-gold-light">฿{depositAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Divider + total */}
                  <div className="pt-2 border-t border-velvet-border flex justify-between items-center">
                    <span className="text-sm font-medium text-velvet-cream">Due at Venue</span>
                    <span className="text-base font-bold text-[#c9a961]">
                      {(tableReservationFee + (depositRequired ? depositAmount : 0)) > 0
                        ? `฿${(tableReservationFee + (depositRequired ? depositAmount : 0)).toLocaleString()}`
                        : 'No charge'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-velvet-muted">No zone pricing configured for this table</p>
                <p className="text-xs text-velvet-muted mt-1">Reservation has no additional fee</p>
                <p className="text-base font-bold text-velvet-cream mt-2">No charge</p>
              </div>
            )}
          </div>

          {/* Info notice */}
          <div className="text-xs text-velvet-muted bg-velvet-gold/10 border border-velvet-gold/30 rounded-lg p-3">
            Online payment is temporarily disabled. Your reservation will be submitted and await restaurant confirmation.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-velvet-border p-4 flex justify-end gap-3 flex-shrink-0 bg-velvet-surface">
          <button
            onClick={onClose}
            className="px-4 py-2 text-velvet-muted hover:text-velvet-cream transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={isProcessing || isLoadingPrice}
            className="px-5 py-2 rounded-lg bg-[#c9a961] text-white hover:bg-[#7a5a2a] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isProcessing ? <FaSpinner className="animate-spin" /> : null}
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}
