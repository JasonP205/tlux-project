import Setting from "../models/Setting.js";

// Cache trong RAM — đọc ở mọi lần tính tiền nên tránh query lặp; PUT /settings sẽ invalidate
let cache = null;

export async function getSettings() {
  if (!cache)
    cache = await Setting.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { key: "global" } },
      { new: true, upsert: true }
    );
  return cache;
}

export function invalidateSettings() {
  cache = null;
}
