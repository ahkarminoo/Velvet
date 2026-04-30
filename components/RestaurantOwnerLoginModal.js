"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faUtensils, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function RestaurantOwnerLoginModal({ isOpen, onClose, onLoginSuccess, onOpenSignupModal }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/restaurant-owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();

      localStorage.removeItem("customerUser");
      localStorage.removeItem("customerToken");
      localStorage.setItem("restaurantOwnerUser", JSON.stringify(data.user));
      localStorage.setItem("restaurantOwnerToken", data.token);
      
      if (data.user.hasRestaurant) {
        router.push('/restaurant-owner/setup/dashboard');
      } else {
        router.push('/restaurant-owner/setup');
      }
      
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      setError("Google login is temporarily disabled. Use email/password login.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        >
          {/* Left Side - Content Image */}
          <div className="w-full md:w-2/5 relative overflow-hidden hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#141517]/80 to-transparent z-10" />
            <Image
              src="/images/body-images/alexander-fae-TivEEYzzhik-unsplash (1).jpg"
              alt="Restaurant ambiance"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-white text-xl font-bold mb-2">Elevate Your Restaurant Experience</h3>
                <p className="text-white/90 text-sm mb-4">Access powerful tools to manage your restaurant and delight your customers.</p>
                <div className="flex space-x-2">
                  {[1, 2, 3].map((dot) => (
                    <motion.div 
                      key={dot}
                      className="w-2 h-2 rounded-full bg-white/30"
                      animate={{ 
                        backgroundColor: dot === 1 ? 'rgba(255, 79, 24, 0.8)' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full md:w-3/5 p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-[#FF4F18] to-[#FF8F6B] rounded-xl flex items-center justify-center mr-3">
                  <FontAwesomeIcon icon={faUtensils} className="text-white text-sm" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Restaurant Portal</h2>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                whileHover={{ rotate: 90 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h3>
              <p className="text-gray-500 text-sm">Sign in to manage your restaurant</p>
            </motion.div>

            <form onSubmit={handleLogin} className="space-y-4">
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative group">
                  <FontAwesomeIcon 
                    icon={faEnvelope} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-[#FF4F18] transition-colors" 
                  />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Email" 
                    required 
                    className="w-full pl-10 pr-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all outline-none" 
                  />
                </div>

                <div className="relative group">
                  <FontAwesomeIcon 
                    icon={faLock} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-[#FF4F18] transition-colors" 
                  />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password" 
                    required 
                    className="w-full pl-10 pr-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all outline-none" 
                  />
                </div>
              </motion.div>

              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 text-[#FF4F18] focus:ring-[#FF4F18] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-[#FF4F18] hover:text-[#FF4F18]/80">
                    Forgot password?
                  </a>
                </div>
              </motion.div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center text-sm"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                </motion.div>
              )}

              <motion.button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#FF4F18] to-[#FF8F6B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#FF4F18]/20 transition-all transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center text-sm"
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(255, 79, 24, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Sign In
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 text-xs group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </motion.button>

              <motion.div 
                className="relative flex items-center py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs">or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </motion.div>

              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:shadow-lg hover:shadow-gray-200/50 transition-all transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <FontAwesomeIcon icon={faGoogle} className="text-red-500 mr-2 text-sm" />
                Sign in with Google
              </motion.button>

              <motion.p 
                className="text-center text-gray-600 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // Open the signup modal instead of redirecting
                    if (onOpenSignupModal) {
                      onOpenSignupModal();
                    }
                  }}
                  className="text-[#FF4F18] hover:text-[#FF4F18]/80 font-semibold transition-colors"
                >
                  Register here
                </button>
              </motion.p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
