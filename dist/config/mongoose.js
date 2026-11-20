import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
}
const connectMongoose = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }
        await mongoose.connect(MONGODB_URI);
        console.log("Mongoose connected successfully");
    }
    catch (error) {
        console.error("Mongoose connection failed:", error);
        throw error;
    }
};
export default connectMongoose;
//# sourceMappingURL=mongoose.js.map