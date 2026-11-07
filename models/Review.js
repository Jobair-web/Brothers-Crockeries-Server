import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 600 },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
