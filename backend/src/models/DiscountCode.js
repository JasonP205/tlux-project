import mongoose from "mongoose";

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null },
    minOrderTotal: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Tính số tiền giảm cho một subtotal; trả về lỗi dạng chuỗi nếu mã không áp dụng được
discountCodeSchema.methods.computeDiscount = function (subtotal) {
  const now = new Date();
  if (!this.active) return { error: "Mã giảm giá đã bị khóa" };
  if (this.validFrom && now < this.validFrom) return { error: "Mã giảm giá chưa đến ngày áp dụng" };
  if (this.validTo && now > this.validTo) return { error: "Mã giảm giá đã hết hạn" };
  if (this.usageLimit != null && this.usedCount >= this.usageLimit)
    return { error: "Mã giảm giá đã hết lượt sử dụng" };
  if (subtotal < this.minOrderTotal)
    return { error: `Đơn hàng tối thiểu ${this.minOrderTotal.toLocaleString("vi-VN")}đ` };

  let amount =
    this.type === "PERCENT" ? Math.round((subtotal * this.value) / 100) : this.value;
  if (this.maxDiscount != null) amount = Math.min(amount, this.maxDiscount);
  amount = Math.min(amount, subtotal);
  return { amount };
};

export default mongoose.model("DiscountCode", discountCodeSchema);
