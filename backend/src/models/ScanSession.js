import mongoose from "mongoose";

const scanSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

scanSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ScanSession", scanSessionSchema);
