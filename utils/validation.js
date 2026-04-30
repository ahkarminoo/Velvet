// Comprehensive input validation utility
class ValidationUtils {
  // Email validation
  static isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Phone number validation (international format)
  static isValidPhone(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Check if it's between 7 and 15 digits
    return digits.length >= 7 && digits.length <= 15;
  }

  // Password validation
  static isValidPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: {
        tooShort: password.length < minLength,
        noUpperCase: !hasUpperCase,
        noLowerCase: !hasLowerCase,
        noNumbers: !hasNumbers,
        noSpecialChar: !hasSpecialChar
      }
    };
  }

  // Date validation
  static isValidDate(date) {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      isValid: inputDate >= today,
      isPast: inputDate < today,
      isToday: inputDate.getTime() === today.getTime()
    };
  }

  // Time validation
  static isValidTime(time) {
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    return timeRegex.test(time);
  }

  // Guest count validation
  static isValidGuestCount(count, maxCapacity = 10) {
    const num = parseInt(count);
    return {
      isValid: !isNaN(num) && num >= 1 && num <= maxCapacity,
      isTooSmall: num < 1,
      isTooLarge: num > maxCapacity,
      isNotNumber: isNaN(num)
    };
  }

  // Restaurant name validation
  static isValidRestaurantName(name) {
    return {
      isValid: name.length >= 2 && name.length <= 100,
      isTooShort: name.length < 2,
      isTooLong: name.length > 100,
      hasInvalidChars: /[<>{}]/.test(name)
    };
  }

  // Address validation
  static isValidAddress(address) {
    return {
      isValid: address.length >= 5 && address.length <= 200,
      isTooShort: address.length < 5,
      isTooLong: address.length > 200
    };
  }

  // Opening hours validation
  static isValidOpeningHours(hours) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    
    for (const day of days) {
      if (hours[day]) {
        const { open, close, isClosed } = hours[day];
        
        if (isClosed) continue;
        
        if (!open || !close) {
          return { isValid: false, error: `Missing opening/closing time for ${day}` };
        }
        
        if (!timeRegex.test(open) || !timeRegex.test(close)) {
          return { isValid: false, error: `Invalid time format for ${day}` };
        }
      }
    }
    
    return { isValid: true };
  }

  // Booking validation
  static validateBooking(bookingData) {
    const errors = [];

    // Required fields
    if (!bookingData.date) errors.push('Date is required');
    if (!bookingData.startTime) errors.push('Start time is required');
    if (!bookingData.endTime) errors.push('End time is required');
    if (!bookingData.guestCount) errors.push('Guest count is required');
    if (!bookingData.tableId) errors.push('Table selection is required');

    // Date validation
    const dateValidation = this.isValidDate(bookingData.date);
    if (!dateValidation.isValid) {
      errors.push('Booking date cannot be in the past');
    }

    // Time validation
    if (bookingData.startTime && !this.isValidTime(bookingData.startTime)) {
      errors.push('Invalid start time format');
    }
    if (bookingData.endTime && !this.isValidTime(bookingData.endTime)) {
      errors.push('Invalid end time format');
    }

    // Guest count validation
    if (bookingData.guestCount) {
      const guestValidation = this.isValidGuestCount(bookingData.guestCount);
      if (!guestValidation.isValid) {
        if (guestValidation.isTooSmall) errors.push('Guest count must be at least 1');
        if (guestValidation.isTooLarge) errors.push('Guest count exceeds maximum capacity');
        if (guestValidation.isNotNumber) errors.push('Guest count must be a number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Restaurant profile validation
  static validateRestaurantProfile(profileData) {
    const errors = [];

    // Name validation
    if (profileData.restaurantName) {
      const nameValidation = this.isValidRestaurantName(profileData.restaurantName);
      if (!nameValidation.isValid) {
        if (nameValidation.isTooShort) errors.push('Restaurant name is too short');
        if (nameValidation.isTooLong) errors.push('Restaurant name is too long');
        if (nameValidation.hasInvalidChars) errors.push('Restaurant name contains invalid characters');
      }
    }

    // Address validation
    if (profileData.location?.address) {
      const addressValidation = this.isValidAddress(profileData.location.address);
      if (!addressValidation.isValid) {
        if (addressValidation.isTooShort) errors.push('Address is too short');
        if (addressValidation.isTooLong) errors.push('Address is too long');
      }
    }

    // Contact number validation
    if (profileData.contactNumber) {
      if (!this.isValidPhone(profileData.contactNumber)) {
        errors.push('Invalid phone number format');
      }
    }

    // Opening hours validation
    if (profileData.openingHours) {
      const hoursValidation = this.isValidOpeningHours(profileData.openingHours);
      if (!hoursValidation.isValid) {
        errors.push(hoursValidation.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // User registration validation
  static validateUserRegistration(userData) {
    const errors = [];

    // Email validation
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email address is required');
    }

    // Name validation
    if (!userData.firstName || userData.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    }
    if (!userData.lastName || userData.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    // Phone validation
    if (!userData.contactNumber || !this.isValidPhone(userData.contactNumber)) {
      errors.push('Valid phone number is required');
    }

    // Password validation
    if (userData.password) {
      const passwordValidation = this.isValidPassword(userData.password);
      if (!passwordValidation.isValid) {
        if (passwordValidation.errors.tooShort) errors.push('Password must be at least 8 characters');
        if (passwordValidation.errors.noUpperCase) errors.push('Password must contain uppercase letter');
        if (passwordValidation.errors.noLowerCase) errors.push('Password must contain lowercase letter');
        if (passwordValidation.errors.noNumbers) errors.push('Password must contain a number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize input
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests = 5, windowMs = 60000) {
    const requests = new Map();
    
    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      for (const [key, timestamp] of requests.entries()) {
        if (timestamp < windowStart) {
          requests.delete(key);
        }
      }
      
      // Check current requests
      const currentRequests = requests.get(identifier) || 0;
      
      if (currentRequests >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      requests.set(identifier, now);
      return true; // Request allowed
    };
  }
}

// Export the class and common validation functions
export default ValidationUtils;

// Convenience exports for common validations
export const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidDate,
  isValidTime,
  isValidGuestCount,
  validateBooking,
  validateRestaurantProfile,
  validateUserRegistration,
  sanitizeInput
} = ValidationUtils; 