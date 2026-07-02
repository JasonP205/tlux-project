import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: "Tài khoản không hợp lệ" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập hết hạn" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    next();
  };
}

export function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
