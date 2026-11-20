
import type { TravelType } from "../custom-travel-request/custom-travel-request.types.js";

export type OpportunityStatus =
  | "draft"
  | "open"
  | "confirmed"
  | "completed";

export interface IOpportunity {
  type: TravelType;

  origin: string;
  destination: string;

  returnOrigin?: string;
  returnDestination?: string;
  returnDate?: Date;

  preferredDeparture: Date;

  price: number;

  aircraftType: string;

  totalCapacity: number;

  bookingSpeed: string;

  status: OpportunityStatus;

  creatorUserId: string;

  passengers: string[];
}
