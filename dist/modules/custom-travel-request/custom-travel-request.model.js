import { model, Schema } from "mongoose";
const passengerSchema = new Schema({
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
}, { _id: false });
const customTravelRequestSchema = new Schema({
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
        required: function () {
            return this.type === "two-way";
        },
    },
    returnDestination: {
        type: String,
        required: function () {
            return this.type === "two-way";
        },
    },
    returnDate: {
        type: Date,
        required: function () {
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
}, {
    timestamps: true,
});
const CustomTravelRequest = model("CustomTravelRequest", customTravelRequestSchema);
export default CustomTravelRequest;
customTravelRequestSchema.index({ status: 1, preferredDeparture: 1 });
//# sourceMappingURL=custom-travel-request.model.js.map