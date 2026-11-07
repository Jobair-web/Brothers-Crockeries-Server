import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true, index: true }, // Better Auth user id
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

export default mongoose.model("Wishlist", wishlistSchema);
