import User from "./user.model.js";
import type { IUserListResponse } from "./user.types.js";

interface UserRow {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export const getAllUsers = async (
  page: number,
  limit: number
): Promise<IUserListResponse> => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    User.find()
      .select("name email phone address city state zipCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<UserRow[]>(),
    User.countDocuments(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: rows.map((r) => ({
      id: String(r._id),
      name: r.name,
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

export const getTotalUserCount = async (): Promise<number> => {
  return User.countDocuments();
};