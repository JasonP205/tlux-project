import mongoose from "mongoose";

export const ORDER_STATUSES = ["DRAFT", "PENDING_PAYMENT", "PAID", "CANCELLED"];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    barcode: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    batchAllocations: [
      {
        batch: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryBatch" },
        qty: { type: Number, min: 1 },
      },
    ],
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    label: { type: String, default: "" },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    discountCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    pointsDiscount: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["CASH", "PAYOS", null], default: null },
    status: { type: String, enum: ORDER_STATUSES, default: "DRAFT", index: true },
    payosOrderCode: { type: Number, default: null, index: true },
    payosCheckoutUrl: { type: String, default: null },
    payosQrCode: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
