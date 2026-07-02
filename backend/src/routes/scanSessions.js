import { Router } from "express";
import crypto from "crypto";
import os from "os";
import ScanSession from "../models/ScanSession.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// IP LAN của máy chủ — để điện thoại cùng mạng truy cập được khi dev trên localhost
function getLanIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

// Tạo phiên ghép cặp điện thoại (hết hạn sau 10 phút)
router.post("/", protect, async (req, res) => {
  const session = await ScanSession.create({
    token: crypto.randomUUID(),
    cashier: req.user._id,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  res.status(201).json({ token: session.token, expiresAt: session.expiresAt, lanIps: getLanIps() });
});

// Điện thoại kiểm tra phiên còn hiệu lực (không cần đăng nhập)
router.get("/:token", async (req, res) => {
  const session = await ScanSession.findOne({
    token: req.params.token,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return res.status(404).json({ message: "Phiên quét không hợp lệ hoặc đã hết hạn" });
  res.json({ valid: true, expiresAt: session.expiresAt });
});

export default router;
