import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to .env.local to enable database features.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

// Helper function to get MongoDB client for sessions
async function getMongoClient() {
  const mongoose = await dbConnect();
  return mongoose.connection.getClient();
}

// Helper function to start a session
async function startSession() {
  const client = await getMongoClient();
  return client.startSession();
}

export default dbConnect;
export { startSession };
