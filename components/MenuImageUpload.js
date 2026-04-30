'use client';

import { useState } from 'react';
import { RiImageAddLine, RiDeleteBinLine } from 'react-icons/ri';
import Image from 'next/image';
import ImageUpload from './ImageUpload';

export default function MenuImageUpload({ initialImages = [], onUpdate }) {
  const [menuImages, setMenuImages] = useState(initialImages);

  const handleImageUpload = (url) => {
    setMenuImages([...menuImages, url]);
    onUpdate([...menuImages, url]);
  };

  const handleDeleteImage = (index) => {
    const updatedImages = menuImages.filter((_, i) => i !== index);
    setMenuImages(updatedImages);
    onUpdate(updatedImages);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuImages.map((image, index) => (
          <div key={index} className="relative group">
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden">
              <Image
                src={image}
                alt={`Menu page ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={() => handleDeleteImage(index)}
              className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-red-500 
                opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
            >
              <RiDeleteBinLine className="text-xl" />
            </button>
          </div>
        ))}
        
        {menuImages.length < 5 && (
          <div className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg 
            hover:border-[#FF4F18] transition-colors">
            <ImageUpload
              onImageUpload={handleImageUpload}
              className="w-full h-full flex flex-col items-center justify-center"
            >
              <RiImageAddLine className="text-3xl text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Add Menu Image</span>
              <span className="text-xs text-gray-400">({menuImages.length}/5)</span>
            </ImageUpload>
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-500">
        Upload up to 5 menu images. Recommended aspect ratio is 3:4.
      </p>
    </div>
  );
} 