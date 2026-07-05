import { Router } from "express";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import { getPayOS, isPayosConfigured } from "../lib/payos.js";
import { getIO } from "../lib/socket.js";
import { protect } from "../middleware/auth.js";
import { getSettings } from "../lib/settings.js";

const router = Router();

// Chuyển đơn PENDING_PAYMENT → PAID + cộng điểm + báo socket (dùng chung cho webhook và poll)
async function markOrderPaid(order) {
  if (order.status !== "PENDING_PAYMENT") return;
  order.status = "PAID";
  order.paidAt = new Date();
  if (order.customer) {
    order.pointsEarned = Math.floor(order.total / (await getSettings()).pointsEarnRate);
    if (order.pointsEarned > 0)
      await Customer.updateOne({ _id: order.customer }, { $inc: { points: order.pointsEarned } });
  }
  await order.save();
  getIO()?.to(`order:${order._id}`).emit("order:paid", { orderId: order._id.toString() });
}

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

  await markOrderPaid(order);
  res.json({ success: true });
});

// POS poll khi webhook không tới được server (vd. chạy localhost): hỏi thẳng PayOS trạng thái link
router.get("/payos/check/:orderId", protect, async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });

  if (order.status === "PENDING_PAYMENT" && order.payosOrderCode && isPayosConfigured()) {
    try {
      const link = await getPayOS().paymentRequests.get(order.payosOrderCode);
      if (link.status === "PAID") await markOrderPaid(order);
    } catch {
      // PayOS tạm lỗi — giữ nguyên trạng thái, lượt poll sau thử lại
    }
  }

  await order.populate("customer");
  res.json({ order });
});

export default router;
