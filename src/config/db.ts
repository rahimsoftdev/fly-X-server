
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(MONGODB_URI);

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) {
      console.log("MongoDB already connected");
      return client;
    }

    await client.connect();

    await client.db().command({ ping: 1 });

    isConnected = true;

    console.log("MongoDB connected successfully");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export { client, connectDB };
