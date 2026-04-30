'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReviewsManagement from './admin/ReviewsManagement'
import { 
  FaUsers, 
  FaChartLine, 
  FaCreditCard, 
  FaCog, 
  FaBell,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaDownload,
  FaBuilding,
  FaCalendarAlt,
  FaComments,
  FaStar,
  FaSignOutAlt,
  FaUser,
  FaMapMarkerAlt,
  FaInfoCircle
} from 'react-icons/fa'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    users: [],
    restaurants: [],
    bookings: [],
    reviews: []
  })
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [filteredBookings, setFilteredBookings] = useState([])
  const [selectedRestaurantForSaaS, setSelectedRestaurantForSaaS] = useState(null)
  const [showSaaSModal, setShowSaaSModal] = useState(false)
  const [saasData, setSaasData] = useState({
    subscription: null,
    usage: null,
    organization: null
  })

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [])

  // Filter bookings by restaurant
  useEffect(() => {
    if (selectedRestaurant === 'all') {
      setFilteredBookings(data.bookings)
    } else {
      const filtered = data.bookings.filter(booking => 
        booking.restaurantId?.restaurantName === selectedRestaurant
      )
      setFilteredBookings(filtered)
    }
  }, [data.bookings, selectedRestaurant])


  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        window.location.href = '/admin/login'
        return
      }

      const response = await fetch('/api/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
        return
      }

      const adminData = await response.json()
      setAdmin(adminData.admin)
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('adminToken')
      window.location.href = '/admin/login'
    }
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [usersRes, restaurantsRes, bookingsRes, reviewsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/restaurants', { headers }),
        fetch('/api/admin/bookings', { headers }),
        fetch('/api/admin/reviews', { headers })
      ])

      // Check for authentication errors
      if (usersRes.status === 401 || restaurantsRes.status === 401 || bookingsRes.status === 401 || 
          reviewsRes.status === 401) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
        return
      }

      const [users, restaurants, bookings, reviews] = await Promise.all([
        usersRes.json(),
        restaurantsRes.json(),
        bookingsRes.json(),
        reviewsRes.json()
      ])

      console.log('Dashboard data fetched:');
      console.log('Users:', users);
      console.log('Restaurants:', restaurants);
      console.log('Bookings:', bookings);
      console.log('Restaurants data length:', restaurants.data?.length);
      console.log('Restaurants success:', restaurants.success);

      setData({
        users: users.data || [],
        restaurants: restaurants.data || [],
        bookings: bookings.data || [],
        reviews: reviews.data || []
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // If it's an authentication error, redirect to login
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    window.location.href = '/admin/login'
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', onClick }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-black text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-black mt-1">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`text-${color}-600 text-xl`} />
        </div>
      </div>
    </motion.div>
  )

  const DataTable = ({ title, data, columns, actions = [] }) => {
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50
    const totalPages = Math.ceil(data.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentData = data.slice(startIndex, endIndex)

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <span className="text-sm text-black">
            Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, index) => (
                  <th key={index} className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                      <div className="flex space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={`${action.className} hover:opacity-80`}
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-black"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-black"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-black">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-black"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-black"
              >
                Last
              </button>
            </div>
            <div className="text-sm text-black">
              {itemsPerPage} items per page
            </div>
          </div>
        )}
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'restaurants', label: 'Restaurants', icon: FaBuilding },
    { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
    { id: 'reviews', label: 'Reviews', icon: FaStar }
  ]

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={data.users.length.toLocaleString()}
          icon={FaUsers}
          color="blue"
          onClick={() => setActiveTab('users')}
        />
        <StatCard
          title="Restaurants"
          value={data.restaurants.length.toLocaleString()}
          icon={FaBuilding}
          color="green"
          onClick={() => setActiveTab('restaurants')}
        />
        <StatCard
          title="Bookings"
          value={data.bookings.length.toLocaleString()}
          icon={FaCalendarAlt}
          color="purple"
          onClick={() => setActiveTab('bookings')}
        />
        <StatCard
          title="Reviews"
          value={data.reviews.length.toLocaleString()}
          icon={FaStar}
          color="orange"
          onClick={() => setActiveTab('reviews')}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Recent Users"
          data={data.users}
          columns={[
            { key: 'firstName', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role' },
            { key: 'createdAt', header: 'Joined', render: (value) => new Date(value).toLocaleDateString() }
          ]}
          actions={[
            { icon: <FaEye className="text-blue-600" />, className: "text-blue-600 hover:text-blue-900", onClick: (row) => console.log('View user', row) },
            { icon: <FaEdit className="text-green-600" />, className: "text-green-600 hover:text-green-900", onClick: (row) => console.log('Edit user', row) }
          ]}
        />

        <DataTable
          title="Recent Restaurants"
          data={data.restaurants}
          columns={[
            { key: 'restaurantName', header: 'Name' },
            { key: 'location', header: 'Location', render: (value) => value?.address || 'N/A' },
            { key: 'cuisineType', header: 'Cuisine' },
            { key: 'createdAt', header: 'Created', render: (value) => new Date(value).toLocaleDateString() }
          ]}
          actions={[
            { icon: <FaEye className="text-blue-600" />, className: "text-blue-600 hover:text-blue-900", onClick: (row) => console.log('View restaurant', row) },
            { icon: <FaEdit className="text-green-600" />, className: "text-green-600 hover:text-green-900", onClick: (row) => console.log('Edit restaurant', row) }
          ]}
        />
      </div>
    </div>
  )

  const UsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black">User Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FaPlus />
          Add User
        </button>
      </div>


      <DataTable
        title="All Users"
        data={data.users}
        columns={[
          { key: 'firstName', header: 'Name', render: (value, row) => `${row.firstName} ${row.lastName}` },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role' },
          { key: 'contactNumber', header: 'Phone' },
          { key: 'createdAt', header: 'Joined', render: (value) => new Date(value).toLocaleDateString() }
        ]}
        actions={[
          { icon: <FaEye className="text-blue-600" />, className: "text-blue-600 hover:text-blue-900", onClick: (row) => console.log('View user', row) },
          { icon: <FaEdit className="text-green-600" />, className: "text-green-600 hover:text-green-900", onClick: (row) => console.log('Edit user', row) },
          { icon: <FaTrash className="text-red-600" />, className: "text-red-600 hover:text-red-900", onClick: (row) => console.log('Delete user', row) }
        ]}
      />
    </div>
  )

  const RestaurantsTab = () => {
    const [selectedRestaurant, setSelectedRestaurant] = useState(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [restaurantStaff, setRestaurantStaff] = useState([])

    const handleManageSaaS = async (restaurant) => {
      setSelectedRestaurantForSaaS(restaurant)
      setShowSaaSModal(true)
      
      // Fetch SaaS data for this restaurant
      try {
        const [subscriptionRes, usageRes, organizationRes] = await Promise.all([
          fetch(`/api/saas/subscriptions/restaurant/${restaurant._id}`),
          fetch(`/api/saas/usage/restaurant/${restaurant._id}`),
          fetch(`/api/saas/organizations/restaurant/${restaurant._id}`)
        ])
        
        const [subscription, usage, organization] = await Promise.all([
          subscriptionRes.json(),
          usageRes.json(),
          organizationRes.json()
        ])
        
        setSaasData({
          subscription: subscription.data,
          usage: usage.data,
          organization: organization.data
        })
      } catch (error) {
        console.error('Error fetching SaaS data:', error)
      }
    }

    const [restaurantSubscription, setRestaurantSubscription] = useState(null)

    const handleViewDetails = async (restaurant) => {
      setSelectedRestaurant(restaurant)
      setShowDetailsModal(true)
      
      // Fetch staff and subscription data for this restaurant
      try {
        const [staffRes, subscriptionRes] = await Promise.all([
          fetch(`/api/staff?restaurantId=${restaurant._id}`),
          fetch(`/api/saas/subscriptions/restaurant/${restaurant._id}`)
        ])
        
        const [staffData, subscriptionData] = await Promise.all([
          staffRes.json(),
          subscriptionRes.json()
        ])
        
        setRestaurantStaff(staffData.staff || [])
        setRestaurantSubscription(subscriptionData.data || null)
      } catch (error) {
        console.error('Error fetching restaurant details:', error)
        setRestaurantStaff([])
        setRestaurantSubscription(null)
      }
    }

    console.log('RestaurantsTab - data.restaurants:', data.restaurants);
    console.log('RestaurantsTab - data.restaurants length:', data.restaurants?.length);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">Restaurant Management</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FaPlus />
            Add Restaurant
          </button>
        </div>

        {data.restaurants && data.restaurants.length > 0 ? (
          <DataTable
            title="All Restaurants"
            data={data.restaurants}
            columns={[
            { key: 'restaurantName', header: 'Name' },
            { 
              key: 'staffCount', 
              header: 'Staff Count', 
              render: (value, row) => {
                return (
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-purple-600" />
                    <span className="font-semibold">{row.staffCount || 0}</span>
                  </div>
                )
              }
            },
            { key: 'contactNumber', header: 'Contact' },
            { 
              key: 'subscription', 
              header: 'Plan', 
              render: (value, row) => {
                const planType = row.subscriptionId?.planType || 'free'
                return (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    planType === 'enterprise' 
                      ? 'bg-purple-100 text-purple-800'
                      : planType === 'professional'
                      ? 'bg-blue-100 text-blue-800'
                      : planType === 'business'
                      ? 'bg-green-100 text-green-800'
                      : planType === 'basic'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {planType.toUpperCase()}
                  </span>
                )
              }
            },
            { key: 'createdAt', header: 'Created', render: (value) => new Date(value).toLocaleDateString() },
            { 
              key: 'status', 
              header: 'Status', 
              render: (value, row) => {
                const status = row.saasStatus || 'active'
                return (
                  <span className={`px-2 py-1 rounded text-xs ${
                    status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : status === 'suspended'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status}
                  </span>
                )
              }
            }
          ]}
          actions={[
            { icon: <FaEye className="text-blue-600" />, className: "text-blue-600 hover:text-blue-900", onClick: (row) => handleViewDetails(row) },
            { icon: <FaEdit className="text-green-600" />, className: "text-green-600 hover:text-green-900", onClick: (row) => console.log('Edit restaurant', row) },
            { icon: <FaCog className="text-purple-600" />, className: "text-purple-600 hover:text-purple-900", onClick: (row) => handleManageSaaS(row) },
            { icon: <FaTrash className="text-red-600" />, className: "text-red-600 hover:text-red-900", onClick: (row) => console.log('Delete restaurant', row) }
          ]}
        />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-500 mb-4">
              <FaBuilding className="text-6xl mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Restaurants Found</h3>
              <p className="text-gray-400">No restaurants are currently registered in the system.</p>
            </div>
          </div>
        )}

        {/* SaaS Management Modal */}
        {showSaaSModal && selectedRestaurantForSaaS && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-black">
                    SaaS Management - {selectedRestaurantForSaaS.restaurantName}
                  </h3>
                  <button
                    onClick={() => setShowSaaSModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subscription Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaCreditCard className="text-blue-600" />
                      Subscription Status
                    </h4>
                    {saasData.subscription ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-black">Plan:</span>
                          <span className="font-semibold text-black">{saasData.subscription.planType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            saasData.subscription.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {saasData.subscription.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Next Billing:</span>
                          <span className="text-black">{new Date(saasData.subscription.nextBillingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Price:</span>
                          <span className="text-black">${saasData.subscription.price}/month</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-black">No subscription found</p>
                    )}
                  </div>

                  {/* Usage Statistics */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaChartLine className="text-green-600" />
                      Usage Statistics
                    </h4>
                    {saasData.usage ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-black">Floor Plans:</span>
                          <span className="text-black">{saasData.usage.floorPlansUsed}/{saasData.usage.floorPlansLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Tables:</span>
                          <span className="text-black">{saasData.usage.tablesUsed}/{saasData.usage.tablesLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Staff:</span>
                          <span className="text-black">{saasData.usage.staffUsed}/{saasData.usage.staffLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Bookings (Month):</span>
                          <span className="text-black">{saasData.usage.bookingsThisMonth}/{saasData.usage.bookingsLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">API Calls (Month):</span>
                          <span className="text-black">{saasData.usage.apiCallsThisMonth}/{saasData.usage.apiCallsLimit}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-black">No usage data found</p>
                    )}
                  </div>

                  {/* Organization Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaBuilding className="text-purple-600" />
                      Organization
                    </h4>
                    {saasData.organization ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-black">Name:</span>
                          <span className="text-black">{saasData.organization.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Plan:</span>
                          <span className="text-black">{saasData.organization.planType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Created:</span>
                          <span className="text-black">{new Date(saasData.organization.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            saasData.organization.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {saasData.organization.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-black">No organization found</p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaCog className="text-orange-600" />
                      Quick Actions
                    </h4>
                    <div className="space-y-3">
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                        <FaEdit />
                        Update Subscription
                      </button>
                      <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                        <FaChartLine />
                        View Analytics
                      </button>
                      <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                        <FaBuilding />
                        Manage Organization
                      </button>
                      <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2">
                        <FaCog />
                        Configure Settings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSaaSModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Details Modal */}
        {showDetailsModal && selectedRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-black">
                    Restaurant Details - {selectedRestaurant.restaurantName}
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaBuilding className="text-blue-600" />
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black">Name:</span>
                        <span className="font-semibold text-black">{selectedRestaurant.restaurantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Cuisine Type:</span>
                        <span className="text-black">{selectedRestaurant.cuisineType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Contact:</span>
                        <span className="text-black">{selectedRestaurant.contactNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Created:</span>
                        <span className="text-black">{new Date(selectedRestaurant.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedRestaurant.saasStatus === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedRestaurant.saasStatus === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedRestaurant.saasStatus || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-green-600" />
                      Location
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black">Address:</span>
                        <span className="text-black text-right max-w-xs">
                          {selectedRestaurant.location?.address || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">City:</span>
                        <span className="text-black">{selectedRestaurant.location?.city || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">State:</span>
                        <span className="text-black">{selectedRestaurant.location?.state || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Country:</span>
                        <span className="text-black">{selectedRestaurant.location?.country || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Postal Code:</span>
                        <span className="text-black">{selectedRestaurant.location?.postalCode || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Staff Information */}
                  <div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaUsers className="text-purple-600" />
                      Staff Members ({restaurantStaff.length})
                    </h4>
                    {restaurantStaff.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {restaurantStaff.map((staff, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaUser className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-black">{staff.displayName}</p>
                                <p className="text-sm text-gray-600">{staff.role}</p>
                                <p className="text-xs text-gray-500">ID: {staff.lineId}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                staff.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {staff.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-black">No staff members found</p>
                    )}
                  </div>

                  {/* Subscription Information */}
                  <div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
                    <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                      <FaCreditCard className="text-blue-600" />
                      Subscription Information
                    </h4>
                    {restaurantSubscription ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaBuilding className="text-blue-600" />
                            <span className="font-semibold text-black">Plan Type</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            restaurantSubscription.planType === 'enterprise' 
                              ? 'bg-purple-100 text-purple-800'
                              : restaurantSubscription.planType === 'professional'
                              ? 'bg-blue-100 text-blue-800'
                              : restaurantSubscription.planType === 'business'
                              ? 'bg-green-100 text-green-800'
                              : restaurantSubscription.planType === 'basic'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {restaurantSubscription.planType?.toUpperCase() || 'FREE'}
                          </span>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaChartLine className="text-green-600" />
                            <span className="font-semibold text-black">Status</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            restaurantSubscription.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {restaurantSubscription.status || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaCog className="text-orange-600" />
                            <span className="font-semibold text-black">Billing</span>
                          </div>
                          <div className="text-sm text-black">
                            <div>${restaurantSubscription.price || 0}/month</div>
                            <div className="text-xs text-gray-600">
                              {restaurantSubscription.billingCycle || 'monthly'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaUsers className="text-purple-600" />
                            <span className="font-semibold text-black">Staff Limit</span>
                          </div>
                          <div className="text-sm text-black">
                            {restaurantSubscription.usage?.staffUsed || 0} / {restaurantSubscription.usage?.staffLimit || 0}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaBuilding className="text-green-600" />
                            <span className="font-semibold text-black">Floor Plans</span>
                          </div>
                          <div className="text-sm text-black">
                            {restaurantSubscription.usage?.floorPlansUsed || 0} / {restaurantSubscription.usage?.floorPlansLimit || 0}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <FaCalendarAlt className="text-blue-600" />
                            <span className="font-semibold text-black">Monthly Bookings</span>
                          </div>
                          <div className="text-sm text-black">
                            {restaurantSubscription.usage?.bookingsThisMonth || 0} / {restaurantSubscription.usage?.bookingsLimit || 0}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <FaInfoCircle className="text-yellow-600" />
                          <span className="text-black font-semibold">No Subscription Found</span>
                        </div>
                        <p className="text-black text-sm mt-2">
                          This restaurant doesn't have an active subscription. They may be using the free plan or need to set up billing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedRestaurant.description && (
                    <div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
                      <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                        <FaInfoCircle className="text-orange-600" />
                        Description
                      </h4>
                      <p className="text-black">{selectedRestaurant.description}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Edit Restaurant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const BookingsTab = () => {
    // Get unique restaurant names for the dropdown
    const restaurantNames = [...new Set(data.bookings
      .map(booking => booking.restaurantId?.restaurantName)
      .filter(name => name)
    )].sort()

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">Booking Management</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FaPlus />
            Add Booking
          </button>
        </div>

        {/* Restaurant Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-black">Filter by Restaurant:</label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="all">All Restaurants ({data.bookings.length})</option>
              {restaurantNames.map(restaurantName => (
                <option key={restaurantName} value={restaurantName}>
                  {restaurantName} ({data.bookings.filter(b => b.restaurantId?.restaurantName === restaurantName).length})
                </option>
              ))}
            </select>
            <span className="text-sm text-black">
              Showing {filteredBookings.length} bookings
            </span>
          </div>
        </div>

        <DataTable
          title={`Bookings${selectedRestaurant !== 'all' ? ` - ${selectedRestaurant}` : ''}`}
          data={filteredBookings}
          columns={[
            { key: 'customerName', header: 'Customer' },
            { key: 'restaurantId', header: 'Restaurant', render: (value) => value?.restaurantName || 'N/A' },
            { key: 'tableId', header: 'Table', render: (value) => value || 'N/A' },
            { key: 'date', header: 'Date', render: (value) => new Date(value).toLocaleDateString() },
            { key: 'startTime', header: 'Time' },
            { key: 'guestCount', header: 'Guests' },
            { key: 'status', header: 'Status' }
          ]}
          actions={[
            { icon: <FaEye className="text-blue-600" />, className: "text-blue-600 hover:text-blue-900", onClick: (row) => console.log('View booking', row) },
            { icon: <FaEdit className="text-green-600" />, className: "text-green-600 hover:text-green-900", onClick: (row) => console.log('Edit booking', row) },
            { icon: <FaTrash className="text-red-600" />, className: "text-red-600 hover:text-red-900", onClick: (row) => console.log('Delete booking', row) }
          ]}
        />
      </div>
    )
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
              <p className="text-black mt-1">Manage your application</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaUser className="text-black" />
                <span className="text-black">{admin?.fullName}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {admin?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-black hover:text-blue-600 hover:border-gray-300'
                  }`}
                >
                  <Icon />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'restaurants' && <RestaurantsTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'reviews' && <ReviewsManagement />}
      </div>
    </div>
  )
}
