import { model, Schema } from "mongoose";
const travelPreferenceSchema = new Schema({
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
        required: function () {
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
        required: function () {
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
}, {
    timestamps: true,
});
const TravelPreference = model("TravelPreference", travelPreferenceSchema);
export default TravelPreference;
//# sourceMappingURL=travel-preference.model.js.map