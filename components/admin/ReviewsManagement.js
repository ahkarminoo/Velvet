import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaTrash, FaFlag, FaCheck, FaTimes, FaSearch, FaFilter } from 'react-icons/fa';

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        setError('Admin authentication required');
        return;
      }
      
      const response = await fetch('/api/admin/reviews', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        setError('Authentication expired. Please login again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.data);
      } else {
        setError('Failed to fetch reviews');
      }
    } catch (err) {
      setError('Error fetching reviews');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (reviewId, action, reason = '') => {
    try {
      setActionLoading(true);
      
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Admin authentication required');
        return;
      }

      let response;
      if (action === 'delete') {
        response = await fetch(`/api/admin/reviews/${reviewId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ reason })
        });
      } else {
        response = await fetch(`/api/admin/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            status: action, 
            reason: reason
          })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchReviews(); // Refresh the list
        setShowModal(false);
        setSelectedReview(null);
        alert(`Review ${action} successfully`);
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchTerm === '' || 
      review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.restaurantId?.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${review.userId?.firstName} ${review.userId?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter;
    
    return matchesSearch && matchesStatus && matchesRating;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      flagged: { color: 'bg-yellow-100 text-yellow-800', text: 'Flagged' },
      hidden: { color: 'bg-gray-100 text-gray-800', text: 'Hidden' },
      removed: { color: 'bg-red-100 text-red-800', text: 'Removed' }
    };
    
    const badge = badges[status] || badges.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reviews Management</h2>
        <div className="text-sm text-gray-500">
          Total: {reviews.length} reviews
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="flagged">Flagged</option>
              <option value="hidden">Hidden</option>
              <option value="removed">Removed</option>
            </select>
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Ratings</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
            <option value="4">4 Stars</option>
            <option value="5">5 Stars</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Review
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <tr key={review._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm text-gray-900 truncate">
                        {review.comment}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {review.userId?.firstName} {review.userId?.lastName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {review.restaurantId?.restaurantName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-lg">{getRatingStars(review.rating)}</span>
                      <span className="ml-2 text-sm text-gray-500">({review.rating})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(review.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReview(review);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEye />
                      </button>
                      
                      {review.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleReviewAction(review._id, 'flagged', 'Inappropriate content')}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Flag Review"
                          >
                            <FaFlag />
                          </button>
                          <button
                            onClick={() => handleReviewAction(review._id, 'hidden', 'Hidden by admin')}
                            className="text-gray-600 hover:text-gray-900"
                            title="Hide Review"
                          >
                            <FaEyeSlash />
                          </button>
                        </>
                      )}
                      
                      {review.status === 'flagged' && (
                        <>
                          <button
                            onClick={() => handleReviewAction(review._id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve Review"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleReviewAction(review._id, 'hidden', 'Hidden after review')}
                            className="text-gray-600 hover:text-gray-900"
                            title="Hide Review"
                          >
                            <FaEyeSlash />
                          </button>
                        </>
                      )}
                      
                      {review.status === 'hidden' && (
                        <button
                          onClick={() => handleReviewAction(review._id, 'active')}
                          className="text-green-600 hover:text-green-900"
                          title="Restore Review"
                        >
                          <FaCheck />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to permanently delete this review?')) {
                            handleReviewAction(review._id, 'delete');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Review"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredReviews.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No reviews found matching your criteria.
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {showModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Review Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Restaurant</label>
                <p className="mt-1 text-sm text-gray-900">{selectedReview.restaurantId?.restaurantName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReview.userId?.firstName} {selectedReview.userId?.lastName}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <div className="mt-1 flex items-center">
                  <span className="text-lg">{getRatingStars(selectedReview.rating)}</span>
                  <span className="ml-2 text-sm text-gray-500">({selectedReview.rating}/5)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Comment</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedReview.comment}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedReview.status)}</div>
              </div>
              
              {selectedReview.flaggedReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Flag Reason</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReview.flaggedReason}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedReview.createdAt).toLocaleString()}
                </p>
              </div>
              
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Images</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {selectedReview.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review image ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
