import mongoose from "mongoose";
import Opportunity from "../opportunity/opportunity.model.js";
import TravelPreference from "../travel-preference/travel-preference.model.js";
import type {
    IAdminOverviewResponse,
    IInsightsResponse,
    IPopularRoute,
} from "./analytics.types.js";

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// MongoDB $dayOfWeek: 1 = Sunday ... 7 = Saturday
const MONGO_WEEK_DAYS = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
];

// UI-তে Mon থেকে Sun ক্রমে দেখাবে
const ORDERED_DAYS = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
];

type MonthRow = { _id: number; value: number };

// ১২ মাসই সবসময় return করবে, ডাটা না থাকলে 0
const fillMonths = (rows: MonthRow[]) =>
    MONTHS.map((month, i) => ({
        month,
        value: rows.find((r) => r._id === i + 1)?.value ?? 0,
    }));

const yearRange = (year: number) => ({
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
});

// ---------- Shared: Popular Routes ----------
export const getPopularRoutes = async (limit = 5): Promise<IPopularRoute[]> => {
    const rows = await TravelPreference.aggregate<{
        _id: { origin: string; destination: string };
        count: number;
    }>([
        { $match: { status: { $ne: "canceled" } } },
        {
            $group: {
                _id: { origin: "$origin", destination: "$destination" },
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    // শতাংশ হবে সব route-এর মোটের উপর, শুধু top 5 এর উপর না
    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return rows.slice(0, limit).map((r) => ({
        origin: r._id.origin,
        destination: r._id.destination,
        count: r.count,
        percentage: total ? Math.round((r.count / total) * 100) : 0,
    }));
};

// ---------- Route 1: Insights ----------
const getWeeklyDemand = async () => {
    const rows = await TravelPreference.aggregate<{ _id: string; members: number }>([
        { $match: { status: { $ne: "canceled" } } },
        {
            $addFields: {
                dateObj: {
                    $convert: {
                        input: "$date",
                        to: "date",
                        onError: null,
                        onNull: null,
                    },
                },
            },
        },
        {
            $project: {
                creatorUserId: 1,
                day: {
                    $cond: [
                        { $eq: ["$type", "regular"] },
                        "$dayOfWeek",
                        {
                            $switch: {
                                branches: [
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 1] }, then: "sunday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 2] }, then: "monday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 3] }, then: "tuesday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 4] }, then: "wednesday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 5] }, then: "thursday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 6] }, then: "friday" },
                                    { case: { $eq: [{ $dayOfWeek: "$dateObj" }, 7] }, then: "saturday" },
                                ],
                                default: null,
                            },
                        },
                    ],
                },
            },
        },
        { $match: { day: { $ne: null } } },
        { $group: { _id: "$day", users: { $addToSet: "$creatorUserId" } } },
        { $project: { members: { $size: "$users" } } },
    ]);

    return ORDERED_DAYS.map((day) => ({
        day,
        members: rows.find((r) => r._id === day)?.members ?? 0,
    }));
};

export const getInsights = async (): Promise<IInsightsResponse> => {
    const [totalInterest, scheduledFlights, weeklyDemand, popularRoutes] =
        await Promise.all([
            TravelPreference.countDocuments({ status: "interested" }),
            Opportunity.countDocuments({ status: { $in: ["open", "confirmed"] } }),
            getWeeklyDemand(),
            getPopularRoutes(5),
        ]);

    return { totalInterest, scheduledFlights, weeklyDemand, popularRoutes };
};

// ---------- Route 2: Admin Overview ----------

// better-auth এর user collection (mongoose connection একই DB-তে থাকতে হবে)
const userCollection = () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database is not connected");
    return db.collection("user");
};

const MEMBER_FILTER = { role: { $nin: ["admin", "staff"] } };

const getMembersOverTime = async (start: Date, end: Date) => {
    const users = userCollection();

    const [before, rows] = await Promise.all([
        users.countDocuments({ ...MEMBER_FILTER, createdAt: { $lt: start } }),
        users
            .aggregate([
                { $match: { ...MEMBER_FILTER, createdAt: { $gte: start, $lt: end } } },
                { $group: { _id: { $month: "$createdAt" }, value: { $sum: 1 } } },
            ])
            .toArray() as Promise<MonthRow[]>,
    ]);

    // cumulative: আগের বছর পর্যন্ত মোট + প্রতি মাসে যোগ হওয়া
    let running = before;
    return fillMonths(rows).map((m) => {
        running += m.value;
        return { month: m.month, total: running };
    });
};

const getDailyActivity = async (start: Date, end: Date) => {
    const [opps, reservations, booked] = await Promise.all([
        // মাসে তৈরি হওয়া opportunity
        Opportunity.aggregate<MonthRow>([
            { $match: { createdAt: { $gte: start, $lt: end } } },
            { $group: { _id: { $month: "$createdAt" }, value: { $sum: 1 } } },
        ]),
        // reservation = passengers এর মোট সংখ্যা (opportunity তৈরির মাস ধরে)
        Opportunity.aggregate<MonthRow>([
            { $match: { createdAt: { $gte: start, $lt: end } } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    value: { $sum: { $size: { $ifNull: ["$passengers", []] } } },
                },
            },
        ]),
        // round trip (two-way) + confirmed/completed, departure মাস ধরে
        Opportunity.aggregate<MonthRow>([
            {
                $match: {
                    type: "two-way",
                    status: { $in: ["confirmed", "completed"] },
                    preferredDeparture: { $gte: start, $lt: end },
                },
            },
            { $group: { _id: { $month: "$preferredDeparture" }, value: { $sum: 1 } } },
        ]),
    ]);

    const o = fillMonths(opps);
    const r = fillMonths(reservations);
    const b = fillMonths(booked);

    return MONTHS.map((month, i) => ({
        month,
        opportunities: o[i]?.value ?? 0,
        reservations: r[i]?.value ?? 0,
        flightsBooked: b[i]?.value ?? 0,
    }));
};

const getDemandOverview = async (start: Date, end: Date) => {
    const rows = await TravelPreference.aggregate<{ _id: number; value: number }>([
        {
            $match: {
                status: { $ne: "canceled" },
                createdAt: { $gte: start, $lt: end },
            },
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                users: { $addToSet: "$creatorUserId" },
            },
        },
        { $project: { value: { $size: "$users" } } },
    ]);

    return fillMonths(rows).map((m) => ({ month: m.month, members: m.value }));
};

export const getAdminOverview = async (
    year: number
): Promise<IAdminOverviewResponse> => {
    const { start, end } = yearRange(year);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const users = userCollection();

    const [
        totalMembers,
        staff,
        totalInterestThisMonth,
        membersOverTime,
        dailyActivity,
        demandOverview,
        popularRoutes,
    ] = await Promise.all([
        users.countDocuments(),
        users.countDocuments({ role: "staff" }),
         Opportunity.countDocuments({
            // status: "interested",
            createdAt: { $gte: monthStart },
        }),
        getMembersOverTime(start, end),
        getDailyActivity(start, end),
        getDemandOverview(start, end),
        getPopularRoutes(5),
    ]);

    return {
        year,
        stats: {
            totalMembers,
            staff,
            totalInterestThisMonth,
            totalRevenue: 4500, // TODO: payment model হলে এখানে sum হবে
        },
        membersOverTime,
        dailyActivity,
        demandOverview,
        popularRoutes,
    };
};