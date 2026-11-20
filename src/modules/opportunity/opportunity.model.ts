
import { model, Schema } from "mongoose";
import type { IOpportunity } from "./opportunity.types.js";

const opportunitySchema = new Schema<IOpportunity>(
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
      required: function (this: IOpportunity) {
        return this.type === "two-way";
      },
    },

    returnDestination: {
      type: String,
      required: function (this: IOpportunity) {
        return this.type === "two-way";
      },
    },

    returnDate: {
      type: Date,
      required: function (this: IOpportunity) {
        return this.type === "two-way";
      },
    },

    preferredDeparture: {
      type: Date,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    aircraftType: {
      type: String,
      required: true,
      trim: true,
    },

    totalCapacity: {
      type: Number,
      required: true,
      min: 1,
    },

    bookingSpeed: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "open", "confirmed", "completed"],
      default: "draft",
    },

    creatorUserId: {
      type: String,
      required: true,
      index: true,
    },

    passengers: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Opportunity = model<IOpportunity>(
  "Opportunity",
  opportunitySchema
);
opportunitySchema.index({ passengers: 1 });
export default Opportunity;
