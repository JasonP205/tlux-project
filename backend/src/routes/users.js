import { Router } from "express";
import User, { ROLES } from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
router.use(protect, authorize("ADMIN"));

router.get("/", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

router.post("/", async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password)
    return res.status(400).json({ message: "Thiếu tên, tên đăng nhập hoặc mật khẩu" });
  if (role && !ROLES.includes(role)) return res.status(400).json({ message: "Vai trò không hợp lệ" });
  const user = await User.create({
    name,
    username,
    role: role || "CASHIER",
    passwordHash: await User.hashPassword(password),
  });
  res.status(201).json({ user });
});

router.put("/:id", async (req, res) => {
  const { name, role, active, password } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy nhân viên" });

  if (user._id.equals(req.user._id) && active === false)
    return res.status(400).json({ message: "Không thể tự khóa tài khoản của mình" });

  if (name != null) user.name = name;
  if (role != null) {
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Vai trò không hợp lệ" });
    user.role = role;
  }
  if (active != null) user.active = active;
  if (password) user.passwordHash = await User.hashPassword(password);
  await user.save();
  res.json({ user });
});

export default router;
