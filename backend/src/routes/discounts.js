import { Router } from "express";
import DiscountCode from "../models/DiscountCode.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const discounts = await DiscountCode.find().sort({ createdAt: -1 });
  res.json({ discounts });
});

router.post("/", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const { code, type, value, maxDiscount, minOrderTotal, usageLimit, validFrom, validTo } = req.body;
  if (!code || !type || value == null)
    return res.status(400).json({ message: "Thiếu mã, loại hoặc giá trị giảm" });
  if (type === "PERCENT" && (value <= 0 || value > 100))
    return res.status(400).json({ message: "Phần trăm giảm phải trong khoảng 1-100" });
  const discount = await DiscountCode.create({
    code,
    type,
    value,
    maxDiscount: maxDiscount ?? null,
    minOrderTotal: minOrderTotal || 0,
    usageLimit: usageLimit ?? null,
    validFrom: validFrom || null,
    validTo: validTo || null,
  });
  res.status(201).json({ discount });
});

router.put("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const discount = await DiscountCode.findById(req.params.id);
  if (!discount) return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
  const fields = ["type", "value", "maxDiscount", "minOrderTotal", "usageLimit", "validFrom", "validTo", "active"];
  for (const f of fields) if (req.body[f] !== undefined) discount[f] = req.body[f];
  await discount.save();
  res.json({ discount });
});

router.delete("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const discount = await DiscountCode.findByIdAndDelete(req.params.id);
  if (!discount) return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
  res.json({ message: "Đã xóa mã giảm giá" });
});

// Thu ngân kiểm tra mã lúc thanh toán
router.post("/validate", async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ message: "Thiếu mã giảm giá" });
  const discount = await DiscountCode.findOne({ code: code.toUpperCase().trim() });
  if (!discount) return res.status(404).json({ message: "Mã giảm giá không tồn tại" });
  const result = discount.computeDiscount(subtotal || 0);
  if (result.error) return res.status(400).json({ message: result.error });
  res.json({ discount, amount: result.amount });
});

export default router;
