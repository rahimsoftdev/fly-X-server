// import { isValidObjectId, Types } from "mongoose";
import { auth } from "../../config/auth.js";
import User from "./user.model.js";
import { isValidObjectId, model, Schema, Types } from "mongoose";
export const getAllUsers = async (page, limit) => {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
        User.find({ role: 'user' })
            .select("name firstName lastName email phone address city state zipCode")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        items: rows.map((r) => ({
            id: String(r._id),
            name: r.name,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            email: r.email,
            address: r.address,
            city: r.city,
            state: r.state,
            zipCode: r.zipCode,
            fullAddress: `${r.address}, ${r.city}, ${r.state} ${r.zipCode}`,
        })),
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        },
    };
};
export const getTotalUserCount = async () => {
    return User.countDocuments();
};
/* ---------- Update (admin) ---------- */
export class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
const EDIT_SELECT = "name firstName lastName email phone address city state zipCode";
const toUpdatedUser = (r) => ({
    id: String(r._id),
    name: r.name,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    email: r.email,
    address: r.address,
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    fullAddress: `${r.address}, ${r.city}, ${r.state} ${r.zipCode}`,
});
export const updateUserById = async (id, input) => {
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid user id");
    }
    const existing = await User.findById(id)
        .select(EDIT_SELECT)
        .lean();
    if (!existing) {
        throw new ApiError(404, "User not found");
    }
    // email বদলালে অন্য কারো email-এর সাথে যেন না মেলে
    if (input.email && input.email !== existing.email) {
        const taken = await User.exists({
            email: input.email,
            _id: { $ne: id },
        });
        if (taken) {
            throw new ApiError(409, "This email is already in use");
        }
    }
    const firstName = input.firstName ?? existing.firstName;
    const lastName = input.lastName ?? existing.lastName;
    // শুধু পাঠানো ফিল্ডই বদলাবে (role কখনোই না)
    const update = {
        ...input,
        name: `${firstName} ${lastName}`.trim(),
        updatedAt: new Date(),
    };
    const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
        .select(EDIT_SELECT)
        .lean();
    if (!updated) {
        throw new ApiError(404, "User not found");
    }
    return toUpdatedUser(updated);
};
// Better Auth-এর session/account collection, শুধু ডিলিটের জন্য
const AuthSession = model("AuthSession", new Schema({}, { strict: false, collection: "session" }));
const AuthAccount = model("AuthAccount", new Schema({}, { strict: false, collection: "account" }));
export const getAllStaff = async (page, limit) => {
    const filter = { role: "staff" };
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
        User.find(filter)
            .select("name phone email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        items: rows.map((r) => ({
            id: String(r._id),
            name: r.name,
            phone: r.phone,
            email: r.email,
        })),
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        },
    };
};
export const deleteStaffById = async (id) => {
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid staff id");
    }
    // শুধু staff ডিলিট করা যাবে, admin বা সাধারণ user না
    const staff = await User.findOne({ _id: id, role: "staff" })
        .select("_id")
        .lean();
    if (!staff) {
        throw new ApiError(404, "Staff not found");
    }
    // userId string বা ObjectId, যেভাবেই সেভ থাকুক ধরা পড়বে
    const ids = [id, new Types.ObjectId(id)];
    // আগে login/session মুছি, শেষে user
    await Promise.all([
        AuthSession.deleteMany({ userId: { $in: ids } }),
        AuthAccount.deleteMany({ userId: { $in: ids } }),
    ]);
    await User.deleteOne({ _id: id });
};
/* ---------- Create staff (admin) ---------- */
const PLACEHOLDER = "N/A";
// "Jane Cooper Smith" -> first: Jane, last: Cooper Smith
const splitName = (name) => {
    const [first = "", ...rest] = name.trim().split(/\s+/);
    return { firstName: first, lastName: rest.join(" ") || PLACEHOLDER };
};
// Better Auth-এর error থেকে status ও বার্তা বের করা
const toApiError = (err) => {
    if (typeof err === "object" && err !== null) {
        const e = err;
        if (typeof e.statusCode === "number") {
            return new ApiError(e.statusCode, typeof e.message === "string" ? e.message : "Failed to create staff");
        }
    }
    return new ApiError(500, "Failed to create staff");
};
export const createStaff = async (input) => {
    const email = input.email.trim().toLowerCase();
    // আগে থেকেই এই email থাকলে সরাসরি 409
    const taken = await User.exists({ email });
    if (taken) {
        throw new ApiError(409, "This email is already in use");
    }
    const { firstName, lastName } = splitName(input.name);
    // Better Auth নিজে পাসওয়ার্ড hash করে user + account বানাবে
    try {
        await auth.api.signUpEmail({
            body: {
                name: input.name.trim(),
                email,
                password: input.password,
                firstName,
                lastName,
                phone: input.phone.trim(),
                address: PLACEHOLDER,
                zipCode: PLACEHOLDER,
                city: PLACEHOLDER,
                state: PLACEHOLDER,
            },
        });
    }
    catch (err) {
        throw toApiError(err);
    }
    // signUp-এ role পাঠানো যায় না (input: false), তাই এখানে বসাই
    const result = await User.updateOne({ email }, { $set: { role: "staff", updatedAt: new Date() } });
    if (result.matchedCount === 0) {
        throw new ApiError(500, "Account created but role could not be set");
    }
    const created = await User.findOne({ email })
        .select("name phone email")
        .lean();
    if (!created) {
        throw new ApiError(500, "Account created but could not be loaded");
    }
    return {
        id: String(created._id),
        name: created.name,
        phone: created.phone,
        email: created.email,
    };
};
//# sourceMappingURL=user.service.js.map