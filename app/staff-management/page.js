'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, Eye, EyeOff } from 'lucide-react';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    lineUserId: '',
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    role: 'waiter'
  });

  const roles = [
    { value: 'waiter', label: 'Waiter', color: 'bg-blue-100 text-blue-800' },
    { value: 'hostess', label: 'Hostess', color: 'bg-green-100 text-green-800' },
    { value: 'manager', label: 'Manager', color: 'bg-purple-100 text-purple-800' },
    { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' }
  ];

  const permissions = {
    canViewBookings: 'View Bookings',
    canCreateBookings: 'Create Bookings',
    canUpdateBookings: 'Update Bookings',
    canCancelBookings: 'Cancel Bookings',
    canDeleteBookings: 'Delete Bookings',
    canManageStaff: 'Manage Staff'
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchStaff();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants/all');
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data.restaurants || []);
        if (data.restaurants && data.restaurants.length > 0) {
          setSelectedRestaurant(data.restaurants[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchStaff = async () => {
    if (!selectedRestaurant) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/staff?restaurantId=${selectedRestaurant}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRestaurant) {
      alert('Please select a restaurant');
      return;
    }

    try {
      const url = editingStaff ? '/api/staff' : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';
      const payload = editingStaff 
        ? { ...formData, staffId: editingStaff._id }
        : { ...formData, restaurantId: selectedRestaurant };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowForm(false);
        setEditingStaff(null);
        resetForm();
        fetchStaff();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save staff member');
      }
    } catch (error) {
      console.error('Error saving staff member:', error);
      alert('Failed to save staff member');
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      lineUserId: staffMember.lineUserId,
      displayName: staffMember.displayName,
      firstName: staffMember.firstName || '',
      lastName: staffMember.lastName || '',
      email: staffMember.email || '',
      contactNumber: staffMember.contactNumber || '',
      role: staffMember.role
    });
    setShowForm(true);
  };

  const handleDelete = async (staffId) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?staffId=${staffId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchStaff();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove staff member');
      }
    } catch (error) {
      console.error('Error removing staff member:', error);
      alert('Failed to remove staff member');
    }
  };

  const resetForm = () => {
    setFormData({
      lineUserId: '',
      displayName: '',
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      role: 'waiter'
    });
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
          <p className="text-gray-600">Manage restaurant staff members and their Line access permissions</p>
        </div>

        {/* Restaurant Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Restaurant
          </label>
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a restaurant...</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>
                {restaurant.restaurantName}
              </option>
            ))}
          </select>
        </div>

        {selectedRestaurant && (
          <>
            {/* Actions Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span className="text-lg font-medium text-gray-900">
                  Staff Members ({staff.length})
                </span>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingStaff(null);
                  resetForm();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Staff Member</span>
              </button>
            </div>

            {/* Staff Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <h2 className="text-xl font-bold mb-4">
                    {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line User ID *
                      </label>
                      <input
                        type="text"
                        value={formData.lineUserId}
                        onChange={(e) => setFormData({...formData, lineUserId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        placeholder="U1234567890abcdef..."
                        disabled={editingStaff} // Can't change Line ID when editing
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingStaff(null);
                          resetForm();
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                      >
                        {editingStaff ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Staff List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : staff.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Members</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first staff member.</p>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingStaff(null);
                    resetForm();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Staff Member
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {staff.map((member) => {
                  const roleInfo = getRoleInfo(member.role);
                  return (
                    <div key={member._id} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0">
                              {member.profileImage ? (
                                <img
                                  src={member.profileImage}
                                  alt={member.displayName}
                                  className="h-10 w-10 rounded-full"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-medium text-sm">
                                    {member.displayName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {member.displayName}
                              </h3>
                              {(member.firstName || member.lastName) && (
                                <p className="text-gray-600 text-sm">
                                  {member.firstName} {member.lastName}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Line User ID</p>
                              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {member.lineUserId}
                              </p>
                            </div>
                            {member.email && (
                              <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="text-sm">{member.email}</p>
                              </div>
                            )}
                            {member.contactNumber && (
                              <div>
                                <p className="text-sm text-gray-600">Contact</p>
                                <p className="text-sm">{member.contactNumber}</p>
                              </div>
                            )}
                          </div>

                          {/* Permissions */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2 flex items-center">
                              <Shield className="h-4 w-4 mr-1" />
                              Permissions
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(member.permissions).map(([key, value]) => (
                                <span
                                  key={key}
                                  className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${
                                    value 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {value ? (
                                    <Eye className="h-3 w-3" />
                                  ) : (
                                    <EyeOff className="h-3 w-3" />
                                  )}
                                  <span>{permissions[key]}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit staff member"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove staff member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
