import Opportunity from "../opportunity/opportunity.model.js";
import TravelPreference from "../travel-preference/travel-preference.model.js";
const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_LIMIT = 5;
// date string হিসেবে সেভ থাকলেও crash করবে না
const toDateStage = {
    $addFields: {
        dateObj: {
            $convert: { input: "$date", to: "date", onError: null, onNull: null },
        },
    },
};
// ---------- Stats ----------
const getStats = async (userId, now) => {
    const [travelOpportunities, pendingReservations, upcomingTrips] = await Promise.all([
        // open আছে, কিন্তু user এখনো যোগ দেয়নি (যোগ দেওয়ার মতো opportunity)
        Opportunity.countDocuments({
            status: "open",
            // passengers: { $ne: userId },
            // preferredDeparture: { $gte: now },
        }),
        // user-এর id আছে এবং status open (এখনো confirm হয়নি)
        Opportunity.countDocuments({
            passengers: userId,
            status: "open",
        }),
        // user-এর id আছে এবং status confirmed (ভবিষ্যতের trip)
        Opportunity.countDocuments({
            passengers: userId,
            status: "confirmed",
            preferredDeparture: { $gte: now },
        }),
    ]);
    return { travelOpportunities, pendingReservations, upcomingTrips };
};
// ---------- High-Demand Routes ----------
const getHighDemandRoutes = async (now) => {
    const last30 = new Date(now.getTime() - 30 * DAY_MS);
    const last60 = new Date(now.getTime() - 60 * DAY_MS);
    const rows = await TravelPreference.aggregate([
        { $match: { type: "regular", status: { $ne: "canceled" } } },
        {
            $group: {
                _id: {
                    origin: "$origin",
                    destination: "$destination",
                    dayOfWeek: "$dayOfWeek",
                    preferredTime: "$preferredTime",
                },
                total: { $sum: 1 },
                recent: {
                    $sum: { $cond: [{ $gte: ["$createdAt", last30] }, 1, 0] },
                },
                previous: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: ["$createdAt", last60] },
                                    { $lt: ["$createdAt", last30] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { total: -1 } },
        { $limit: 4 },
    ]);
    return rows.map((r) => {
        // আগের ৩০ দিনে 0 হলে ভাগ করা যাবে না
        const growth = r.previous > 0
            ? Math.round(((r.recent - r.previous) / r.previous) * 100)
            : r.recent > 0
                ? 100
                : 0;
        return {
            origin: r._id.origin,
            destination: r._id.destination,
            dayOfWeek: r._id.dayOfWeek,
            preferredTime: r._id.preferredTime,
            growth,
        };
    });
};
// ---------- Popular Travel Dates ----------
const getPopularDates = async (now) => {
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const rows = await TravelPreference.aggregate([
        { $match: { type: "one-time", status: { $ne: "canceled" } } },
        toDateStage,
        { $match: { dateObj: { $gte: todayStart } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateObj" } },
                routes: {
                    $addToSet: { $concat: ["$origin", "->", "$destination"] },
                },
                users: { $addToSet: "$creatorUserId" },
            },
        },
        { $addFields: { memberCount: { $size: "$users" } } },
        { $sort: { memberCount: -1, _id: 1 } },
        { $limit: 4 },
    ]);
    return rows.map((r) => ({
        date: r._id,
        routes: r.routes.length,
        members: r.users.length,
    }));
};
const getUpcomingTripList = async (userId, now) => {
    const rows = await Opportunity.find({
        passengers: userId,
        status: "confirmed",
        preferredDeparture: { $gte: now },
    })
        .select("type origin destination preferredDeparture returnDate status")
        .sort({ preferredDeparture: 1 })
        .limit(UPCOMING_LIMIT)
        .lean();
    return rows.map((r) => ({
        id: String(r._id),
        source: "opportunity",
        type: r.type,
        origin: r.origin,
        destination: r.destination,
        departure: r.preferredDeparture.toISOString(),
        returnDate: r.returnDate ? r.returnDate.toISOString() : null,
        status: r.status,
    }));
};
// ---------- Main ----------
export const getDashboardOverview = async (userId, userName) => {
    const now = new Date();
    const [stats, highDemandRoutes, popularDates, upcomingTrips] = await Promise.all([
        getStats(userId, now),
        getHighDemandRoutes(now),
        getPopularDates(now),
        getUpcomingTripList(userId, now),
    ]);
    return {
        user: { name: userName },
        stats,
        highDemandRoutes,
        popularDates,
        upcomingTrips,
    };
};
//# sourceMappingURL=dashboard.service.js.map