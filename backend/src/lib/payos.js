import { PayOS } from "@payos/node";

let payos = null;

export function isPayosConfigured() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY
  );
}

export function getPayOS() {
  if (!isPayosConfigured()) {
    const err = new Error("Chưa cấu hình PayOS (PAYOS_* trong .env)");
    err.status = 503;
    throw err;
  }
  if (!payos) {
    payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return payos;
}
