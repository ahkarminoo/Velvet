'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { RiLoader4Line } from 'react-icons/ri';

export default function ImageUpload({ 
  onImageUpload, 
  currentImage, 
  type = 'misc',
  className = '',
  children,
  multiple = false
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentImage || null);

  const validateFile = (file) => {
    // Size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG, and WebP images are allowed');
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setError('');
    setUploading(true);

    try {
      // Validate each file
      files.forEach(validateFile);

      // If not multiple, only process the first file
      const filesToProcess = multiple ? files : [files[0]];

      for (const file of filesToProcess) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const { url } = await response.json();
        onImageUpload(url);
      }
    } catch (error) {
      setError(error.message);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {currentImage || preview ? (
        <div className="relative w-full h-full">
          <Image
            src={currentImage || preview}
            alt="Upload preview"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            multiple={multiple}
            disabled={uploading}
          />
          {children || (
            <>
              {uploading ? (
                <RiLoader4Line className="text-3xl text-gray-400 animate-spin" />
              ) : (
                <FaCloudUploadAlt className="text-3xl text-gray-400" />
              )}
              <span className="text-sm text-gray-500 mt-2">
                {uploading ? 'Uploading...' : 'Click to upload'}
              </span>
            </>
          )}
        </label>
      )}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-sm p-2 rounded-b-lg">
          {error}
        </div>
      )}
    </div>
  );
}