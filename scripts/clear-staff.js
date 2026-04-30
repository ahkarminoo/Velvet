// Script to clear existing staff records that might have old schema
import dbConnect from '../lib/mongodb.js';
import mongoose from 'mongoose';

async function clearStaff() {
  try {
    await dbConnect();
    
    // Drop the staff collection to remove any schema conflicts
    const db = mongoose.connection.db;
    
    try {
      await db.collection('staffs').drop();
      console.log('✅ Dropped existing staff collection');
    } catch (error) {
      if (error.code === 26) {
        console.log('ℹ️ Staff collection does not exist, nothing to drop');
      } else {
        console.log('⚠️ Error dropping collection:', error.message);
      }
    }
    
    console.log('✅ Staff collection cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing staff collection:', error);
    process.exit(1);
  }
}

clearStaff();
