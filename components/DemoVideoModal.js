'use client';

import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

export default function DemoVideoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
          >
            <FaTimes size={24} />
          </button>

          {/* Video Player */}
          <div className="relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
            <video
              className="absolute inset-0 w-full h-full"
              controls
              autoPlay
              src="/videos/DemoVideo.mp4" 
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 