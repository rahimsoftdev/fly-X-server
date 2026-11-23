import { model, Schema } from "mongoose";
import type { IUser } from "./user.types.js";

const userSchema = new Schema<IUser>(
  {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    role: String,
    createdAt: Date,
  },
  {
    // Better Auth নিজেই এই collection বানায়, mongoose যেন নতুন না বানায়
    collection: "user",
    timestamps: false,
    versionKey: false,
  }
);

const User = model<IUser>("User", userSchema);

export default User;