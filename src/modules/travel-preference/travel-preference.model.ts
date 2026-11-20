
import { model, Schema } from "mongoose";
import type { ITravelPreference } from "./travel-preference.types.js";

const travelPreferenceSchema = new Schema<ITravelPreference>(
    {
        type: {
            type: String,
            enum: ["regular", "one-time"],
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

        preferredTime: {
            type: String,
            required: true,
        },

        date: {
            type: Date,
            required: function (this: ITravelPreference) {
                return this.type === "one-time";
            },
        },

        dayOfWeek: {
            type: String,
            enum: [
                "saturday",
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
            ],
            required: function (this: ITravelPreference) {
                return this.type === "regular";
            },
        },

        status: {
            type: String,
            enum: ["interested", "canceled", "confirmed"],
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

const TravelPreference = model<ITravelPreference>(
    "TravelPreference",
    travelPreferenceSchema
);

export default TravelPreference;
