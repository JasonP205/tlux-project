import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", trim: true },
    points: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" },
    // Mã thành viên in trên thẻ, quét được tại POS (prefix TLX)
    memberCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

customerSchema.pre("validate", function () {
  if (!this.memberCode && this.phone) this.memberCode = `TLX${this.phone.replace(/\D/g, "")}`;
});

export default mongoose.model("Customer", customerSchema);
