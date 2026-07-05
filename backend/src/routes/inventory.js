import { Router } from "express";
import InventoryBatch from "../models/InventoryBatch.js";
import Product from "../models/Product.js";
import { protect, authorize } from "../middleware/auth.js";
import { getSettings } from "../lib/settings.js";

const router = Router();
router.use(protect);

const CAN_MANAGE = ["ADMIN", "MANAGER", "WAREHOUSE"];

// Nhập kho: tạo lô mới với ngày nhập + hạn sử dụng
router.post("/import", authorize(...CAN_MANAGE), async (req, res) => {
  const { productId, quantity, importDate, expiryDate, note } = req.body;
  if (!productId || !quantity || quantity < 1)
    return res.status(400).json({ message: "Thiếu sản phẩm hoặc số lượng không hợp lệ" });
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  const batch = await InventoryBatch.create({
    product: productId,
    quantityIn: quantity,
    remaining: quantity,
    importDate: importDate ? new Date(importDate) : new Date(),
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    note: note || "",
    createdBy: req.user._id,
  });
  res.status(201).json({ batch });
});

router.get("/batches", async (req, res) => {
  const { productId, onlyAvailable, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (productId) filter.product = productId;
  if (onlyAvailable) filter.remaining = { $gt: 0 };
  const [batches, total] = await Promise.all([
    InventoryBatch.find(filter)
      .populate("product", "name barcode unit image")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    InventoryBatch.countDocuments(filter),
  ]);
  res.json({ batches, total, page: Number(page), limit: Number(limit) });
});

// Sửa lô: nhập nhầm số lượng/HSD, hoặc điều chỉnh tồn (hủy hàng hỏng/hết hạn)
router.put("/batches/:id", authorize(...CAN_MANAGE), async (req, res) => {
  const { quantityIn, remaining, expiryDate, note } = req.body;
  const batch = await InventoryBatch.findById(req.params.id);
  if (!batch) return res.status(404).json({ message: "Không tìm thấy lô hàng" });
  if (quantityIn != null) {
    // Sửa số lượng nhập giữ nguyên số đã xuất: remaining dịch theo cùng chênh lệch
    const sold = batch.quantityIn - batch.remaining;
    if (quantityIn < 1 || quantityIn < sold)
      return res
        .status(400)
        .json({ message: `Số lượng nhập không hợp lệ (lô này đã xuất ${sold})` });
    batch.quantityIn = quantityIn;
    batch.remaining = quantityIn - sold;
  }
  if (remaining != null) {
    if (remaining < 0 || remaining > batch.quantityIn)
      return res.status(400).json({ message: "Số lượng còn lại không hợp lệ" });
    batch.remaining = remaining;
  }
  if (expiryDate !== undefined) batch.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (note != null) batch.note = note;
  await batch.save();
  await batch.populate([
    { path: "product", select: "name barcode unit image" },
    { path: "createdBy", select: "name" },
  ]);
  res.json({ batch });
});

// Cảnh báo: lô sắp hết hạn và sản phẩm sắp hết hàng (ngưỡng mặc định lấy từ Cài đặt)
router.get("/alerts", async (req, res) => {
  const settings = await getSettings();
  const expiryDays = Number(req.query.expiryDays || settings.expiryWarningDays);
  const lowStockThreshold = Number(req.query.lowStock || settings.lowStockThreshold);
  const soon = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const expiringBatches = await InventoryBatch.find({
    remaining: { $gt: 0 },
    expiryDate: { $ne: null, $lte: soon },
  })
    .populate("product", "name barcode unit image")
    .sort({ expiryDate: 1 });

  const stocks = await InventoryBatch.aggregate([
    { $match: { remaining: { $gt: 0 } } },
    { $group: { _id: "$product", stock: { $sum: "$remaining" } } },
    { $match: { stock: { $lte: lowStockThreshold } } },
  ]);
  const lowStockIds = stocks.map((s) => s._id);
  const lowStockProducts = await Product.find({ _id: { $in: lowStockIds }, active: true });
  const stockMap = new Map(stocks.map((s) => [s._id.toString(), s.stock]));

  // Sản phẩm đang bán nhưng hết sạch tồn
  const withAnyStock = await InventoryBatch.distinct("product", { remaining: { $gt: 0 } });
  const outOfStock = await Product.find({ _id: { $nin: withAnyStock }, active: true });

  res.json({
    expiringBatches,
    lowStockProducts: lowStockProducts.map((p) => ({
      ...p.toObject(),
      stock: stockMap.get(p._id.toString()) || 0,
    })),
    outOfStockProducts: outOfStock,
  });
});

export default router;
