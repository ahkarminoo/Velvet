'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaStar, FaImage, FaTimes, FaTrash, FaRegSmile, FaRegMeh, FaRegFrown, FaCamera } from 'react-icons/fa';
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

export default function ReviewSection({ restaurantId, onLoginClick }) {
  const { userProfile, isAuthenticated, getAuthToken } = useFirebaseAuth();
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', images: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reviews');
      }
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews, restaurantId]);

  useEffect(() => {
    if (reviews.length > 0 && isAuthenticated && userProfile) {
      const existingReview = reviews.find(review => review.userId?._id === userProfile._id);
      setUserReview(existingReview);
    }
  }, [reviews, isAuthenticated, userProfile]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (newReview.images.length + files.length > 5) {
      setError('Maximum 5 images allowed per review');
      return;
    }

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'review');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const { url } = await response.json();
        // Store the image URL (Firebase or generic)
        setNewReview(prev => ({
          ...prev,
          images: [...prev.images, url]
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        setError('Failed to upload image. Please try again.');
      }
    }
  };

  const validateReview = () => {
    if (newReview.comment.length < 10) {
      setError('Review must be at least 10 characters long');
      return false;
    }
    if (newReview.rating < 1) {
      setError('Please select a rating');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userReview) {
      setShowConfirmDialog(true);
      return;
    }
    await submitReview();
  };

  const handleDeleteAndResubmit = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewId: userReview._id })
      });

      if (!response.ok) throw new Error('Failed to delete review');
      
      await submitReview();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to update review. Please try again.');
    }
  };

  const submitReview = async () => {
    if (!validateReview()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Please log in to submit a review');
        return;
      }

      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: newReview.rating,
          comment: newReview.comment,
          images: newReview.images
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const { review } = await response.json();
      setReviews(prevReviews => [review, ...prevReviews]);
      setNewReview({ rating: 5, comment: '', images: [] });
      setError('');
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setReviews(prev => prev.filter(review => review._id !== reviewId));
    } catch (error) {
      setError(error.message);
    }
  };

  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">Replace Existing Review?</h3>
        <p className="text-gray-600 mb-6">
          You already have a review for this restaurant. Would you like to delete your existing review and post a new one?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowConfirmDialog(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAndResubmit}
            className="px-4 py-2 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90"
          >
            Replace Review
          </button>
        </div>
      </div>
    </div>
  );

  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return '/default-image.jpg';
    if (imageUrl.startsWith('http') || imageUrl.startsWith('blob')) {
      return imageUrl;
    }
    // If it's a relative path from your upload API
    return `${process.env.NEXT_PUBLIC_API_URL || ''}${imageUrl}`;
  };

  const getProfileImageUrl = (user) => {
    if (!user || !user.profileImage) return '/default-avatar.png';
    // If it's already a full S3 URL, return it
    if (user.profileImage.startsWith('https://')) {
      return user.profileImage;
    }
    return '/default-avatar.png';
  };

  const renderReviewForm = () => {
    if (!isAuthenticated) {
      return (
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-6 sm:p-8 shadow-lg border border-gray-100">
          <div className="text-center space-y-3 sm:space-y-4">
            <FaRegSmile className="text-3xl sm:text-4xl text-[#FF4F18] mx-auto" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Share Your Experience</h3>
            <p className="text-sm sm:text-base text-gray-600">Join our community and let others know about your dining experience</p>
            <button
              onClick={onLoginClick}
              className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#FF4F18] text-white text-sm sm:text-base rounded-full hover:bg-[#FF4F18]/90 transition-all transform hover:scale-105 shadow-md"
            >
              Log In to Write a Review
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full overflow-hidden">
            <Image 
              src={getProfileImageUrl(userProfile)}
              alt={`${userProfile?.firstName || 'Anonymous'}'s profile`}
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">
              {userProfile?.firstName} {userProfile?.lastName}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Sharing your experience</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <p className="text-sm sm:text-base text-gray-600 font-medium">How was your experience?</p>
            <div className="flex gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                  className={`text-2xl sm:text-3xl transition-all transform hover:scale-110 ${
                    star <= newReview.rating ? 'text-[#FF4F18]' : 'text-gray-300'
                  }`}
                >
                  <FaStar />
                </button>
              ))}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              {newReview.rating === 5 && "Outstanding!"}
              {newReview.rating === 4 && "Very Good"}
              {newReview.rating === 3 && "Good"}
              {newReview.rating === 2 && "Fair"}
              {newReview.rating === 1 && "Poor"}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Tell us more about your experience..."
              className="w-full p-3 sm:p-4 text-sm sm:text-base border text-black rounded-xl focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
              rows={4}
              required
            />
            <span className="absolute bottom-2 right-2 text-xs sm:text-sm text-gray-400">
              {newReview.comment.length}/500
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base text-gray-600">Add Photos</label>
              <span className="text-xs sm:text-sm text-gray-400">{newReview.images.length}/5 photos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
              {newReview.images.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                  <Image
                    src={url}
                    alt={`Review image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTimes className="text-xs sm:text-sm" />
                  </button>
                </div>
              ))}
              {newReview.images.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF4F18] transition-colors">
                  <FaCamera className="text-xl sm:text-2xl text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-500 mt-1">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    multiple
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs sm:text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-[#FF4F18] text-white rounded-full hover:bg-[#FF4F18]/90 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
          >
            {isSubmitting ? 'Posting...' : 'Share Your Review'}
          </button>
        </form>
      </div>
    );
  };

  const renderReviews = () => (
    <div className="space-y-4 sm:space-y-6">
      {reviews.map((review) => (
        <div key={review._id} 
          className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full overflow-hidden">
                <Image 
                  src={getProfileImageUrl(review.userId)}
                  alt={`${review.userId?.firstName || 'Anonymous'}'s profile`}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  {review.userId?.firstName || 'Anonymous'} {review.userId?.lastName || ''}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 text-[#FF4F18]">
                    {[...Array(review.rating)].map((_, i) => (
                      <FaStar key={i} className="text-xs sm:text-sm" />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">
                    • {new Date(review.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
            {isAuthenticated && review.userId?._id === userProfile?._id && (
              <button
                onClick={() => handleDeleteReview(review._id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 sm:p-2 hover:bg-red-50 rounded-full"
              >
                <FaTrash className="text-xs sm:text-sm" />
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm sm:text-base ml-12 sm:ml-16 mb-3 sm:mb-4">{review.comment}</p>
          
          {review.images && review.images.length > 0 && (
            <div className="ml-12 sm:ml-16 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              {review.images.map((imageUrl, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group"
                >
                  <Image
                    src={imageUrl}
                    alt={`Review image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Reviews</h2>
        <div className="flex items-center gap-2">
          <div className="text-[#FF4F18] font-medium text-base sm:text-lg">
            {reviews.length > 0 
              ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
              : '0.0'
            }
          </div>
          <div className="flex text-[#FF4F18]">
            <FaStar className="text-base sm:text-lg" />
          </div>
          <span className="text-sm sm:text-base text-gray-500">({reviews.length})</span>
        </div>
      </div>
      {renderReviewForm()}
      {showConfirmDialog && <ConfirmDialog />}
      {renderReviews()}
    </div>
  );
} 