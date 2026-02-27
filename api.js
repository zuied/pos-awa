// ================= CONFIG =================
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbz9aqv5aqTC7FnHCLLenvylSfsJO-0gOsSAs1bg8t4jSWbslCNl_rqF3trt0giWCOD6MQ/exec";

import AsyncStorage from "@react-native-async-storage/async-storage";
const OFFLINE_QUEUE_KEY = "offline_transaksi_queue";
const TIMEOUT_MS = 15000;
const MAX_RETRY = 2;

export const addToOfflineQueue = async (transaksi) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];

    queue.push({
      ...transaksi,
      offline_id: Date.now(),
    });

    await AsyncStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(queue)
    );

    console.log("Disimpan ke offline queue");
  } catch (error) {
    console.log("Gagal simpan queue", error);
  }
};

// ================= HELPER =================
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ================= SAFE JSON =================
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log("❌ JSON parse gagal");
    console.log("RAW:", text);
    return null;
  }
}

// ================= NORMALIZER =================
function normalizeArray(json) {
  if (!json) return [];

  if (Array.isArray(json)) return json;

  if (json.status === "success" && Array.isArray(json.data)) {
    return json.data;
  }

  return [];
}

// ================= CORE REQUEST =================
async function request(url, options = {}, retry = MAX_RETRY) {
  try {
    console.log("🌐 REQUEST:", url);

    const res = await fetchWithTimeout(url, options);

    const text = await res.text();
    console.log("📦 RAW:", text);

    const json = safeJsonParse(text);
    return json;
  } catch (err) {
    console.log("❌ REQUEST ERROR:", err?.message);

    if (retry > 0) {
      console.log("🔁 RETRY...");
      await sleep(800);
      return request(url, options, retry - 1);
    }

    return null;
  }
}

// =================================================
// ================= GET MENU ======================
// =================================================
export async function getMenu() {
  const json = await request(
    GAS_URL + "?action=getMenu"
  );

  return normalizeArray(json);
}

// =================================================
// ================= GET REKAP =====================
// =================================================
export async function getRekap() {
  const json = await request(
    GAS_URL + "?action=getRekap"
  );

  return normalizeArray(json);
}

// =================================================
// ================= SIMPAN TRANSAKSI ==============
// =================================================
export async function simpanTransaksi(payload) {
  try {
    console.log("📤 KIRIM TRANSAKSI:", payload);

    const json = await request(
      GAS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      },
      1
    );

    if (!json) {
      return {
        status: "error",
        message: "Tidak ada response dari server",
      };
    }

    return json;
  } catch (err) {
    console.log("❌ simpanTransaksi error:", err);
    return {
      status: "error",
      message: err.message,
    };
  }
}