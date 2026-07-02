import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    barcode: { type: String, required: true, unique: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "cái", trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text" });

export default mongoose.model("Product", productSchema);
