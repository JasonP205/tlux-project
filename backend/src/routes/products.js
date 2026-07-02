import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import InventoryBatch from "../models/InventoryBatch.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadImage, deleteImage } from "../lib/cloudinary.js";
import { indexProduct, removeProduct, searchProducts } from "../lib/es.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

// Gắn tồn kho (tổng remaining các lô) vào danh sách sản phẩm
async function attachStock(products) {
  const ids = products.map((p) => p._id);
  const stocks = await InventoryBatch.aggregate([
    { $match: { product: { $in: ids }, remaining: { $gt: 0 } } },
    { $group: { _id: "$product", stock: { $sum: "$remaining" }, nearestExpiry: { $min: "$expiryDate" } } },
  ]);
  const map = new Map(stocks.map((s) => [s._id.toString(), s]));
  return products.map((p) => {
    const s = map.get(p._id.toString());
    return { ...p.toObject(), stock: s?.stock || 0, nearestExpiry: s?.nearestExpiry || null };
  });
}

function syncES(product) {
  return product
    .populate("category")
    .then((p) => indexProduct(p))
    .catch((err) => console.error("[ES] Lỗi đồng bộ sản phẩm:", err.message));
}

router.get("/", async (req, res) => {
  const { q, category, page = 1, limit = 20, includeInactive } = req.query;
  const filter = {};
  if (!includeInactive) filter.active = true;
  if (category) filter.category = category;
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { barcode: q }];

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  res.json({ products: await attachStock(products), total, page: Number(page), limit: Number(limit) });
});

// Tìm kiếm fuzzy qua Elasticsearch, fallback Mongo regex nếu ES lỗi
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ products: [], engine: "none" });
  try {
    const hits = await searchProducts(q, { limit: 15 });
    const ids = hits.map((h) => new mongoose.Types.ObjectId(h.id));
    const products = await Product.find({ _id: { $in: ids }, active: true }).populate("category");
    const order = new Map(hits.map((h, i) => [h.id, i]));
    const sorted = (await attachStock(products)).sort(
      (a, b) => order.get(a._id.toString()) - order.get(b._id.toString())
    );
    res.json({ products: sorted, engine: "elasticsearch" });
  } catch (err) {
    console.error("[ES] Search lỗi, fallback Mongo:", err.message);
    const products = await Product.find({
      active: true,
      $or: [{ name: { $regex: q, $options: "i" } }, { barcode: q }],
    })
      .populate("category")
      .limit(15);
    res.json({ products: await attachStock(products), engine: "mongo" });
  }
});

router.get("/barcode/:code", async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.code, active: true }).populate("category");
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm với mã này" });
  const [withStock] = await attachStock([product]);
  res.json({ product: withStock });
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category");
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const [withStock] = await attachStock([product]);
  const batches = await InventoryBatch.find({ product: product._id, remaining: { $gt: 0 } }).sort({
    expiryDate: 1,
  });
  res.json({ product: withStock, batches });
});

router.post("/", authorize("ADMIN", "MANAGER"), upload.single("image"), async (req, res) => {
  const { name, barcode, price, costPrice, unit, category, description } = req.body;
  if (!name || !barcode || price == null)
    return res.status(400).json({ message: "Thiếu tên, mã vạch hoặc giá bán" });

  let image = { url: null, publicId: null };
  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer);
    image = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }
  const product = await Product.create({
    name,
    barcode,
    price,
    costPrice: costPrice || 0,
    unit: unit || "cái",
    category: category || null,
    description: description || "",
    image,
  });
  await syncES(product);
  res.status(201).json({ product });
});

router.put("/:id", authorize("ADMIN", "MANAGER"), upload.single("image"), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  const { name, barcode, price, costPrice, unit, category, description, active } = req.body;
  if (name != null) product.name = name;
  if (barcode != null) product.barcode = barcode;
  if (price != null) product.price = price;
  if (costPrice != null) product.costPrice = costPrice;
  if (unit != null) product.unit = unit;
  if (category !== undefined) product.category = category || null;
  if (description != null) product.description = description;
  if (active != null) product.active = active === "true" || active === true;

  if (req.file) {
    const uploaded = await uploadImage(req.file.buffer);
    await deleteImage(product.image?.publicId);
    product.image = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }
  await product.save();
  await syncES(product);
  res.json({ product });
});

// Xóa mềm: ngừng kinh doanh, gỡ khỏi kết quả tìm kiếm
router.delete("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  product.active = false;
  await product.save();
  await removeProduct(product._id).catch((err) => console.error("[ES]", err.message));
  res.json({ message: "Đã ngừng kinh doanh sản phẩm" });
});

export default router;
