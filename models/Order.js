import mongoose from "mongoose";

export const ORDER_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];
export const PAYMENT_METHODS = ["bkash_nagad", "cod"];
export const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid", "rejected"];

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    user: { type: String, index: true, default: null }, // Better Auth user id (null for guests)
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    billing: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      company: { type: String, trim: true, default: "" },
      country: { type: String, default: "Bangladesh" },
      address: { type: String, required: true, trim: true },
      apartment: { type: String, trim: true, default: "" },
      city: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      postcode: { type: String, trim: true, default: "" },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true, default: "" },
    },
    shipToDifferentAddress: { type: Boolean, default: false },
    shipping: {
      firstName: String,
      lastName: String,
      address: String,
      apartment: String,
      city: String,
      district: String,
      postcode: String,
      phone: String,
    },
    notes: { type: String, default: "", maxlength: 1000 },
    shippingZone: { type: String, enum: ["dhaka", "chattogram", "others"], required: true },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    payment: {
      senderNumber: String,
      transactionId: String,
      verifiedAt: Date,
      verifiedBy: String,
    },
    status: { type: String, enum: ORDER_STATUSES, default: "Pending", index: true },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `BC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }
  next();
});

export default mongoose.model("Order", orderSchema);
