export interface IHighDemandRoute {
  origin: string;
  destination: string;
  dayOfWeek: string;
  preferredTime: string;
  growth: number; // শতাংশ, কমলে ঋণাত্মক
}

export interface IPopularDate {
  date: string; // "2026-06-15"
  routes: number;
  members: number;
}

export interface IUpcomingTrip {
  id: string;
  source: "opportunity" | "custom"; // কোন collection থেকে এসেছে
  type: "one-way" | "two-way";
  origin: string;
  destination: string;
  departure: string; // ISO date
  returnDate: string | null; // শুধু two-way হলে থাকবে
  status: string;
}

export interface IDashboardResponse {
  user: { name: string };
  stats: {
    travelOpportunities: number;
    pendingReservations: number;
    upcomingTrips: number;
  };
  highDemandRoutes: IHighDemandRoute[];
  popularDates: IPopularDate[];
  upcomingTrips: IUpcomingTrip[];
}