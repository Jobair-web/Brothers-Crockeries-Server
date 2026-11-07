import mongoose from "mongoose";
import { slugify, randomSuffix } from "../utils/slugify.js";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: String,
    provider: { type: String, enum: ["cloudinary", "imagekit", "external"], default: "external" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: "", maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: String, trim: true, default: "" },
    images: { type: [imageSchema], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

productSchema.pre("validate", async function (next) {
  if (!this.slug) {
    const base = slugify(this.title) || "product";
    const exists = await this.constructor.exists({ slug: base });
    this.slug = exists ? `${base}-${randomSuffix()}` : base;
  }
  next();
});

export default mongoose.model("Product", productSchema);
