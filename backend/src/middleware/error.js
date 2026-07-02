export function notFound(req, res) {
  res.status(404).json({ message: "Không tìm thấy đường dẫn" });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "trường";
    return res.status(409).json({ message: `Giá trị ${field} đã tồn tại` });
  }
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((e) => e.message).join("; ");
    return res.status(400).json({ message: msg });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "ID không hợp lệ" });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || "Lỗi hệ thống" });
}
