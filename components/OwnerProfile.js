'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaEdit, FaUser, FaEnvelope, FaPhone, FaClock } from 'react-icons/fa'
import { RiUserLine, RiCameraLine } from 'react-icons/ri'
import Image from 'next/image'

export default function OwnerProfile() {
  const [ownerData, setOwnerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileImage, setProfileImage] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    const fetchOwnerProfile = async () => {
      const token = localStorage.getItem("restaurantOwnerToken")
      if (!token) {
        return
      }

      try {
        const response = await fetch("/api/restaurant-owner/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setOwnerData(data)
          setProfileImage(data.imageUrl)
          setFormData({
            firstName: data.name.split(' ')[0],
            lastName: data.name.split(' ')[1],
            email: data.email,
            phone: data.phoneNumber || '',
          })
        } else {
          console.error("Failed to fetch owner profile")
        }
      } catch (error) {
        console.error("Error fetching owner profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOwnerProfile()
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem("restaurantOwnerToken")
    if (!token) {
      console.error("No authentication token found")
      return
    }
    
    try {
      // Prepare the updated profile data
      const updatedProfile = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phoneNumber: formData.phone,
        imageUrl: profileImage
      }
      
      // Send the updated profile to the API
      const response = await fetch("/api/restaurant-owner/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      })
      
      if (response.ok) {
        // Update the local state with the new data
        const updatedData = await response.json()
        setOwnerData(updatedData)
        alert("Profile updated successfully!")
      } else {
        const errorData = await response.json()
        console.error("Failed to update profile:", errorData)
        alert("Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("An error occurred while updating your profile.")
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  if (loading) {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-[#2D3436] to-[#1A1C1E] rounded-3xl shadow-xl p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!ownerData) {
    return (
      <div className="min-h-[500px] bg-gradient-to-br from-[#2D3436] to-[#1A1C1E] rounded-3xl shadow-xl p-8 flex items-center justify-center">
        <div className="text-white text-xl">Failed to load profile</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-black">
      <h2 className="text-xl font-semibold text-[#141517] mb-6">Owner Profile</h2>
      
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="relative h-full w-full rounded-full overflow-hidden border-4 border-[#FF4F18] shadow-lg">
          {profileImage ? (
            <Image
              src={profileImage}
              alt="Profile"
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full bg-[#F8FAFC] flex items-center justify-center">
              <RiUserLine className="text-4xl text-[#64748B]" />
            </div>
          )}
        </div>
        <button
          onClick={() => document.getElementById('profileImage').click()}
          className="absolute bottom-0 right-0 p-2 rounded-full bg-[#FF4F18] text-white hover:opacity-90 transition-all duration-200"
        >
          <RiCameraLine className="text-xl" />
        </button>
        <input
          id="profileImage"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <FormField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>

        <FormField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          type="email"
          required
        />

        <FormField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
        />

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-[#FF4F18] text-white hover:opacity-90 transition-all duration-200"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

const FormField = ({ label, name, value, onChange, type = 'text', required = false }) => (
  <div>
    <label className="block text-sm font-medium text-[#64748B] mb-2">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#FF4F18] focus:ring-1 focus:ring-[#FF4F18] outline-none transition-all duration-200"
    />
  </div>
)