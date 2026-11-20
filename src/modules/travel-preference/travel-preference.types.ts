
export type TravelPreferenceType = "regular" | "one-time";

export type DayOfWeek =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type TravelPreferenceStatus =
  | "interested"
  | "canceled"
  | "confirmed";

export interface ITravelPreference {
  type: TravelPreferenceType;

  origin: string;
  destination: string;

  preferredTime: string;

  date?: Date;
  dayOfWeek?: DayOfWeek;

  status: TravelPreferenceStatus;

  creatorUserId: string;
}
