import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

import dbConnect from '@/lib/mongodb';
import User from '@/models/user';
import Restaurant from '@/models/Restaurants';
import Booking from '@/models/Booking';
import TableLock from '@/models/TableLock';

let replSet;

/**
 * Boot an in-memory MongoDB replica set and connect Mongoose to it via the
 * project's normal dbConnect singleton. Call this once per test file via
 * `setupBookingTestDb()`. Provides automatic teardown and per-test collection
 * clearing.
 *
 * Replica set (rather than single-node) is required because the
 * confirmSoftLock flow uses session.withTransaction.
 */
export function setupBookingTestDb() {
    beforeAll(async () => {
        replSet = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        process.env.MONGODB_URI = replSet.getUri();
        await dbConnect();
    }, 60_000);

    afterEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key of Object.keys(collections)) {
            await collections[key].deleteMany({});
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
        if (replSet) await replSet.stop();
        if (global.mongoose) {
            global.mongoose.conn = null;
            global.mongoose.promise = null;
        }
    });
}

// ---------- Seed helpers ----------

let seedCounter = 0;
const nextId = () => ++seedCounter;

export async function makeUser(overrides = {}) {
    const n = nextId();
    return User.create({
        email: `user${n}-${Date.now()}@test.com`,
        firstName: 'Test',
        lastName: `User${n}`,
        contactNumber: '0000000000',
        role: 'customer',
        ...overrides,
    });
}

export async function makeRestaurant(overrides = {}) {
    const owner = overrides.ownerId ?? new mongoose.Types.ObjectId();
    const n = nextId();
    return Restaurant.create({
        ownerId: owner,
        restaurantName: `Test Restaurant ${n}`,
        cuisineType: 'Thai',
        description: 'For testing',
        defaultFloorplanId: new mongoose.Types.ObjectId(),
        ...overrides,
    });
}

/**
 * Insert a confirmed booking directly. Used to set up conflict scenarios.
 * `pricing.finalPrice` is required by the schema.
 */
export async function makeBooking({ restaurantId, userId, tableId, date, startTime, endTime, status = 'confirmed', ...rest }) {
    return Booking.create({
        restaurantId,
        floorplanId: rest.floorplanId ?? new mongoose.Types.ObjectId(),
        userId,
        tableId,
        date,
        startTime,
        endTime,
        status,
        guestCount: 2,
        customerName: 'Existing Customer',
        customerEmail: 'existing@test.com',
        pricing: { finalPrice: 100 },
        ...rest,
    });
}

/**
 * Insert an active TableLock directly (bypassing createSoftLock).
 * Used to test lock-conflict scenarios in createSoftLock tests.
 */
export async function makeTableLock({ restaurantId, userId, tableId, date, startTime, endTime, expiresAt, ...rest }) {
    return TableLock.create({
        lockId: TableLock.generateLockId(),
        restaurantId,
        userId,
        tableId,
        date,
        startTime,
        endTime,
        guestCount: 2,
        expiresAt: expiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
        metadata: {
            customerName: 'Other User',
            customerEmail: 'other@test.com',
            customerPhone: '0000000000',
            pricing: { finalPrice: 100 },
        },
        ...rest,
    });
}
