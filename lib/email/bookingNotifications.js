import transporter from './transporter.js';
import { bookingConfirmationTemplate, bookingCancellationTemplate } from './templates.js';

/**
 * Send booking confirmation email to customer
 * @param {Object} bookingData - Booking information
 * @returns {Promise<Object>} - Result object with success status
 */
export async function sendBookingConfirmationEmail(bookingData) {
  try {
    console.log('Sending booking confirmation email to:', bookingData.customerEmail);
    
    // Fetch restaurant menu images if not provided
    if (!bookingData.menuImages && bookingData.restaurantId) {
      try {
        const Restaurant = (await import('@/models/Restaurants')).default;
        const restaurant = await Restaurant.findById(bookingData.restaurantId);
        if (restaurant && restaurant.images && restaurant.images.menu) {
          bookingData.menuImages = restaurant.images.menu;
        }
      } catch (error) {
        console.error('Error fetching restaurant menu images:', error);
      }
    }
    
    const emailTemplate = bookingConfirmationTemplate(bookingData);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: bookingData.customerEmail,
      subject: `🎉 Booking Confirmed - ${bookingData.restaurantName}`,
      html: emailTemplate,
      // Add text version for email clients that don't support HTML
      text: `
        Booking Confirmed!
        
        Dear ${bookingData.customerName},
        
        Your reservation has been confirmed by ${bookingData.restaurantName}.
        
        Booking Details:
        - Date: ${new Date(bookingData.date).toLocaleDateString()}
        - Time: ${bookingData.startTime} - ${bookingData.endTime}
        - Guests: ${bookingData.guestCount}
        - Table: ${bookingData.tableId}
        - Reference: ${bookingData.bookingRef}
        - Booked On: ${new Date(bookingData.createdAt).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        
        ${bookingData.menuImages && bookingData.menuImages.length > 0 ? `
        Menu: Check the HTML version of this email to view our menu images!
        ` : ''}
        
        We look forward to serving you!
        
        Best regards,
        ${bookingData.restaurantName} Team
        (Sent via FoodLoft)
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent successfully:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId,
      email: bookingData.customerEmail
    };
  } catch (error) {
    console.error('Booking confirmation email failed:', error);
    return { 
      success: false, 
      error: error.message,
      email: bookingData.customerEmail
    };
  }
}

/**
 * Send booking cancellation email to customer
 * @param {Object} bookingData - Booking information
 * @returns {Promise<Object>} - Result object with success status
 */
export async function sendBookingCancellationEmail(bookingData) {
  try {
    console.log('Sending booking cancellation email to:', bookingData.customerEmail);
    
    const emailTemplate = bookingCancellationTemplate(bookingData);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: bookingData.customerEmail,
      subject: `❌ Booking Cancelled - ${bookingData.restaurantName}`,
      html: emailTemplate,
      // Add text version for email clients that don't support HTML
      text: `
        Booking Cancelled
        
        Dear ${bookingData.customerName},
        
        We regret to inform you that your reservation at ${bookingData.restaurantName} has been cancelled.
        
        Cancelled Booking Details:
        - Date: ${new Date(bookingData.date).toLocaleDateString()}
        - Time: ${bookingData.startTime} - ${bookingData.endTime}
        - Reference: ${bookingData.bookingRef}
        - Booked On: ${new Date(bookingData.createdAt).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        
        We apologize for any inconvenience. If you would like to make a new reservation, please contact us.
        
        Best regards,
        ${bookingData.restaurantName} Team
        (Sent via FoodLoft)
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Booking cancellation email sent successfully:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId,
      email: bookingData.customerEmail
    };
  } catch (error) {
    console.error('Booking cancellation email failed:', error);
    return { 
      success: false, 
      error: error.message,
      email: bookingData.customerEmail
    };
  }
}

/**
 * Send email notification based on booking status change
 * @param {Object} bookingData - Booking information
 * @param {string} newStatus - New booking status
 * @param {string} previousStatus - Previous booking status
 * @returns {Promise<Object>} - Result object with success status
 */
export async function sendBookingStatusNotification(bookingData, newStatus, previousStatus) {
  // Only send emails for specific status changes
  if (previousStatus === 'pending' && newStatus === 'confirmed') {
    return await sendBookingConfirmationEmail(bookingData);
  } else if (previousStatus === 'pending' && newStatus === 'cancelled') {
    return await sendBookingCancellationEmail(bookingData);
  } else if (previousStatus === 'confirmed' && newStatus === 'cancelled') {
    return await sendBookingCancellationEmail(bookingData);
  }
  
  // No email needed for other status changes
  return { 
    success: true, 
    message: 'No email notification required for this status change',
    newStatus,
    previousStatus
  };
}
