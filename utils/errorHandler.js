// Centralized error handling utility
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  // Handle API errors
  handleApiError(error, context = '') {
    const errorInfo = {
      message: error.message || 'Unknown error occurred',
      status: error.status || 500,
      context,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    this.logError(errorInfo);

    // Return user-friendly error message
    return {
      error: true,
      message: this.getUserFriendlyMessage(errorInfo),
      details: process.env.NODE_ENV === 'development' ? errorInfo : undefined
    };
  }

  // Handle 3D scene errors
  handleSceneError(error, component = '') {
    const errorInfo = {
      message: error.message || '3D scene error occurred',
      type: 'scene',
      component,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    this.logError(errorInfo);

    // Provide recovery suggestions
    const suggestions = this.getSceneErrorSuggestions(errorInfo);
    
    return {
      error: true,
      message: '3D scene encountered an issue. Please refresh the page.',
      suggestions,
      details: process.env.NODE_ENV === 'development' ? errorInfo : undefined
    };
  }

  // Handle validation errors
  handleValidationError(errors, context = '') {
    const errorInfo = {
      message: 'Validation failed',
      type: 'validation',
      context,
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      error: true,
      message: 'Please check your input and try again.',
      fieldErrors: this.formatValidationErrors(errors),
      details: process.env.NODE_ENV === 'development' ? errorInfo : undefined
    };
  }

  // Handle network errors
  handleNetworkError(error, endpoint = '') {
    const errorInfo = {
      message: error.message || 'Network error occurred',
      type: 'network',
      endpoint,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    return {
      error: true,
      message: 'Connection issue. Please check your internet and try again.',
      retry: true,
      details: process.env.NODE_ENV === 'development' ? errorInfo : undefined
    };
  }

  // Log error for debugging
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error logged:', errorInfo);
    }
  }

  // Get user-friendly error messages
  getUserFriendlyMessage(errorInfo) {
    const { message, status } = errorInfo;

    // Common error patterns
    if (message.includes('Unauthorized') || status === 401) {
      return 'Please log in to continue.';
    }
    
    if (message.includes('Forbidden') || status === 403) {
      return 'You don\'t have permission to perform this action.';
    }
    
    if (message.includes('Not Found') || status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (message.includes('Validation') || status === 400) {
      return 'Please check your input and try again.';
    }
    
    if (status >= 500) {
      return 'Server error. Please try again later.';
    }

    return message || 'An unexpected error occurred.';
  }

  // Format validation errors for display
  formatValidationErrors(errors) {
    if (!Array.isArray(errors)) {
      return { general: errors };
    }

    const formatted = {};
    errors.forEach(error => {
      if (error.field) {
        formatted[error.field] = error.message;
      } else {
        formatted.general = error.message;
      }
    });

    return formatted;
  }

  // Get scene error recovery suggestions
  getSceneErrorSuggestions(errorInfo) {
    const suggestions = [];

    if (errorInfo.message.includes('WebGL')) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check if your browser supports WebGL');
      suggestions.push('Try using a different browser');
    }

    if (errorInfo.message.includes('memory')) {
      suggestions.push('Close other browser tabs');
      suggestions.push('Refresh the page');
      suggestions.push('Try again in a few minutes');
    }

    if (errorInfo.message.includes('context')) {
      suggestions.push('Refresh the page');
      suggestions.push('Try using a different browser');
    }

    return suggestions.length > 0 ? suggestions : ['Please refresh the page and try again'];
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      byContext: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      // Count by type
      const type = error.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by context
      if (error.context) {
        stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
      }
    });

    return stats;
  }

  // Clear error log
  clearLog() {
    this.errorLog = [];
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export both the class and instance
export { ErrorHandler, errorHandler };

// Convenience functions for common error types
export const handleApiError = (error, context) => errorHandler.handleApiError(error, context);
export const handleSceneError = (error, component) => errorHandler.handleSceneError(error, component);
export const handleValidationError = (errors, context) => errorHandler.handleValidationError(errors, context);
export const handleNetworkError = (error, endpoint) => errorHandler.handleNetworkError(error, endpoint); 