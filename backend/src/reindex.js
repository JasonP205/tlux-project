import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "./lib/db.js";
import Product from "./models/Product.js";
import { ensureProductIndex, indexProduct } from "./lib/es.js";

// Đồng bộ lại toàn bộ sản phẩm từ MongoDB sang Elasticsearch
await connectDB();
await ensureProductIndex();
const products = await Product.find({ active: true }).populate("category");
for (const product of products) {
  await indexProduct(product);
  console.log(`Đã index: ${product.name}`);
}
console.log(`Hoàn tất: ${products.length} sản phẩm`);
await mongoose.disconnect();
process.exit(0);
