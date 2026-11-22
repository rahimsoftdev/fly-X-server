import Opportunity from "../opportunity/opportunity.model.js";
import TravelPreference from "../travel-preference/travel-preference.model.js";
import type {
  IDashboardResponse,
  IHighDemandRoute,
  IPopularDate,
  IUpcomingTrip,
} from "./dashboard.types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// date string হিসেবে সেভ থাকলেও crash করবে না
const toDateStage = {
  $addFields: {
    dateObj: {
      $convert: { input: "$date", to: "date", onError: null, onNull: null },
    },
  },
};

// ---------- Stats ----------
const getStats = async (userId: string, now: Date) => {
  const [travelOpportunities, pendingReservations, upcomingTrips] =
    await Promise.all([
      Opportunity.countDocuments({
        status: "open",
        preferredDeparture: { $gte: now },
      }),
      Opportunity.countDocuments({
        passengers: userId,
        status: "open",
      }),
      Opportunity.countDocuments({
        passengers: userId,
        status: "confirmed",
        preferredDeparture: { $gte: now },
      }),
    ]);

  return { travelOpportunities, pendingReservations, upcomingTrips };
};

// ---------- High-Demand Routes ----------
const getHighDemandRoutes = async (now: Date): Promise<IHighDemandRoute[]> => {
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const last60 = new Date(now.getTime() - 60 * DAY_MS);

  const rows = await TravelPreference.aggregate<{
    _id: {
      origin: string;
      destination: string;
      dayOfWeek: string;
      preferredTime: string;
    };
    total: number;
    recent: number;
    previous: number;
  }>([
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
    const growth =
      r.previous > 0
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
const getPopularDates = async (now: Date): Promise<IPopularDate[]> => {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const rows = await TravelPreference.aggregate<{
    _id: string;
    routes: string[];
    users: string[];
  }>([
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

// ---------- Upcoming Trips (user-এর নিজের preference) ----------
const getUpcomingTripList = async (
  userId: string,
  now: Date
): Promise<IUpcomingTrip[]> => {
  const rows = await TravelPreference.aggregate<{
    _id: unknown;
    origin: string;
    destination: string;
    type: "regular" | "one-time";
    dayOfWeek?: string;
    dateObj: Date | null;
    preferredTime: string;
  }>([
    { $match: { creatorUserId: userId, status: { $ne: "canceled" } } },
    toDateStage,
    {
      $match: {
        $or: [{ type: "regular" }, { dateObj: { $gte: now } }],
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
  ]);

  return rows.map((r) => ({
    id: String(r._id),
    origin: r.origin,
    destination: r.destination,
    type: r.type,
    dayOfWeek: r.dayOfWeek ?? null,
    date: r.dateObj ? r.dateObj.toISOString() : null,
    preferredTime: r.preferredTime,
  }));
};

// ---------- Main ----------
export const getDashboardOverview = async (
  userId: string,
  userName: string
): Promise<IDashboardResponse> => {
  const now = new Date();

  const [stats, highDemandRoutes, popularDates, upcomingTrips] =
    await Promise.all([
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