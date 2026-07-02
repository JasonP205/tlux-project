import { Router } from "express";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import { getPayOS, isPayosConfigured } from "../lib/payos.js";
import { getIO } from "../lib/socket.js";
import { POINTS_EARN_RATE } from "./orders.js";

const router = Router();

// Webhook PayOS gọi khi khách chuyển khoản thành công (route công khai, xác thực bằng chữ ký)
router.post("/payos/webhook", async (req, res) => {
  if (!isPayosConfigured()) return res.status(503).json({ message: "PayOS chưa cấu hình" });
  let data;
  try {
    data = await getPayOS().webhooks.verify(req.body);
  } catch {
    return res.status(400).json({ message: "Chữ ký webhook không hợp lệ" });
  }

  const order = await Order.findOne({ payosOrderCode: data.orderCode });
  // PayOS gửi webhook test khi đăng ký URL — trả 200 để xác nhận
  if (!order) return res.json({ success: true });

  if (order.status === "PENDING_PAYMENT") {
    order.status = "PAID";
    order.paidAt = new Date();
    if (order.customer) {
      order.pointsEarned = Math.floor(order.total / POINTS_EARN_RATE);
      if (order.pointsEarned > 0)
        await Customer.updateOne({ _id: order.customer }, { $inc: { points: order.pointsEarned } });
    }
    await order.save();
    getIO()?.to(`order:${order._id}`).emit("order:paid", { orderId: order._id.toString() });
  }
  res.json({ success: true });
});

export default router;
