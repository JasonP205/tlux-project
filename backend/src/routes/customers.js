import { Router } from "express";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const filter = q
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }] }
    : {};
  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);
  res.json({ customers, total, page: Number(page), limit: Number(limit) });
});

router.get("/:id", async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  const orders = await Order.find({ customer: customer._id, status: "PAID" })
    .populate("cashier", "name")
    .sort({ paidAt: -1 })
    .limit(50);
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  res.json({ customer, orders, totalSpent });
});

// Thu ngân được phép tạo nhanh khách hàng mới tại quầy
router.post("/", async (req, res) => {
  const { name, phone, email, note } = req.body;
  if (!name || !phone) return res.status(400).json({ message: "Thiếu tên hoặc số điện thoại" });
  const customer = await Customer.create({ name, phone, email: email || "", note: note || "" });
  res.status(201).json({ customer });
});

router.put("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const { name, phone, email, note, points } = req.body;
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  if (name != null) customer.name = name;
  if (phone != null) customer.phone = phone;
  if (email != null) customer.email = email;
  if (note != null) customer.note = note;
  if (points != null) customer.points = points;
  await customer.save();
  res.json({ customer });
});

router.delete("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  res.json({ message: "Đã xóa khách hàng" });
});

export default router;
