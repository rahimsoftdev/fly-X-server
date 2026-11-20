import type { HydratedDocument } from "mongoose";
import { model, Schema } from "mongoose";
import type {
    ICustomTravelRequest,
    IPassengerInformation,
} from "./custom-travel-request.types.js";
type CustomTravelRequestDocument =
  HydratedDocument<ICustomTravelRequest>;

const passengerSchema = new Schema<IPassengerInformation>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        streetAddress: {
            type: String,
            required: true,
            trim: true,
        },
        zipCode: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const customTravelRequestSchema =
    new Schema<ICustomTravelRequest>(
        {
            type: {
                type: String,
                enum: ["one-way", "two-way"],
                required: true,
            },

            origin: {
                type: String,
                required: true,
                trim: true,
            },
            destination: {
                type: String,
                required: true,
                trim: true,
            },

            returnOrigin: {
                type: String,
                required: function (this: CustomTravelRequestDocument) {
                    return this.type === "two-way";
                },
            },
            returnDestination: {
                type: String,
                required: function (this: CustomTravelRequestDocument) {
                    return this.type === "two-way";
                },
            },
            returnDate: {
                type: Date,
                required: function (this: CustomTravelRequestDocument) {
                    return this.type === "two-way";
                },
            },

            preferredDeparture: {
                type: Date,
                required: true,
            },

            specialRequests: {
                type: String,
                trim: true,
            },

            passengers: {
                type: [passengerSchema],
                default: [],
            },

            status: {
                type: String,
                enum: ["interested", "confirmed"],
                default: "interested",
            },

            creatorUserId: {
                type: String,
                required: true,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );

const CustomTravelRequest = model<ICustomTravelRequest>(
    "CustomTravelRequest",
    customTravelRequestSchema
);

export default CustomTravelRequest;
