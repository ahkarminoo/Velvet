import mongoose from 'mongoose';
import Restaurant from '../models/Restaurants.js';
import RestaurantOwner from '../models/restaurant-owner.js';
import User from '../models/user.js';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test restaurant owner
    const testOwner = new RestaurantOwner({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      contactNumber: '+1234567890',
      role: 'restaurant-owner'
    });

    await testOwner.save();
    console.log('Test restaurant owner created:', testOwner.email);

    // Create a test restaurant
    const testRestaurant = new Restaurant({
      ownerId: testOwner._id,
      restaurantName: 'Test Restaurant',
      cuisineType: 'Italian',
      location: {
        address: '123 Main St, City, State',
        coordinates: {
          lat: 40.7128,
          lng: -74.0060
        }
      },
      description: 'A wonderful Italian restaurant with great food and atmosphere.',
      contactNumber: '+1234567890',
      openingHours: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00' }
      }
    });

    await testRestaurant.save();
    console.log('Test restaurant created:', testRestaurant.restaurantName);

    // Create a test customer
    const testCustomer = new User({
      email: 'customer@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      contactNumber: '+1234567891',
      role: 'customer'
    });

    await testCustomer.save();
    console.log('Test customer created:', testCustomer.email);

    // Create a test booking
    const testBooking = new Booking({
      restaurantId: testRestaurant._id,
      userId: testCustomer._id,
      customerName: testCustomer.firstName + ' ' + testCustomer.lastName,
      customerEmail: testCustomer.email,
      customerPhone: '+1234567891',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '19:00',
      endTime: '21:00',
      guestCount: 2,
      status: 'confirmed',
      tableId: 't1',
      specialRequests: 'Window seat preferred'
    });

    await testBooking.save();
    console.log('Test booking created:', testBooking.bookingRef);

    console.log('\nTest data created successfully!');
    console.log('You can now login to the admin dashboard and see the test data.');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createTestData();
