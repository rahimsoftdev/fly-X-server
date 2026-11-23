import mongoose from "mongoose";
// better-auth-er default user collection-er nam "user".
// Apnar auth config e onno nam dile ekhane bodle nin.
const USER_COLLECTION = "user";
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
// creatorUserId (string) diye better-auth-er user collection theke name/email ana
export const getMembersByIds = async (ids) => {
    const members = new Map();
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0)
        return members;
    const objectIds = uniqueIds
        .filter((id) => OBJECT_ID_REGEX.test(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    const users = await mongoose.connection
        .collection(USER_COLLECTION)
        .find({
        $or: [{ _id: { $in: objectIds } }, { id: { $in: uniqueIds } }],
    })
        .project({ name: 1, email: 1, id: 1 })
        .toArray();
    for (const user of users) {
        const info = {
            id: String(user.id ?? user._id),
            name: String(user.name ?? ""),
            email: String(user.email ?? ""),
        };
        members.set(String(user._id), info);
        if (user.id)
            members.set(String(user.id), info);
    }
    return members;
};
// Request gulor sathe "member" (name + email) jure dey. User na pele member: null
export const attachMembers = async (items) => {
    const members = await getMembersByIds(items.map((item) => item.creatorUserId));
    return items.map((item) => ({
        ...item,
        member: members.get(item.creatorUserId) ?? null,
    }));
};
//# sourceMappingURL=member-lookup.util.js.map