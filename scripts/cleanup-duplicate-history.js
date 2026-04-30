import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

// Check if MONGODB_URI is available before importing other modules
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('Please make sure you have a .env file with your MongoDB connection string');
  console.log('Example: MONGODB_URI=mongodb://localhost:27017/your-database');
  process.exit(1);
}

async function cleanupDuplicateHistory() {
  try {
    // Dynamically import modules after environment variables are loaded
    const { default: dbConnect } = await import('../lib/mongodb.js');
    const { default: Booking } = await import('../models/Booking.js');

    await dbConnect();
    console.log('✅ Connected to database');

    // Find all bookings with history
    const bookings = await Booking.find({ 'history.0': { $exists: true } });
    console.log(`📊 Found ${bookings.length} bookings with history`);

    let cleanedCount = 0;
    let totalRemoved = 0;

    for (const booking of bookings) {
      const originalHistoryLength = booking.history.length;
      const cleanedHistory = [];
      const seenEntries = new Set();

      for (const entry of booking.history) {
        // Create a unique key for each history entry
        const entryKey = `${entry.action}-${entry.timestamp}-${JSON.stringify(entry.details)}`;
        
        if (!seenEntries.has(entryKey)) {
          seenEntries.add(entryKey);
          cleanedHistory.push(entry);
        }
      }

      // If we removed duplicates, update the booking
      if (cleanedHistory.length < originalHistoryLength) {
        booking.history = cleanedHistory;
        await booking.save();
        cleanedCount++;
        totalRemoved += (originalHistoryLength - cleanedHistory.length);
        console.log(`🧹 Cleaned booking ${booking._id}: removed ${originalHistoryLength - cleanedHistory.length} duplicate entries`);
      }
    }

    console.log(`\n🎉 Cleanup completed:`);
    console.log(`- Processed ${bookings.length} bookings`);
    console.log(`- Cleaned ${cleanedCount} bookings`);
    console.log(`- Removed ${totalRemoved} duplicate history entries`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
cleanupDuplicateHistory(); 