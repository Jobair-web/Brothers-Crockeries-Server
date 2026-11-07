import mongoose from "mongoose";

/**
 * Better Auth owns the `user` collection (created from the Next.js app).
 * This model maps onto the same collection so the admin API can list and manage users.
 */
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    image: String,
    phone: String,
    emailVerified: Boolean,
    role: { type: String, default: "user" },
  },
  { collection: "user", strict: false, timestamps: false }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
