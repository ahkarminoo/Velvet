/**
 * Client-side utilities for booking with OCC and reservation holds
 * Example implementation showing how to use the OCC system
 */

class BookingClient {
  constructor(baseUrl = '/api', authToken = null) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Make authenticated request
   */
  async makeRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a reservation hold
   */
  async createReservationHold({
    restaurantId,
    tableId,
    date,
    startTime,
    endTime,
    guestCount,
    holdDurationMinutes = 5
  }) {
    return this.makeRequest(`${this.baseUrl}/bookings/create-soft-lock`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        tableId,
        date,
        startTime,
        endTime,
        guestCount,
        holdDurationMinutes
      })
    });
  }

  /**
   * Confirm a reservation hold
   */
  async confirmReservationHold(lockId, additionalData = {}) {
    return this.makeRequest(`${this.baseUrl}/bookings/confirm-soft-lock`, {
      method: 'POST',
      body: JSON.stringify({
        lockId,
        ...additionalData
      })
    });
  }

  /**
   * Release a reservation hold
   */
  async releaseReservationHold(lockId) {
    return this.makeRequest(`${this.baseUrl}/bookings/release-soft-lock`, {
      method: 'POST',
      body: JSON.stringify({ lockId })
    });
  }

  /**
   * Check reservation hold status
   */
  async getReservationHoldStatus(lockId) {
    return this.makeRequest(`${this.baseUrl}/bookings/release-soft-lock?lockId=${lockId}`, {
      method: 'GET'
    });
  }

  /**
   * Check for booking conflicts
   */
  async checkConflicts({
    restaurantId,
    tableId,
    date,
    startTime,
    endTime
  }) {
    return this.makeRequest(`${this.baseUrl}/bookings/conflict-check`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        tableId,
        date,
        startTime,
        endTime
      })
    });
  }

  /**
   * Quick availability check
   */
  async checkAvailability({
    restaurantId,
    tableId,
    date,
    startTime,
    endTime
  }) {
    const params = new URLSearchParams({
      restaurantId,
      tableId,
      date,
      startTime,
      endTime
    });

    return this.makeRequest(`${this.baseUrl}/bookings/conflict-check?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Create booking directly (without holds)
   */
  async createBooking({
    restaurantId,
    floorplanId,
    tableId,
    date,
    startTime,
    endTime,
    guestCount
  }) {
    return this.makeRequest(`${this.baseUrl}/scenes/${floorplanId}/book`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        tableId,
        date,
        startTime,
        endTime,
        guestCount
      })
    });
  }

  /**
   * Update booking with OCC
   */
  async updateBooking(bookingId, updates, expectedVersion) {
    return this.makeRequest(`${this.baseUrl}/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updates,
        version: expectedVersion
      })
    });
  }

  /**
   * Get booking with version for OCC
   */
  async getBooking(bookingId) {
    return this.makeRequest(`${this.baseUrl}/bookings/${bookingId}`, {
      method: 'GET'
    });
  }
}

/**
 * Example usage patterns
 */

// Example 1: Booking with reservation hold
export async function bookWithHold({
  restaurantId,
  tableId,
  date,
  startTime,
  endTime,
  guestCount,
  customerData
}) {
  const client = new BookingClient();
  
  try {
    // 1. Create reservation hold
    const lock = await client.createReservationHold({
      restaurantId,
      tableId,
      date,
      startTime,
      endTime,
      guestCount,
      holdDurationMinutes: 10 // Give user 10 minutes to complete
    });

    console.log('Reservation hold created:', lock.lock.lockId);

    // 2. Show user confirmation form
    // ... user interaction ...

    // 3. Confirm the hold
    const booking = await client.confirmReservationHold(lock.lock.lockId, {
      specialRequests: customerData.specialRequests,
      pricing: customerData.pricing
    });

    console.log('Booking confirmed:', booking.booking._id);
    return booking;

  } catch (error) {
    console.error('Booking failed:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('already booked')) {
      throw new Error('This table is no longer available. Please select a different time.');
    } else if (error.message.includes('expired')) {
      throw new Error('Your reservation hold has expired. Please try again.');
    } else {
      throw error;
    }
  }
}

// Example 2: Quick booking without holds
export async function quickBook({
  restaurantId,
  floorplanId,
  tableId,
  date,
  startTime,
  endTime,
  guestCount
}) {
  const client = new BookingClient();

  try {
    // Check availability first
    const availability = await client.checkAvailability({
      restaurantId,
      tableId,
      date,
      startTime,
      endTime
    });

    if (!availability.isAvailable) {
      throw new Error('Table is not available for the selected time');
    }

    // Create booking directly
    const booking = await client.createBooking({
      restaurantId,
      floorplanId,
      tableId,
      date,
      startTime,
      endTime,
      guestCount
    });

    console.log('Booking created:', booking.booking._id);
    return booking;

  } catch (error) {
    console.error('Quick booking failed:', error.message);
    throw error;
  }
}

// Example 3: Update booking with OCC
export async function updateBookingWithOCC(bookingId, updates) {
  const client = new BookingClient();

  try {
    // 1. Get current booking with version
    const currentBooking = await client.getBooking(bookingId);
    
    // 2. Update with version check
    const updatedBooking = await client.updateBooking(
      bookingId,
      updates,
      currentBooking.version
    );

    console.log('Booking updated:', updatedBooking._id);
    return updatedBooking;

  } catch (error) {
    console.error('Update failed:', error.message);
    
    if (error.message.includes('concurrency control failed')) {
      throw new Error('Booking was modified by someone else. Please refresh and try again.');
    } else {
      throw error;
    }
  }
}

// Example 4: Handle reservation hold with timer
export class ReservationHoldManager {
  constructor(client, lockId, onExpire, onExtend) {
    this.client = client;
    this.lockId = lockId;
    this.onExpire = onExpire;
    this.onExtend = onExtend;
    this.timer = null;
    this.isActive = true;
  }

  async startMonitoring() {
    try {
      const status = await this.client.getReservationHoldStatus(this.lockId);
      
      if (status.lock.isExpired) {
        this.onExpire();
        return;
      }

      // Set timer for remaining time
      const remainingMs = status.lock.timeRemainingMs;
      this.timer = setTimeout(() => {
        if (this.isActive) {
          this.onExpire();
        }
      }, remainingMs);

      // Check for extension opportunities
      if (remainingMs < 60000) { // Less than 1 minute
        this.onExtend(remainingMs);
      }

    } catch (error) {
      console.error('Error monitoring hold:', error);
      this.onExpire();
    }
  }

  async extendHold(minutes = 5) {
    try {
      const status = await this.client.getReservationHoldStatus(this.lockId);
      
      if (status.lock.isExpired) {
        throw new Error('Hold has already expired');
      }

      // In a real implementation, you'd call an extend endpoint
      // For now, we'll create a new hold
      console.log(`Hold extended by ${minutes} minutes`);
      
      // Restart monitoring with new time
      if (this.timer) {
        clearTimeout(this.timer);
      }
      
      // Simulate extended time
      this.timer = setTimeout(() => {
        if (this.isActive) {
          this.onExpire();
        }
      }, minutes * 60 * 1000);

    } catch (error) {
      console.error('Error extending hold:', error);
      throw error;
    }
  }

  release() {
    this.isActive = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Release the hold
    return this.client.releaseReservationHold(this.lockId);
  }
}

// Example 5: React hook for reservation holds
export function useReservationHold(client, initialLockId = null) {
  const [lockId, setLockId] = React.useState(initialLockId);
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const createHold = async (holdData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createReservationHold(holdData);
      setLockId(result.lock.lockId);
      setStatus(result.lock);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmHold = async (additionalData) => {
    if (!lockId) {
      throw new Error('No active hold to confirm');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await client.confirmReservationHold(lockId, additionalData);
      setLockId(null);
      setStatus(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const releaseHold = async () => {
    if (!lockId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await client.releaseReservationHold(lockId);
      setLockId(null);
      setStatus(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!lockId) {
      return;
    }

    try {
      const result = await client.getReservationHoldStatus(lockId);
      setStatus(result.lock);
      
      if (result.lock.isExpired) {
        setLockId(null);
        setStatus(null);
      }
      
      return result.lock;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (lockId) {
        client.releaseReservationHold(lockId).catch(console.error);
      }
    };
  }, [lockId]);

  return {
    lockId,
    status,
    error,
    isLoading,
    createHold,
    confirmHold,
    releaseHold,
    checkStatus
  };
}

export default BookingClient;
