'use client';

import { useState, useEffect } from 'react';
import { Trash2, Users, Shield, Eye, EyeOff, QrCode, X } from 'lucide-react';

export default function StaffManagement({ restaurantId }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrFormData, setQrFormData] = useState({
    displayName: '',
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
    if (restaurantId) {
      fetchStaff();
    }
  }, [restaurantId]);

  const fetchStaff = async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/staff?restaurantId=${restaurantId}`);
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


  const generateQRCode = async () => {
    if (!restaurantId) {
      alert('Restaurant ID is required');
      return;
    }

    if (!qrFormData.displayName.trim()) {
      alert('Please enter staff member name');
      return;
    }

    setQrLoading(true);
    try {
      const response = await fetch('/api/staff/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          role: qrFormData.role,
          displayName: qrFormData.displayName.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const resetQRForm = () => {
    setQrFormData({
      displayName: '',
      role: 'waiter'
    });
    setQrCode('');
  };


  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  if (!restaurantId) {
    return (
      <div className="text-center py-8">
        <p className="text-black">Please create a restaurant profile first to manage staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-black" />
          <span className="text-lg font-medium text-black">
            Staff Members ({staff.length})
          </span>
        </div>
        <button
          onClick={() => {
            setShowQRGenerator(true);
            resetQRForm();
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <QrCode className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>


      {/* QR Generator Modal */}
      {showQRGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Generate Staff QR Code</h2>
              <button
                onClick={() => {
                  setShowQRGenerator(false);
                  resetQRForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!qrCode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Staff Member Name *
                  </label>
                  <input
                    type="text"
                    value={qrFormData.displayName}
                    onChange={(e) => setQrFormData({...qrFormData, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Role *
                  </label>
                  <select
                    value={qrFormData.role}
                    onChange={(e) => setQrFormData({...qrFormData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>How it works:</strong><br/>
                    1. Generate QR code with staff details<br/>
                    2. Staff scans QR code with their phone<br/>
                    3. Staff adds Line bot as friend<br/>
                    4. Staff sends registration code to bot<br/>
                    5. Registration complete automatically!
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQRGenerator(false);
                      resetQRForm();
                    }}
                    className="px-4 py-2 text-black hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateQRCode}
                    disabled={qrLoading || !qrFormData.displayName.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    {qrLoading ? 'Generating...' : 'Generate QR Code'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <img src={qrCode} alt="Staff Registration QR Code" className="mx-auto mb-4" />
                  <p className="text-sm text-black mb-2">
                    <strong>{qrFormData.displayName}</strong> - {roles.find(r => r.value === qrFormData.role)?.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    QR Code expires in 10 minutes
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-yellow-800 text-sm">
                    📱 <strong>Instructions for staff:</strong><br/>
                    1. Scan this QR code with your phone<br/>
                    2. Add the Line bot as a friend<br/>
                    3. Send the registration code to the bot<br/>
                    4. Registration will complete automatically!
                  </p>
                </div>
                <div className="flex justify-center space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowQRGenerator(false);
                      resetQRForm();
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Done
                  </button>
                  <button
                    onClick={resetQRForm}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4F18]"></div>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">No Staff Members</h3>
          <p className="text-black mb-4">Get started by adding your first staff member.</p>
          <button
            onClick={() => {
              setShowQRGenerator(true);
              resetQRForm();
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Staff Member
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => {
            const roleInfo = getRoleInfo(member.role);
            return (
              <div key={member._id} className="bg-white border border-gray-200 rounded-lg p-4">
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
                        <h3 className="text-lg font-semibold text-black">
                          {member.displayName}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <div>
                        <p className="text-sm text-black">Line ID</p>
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-black">
                          @{member.lineId}
                        </p>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <p className="text-sm text-black mb-2 flex items-center">
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

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-black mb-2">How to add staff:</h3>
        <div className="text-sm text-black">
          <h4 className="font-medium text-green-600 mb-2">📱 QR Code Registration</h4>
          <ol className="space-y-1">
            <li>1. Click "Add Staff Member" to generate QR code</li>
            <li>2. Enter staff member's name and role</li>
            <li>3. Show QR code to staff member</li>
            <li>4. Staff scans QR code and adds Line bot</li>
            <li>5. Staff sends registration code to bot</li>
            <li>6. Registration completes automatically! ✅</li>
          </ol>
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-blue-800 text-xs">
              💡 <strong>Tip:</strong> QR codes expire after 30 minutes for security. 
              Staff members will be able to use the Line bot immediately after registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
