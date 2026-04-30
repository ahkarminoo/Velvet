export const getProfileImageUrl = (imageUrl) => {
  if (!imageUrl) return '/default-avatar.png';
  if (imageUrl.startsWith('http') || imageUrl.startsWith('blob')) {
    return imageUrl;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || ''}${imageUrl}`;
};

export const getReviewImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http') || imageUrl.startsWith('blob')) {
    return imageUrl;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || ''}${imageUrl}`;
}; 