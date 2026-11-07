import mongoose from "mongoose";
import { z } from "zod";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/slugify.js";
import { deleteImage } from "../config/imageStorage.js";

const PAGE_SIZE = 40;

const SORTS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  "name-asc": { title: 1, _id: 1 },
};

export const withDiscount = (p) => {
  const doc = typeof p.toObject === "function" ? p.toObject() : p;
  const discountPercent =
    doc.originalPrice && doc.originalPrice > doc.price ? Math.round(((doc.originalPrice - doc.price) / doc.originalPrice) * 100) : 0;
  return { ...doc, discountPercent };
};

const productSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).optional().default(""),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional().nullable(),
  category: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid category"),
  brand: z.string().trim().max(80).optional().default(""),
  stock: z.coerce.number().int().min(0).default(0),
  inStock: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().optional().default(false),
  images: z
    .array(z.object({ url: z.string().url(), fileId: z.string().optional(), provider: z.enum(["cloudinary", "imagekit", "external"]).optional() }))
    .max(8)
    .default([]),
});

/** GET /api/products?page&limit&category&search&minPrice&maxPrice&sort&inStock&featured&featuredLast */
export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE, 1), 100);
  const { category, search, sort, inStock, featured, featuredLast } = req.query;

  const base = {};
  if (category) {
    const cat = await Category.findOne({ slug: category }).select("_id").lean();
    if (!cat) {
      return res.json({ products: [], page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false, priceRange: { min: 0, max: 0 } });
    }
    base.category = cat._id;
  }
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    base.$or = [{ title: rx }, { brand: rx }];
  }
  if (inStock === "true") base.inStock = true;
  if (featured === "true") base.isFeatured = true;

  const filter = { ...base };
  const min = Number(req.query.minPrice);
  const max = Number(req.query.maxPrice);
  if (req.query.minPrice !== undefined && Number.isFinite(min)) filter.price = { ...(filter.price || {}), $gte: min };
  if (req.query.maxPrice !== undefined && Number.isFinite(max)) filter.price = { ...(filter.price || {}), $lte: max };

  // Homepage "All Products": normal products first (newest first), featured products at the very end.
  const sortSpec = SORTS[sort] || (featuredLast === "true" ? { isFeatured: 1, createdAt: -1, _id: -1 } : SORTS.newest);

  const [products, total, range] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    Product.aggregate([{ $match: base }, { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }]),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    products: products.map(withDiscount),
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    priceRange: { min: Math.floor(range[0]?.min ?? 0), max: Math.ceil(range[0]?.max ?? 0) },
  });
});

/** GET /api/products/:idOrSlug */
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const product = await Product.findOne(query).populate("category", "name slug").lean();
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ product: withDiscount(product) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  if (!(await Category.exists({ _id: data.category }))) throw new ApiError(400, "Category does not exist");
  const product = await Product.create({ ...data, originalPrice: data.originalPrice ?? undefined });
  await product.populate("category", "name slug");
  res.status(201).json({ product: withDiscount(product) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  if (data.images) {
    const keep = new Set(data.images.map((i) => i.url));
    await Promise.all(product.images.filter((i) => !keep.has(i.url)).map((i) => deleteImage(i)));
  }
  if (data.category && !(await Category.exists({ _id: data.category }))) throw new ApiError(400, "Category does not exist");

  const patch = { ...data };
  if (data.originalPrice === null) patch.originalPrice = undefined; // explicit null clears the field
  product.set(patch);
  await product.save();
  await product.populate("category", "name slug");
  res.json({ product: withDiscount(product) });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  await Promise.all(product.images.map((i) => deleteImage(i)));
  res.json({ message: "Product deleted" });
});