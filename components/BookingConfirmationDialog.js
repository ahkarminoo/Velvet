import { useState } from 'react';
import { motion } from "framer-motion";

export default function BookingConfirmationDialog({ bookingDetails, onClose, onConfirm }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    
    // Add a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onConfirm();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-velvet-surface border border-velvet-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md lg:max-w-lg mx-auto overflow-hidden max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#c9a961] to-[#e2c887] p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-2xl font-bold truncate text-velvet-black">Confirm Booking</h3>
              <p className="text-velvet-black/70 text-xs sm:text-sm mt-1">Review your reservation details</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-3 text-velvet-black/70 hover:text-velvet-black transition text-2xl sm:text-3xl font-light hover:bg-velvet-black/10 rounded-full w-10 h-10 flex items-center justify-center"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Booking Summary */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div className="flex items-center p-3 sm:p-4 bg-velvet-black/50 border border-velvet-border rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-velvet-gold/15 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-velvet-gold font-semibold text-sm sm:text-base">📅</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-velvet-muted">Date</p>
                  <p className="font-semibold text-velvet-cream text-sm sm:text-base leading-tight">{formatDate(bookingDetails.date)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 sm:p-4 bg-velvet-black/50 border border-velvet-border rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-velvet-gold/15 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-velvet-gold font-semibold text-sm sm:text-base">🕐</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-velvet-muted">Time</p>
                  <p className="font-semibold text-velvet-cream text-sm sm:text-base">{bookingDetails.time}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center p-3 sm:p-4 bg-velvet-black/50 border border-velvet-border rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm sm:text-base">🪑</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-velvet-muted">Table</p>
                    <p className="font-semibold text-velvet-cream text-sm sm:text-base">{bookingDetails.tableId}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-3 sm:p-4 bg-velvet-black/50 border border-velvet-border rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-velvet-purple/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-velvet-gold-light font-semibold text-sm sm:text-base">👥</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-velvet-muted">Guests</p>
                    <p className="font-semibold text-velvet-cream text-sm sm:text-base">{bookingDetails.guestCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs sm:text-sm">ℹ️</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-blue-800 font-medium text-xs sm:text-sm">Booking Confirmation</p>
                <p className="text-blue-700 text-xs sm:text-sm mt-1 leading-relaxed">Your booking will be submitted and is pending restaurant confirmation. You'll receive a notification once approved.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-3 border border-velvet-border text-velvet-cream rounded-lg sm:rounded-xl font-medium hover:bg-velvet-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-[#c9a961] to-[#e2c887] text-white rounded-lg sm:rounded-xl font-medium hover:from-[#c9a961]/90 hover:to-[#e2c887]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <span>Confirm Booking</span>
                  <span>✨</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
