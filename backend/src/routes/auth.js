import { Router } from "express";
import User from "../models/User.js";
import { protect, signToken, COOKIE_OPTIONS } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });

  const user = await User.findOne({ username: username.toLowerCase().trim() }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
  if (!user.active) return res.status(403).json({ message: "Tài khoản đã bị khóa" });

  res.cookie("token", signToken(user), COOKIE_OPTIONS);
  res.json({ user });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ message: "Đã đăng xuất" });
});

router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
