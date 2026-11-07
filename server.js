import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { activeProvider } from "./config/imageStorage.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const origins = (process.env.CLIENT_URL || "http://localhost:3000").split(",").map((o) => o.trim());

if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

const limiter = (limit, windowMinutes, message) =>
  rateLimit({ windowMs: windowMinutes * 60_000, limit, standardHeaders: true, legacyHeaders: false, message: { success: false, message } });
const apiLimiter = limiter(600, 15, "Too many requests. Please slow down and try again shortly.");
const orderLimiter = limiter(20, 60, "Too many orders from this connection. Please try again later.");
const reviewLimiter = limiter(10, 60, "Too many reviews submitted. Please try again later.");
const onlyPost = (mw) => (req, res, next) => (req.method === "POST" ? mw(req, res, next) : next());

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, imageProvider: activeProvider() }));
app.use("/api", apiLimiter);
app.use("/api/orders", onlyPost(orderLimiter));
app.use("/api/reviews", onlyPost(reviewLimiter));
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
