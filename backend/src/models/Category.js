import mongoose from "mongoose";

// "Bánh kẹo" → "banhkeo" (dùng trên URL: /products?category=banhkeo)
export function toSlug(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function () {
  if (this.name) this.slug = toSlug(this.name);
});

export default mongoose.model("Category", categorySchema);
