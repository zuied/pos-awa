// ================= CONFIG =================

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyEHqqPYm65WZ2koCrfGFi1sbFatMwI4yYc_c4SQN0zro4ACjrv0GQME2capnxJWa1j/exec";

const TIMEOUT_MS = 15000;
const MAX_RETRY = 2;

// ================= HELPER =================
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function safeJsonParse(text) {
  try {
    // GAS kadang membungkus response dengan callback atau prefix — bersihkan dulu
    const cleaned = text.trim().replace(/^[^{[]*/, "").replace(/[^}\]]*$/, "");
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.log("❌ JSON parse gagal, RAW:", text);
      return null;
    }
  }
}

function normalizeArray(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (json.status === "success" && Array.isArray(json.data)) return json.data;
  return [];
}

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

// ================= GET MENU =================
export async function getMenu() {
  const json = await request(GAS_URL + "?action=getMenu");
  return normalizeArray(json);
}

// ================= GET REKAP =================
export async function getRekap() {
  const json = await request(GAS_URL + "?action=getRekap");
  return normalizeArray(json);
}

// ================= SIMPAN TRANSAKSI =================
export async function simpanTransaksi(payload) {
  try {
    console.log("📤 KIRIM TRANSAKSI:", payload);
    const json = await request(
      GAS_URL,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      },
      1
    );
    if (!json) {
      return { status: "error", message: "Tidak ada response dari server" };
    }
    return json;
  } catch (err) {
    console.log("❌ simpanTransaksi error:", err);
    return { status: "error", message: err.message };
  }
}

// ================= VOID TRANSAKSI =================
export async function voidTransaksi(id) {
  try {
    const url = `${GAS_URL}?action=voidTransaksi&id=${encodeURIComponent(id)}&t=${Date.now()}`;
    console.log("🗑 VOID URL:", url);

    // Gunakan fetchWithTimeout supaya tidak hang + ikuti redirect GAS
    const res = await fetchWithTimeout(url, { redirect: "follow" });
    const text = await res.text();
    console.log("🗑 VOID RAW:", text);

    // Coba parse JSON
    const json = safeJsonParse(text);
    console.log("🗑 VOID JSON:", json);

    // GAS kadang mengembalikan berbagai format sukses — normalkan
    if (json) {
      const status = json.status || json.result || "";
      if (
        status === "success" ||
        status === "ok" ||
        status === "deleted" ||
        json.deleted === true
      ) {
        return { status: "success" };
      }
      // Jika ada message error eksplisit dari server
      if (json.status === "error" || json.error) {
        return { status: "error", message: json.message || json.error || "Gagal void" };
      }
    }

    // Jika response kosong / tidak ada JSON tapi HTTP status 200 → anggap sukses
    // (GAS kadang hanya return string pendek seperti "OK")
    if (res.ok || (text && text.trim().length > 0)) {
      console.log("⚠️ Void: response tidak terstandar tapi dianggap sukses:", text);
      return { status: "success" };
    }

    return { status: "error", message: "Response tidak dikenali: " + text };
  } catch (err) {
    console.log("❌ voidTransaksi error:", err);
    return { status: "error", message: err.message };
  }
}

// ================= EDIT TRANSAKSI =================
export async function editTransaksi(payload) {
  try {
    console.log("✏️ EDIT TRANSAKSI:", payload);
    const json = await request(
      GAS_URL,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "editTransaksi", transaksi: payload }),
      },
      1
    );
    if (!json) {
      return { status: "error", message: "Tidak ada response dari server" };
    }
    return json;
  } catch (err) {
    console.log("❌ editTransaksi error:", err);
    return { status: "error" };
  }
}
