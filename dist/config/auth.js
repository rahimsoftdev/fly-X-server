import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { db } from "./db.js";
export const auth = betterAuth({
    database: mongodbAdapter(db),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.CLIENT_URL],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
    },
    user: {
        additionalFields: {
            firstName: {
                type: "string",
                required: true,
            },
            lastName: {
                type: "string",
                required: true,
            },
            address: {
                type: "string",
                required: true,
            },
            zipCode: {
                type: "string",
                required: true,
            },
            city: {
                type: "string",
                required: true,
            },
            state: {
                type: "string",
                required: true,
            },
            phone: {
                type: "string",
                required: true,
            },
            role: {
                type: ["user", "staff", "admin"],
                required: false,
                defaultValue: "user",
                input: false,
            },
        },
    },
    plugins: [
        jwt(),
    ],
});
//# sourceMappingURL=auth.js.map