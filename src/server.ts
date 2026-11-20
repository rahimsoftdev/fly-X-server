
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import dns from "node:dns/promises";
import connectMongoose from "./config/mongoose.js";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectMongoose();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
