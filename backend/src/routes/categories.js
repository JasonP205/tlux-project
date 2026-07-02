import { Router } from "express";
import Category from "../models/Category.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ categories });
});

router.post("/", authorize("ADMIN", "MANAGER"), async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: "Thiếu tên danh mục" });
  const category = await Category.create({ name: req.body.name });
  res.status(201).json({ category });
});

router.put("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true, runValidators: true }
  );
  if (!category) return res.status(404).json({ message: "Không tìm thấy danh mục" });
  res.json({ category });
});

router.delete("/:id", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Không tìm thấy danh mục" });
  res.json({ message: "Đã xóa danh mục" });
});

export default router;
