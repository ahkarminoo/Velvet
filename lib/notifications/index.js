/**
 * Unified notification interface.
 *
 * For the demo, all functions are no-op stubs that log what *would* have been sent.
 * The real LINE and SMTP implementations still live in:
 *   - lib/lineNotificationService.js
 *   - lib/email/bookingNotifications.js
 * To wire them back in, replace the bodies below with delegations to those modules.
 *
 * Routes should import notification functions ONLY from this module, never from
 * the channel-specific files directly. That keeps tests free of LINE/SMTP mocks
 * and makes future channel changes a one-file edit.
 */

const STUB_RESULT = (channel, action) => ({
    success: true,
    stubbed: true,
    channel,
    action,
});

function logStub(channel, action, payload) {
    if (process.env.NODE_ENV === 'test') return;
    console.log(`[notifications:${channel}] (stub) ${action}`, {
        bookingRef: payload?.booking?.bookingRef ?? payload?.bookingData?.bookingRef,
        customerEmail: payload?.booking?.customerEmail ?? payload?.bookingData?.customerEmail,
        ...payload?.extra,
    });
}

export async function notifyCustomerOfBookingConfirmation(booking, staff) {
    logStub('line', 'customer-confirmation', { booking, extra: { staffId: staff?._id } });
    return STUB_RESULT('line', 'customer-confirmation');
}

export async function notifyCustomerOfBookingRejection(booking, staff, reason = null) {
    logStub('line', 'customer-rejection', { booking, extra: { staffId: staff?._id, reason } });
    return STUB_RESULT('line', 'customer-rejection');
}

export async function notifyStaffOfNewBooking(booking, restaurantId) {
    logStub('line', 'staff-new-booking', { booking, extra: { restaurantId } });
    return STUB_RESULT('line', 'staff-new-booking');
}

export async function sendBookingStatusNotification(bookingData, newStatus, previousStatus) {
    logStub('email', 'status-change', { bookingData, extra: { newStatus, previousStatus } });
    return STUB_RESULT('email', 'status-change');
}
