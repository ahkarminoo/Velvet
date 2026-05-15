"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faUtensils } from "@fortawesome/free-solid-svg-icons";

export default function SignupModal({ isOpen, onClose, openLoginModal }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      localStorage.setItem("customerUser", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("customerToken", data.token);
      }
      window.dispatchEvent(new CustomEvent("customerUserLogin", { detail: data.user }));
      setMessage("Signup successful");
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error("Signup error:", error);
      setMessage(error.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-velvet-surface rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-y-auto max-h-[95vh] sm:max-h-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Header with Icon */}
          <div className="bg-[#c9a961] p-6 sm:p-8 text-center relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-[#15130f]/80 hover:text-[#15130f] transition-colors duration-200 w-10 h-10 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <FontAwesomeIcon
                icon={faUtensils}
                className="text-[#15130f] text-3xl sm:text-4xl mb-3 sm:mb-4"
              />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#15130f] mb-1 sm:mb-2">
              Join Velvet Today
            </h2>
            <p className="text-[#15130f]/80 text-xs sm:text-sm">
              Create an account to start booking your favorite venues
            </p>
          </div>

          <form onSubmit={handleSignup} className="p-6 sm:p-8 space-y-5 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 sm:py-4 bg-velvet-black border border-velvet-border rounded-xl text-velvet-cream placeholder-velvet-muted focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold transition-all outline-none text-base"
                />
              </div>
              <div className="relative group">
                <FontAwesomeIcon 
                  icon={faEnvelope} 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-velvet-muted group-focus-within:text-velvet-gold transition-colors" 
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 sm:py-4 bg-velvet-black border border-velvet-border rounded-xl text-velvet-cream placeholder-velvet-muted focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold transition-all outline-none text-base"
                />
              </div>
              <div className="relative group">
                <FontAwesomeIcon 
                  icon={faLock} 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-velvet-muted group-focus-within:text-velvet-gold transition-colors" 
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 sm:py-4 bg-velvet-black border border-velvet-border rounded-xl text-velvet-cream placeholder-velvet-muted focus:ring-2 focus:ring-velvet-gold focus:border-velvet-gold transition-all outline-none text-base"
                />
              </div>
            </div>

            {message && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center p-4 rounded-xl ${
                  message.includes("successful")
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {message}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 sm:py-4 bg-[#c9a961] text-velvet-black font-semibold rounded-xl hover:bg-[#e2c887] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </motion.button>

            <p className="text-center text-velvet-muted text-sm">
              Already have an account?{" "}
              <button
                onClick={() => {
                  onClose();
                  openLoginModal();
                }}
                className="text-[#c9a961] hover:text-[#c9a961]/80 font-semibold transition-colors"
              >
                Log in
              </button>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
