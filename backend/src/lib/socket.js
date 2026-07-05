import { Server } from "socket.io";
import ScanSession from "../models/ScanSession.js";

let io = null;

// Hóa đơn cuối cùng đã đẩy sang màn hình khách của từng thu ngân (cache trong RAM)
const lastDisplayOrder = new Map();

export function initSocket(httpServer, corsOptions) {
  io = new Server(httpServer, { cors: corsOptions });

  io.on("connection", (socket) => {
    // Máy thu ngân mở modal quét bằng điện thoại → join room theo token
    socket.on("pos:join", async ({ token }) => {
      const session = await ScanSession.findOne({ token, expiresAt: { $gt: new Date() } });
      if (!session) return socket.emit("scan:error", { message: "Phiên quét không hợp lệ hoặc đã hết hạn" });
      socket.join(`scan:${token}`);
    });

    // Điện thoại mở trang /scan/<token>
    socket.on("phone:join", async ({ token }) => {
      const session = await ScanSession.findOne({ token, expiresAt: { $gt: new Date() } });
      if (!session) return socket.emit("scan:error", { message: "Phiên quét không hợp lệ hoặc đã hết hạn" });
      socket.join(`scan:${token}`);
      socket.to(`scan:${token}`).emit("phone:connected");
    });

    // Điện thoại quét được barcode → chuyển tiếp về máy thu ngân
    socket.on("scan:barcode", ({ token, barcode }) => {
      if (!token || !barcode) return;
      socket.to(`scan:${token}`).emit("scan:barcode", { barcode });
    });

    // Màn hình phụ cho khách xem (/display/<cashierId>) join room theo thu ngân.
    // Gửi ngay trạng thái cuối cùng để màn hình mở sau vẫn thấy hóa đơn đang bán dở.
    socket.on("display:join", ({ cashierId }) => {
      if (!cashierId) return;
      socket.join(`display:${cashierId}`);
      socket.emit("display:update", { order: lastDisplayOrder.get(cashierId) ?? null });
    });
    // POS đẩy hóa đơn đang mở sang màn hình khách mỗi khi thay đổi
    socket.on("display:update", ({ cashierId, order }) => {
      if (!cashierId) return;
      lastDisplayOrder.set(cashierId, order ?? null);
      socket.to(`display:${cashierId}`).emit("display:update", { order });
    });

    // POS theo dõi trạng thái thanh toán PayOS của 1 đơn
    socket.on("order:watch", ({ orderId }) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on("order:unwatch", ({ orderId }) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
