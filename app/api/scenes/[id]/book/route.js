import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import { createSceneBooking } from '@/lib/bookings/sceneBooking';
import { errorResponseFor } from '@/lib/api/bookingErrorResponse';

/**
 * Auto-create a User document for a first-time Firebase login.
 * Specific to this route — the customer arrives via the public booking flow
 * and may not have a Mongo User record yet, even though they're authed.
 */
async function ensureUserExists(firebaseUid, email) {
  let user = await User.findOne({ firebaseUid });
  if (user) return user;

  try {
    return await User.create({ firebaseUid, email, role: 'customer' });
  } catch (createError) {
    if (createError.code === 11000) {
      // Email collided with an existing User; attach the firebaseUid to that record.
      user = await User.findOne({ email });
      if (user) {
        if (!user.firebaseUid) {
          user.firebaseUid = firebaseUid;
          await user.save();
        }
        return user;
      }
    }
    throw createError;
  }
}

/**
 * Resolve a user for the scene-booking flow. Extends the project's standard
 * auth with two extras specific to this route:
 *   1. Falls back to a `customerToken` cookie if no Authorization header.
 *   2. For Firebase tokens, auto-creates the Mongo User if missing.
 */
async function resolveSceneBookingUser(request) {
  let token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get('customerToken')?.value;
  }
  if (!token) return null;

  if (token.startsWith('line.')) {
    return User.findOne({ lineUserId: token.replace('line.', '') });
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (secret) {
      const { userId } = jwt.verify(token, secret);
      const user = await User.findById(userId);
      if (user) return user;
    }
  } catch {}

  try {
    const { success, firebaseUid, email } = await verifyFirebaseAuth(request);
    if (success) return ensureUserExists(firebaseUid, email);
  } catch {}

  return null;
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const sceneId = await params.id;
    const {
      tableId,
      date,
      startTime,
      endTime,
      durationMinutes,
      guestCount,
      restaurantId,
    } = await request.json();

    const user = await resolveSceneBookingUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking } = await createSceneBooking({
      user,
      sceneId,
      restaurantId,
      tableId,
      date,
      startTime,
      endTime,
      durationMinutes,
      guestCount,
    });

    return NextResponse.json({
      message: 'Booking created successfully. Please wait for restaurant confirmation.',
      booking,
      tableDetails: {
        friendlyId: tableId,
        bookingStatus: 'booked',
        bookingId: booking._id,
      },
    });
  } catch (error) {
    return errorResponseFor(error, { fallbackMessage: 'Booking error', includeDevStack: true });
  }
}
