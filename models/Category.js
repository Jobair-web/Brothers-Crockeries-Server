import mongoose from "mongoose";
import { slugify, randomSuffix } from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, unique: true, index: true },
    icon: { type: String, default: "package" }, // key understood by the client icon map
    image: { type: String, default: "" },
    isFeatured: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function (next) {
  if (!this.slug) this.slug = slugify(this.name) || `category-${randomSuffix()}`;
  next();
});

export default mongoose.model("Category", categorySchema);
