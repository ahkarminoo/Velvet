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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md mx-auto animate-fade-up max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-auto">

        {/* Header */}
        <div className="border-b border-gray-100 p-3 sm:p-4 flex justify-between items-center flex-shrink-0 bg-white">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">Review Booking</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors text-xl sm:text-2xl font-light p-1 rounded-full hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">

          {/* Booking summary */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Booking Summary</h4>
            <div className="space-y-1 text-xs sm:text-sm text-gray-600">
              <p>Date: {new Date(bookingDetails.date).toLocaleDateString()}</p>
              <p>Time: {bookingDetails.time}</p>
              <p>Table: {bookingDetails.tableId}</p>
              <p>Guests: {bookingDetails.guestCount}</p>
              <p>Duration: {bookingDetails.durationMinutes || 120} minutes</p>
            </div>
          </div>

          {/* Zone pricing card */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {/* Zone badge header */}
            {isLoadingPrice ? (
              <div className="p-4 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <FaSpinner className="animate-spin" /> Loading zone pricing…
              </div>
            ) : hasZone ? (
              <>
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: zoneColor ? `${zoneColor}22` : '#f9f9f9', borderBottom: `2px solid ${zoneColor || '#e5e7eb'}` }}
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
                      style={{ backgroundColor: zoneColor ? `${zoneColor}33` : '#f3f4f6', color: zoneColor || '#666' }}
                    >
                      {ZONE_TYPE_LABELS[zoneType] || zoneType}
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                  {/* Reservation fee */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Table Reservation Fee</span>
                    <span className={`text-sm font-bold ${tableReservationFee > 0 ? 'text-[#FF4F18]' : 'text-gray-400'}`}>
                      {tableReservationFee > 0 ? `฿${tableReservationFee.toLocaleString()}` : 'Included'}
                    </span>
                  </div>

                  {/* Minimum spend */}
                  {minimumSpend > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Minimum Spend</span>
                      <span className="text-sm font-semibold text-amber-600">฿{minimumSpend.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Deposit */}
                  {depositRequired && depositAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deposit Required</span>
                      <span className="text-sm font-semibold text-purple-600">฿{depositAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Divider + total */}
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">Due at Venue</span>
                    <span className="text-base font-bold text-[#FF4F18]">
                      {(tableReservationFee + (depositRequired ? depositAmount : 0)) > 0
                        ? `฿${(tableReservationFee + (depositRequired ? depositAmount : 0)).toLocaleString()}`
                        : 'No charge'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">No zone pricing configured for this table</p>
                <p className="text-xs text-gray-400 mt-1">Reservation has no additional fee</p>
                <p className="text-base font-bold text-gray-700 mt-2">No charge</p>
              </div>
            )}
          </div>

          {/* Info notice */}
          <div className="text-xs text-gray-500 bg-orange-50 border border-orange-200 rounded-lg p-3">
            Online payment is temporarily disabled. Your reservation will be submitted and await restaurant confirmation.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex justify-end gap-3 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={isProcessing || isLoadingPrice}
            className="px-5 py-2 rounded-lg bg-[#FF4F18] text-white hover:bg-[#E74614] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isProcessing ? <FaSpinner className="animate-spin" /> : null}
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}
