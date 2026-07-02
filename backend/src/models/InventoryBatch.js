import mongoose from "mongoose";

const inventoryBatchSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantityIn: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0 },
    importDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date, default: null },
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

inventoryBatchSchema.index({ product: 1, expiryDate: 1 });

export default mongoose.model("InventoryBatch", inventoryBatchSchema);
