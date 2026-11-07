import mongoose from "mongoose";
import { z } from "zod";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SHIPPING_COST } from "../utils/shipping.js";
import { orderEmail } from "../utils/orderEmail.js";
import { sendMail } from "../utils/mailer.js";


const orderSchema = z
  .object({
    items: z
      .array(z.object({ productId: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid product"), quantity: z.coerce.number().int().min(1).max(50) }))
      .min(1, "Your cart is empty"),
    billing: z.object({
      firstName: z.string().trim().min(1, "First name is required"),
      lastName: z.string().trim().min(1, "Last name is required"),
      company: z.string().trim().optional().default(""),
      country: z.string().trim().default("Bangladesh"),
      address: z.string().trim().min(3, "Street address is required"),
      apartment: z.string().trim().optional().default(""),
      city: z.string().trim().min(2, "Town / City is required"),
      district: z.string().trim().min(2, "District is required"),
      postcode: z.string().trim().optional().default(""),
      phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number"),
      email: z.string().trim().email().optional().or(z.literal("")).default(""),
    }),
    shipping: z
      .object({
        firstName: z.string().trim().min(1, "Shipping first name is required"),
        lastName: z.string().trim().min(1, "Shipping last name is required"),
        address: z.string().trim().min(3, "Shipping street address is required"),
        apartment: z.string().trim().optional().default(""),
        city: z.string().trim().min(2, "Shipping town / city is required"),
        district: z.string().trim().min(2, "Shipping district is required"),
        postcode: z.string().trim().optional().default(""),
        phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid shipping mobile number"),
      })
      .optional(),
    notes: z.string().max(1000).optional().default(""),
    shippingZone: z.enum(["dhaka", "chattogram", "others"]),
    paymentMethod: z.enum(["bkash_nagad", "cod"]),
    payment: z.object({ senderNumber: z.string().trim().optional(), transactionId: z.string().trim().optional() }).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "bkash_nagad") {
      if (!v.payment?.senderNumber) ctx.addIssue({ code: "custom", path: ["payment", "senderNumber"], message: "Enter the bKash/Nagad number you paid from" });
      if (!v.payment?.transactionId) ctx.addIssue({ code: "custom", path: ["payment", "transactionId"], message: "Enter the transaction ID (TrxID)" });
    }
  });

/** Atomically reserve (or release) stock. Returns the reserved lines so callers can roll back. */
async function reserveStock(lines) {
  const done = [];
  try {
    for (const { product, quantity, title } of lines) {
      const res = await Product.updateOne({ _id: product, inStock: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } });
      if (res.modifiedCount !== 1) throw new ApiError(409, `"${title}" does not have enough stock`);
      done.push({ product, quantity });
      await Product.updateOne({ _id: product, stock: { $lte: 0 } }, { inStock: false });
    }
  } catch (err) {
    await releaseStock(done);
    throw err;
  }
}

async function releaseStock(lines) {
  await Promise.all(
    lines.map(({ product, quantity }) => Product.updateOne({ _id: product }, { $inc: { stock: quantity }, $set: { inStock: true } }))
  );
}

/** POST /api/orders – prices are always recalculated on the server. */
export const createOrder = asyncHandler(async (req, res) => {
  const data = orderSchema.parse(req.body);

  const ids = [...new Set(data.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = data.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new ApiError(400, "One of the products in your cart is no longer available");
    return { product: p._id, title: p.title, image: p.images?.[0]?.url, price: p.price, quantity: i.quantity };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const shippingCost = SHIPPING_COST[data.shippingZone];

  await reserveStock(lines);

  try {
    const order = await Order.create({
      user: req.user?.id ?? null,
      items: lines,
      billing: data.billing,
      shipToDifferentAddress: Boolean(data.shipping),
      shipping: data.shipping,
      notes: data.notes,
      shippingZone: data.shippingZone,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === "bkash_nagad" ? "pending_verification" : "unpaid",
      payment: data.paymentMethod === "bkash_nagad" ? data.payment : undefined,
    });
    // Confirmation email is best-effort: it never blocks or fails the order.
    if (order.billing.email) sendMail({ to: order.billing.email, ...orderEmail(order.toObject()) });
    res.status(201).json({ order });
  } catch (err) {
    await releaseStock(lines);
    throw err;
  }
});

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ orders });
});

/** GET /api/orders/:idOrNumber – owner or admin. */
export const getOrder = asyncHandler(async (req, res) => {
  const { idOrNumber } = req.params;
  const query = mongoose.isValidObjectId(idOrNumber) ? { _id: idOrNumber } : { orderNumber: idOrNumber };
  const order = await Order.findOne(query).lean();
  if (!order) throw new ApiError(404, "Order not found");
  if (req.user.role !== "admin" && order.user !== req.user.id) throw new ApiError(403, "You cannot view this order");
  res.json({ order });
});

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderNumber: rx }, { "billing.phone": rx }, { "billing.firstName": rx }, { "billing.lastName": rx }];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const wasCancelled = order.status === "Cancelled";
  const lines = order.items.map((i) => ({ product: i.product, quantity: i.quantity, title: i.title }));
  if (status === "Cancelled" && !wasCancelled) await releaseStock(lines);
  if (status !== "Cancelled" && wasCancelled) await reserveStock(lines);

  order.status = status;
  if (status === "Completed" && order.paymentMethod === "cod") order.paymentStatus = "paid";
  await order.save();
  res.json({ order });
});

/** PATCH /api/orders/:id/payment { action: "verify" | "reject" } */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { action } = req.body ?? {};
  if (!["verify", "reject"].includes(action)) throw new ApiError(400, "action must be 'verify' or 'reject'");
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentMethod !== "bkash_nagad") throw new ApiError(400, "Only bKash/Nagad payments need verification");

  order.paymentStatus = action === "verify" ? "paid" : "rejected";
  order.set("payment.verifiedAt", new Date());
  order.set("payment.verifiedBy", req.user.email);
  if (action === "verify" && order.status === "Pending") order.status = "Processing";
  await order.save();
  res.json({ order });
});

/** GET /api/admin/stats */
export const dashboardStats = asyncHandler(async (req, res) => {
  const [orders, products, users, revenue, pendingOrders, pendingPayments, lowStock, recentOrders] = await Promise.all([
    Order.countDocuments(),
    Product.countDocuments(),
    User.countDocuments(),
    Order.aggregate([{ $match: { status: "Completed" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Order.countDocuments({ status: "Pending" }),
    Order.countDocuments({ paymentStatus: "pending_verification", status: { $ne: "Cancelled" } }),
    Product.countDocuments({ $or: [{ inStock: false }, { stock: { $lte: 5 } }] }),
    Order.find().sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  res.json({ stats: { orders, products, users, revenue: revenue[0]?.total ?? 0, pendingOrders, pendingPayments, lowStock }, recentOrders });
});
