import { model, Schema } from "mongoose";
const userSchema = new Schema({
    name: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    role: String,
    createdAt: Date,
    updatedAt: Date,
}, {
    // Better Auth নিজেই এই collection বানায়, mongoose যেন নতুন না বানায়
    collection: "user",
    timestamps: false,
    versionKey: false,
});
const User = model("User", userSchema);
export default User;
//# sourceMappingURL=user.model.js.map