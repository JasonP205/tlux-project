import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import InventoryBatch from "../models/InventoryBatch.js";
import Customer from "../models/Customer.js";
import DiscountCode from "../models/DiscountCode.js";
import { protect, authorize } from "../middleware/auth.js";
import { getPayOS } from "../lib/payos.js";

const router = Router();
router.use(protect);

// Tích điểm: 1 điểm / 10.000đ; đổi điểm: 1 điểm = 100đ
export const POINTS_EARN_RATE = 10000;
export const POINT_VALUE = 100;

function genOrderCode() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `HD${ymd}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// FEFO: lô có HSD gần nhất bán trước, lô không HSD bán sau cùng
function sortFEFO(batches) {
  return [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return a.expiryDate - b.expiryDate;
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return a.importDate - b.importDate;
  });
}

function computeTotals(order) {
  order.subtotal = order.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  order.total = Math.max(0, order.subtotal - order.discountAmount - order.pointsDiscount);
}

// Hoàn kho + hoàn điểm + hoàn lượt mã giảm giá (khi hủy đơn PENDING_PAYMENT)
export async function revertOrder(order, session) {
  for (const item of order.items) {
    for (const alloc of item.batchAllocations || []) {
      await InventoryBatch.updateOne(
        { _id: alloc.batch },
        { $inc: { remaining: alloc.qty } },
        { session }
      );
    }
    item.batchAllocations = [];
  }
  if (order.discountCode) {
    await DiscountCode.updateOne(
      { code: order.discountCode },
      { $inc: { usedCount: -1 } },
      { session }
    );
  }
  if (order.customer && order.pointsRedeemed > 0) {
    await Customer.updateOne(
      { _id: order.customer },
      { $inc: { points: order.pointsRedeemed } },
      { session }
    );
  }
}

// Tạo hóa đơn nháp mới — thu ngân có thể mở nhiều hóa đơn song song
router.post("/", async (req, res) => {
  const order = await Order.create({
    code: genOrderCode(),
    label: req.body.label || "",
    cashier: req.user._id,
  });
  res.status(201).json({ order });
});

// Các hóa đơn nháp/chờ thanh toán của thu ngân hiện tại (khôi phục tab khi reload)
router.get("/drafts", async (req, res) => {
  const orders = await Order.find({
    cashier: req.user._id,
    status: { $in: ["DRAFT", "PENDING_PAYMENT"] },
  })
    .populate("customer")
    .sort({ createdAt: 1 });
  res.json({ orders });
});

router.get("/", authorize("ADMIN", "MANAGER", "CASHIER"), async (req, res) => {
  const { status, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  else filter.status = { $ne: "DRAFT" };
  if (req.user.role === "CASHIER") filter.cashier = req.user._id;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("cashier", "name")
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, total, page: Number(page), limit: Number(limit) });
});

// Thống kê cho dashboard
router.get("/stats", authorize("ADMIN", "MANAGER"), async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last7 = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [today, month, daily, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: { status: "PAID", paidAt: { $gte: startOfDay } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: "PAID", paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: "PAID", paidAt: { $gte: last7 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: "+07:00" } },
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: "PAID", paidAt: { $gte: startOfMonth } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    today: today[0] || { revenue: 0, count: 0 },
    month: month[0] || { revenue: 0, count: 0 },
    daily,
    topProducts,
  });
});

router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("cashier", "name")
    .populate("customer");
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  res.json({ order });
});

// Cập nhật giỏ hàng của hóa đơn nháp (thay toàn bộ items)
router.put("/:id/items", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  if (order.status !== "DRAFT")
    return res.status(400).json({ message: "Chỉ sửa được hóa đơn nháp" });
  if (!order.cashier.equals(req.user._id) && req.user.role === "CASHIER")
    return res.status(403).json({ message: "Không phải hóa đơn của bạn" });

  const items = req.body.items || [];
  const productIds = items.map((it) => it.productId);
  const products = await Product.find({ _id: { $in: productIds }, active: true });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Kiểm tra tồn kho khả dụng
  const stocks = await InventoryBatch.aggregate([
    { $match: { product: { $in: products.map((p) => p._id) }, remaining: { $gt: 0 } } },
    { $group: { _id: "$product", stock: { $sum: "$remaining" } } },
  ]);
  const stockMap = new Map(stocks.map((s) => [s._id.toString(), s.stock]));

  const newItems = [];
  for (const it of items) {
    const product = productMap.get(it.productId);
    if (!product) return res.status(400).json({ message: "Có sản phẩm không tồn tại hoặc đã ngừng bán" });
    const qty = Math.max(1, Number(it.qty) || 1);
    const stock = stockMap.get(it.productId) || 0;
    if (qty > stock)
      return res.status(400).json({ message: `"${product.name}" chỉ còn ${stock} ${product.unit} trong kho` });
    newItems.push({
      product: product._id,
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      qty,
      batchAllocations: [],
    });
  }
  order.items = newItems;
  computeTotals(order);
  await order.save();
  res.json({ order });
});

// Cập nhật khách hàng / mã giảm giá / điểm đổi / nhãn tab
router.put("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  if (order.status !== "DRAFT")
    return res.status(400).json({ message: "Chỉ sửa được hóa đơn nháp" });

  const { customerId, discountCode, pointsRedeemed, label } = req.body;

  if (label !== undefined) order.label = label;

  if (customerId !== undefined) {
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
      order.customer = customer._id;
    } else {
      order.customer = null;
      order.pointsRedeemed = 0;
      order.pointsDiscount = 0;
    }
  }

  if (discountCode !== undefined) {
    if (discountCode) {
      const discount = await DiscountCode.findOne({ code: discountCode.toUpperCase().trim() });
      if (!discount) return res.status(404).json({ message: "Mã giảm giá không tồn tại" });
      const subtotal = order.items.reduce((s, it) => s + it.price * it.qty, 0);
      const result = discount.computeDiscount(subtotal);
      if (result.error) return res.status(400).json({ message: result.error });
      order.discountCode = discount.code;
      order.discountAmount = result.amount;
    } else {
      order.discountCode = null;
      order.discountAmount = 0;
    }
  }

  if (pointsRedeemed !== undefined) {
    const pts = Math.max(0, Number(pointsRedeemed) || 0);
    if (pts > 0) {
      if (!order.customer)
        return res.status(400).json({ message: "Cần chọn khách hàng trước khi đổi điểm" });
      const customer = await Customer.findById(order.customer);
      if (pts > customer.points)
        return res.status(400).json({ message: `Khách chỉ có ${customer.points} điểm` });
    }
    order.pointsRedeemed = pts;
    order.pointsDiscount = pts * POINT_VALUE;
  }

  computeTotals(order);
  await order.save();
  await order.populate("customer");
  res.json({ order });
});

// Thanh toán: trừ kho FEFO trong transaction, chốt giảm giá + điểm
router.post("/:id/checkout", async (req, res) => {
  const { paymentMethod } = req.body;
  if (!["CASH", "PAYOS"].includes(paymentMethod))
    return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  if (order.status !== "DRAFT")
    return res.status(400).json({ message: "Hóa đơn không ở trạng thái nháp" });
  if (order.items.length === 0)
    return res.status(400).json({ message: "Hóa đơn chưa có sản phẩm" });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Xác thực lại mã giảm giá và tăng lượt dùng
      if (order.discountCode) {
        const discount = await DiscountCode.findOne({ code: order.discountCode }).session(session);
        if (!discount) throw Object.assign(new Error("Mã giảm giá không còn tồn tại"), { status: 400 });
        const subtotal = order.items.reduce((s, it) => s + it.price * it.qty, 0);
        const result = discount.computeDiscount(subtotal);
        if (result.error) throw Object.assign(new Error(result.error), { status: 400 });
        order.discountAmount = result.amount;
        discount.usedCount += 1;
        await discount.save({ session });
      }

      // Trừ điểm đổi của khách
      if (order.pointsRedeemed > 0) {
        const updated = await Customer.updateOne(
          { _id: order.customer, points: { $gte: order.pointsRedeemed } },
          { $inc: { points: -order.pointsRedeemed } },
          { session }
        );
        if (updated.modifiedCount === 0)
          throw Object.assign(new Error("Khách không đủ điểm để đổi"), { status: 400 });
      }

      // Trừ kho theo FEFO
      for (const item of order.items) {
        const batches = sortFEFO(
          await InventoryBatch.find({ product: item.product, remaining: { $gt: 0 } }).session(session)
        );
        let need = item.qty;
        const allocations = [];
        for (const batch of batches) {
          if (need <= 0) break;
          const take = Math.min(need, batch.remaining);
          batch.remaining -= take;
          await batch.save({ session });
          allocations.push({ batch: batch._id, qty: take });
          need -= take;
        }
        if (need > 0)
          throw Object.assign(new Error(`"${item.name}" không đủ tồn kho`), { status: 400 });
        item.batchAllocations = allocations;
      }

      computeTotals(order);
      order.paymentMethod = paymentMethod;

      if (paymentMethod === "CASH") {
        order.status = "PAID";
        order.paidAt = new Date();
        if (order.customer) {
          order.pointsEarned = Math.floor(order.total / POINTS_EARN_RATE);
          if (order.pointsEarned > 0)
            await Customer.updateOne(
              { _id: order.customer },
              { $inc: { points: order.pointsEarned } },
              { session }
            );
        }
      } else {
        order.status = "PENDING_PAYMENT";
      }
      await order.save({ session });
    });
  } catch (err) {
    session.endSession();
    return res.status(err.status || 500).json({ message: err.message || "Thanh toán thất bại" });
  }
  session.endSession();

  // Với PayOS: tạo link thanh toán sau khi đã giữ hàng
  if (paymentMethod === "PAYOS") {
    try {
      if (order.total <= 0)
        throw Object.assign(new Error("Hóa đơn 0đ, hãy chọn thanh toán tiền mặt"), { status: 400 });
      const payos = getPayOS();
      const payosOrderCode = Date.now();
      const link = await payos.paymentRequests.create({
        orderCode: payosOrderCode,
        amount: order.total,
        description: order.code.slice(0, 25),
        returnUrl: `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:3000"}/pos`,
        cancelUrl: `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:3000"}/pos`,
      });
      order.payosOrderCode = payosOrderCode;
      order.payosCheckoutUrl = link.checkoutUrl;
      order.payosQrCode = link.qrCode;
      await order.save();
    } catch (err) {
      // Không tạo được link → hoàn tác giữ hàng, trả hóa đơn về nháp
      await revertOrder(order, undefined);
      order.status = "DRAFT";
      order.paymentMethod = null;
      await order.save();
      return res
        .status(err.status || 502)
        .json({ message: `Không tạo được thanh toán PayOS: ${err.message}` });
    }
  }

  await order.populate("customer");
  res.json({ order });
});

// Hủy hóa đơn (nháp hoặc đang chờ thanh toán)
router.post("/:id/cancel", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  if (!["DRAFT", "PENDING_PAYMENT"].includes(order.status))
    return res.status(400).json({ message: "Chỉ hủy được hóa đơn nháp hoặc chờ thanh toán" });

  if (order.status === "PENDING_PAYMENT") {
    await revertOrder(order);
    if (order.payosOrderCode) {
      try {
        await getPayOS().paymentRequests.cancel(order.payosOrderCode, { cancellationReason: "Thu ngân hủy" });
      } catch {
        // Link có thể đã hết hạn — bỏ qua
      }
    }
  }
  order.status = "CANCELLED";
  await order.save();
  res.json({ order });
});

export default router;
