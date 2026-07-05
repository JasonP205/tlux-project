import { Router } from "express";
import multer from "multer";
import Setting from "../models/Setting.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadImage, deleteImage } from "../lib/cloudinary.js";
import { getSettings, invalidateSettings } from "../lib/settings.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Công khai (không cần đăng nhập): trang login và màn hình khách cần logo + tên cửa hàng
router.get("/branding", async (req, res) => {
  const s = await getSettings();
  res.json({
    branding: { storeName: s.storeName, storeSlogan: s.storeSlogan, logoUrl: s.logo?.url ?? null },
  });
});

router.use(protect);

// Mọi role đều đọc được (POS cần VAT, hóa đơn in cần thông tin cửa hàng)
router.get("/", async (req, res) => {
  res.json({ settings: await getSettings() });
});

const EDITABLE = [
  "storeName",
  "storeSlogan",
  "storeAddress",
  "storePhone",
  "vatRate",
  "pointsEarnRate",
  "pointValue",
  "lowStockThreshold",
  "expiryWarningDays",
  "receiptFooter",
  "receiptReturnNote",
  "wifiName",
  "wifiPassword",
  "wifiDisplay",
];

// multipart (có upload logo) hoặc JSON thường đều dùng chung route này
router.put("/", authorize("ADMIN"), upload.single("logo"), async (req, res) => {
  const patch = {};
  for (const key of EDITABLE) if (req.body[key] !== undefined) patch[key] = req.body[key];
  if (patch.storeName !== undefined && !String(patch.storeName).trim())
    return res.status(400).json({ message: "Tên cửa hàng không được để trống" });

  if (req.file) {
    const current = await getSettings();
    const uploaded = await uploadImage(req.file.buffer);
    await deleteImage(current.logo?.publicId);
    patch.logo = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  const settings = await Setting.findOneAndUpdate({ key: "global" }, patch, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  invalidateSettings();
  res.json({ settings });
});

export default router;
