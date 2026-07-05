import mongoose from "mongoose";

// Cài đặt hệ thống — 1 document duy nhất (key: "global"), admin chỉnh ở trang /settings
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },

    // Thông tin cửa hàng (in trên hóa đơn, hiện ở màn hình khách)
    storeName: { type: String, default: "TLUX", trim: true },
    storeSlogan: { type: String, default: "Hệ thống quản lý bán hàng", trim: true },
    storeAddress: { type: String, default: "", trim: true },
    storePhone: { type: String, default: "", trim: true },
    // Logo tùy chỉnh (Cloudinary) — không có thì dùng /logo.png mặc định của frontend
    logo: {
      type: new mongoose.Schema({ url: String, publicId: String }, { _id: false }),
      default: null,
    },

    // WiFi cho khách: hiện trên hóa đơn dạng chữ hoặc mã QR (quét là kết nối)
    wifiName: { type: String, default: "", trim: true },
    wifiPassword: { type: String, default: "", trim: true },
    wifiDisplay: { type: String, enum: ["off", "text", "qr"], default: "off" },

    // Thuế GTGT (%) tính trên (tạm tính − giảm giá − điểm đã đổi)
    vatRate: { type: Number, default: 0, min: 0, max: 100 },

    // Tích điểm: pointsEarnRate đ doanh thu = 1 điểm; đổi 1 điểm = pointValue đ
    pointsEarnRate: { type: Number, default: 10000, min: 1 },
    pointValue: { type: Number, default: 100, min: 0 },

    // Cảnh báo kho
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    expiryWarningDays: { type: Number, default: 30, min: 1 },

    // Chân hóa đơn
    receiptFooter: { type: String, default: "Cảm ơn quý khách, hẹn gặp lại!", trim: true },
    receiptReturnNote: { type: String, default: "Đổi trả trong 3 ngày kèm hóa đơn", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
