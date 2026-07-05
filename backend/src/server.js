import dotenv from "dotenv";
dotenv.config();
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./lib/db.js";
import { initSocket } from "./lib/socket.js";
import { ensureProductIndex } from "./lib/es.js";
import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import inventoryRoutes from "./routes/inventory.js";
import customerRoutes from "./routes/customers.js";
import discountRoutes from "./routes/discounts.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import settingRoutes from "./routes/settings.js";
import scanSessionRoutes from "./routes/scanSessions.js";

const app = express();
const PORT = process.env.PORT || 5002;

const WHITELIST = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

// Ở dev, cho phép truy cập từ điện thoại cùng mạng LAN (IP private)
const LAN_ORIGIN_RE =
  /^https?:\/\/(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)[\d.]+(?::\d+)?$/;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (WHITELIST.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== "production" && LAN_ORIGIN_RE.test(origin))
      return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/scan-sessions", scanSessionRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer, corsOptions);

connectDB().then(async () => {
  try {
    await ensureProductIndex();
    console.log("Elasticsearch index sẵn sàng");
  } catch (err) {
    console.warn("Elasticsearch chưa sẵn sàng, search sẽ fallback Mongo:", err.message);
  }
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
