
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(MONGODB_URI);

const db = client.db();

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) return db;

    await client.connect();
    await db.command({ ping: 1 });

    isConnected = true;

    console.log("MongoDB connected successfully");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export { client, db, connectDB };
