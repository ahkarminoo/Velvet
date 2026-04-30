'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { motion } from 'framer-motion';
import { RiCalendarLine, RiTimeLine, RiUserLine, RiPhoneLine, RiMailLine, RiTableLine } from 'react-icons/ri';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaTrash } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function RestaurantReservation({ restaurantId }) {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('today');
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
    totalGuests: 0
  });
  const [token, setToken] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('restaurantOwnerToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token && restaurantId) {
      fetchBookings();
    }
  }, [selectedDate, filterStatus, timeRange, restaurantId, token]);

  const fetchBookings = useCallback(async () => {
    if (!token || !restaurantId) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        date: selectedDate,
        status: filterStatus !== 'all' ? filterStatus : '',
        timeRange: timeRange
      });

      console.log('Fetching bookings with params:', queryParams.toString());

      const response = await fetch(
        `/api/bookings/restaurant/${restaurantId}?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }
      
      const data = await response.json();
      console.log('Received bookings data:', data);

      setBookings(data.bookings || []);
      setStats(data.stats || {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        completed: 0,
        totalGuests: 0
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(error.message || 'Failed to fetch bookings');
      setBookings([]);
      setStats({
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        completed: 0,
        totalGuests: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterStatus, timeRange, restaurantId, token]);

  const handleBookingAction = async (bookingId, action) => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const response = await fetch(`/api/bookings/restaurant/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: action === 'confirm' ? 'confirmed' 
            : action === 'cancel' ? 'cancelled'
            : 'completed'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking status');
      }
      
      toast.success(`Booking ${action}ed successfully`);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const bookingDate = parseISO(booking.date);
    switch (filterStatus) {
      case 'upcoming':
        return !isPast(bookingDate) || isToday(bookingDate);
      case 'past':
        return isPast(bookingDate) && !isToday(bookingDate);
      case 'today':
        return isToday(bookingDate);
      default:
        return true;
    }
  });

  const handleBulkAction = async () => {
    if (!bulkAction || selectedBookings.size === 0) return;

    try {
      const promises = Array.from(selectedBookings).map(bookingId =>
        fetch(`/api/bookings/restaurant/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: bulkAction }),
        })
      );

      await Promise.all(promises);
      toast.success(`Successfully updated ${selectedBookings.size} bookings`);
      setSelectedBookings(new Set());
      setBulkAction('');
      fetchBookings();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to update some bookings');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/restaurant/${bookingId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete booking');
      }
      
      toast.success('Booking deleted successfully');
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const toggleBookingSelection = (bookingId) => {
    const newSelection = new Set(selectedBookings);
    if (newSelection.has(bookingId)) {
      newSelection.delete(bookingId);
    } else {
      newSelection.add(bookingId);
    }
    setSelectedBookings(newSelection);
  };

  const selectAllBookings = () => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookings.map(b => b._id)));
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (!newDate) {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      setSelectedDate(today.toISOString().split('T')[0]);
    } else {
      setSelectedDate(newDate);
    }
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
    // Reset date selection when switching to a time range
    if (e.target.value !== '') {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      setSelectedDate(today.toISOString().split('T')[0]);
    }
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-h-[calc(100vh-200px)] flex flex-col">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-[#FF4F18]/10 rounded-lg p-4">
          <h3 className="text-[#FF4F18] font-semibold">Total Bookings</h3>
          <p className="text-2xl font-bold text-[#FF4F18]">{stats.total}</p>
        </div>
        <div className="bg-[#FF4F18]/10 rounded-lg p-4">
          <h3 className="text-[#FF4F18] font-semibold">Confirmed</h3>
          <p className="text-2xl font-bold text-[#FF4F18]">{stats.confirmed}</p>
        </div>
        <div className="bg-[#FF4F18]/10 rounded-lg p-4">
          <h3 className="text-[#FF4F18] font-semibold">Pending</h3>
          <p className="text-2xl font-bold text-[#FF4F18]">{stats.pending}</p>
        </div>
        <div className="bg-[#FF4F18]/10 rounded-lg p-4">
          <h3 className="text-[#FF4F18] font-semibold">Cancelled</h3>
          <p className="text-2xl font-bold text-[#FF4F18]">{stats.cancelled}</p>
        </div>
        <div className="bg-[#FF4F18]/10 rounded-lg p-4">
          <h3 className="text-[#FF4F18] font-semibold">Completed</h3>
          <p className="text-2xl font-bold text-[#FF4F18]">{stats.completed}</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap text-black gap-4 mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F18] focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F18] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F18] focus:border-transparent"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Bulk Actions Section */}
      {selectedBookings.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-800 font-medium">
                {selectedBookings.size} booking{selectedBookings.size > 1 ? 's' : ''} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select Action</option>
                <option value="confirmed">Confirm Selected</option>
                <option value="cancelled">Cancel Selected</option>
                <option value="completed">Mark as Completed</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              >
                Apply Action
              </button>
              <button
                onClick={() => {
                  setSelectedBookings(new Set());
                  setBulkAction('');
                }}
                className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-all"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Layout - Added overflow handling */}
      <div className="flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedBookings.size === bookings.length && bookings.length > 0}
                    onChange={selectAllBookings}
                    className="rounded border-gray-300 text-[#FF4F18] focus:ring-[#FF4F18]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Table</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#111827] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <motion.tr
                  key={booking._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedBookings.has(booking._id)}
                      onChange={() => toggleBookingSelection(booking._id)}
                      className="rounded border-gray-300 text-[#FF4F18] focus:ring-[#FF4F18]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <RiUserLine className="text-[#FF4F18] mr-2" />
                      <div className="text-sm font-medium text-[#111827]">{booking.customerName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[#111827]">
                      <div className="flex items-center mb-1">
                        <RiPhoneLine className="text-[#FF4F18] mr-2" />
                        {booking.customerPhone}
                      </div>
                      <div className="flex items-center">
                        <RiMailLine className="text-[#FF4F18] mr-2" />
                        {booking.customerEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="bg-[#FF4F18] text-white px-3 py-1 rounded-lg text-sm font-bold">
                        {booking.tableId || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[#111827]">
                      <div className="flex items-center mb-1">
                        <RiCalendarLine className="text-[#FF4F18] mr-2" />
                        {format(parseISO(booking.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center">
                        <RiTimeLine className="text-[#FF4F18] mr-2" />
                        {`${booking.startTime} - ${booking.endTime}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeStyle(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {/* Quick Action Dropdown */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            if (e.target.value === 'delete') {
                              handleDeleteBooking(booking._id);
                            } else {
                              handleBookingAction(booking._id, e.target.value);
                            }
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F18] focus:border-transparent text-xs text-black bg-white"
                      >
                        <option value="">Quick Actions</option>
                        {booking.status === 'pending' && (
                          <>
                            <option value="confirm">Confirm</option>
                            <option value="cancel">Cancel</option>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <>
                            <option value="complete">Mark Complete</option>
                            <option value="cancel">Cancel</option>
                          </>
                        )}
                        {(booking.status === 'cancelled' || booking.status === 'completed') && (
                          <option value="delete">Delete</option>
                        )}
                      </select>
                      
                      {/* Individual Action Buttons */}
                      {booking.status === 'pending' && (
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleBookingAction(booking._id, 'confirm')}
                            className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-all flex items-center gap-1"
                            title="Confirm Booking"
                          >
                            <FaCheckCircle className="w-3 h-3" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleBookingAction(booking._id, 'cancel')}
                            className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-all flex items-center gap-1"
                            title="Cancel Booking"
                          >
                            <FaTimesCircle className="w-3 h-3" />
                          </motion.button>
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleBookingAction(booking._id, 'complete')}
                            className="px-2 py-1 bg-[#FF4F18] text-white text-xs font-medium rounded hover:bg-[#FF4F18]/90 transition-all flex items-center gap-1"
                            title="Mark as Completed"
                          >
                            <FaCheckCircle className="w-3 h-3" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleBookingAction(booking._id, 'cancel')}
                            className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-all flex items-center gap-1"
                            title="Cancel Booking"
                          >
                            <FaTimesCircle className="w-3 h-3" />
                          </motion.button>
                        </div>
                      )}
                      {(booking.status === 'cancelled' || booking.status === 'completed') && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteBooking(booking._id)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-all flex items-center gap-1"
                          title="Delete Booking"
                        >
                          <FaTrash className="w-3 h-3" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="p-4 rounded-lg bg-white shadow-lg">
            <FaSpinner className="w-8 h-8 text-[#FF4F18] animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
} 