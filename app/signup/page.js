"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
  
    // Make sure passwords match
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
  
    const payload = { email, username, password, contactNumber };
  
    // Log the payload to ensure it's correct
    console.log("Payload to send:", payload);
  
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Using the payload directly
      });
  
      const data = await res.json();
      console.log("Response from server:", data);
  
      if (!res.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }
  
      setMessage("Signup successful!");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("An error occurred during signup.");
    }
  };
  
  
  const handleGoogleLogin = async () => {
    signIn("google");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-[#FF6A00] to-[#FFB400]">
      <div className="flex flex-col md:flex-row w-full max-w-screen-xl p-4 ">
        {/* Form Section */}
        <div className="bg-white p-10 rounded-lg shadow-lg flex-1">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#F4A261]">FoodLoft</h1>
            <p className="text-gray-600 mt-2 text-lg">Create an account to start your journey with FoodLoft</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Your Name"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4A261] text-black"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4A261] text-black"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label htmlFor="contactNumber" className="block text-sm font-semibold text-gray-700">Contact Number</label>
                <input
                  type="text"
                  id="contactNumber"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Enter your contact number"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4A261] text-black"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4A261] text-black"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4A261] text-black"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 mt-6 bg-[#F4A261] font-semibold rounded-md hover:bg-[#E07B5D] transition text-black"
            >
              Sign Up
            </button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-gray-500">{message}</p>
          )}

          {/* Google Login Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center bg-white text-black py-2 px-4 rounded-md hover:bg-[#F4A261] transition shadow-md hover:shadow-lg"
            >
              <img src="/images/google-image.png" alt="Google Logo" className="w-6 h-6 mr-2" />
              Sign Up with Google
            </button>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#F4A261] hover:text-[#E07B5D]">Login</Link>
            </p>
          </div>
        </div>

        {/* Image Section */}
        <div className="hidden md:block flex-1">
          <img
            src="/images/signup-image2.png" // Ensure this path is correct
            alt="FoodLoft"
            className="w-full h-full object-cover rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
