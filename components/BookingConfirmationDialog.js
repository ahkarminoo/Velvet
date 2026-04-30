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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-md lg:max-w-lg mx-auto overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] p-4 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold truncate">Confirm Booking</h3>
              <p className="text-orange-100 text-xs sm:text-sm mt-1">Review your reservation details</p>
            </div>
            <button 
              onClick={onClose}
              className="ml-3 text-white/80 hover:text-white transition-colors text-2xl sm:text-3xl font-light p-1 hover:bg-white/10 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center"
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
            <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-semibold text-sm sm:text-base">📅</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-800 text-sm sm:text-base leading-tight">{formatDate(bookingDetails.date)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm sm:text-base">🕐</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Time</p>
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">{bookingDetails.time}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm sm:text-base">🪑</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Table</p>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{bookingDetails.tableId}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm sm:text-base">👥</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Guests</p>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{bookingDetails.guestCount}</p>
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
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-[#FF4F18] to-[#FF6B35] text-white rounded-lg sm:rounded-xl font-medium hover:from-[#FF4F18]/90 hover:to-[#FF6B35]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
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
