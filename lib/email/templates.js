// Email templates for booking notifications

export const bookingConfirmationTemplate = (bookingData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmed - ${bookingData.restaurantName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #FF4F18; font-size: 24px; font-weight: bold; }
        .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .status-badge { background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .foodloft-branding { background: #FF4F18; color: white; padding: 10px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .menu-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .menu-image { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #e9ecef; }
        .menu-image:hover { border-color: #FF4F18; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🍽️ FoodLoft</div>
          <h1 style="color: #FF4F18; margin: 10px 0;">🎉 Booking Confirmed!</h1>
        </div>
        
        <p>Dear <strong>${bookingData.customerName}</strong>,</p>
        
        <p>Great news! Your reservation has been confirmed by <strong>${bookingData.restaurantName}</strong>.</p>
        
        <div class="booking-details">
          <h3 style="color: #FF4F18; margin-top: 0;">📋 Booking Details</h3>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value"><span class="status-badge">CONFIRMED</span></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Restaurant:</span>
            <span class="detail-value">${bookingData.restaurantName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date(bookingData.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${bookingData.startTime} - ${bookingData.endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guests:</span>
            <span class="detail-value">${bookingData.guestCount} ${bookingData.guestCount === 1 ? 'person' : 'people'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Table:</span>
            <span class="detail-value">${bookingData.tableId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reference:</span>
            <span class="detail-value"><strong>${bookingData.bookingRef}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Booked On:</span>
            <span class="detail-value">${new Date(bookingData.createdAt).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
        
        ${bookingData.menuImages && bookingData.menuImages.length > 0 ? `
        <div class="menu-section">
          <h3 style="color: #FF4F18; margin-top: 0; text-align: center;">🍽️ Our Menu</h3>
          <p style="text-align: center; color: #666; margin-bottom: 0;">Take a look at our delicious offerings</p>
          <div class="menu-grid">
            ${bookingData.menuImages.map((imageUrl, index) => `
              <div style="text-align: center;">
                <img src="${imageUrl}" alt="Menu Page ${index + 1}" class="menu-image" />
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Page ${index + 1}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;"><strong>💡 Important:</strong> Please arrive on time for your reservation. If you need to make any changes, please contact the restaurant directly.</p>
        </div>
        
        <p>We look forward to serving you! If you have any questions, please don't hesitate to contact us.</p>
        
        <div class="foodloft-branding">
          <p style="margin: 0; font-weight: bold;">Powered by FoodLoft</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Your trusted restaurant booking platform</p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br>
          <strong>${bookingData.restaurantName}</strong> Team</p>
          <p style="font-size: 12px; color: #999;">
            This email was sent via FoodLoft. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const bookingCancellationTemplate = (bookingData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Cancelled - ${bookingData.restaurantName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #FF4F18; font-size: 24px; font-weight: bold; }
        .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .status-badge { background: #dc3545; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .foodloft-branding { background: #FF4F18; color: white; padding: 10px; border-radius: 8px; margin: 20px 0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🍽️ FoodLoft</div>
          <h1 style="color: #FF4F18; margin: 10px 0;">❌ Booking Cancelled</h1>
        </div>
        
        <p>Dear <strong>${bookingData.customerName}</strong>,</p>
        
        <p>We regret to inform you that your reservation at <strong>${bookingData.restaurantName}</strong> has been cancelled.</p>
        
        <div class="booking-details">
          <h3 style="color: #FF4F18; margin-top: 0;">📋 Cancelled Booking Details</h3>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value"><span class="status-badge">CANCELLED</span></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Restaurant:</span>
            <span class="detail-value">${bookingData.restaurantName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date(bookingData.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${bookingData.startTime} - ${bookingData.endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reference:</span>
            <span class="detail-value"><strong>${bookingData.bookingRef}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Booked On:</span>
            <span class="detail-value">${new Date(bookingData.createdAt).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>💡 Note:</strong> If you would like to make a new reservation, please visit our website or contact the restaurant directly.</p>
        </div>
        
        <p>We apologize for any inconvenience. Thank you for your understanding.</p>
        
        <div class="foodloft-branding">
          <p style="margin: 0; font-weight: bold;">Powered by FoodLoft</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Your trusted restaurant booking platform</p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br>
          <strong>${bookingData.restaurantName}</strong> Team</p>
          <p style="font-size: 12px; color: #999;">
            This email was sent via FoodLoft. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
