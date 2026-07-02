import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "./lib/db.js";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";
import InventoryBatch from "./models/InventoryBatch.js";
import Customer from "./models/Customer.js";
import DiscountCode from "./models/DiscountCode.js";
import { ensureProductIndex, indexProduct } from "./lib/es.js";

await connectDB();

// ==== Nhân viên (mật khẩu mặc định: 123456) ====
const passwordHash = await User.hashPassword("123456");
const users = [
  { name: "Quản trị viên", username: "admin", role: "ADMIN" },
  { name: "Trần Quản Lý", username: "quanly", role: "MANAGER" },
  { name: "Lê Thủ Kho", username: "thukho", role: "WAREHOUSE" },
  { name: "Nguyễn Thu Ngân", username: "thungan", role: "CASHIER" },
];
for (const u of users) {
  await User.updateOne({ username: u.username }, { $setOnInsert: { ...u, passwordHash } }, { upsert: true });
}
console.log("✓ Nhân viên: admin / quanly / thukho / thungan (mật khẩu: 123456)");

// ==== Danh mục ====
const categoryNames = ["Đồ uống", "Bánh kẹo", "Sữa & Trứng", "Mì & Thực phẩm khô", "Hóa mỹ phẩm"];
const categories = {};
for (const name of categoryNames) {
  const cat = await Category.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
  categories[name] = cat._id;
}
console.log("✓ Danh mục:", categoryNames.join(", "));

// ==== Sản phẩm ====
const productData = [
  { name: "Nước suối Lavie 500ml", barcode: "8934588012345", price: 6000, costPrice: 4000, unit: "chai", cat: "Đồ uống" },
  { name: "Coca-Cola lon 330ml", barcode: "8934588823451", price: 12000, costPrice: 9000, unit: "lon", cat: "Đồ uống" },
  { name: "Trà xanh 0 độ 455ml", barcode: "8936013254789", price: 10000, costPrice: 7500, unit: "chai", cat: "Đồ uống" },
  { name: "Sữa tươi Vinamilk 1L", barcode: "8934673314152", price: 32000, costPrice: 27000, unit: "hộp", cat: "Sữa & Trứng" },
  { name: "Sữa chua Vinamilk có đường", barcode: "8934673271042", price: 8000, costPrice: 6000, unit: "hộp", cat: "Sữa & Trứng" },
  { name: "Trứng gà ta hộp 10 quả", barcode: "8938505970012", price: 35000, costPrice: 28000, unit: "hộp", cat: "Sữa & Trứng" },
  { name: "Mì Hảo Hảo tôm chua cay", barcode: "8934563138165", price: 4500, costPrice: 3500, unit: "gói", cat: "Mì & Thực phẩm khô" },
  { name: "Gạo ST25 túi 5kg", barcode: "8936098765432", price: 165000, costPrice: 140000, unit: "túi", cat: "Mì & Thực phẩm khô" },
  { name: "Bánh Oreo 133g", barcode: "8992760221034", price: 16000, costPrice: 12500, unit: "gói", cat: "Bánh kẹo" },
  { name: "Kẹo Alpenliebe dâu", barcode: "8993175535885", price: 22000, costPrice: 17000, unit: "gói", cat: "Bánh kẹo" },
  { name: "Nước rửa chén Sunlight 750g", barcode: "8934868166894", price: 28000, costPrice: 22000, unit: "chai", cat: "Hóa mỹ phẩm" },
  { name: "Dầu gội Clear Men 630g", barcode: "8934868157427", price: 145000, costPrice: 118000, unit: "chai", cat: "Hóa mỹ phẩm" },
];

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const productDocs = [];
for (const p of productData) {
  const doc = await Product.findOneAndUpdate(
    { barcode: p.barcode },
    { name: p.name, barcode: p.barcode, price: p.price, costPrice: p.costPrice, unit: p.unit, category: categories[p.cat] },
    { upsert: true, new: true }
  );
  productDocs.push(doc);
}
console.log(`✓ Sản phẩm: ${productDocs.length}`);

// ==== Lô hàng: mỗi sản phẩm 2 lô với HSD khác nhau (có lô cận date để test cảnh báo + FEFO) ====
const admin = await User.findOne({ username: "thukho" });
const batchCount = await InventoryBatch.countDocuments();
if (batchCount === 0) {
  for (const [i, doc] of productDocs.entries()) {
    await InventoryBatch.create([
      {
        product: doc._id,
        quantityIn: 50,
        remaining: 50,
        importDate: new Date(now - 20 * DAY),
        expiryDate: new Date(now + (i % 3 === 0 ? 10 : 90) * DAY),
        note: "Lô nhập đợt 1",
        createdBy: admin._id,
      },
      {
        product: doc._id,
        quantityIn: 100,
        remaining: 100,
        importDate: new Date(now - 5 * DAY),
        expiryDate: new Date(now + 180 * DAY),
        note: "Lô nhập đợt 2",
        createdBy: admin._id,
      },
    ]);
  }
  console.log("✓ Lô hàng: mỗi sản phẩm 2 lô (150 tồn/SP)");
} else {
  console.log("• Lô hàng đã có, bỏ qua");
}

// ==== Khách hàng ====
const customers = [
  { name: "Nguyễn Văn An", phone: "0901234567", email: "an@gmail.com", points: 120 },
  { name: "Trần Thị Bích", phone: "0912345678", email: "bich@gmail.com", points: 45 },
  { name: "Phạm Minh Châu", phone: "0987654321", points: 0 },
];
for (const c of customers) {
  await Customer.updateOne({ phone: c.phone }, { $setOnInsert: c }, { upsert: true });
}
console.log("✓ Khách hàng mẫu: 3");

// ==== Mã giảm giá ====
const discounts = [
  { code: "GIAM10", type: "PERCENT", value: 10, maxDiscount: 50000, minOrderTotal: 100000, usageLimit: 100 },
  { code: "KHAITRUONG", type: "FIXED", value: 20000, minOrderTotal: 50000, usageLimit: 50 },
];
for (const d of discounts) {
  await DiscountCode.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
}
console.log("✓ Mã giảm giá: GIAM10 (10%, tối đa 50k, đơn từ 100k), KHAITRUONG (giảm 20k, đơn từ 50k)");

// ==== Đồng bộ Elasticsearch ====
try {
  await ensureProductIndex();
  const all = await Product.find({ active: true }).populate("category");
  for (const p of all) await indexProduct(p);
  console.log(`✓ Elasticsearch: đã index ${all.length} sản phẩm`);
} catch (err) {
  console.warn("⚠ Elasticsearch chưa chạy, bỏ qua index:", err.message);
}

console.log("\nSeed hoàn tất!");
await mongoose.disconnect();
process.exit(0);
