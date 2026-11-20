
export type TravelType = "one-way" | "two-way";

export type CustomTravelRequestStatus =
  | "interested"
  | "confirmed";

export interface IPassengerInformation {
  firstName: string;
  lastName: string;
  streetAddress: string;
  zipCode: string;
  email: string;
  phone: string;
}

export interface ICustomTravelRequest {
  type: TravelType;

  origin: string;
  destination: string;

  returnOrigin?: string;
  returnDestination?: string;
  returnDate?: Date;

  preferredDeparture: Date;

  specialRequests?: string;

  passengers: IPassengerInformation[];

  status: CustomTravelRequestStatus;

  creatorUserId: string;
}
