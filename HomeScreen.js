import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import MenuList from "./MenuList";
import { getMenu, simpanTransaksi } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const QUEUE_KEY = "offline_queue";
const PAY_COOLDOWN = 1500;

const generateTrxId = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${yy}${mm}${dd}-${rand}`;
};

export default function HomeScreen({ navigation }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [metode, setMetode] = useState("Tunai");
  const [bayar, setBayar] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [lastPayTime, setLastPayTime] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  // Load menu satu kali
  useEffect(() => {
    (async () => {
      const data = await getMenu();
      setMenu(data);
    })();
  }, []);

  // Monitor koneksi
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  // Auto sync saat online
  useEffect(() => {
    if (!isOffline) processQueue();
  }, [isOffline]);

  // ================= CART =================
  const addToCart = (item) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id_produk === item.id_produk);
      if (exist)
        return prev.map((i) =>
          i.id_produk === item.id_produk ? { ...i, jumlah: i.jumlah + 1 } : i
        );
      return [...prev, { ...item, jumlah: 1 }];
    });
  };

  const removeFromCart = (item) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id_produk === item.id_produk);
      if (!exist) return prev;
      if (exist.jumlah === 1)
        return prev.filter((i) => i.id_produk !== item.id_produk);
      return prev.map((i) =>
        i.id_produk === item.id_produk ? { ...i, jumlah: i.jumlah - 1 } : i
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setBayar("");
  };

  const totalHarga = useMemo(
    () => cart.reduce((sum, i) => sum + Number(i.harga) * i.jumlah, 0),
    [cart]
  );

  const kembalian =
    metode === "Tunai" ? Math.max(Number(bayar || 0) - totalHarga, 0) : 0;

  // ================= OFFLINE QUEUE =================
  const saveToQueue = async (payload) => {
    try {
      const existing = await AsyncStorage.getItem(QUEUE_KEY);
      const arr = existing ? JSON.parse(existing) : [];
      arr.push(payload);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
      console.log("💾 Masuk offline queue:", arr.length, "item");
    } catch (e) {
      console.log("❌ Gagal simpan queue", e);
    }
  };

  const processQueue = async () => {
    try {
      const existing = await AsyncStorage.getItem(QUEUE_KEY);
      if (!existing) return;
      const arr = JSON.parse(existing);
      if (arr.length === 0) return;

      console.log("🚀 Kirim queue:", arr.length);
      const remaining = [];
      for (const payload of arr) {
        try {
          const res = await simpanTransaksi(payload);
          if (res?.status !== "success") remaining.push(payload);
        } catch {
          remaining.push(payload);
        }
      }
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      if (remaining.length < arr.length) {
        console.log("✅ Queue sync:", arr.length - remaining.length, "terkirim");
      }
    } catch (e) {
      console.log("❌ processQueue error", e);
    }
  };

  // ================= BAYAR =================
  const handlePay = async () => {
    const now = Date.now();
    if (isPaying) return;
    if (now - lastPayTime < PAY_COOLDOWN) return;

    if (cart.length === 0) {
      Alert.alert("Keranjang kosong", "Tambahkan menu terlebih dahulu");
      return;
    }
    if (metode === "Tunai" && Number(bayar) < totalHarga) {
      Alert.alert(
        "Uang kurang",
        `Total Rp ${totalHarga.toLocaleString("id-ID")}, uang bayar Rp ${Number(bayar).toLocaleString("id-ID")}`
      );
      return;
    }

    setIsPaying(true);
    setLastPayTime(now);

    const safetyTimeout = setTimeout(() => {
      setIsPaying(false);
    }, 15000);

    const payload = {
      action: "simpanTransaksi",
      transaksi: {
        id_transaksi: generateTrxId(),
        waktu_transaksi: new Date().toLocaleString("id-ID"),
        total_harga: totalHarga,
        metode_pembayaran: metode,
        item_dibeli: cart.map((i) => ({
          nama_produk: i.nama_produk,
          jumlah: i.jumlah,
          harga: i.harga,
        })),
      },
    };

    try {
      const net = await NetInfo.fetch();

      if (!net.isConnected) {
        await saveToQueue(payload);
        Alert.alert("Offline 📴", "Transaksi disimpan ke antrian, akan dikirim saat online");
        clearCart();
        return;
      }

      const res = await simpanTransaksi(payload);
      console.log("📨 RESPONSE:", res);

      if (res?.status === "success") {
        Alert.alert("✅ Berhasil", "Transaksi tersimpan!");
        clearCart();
      } else if (res?.status === "duplicate") {
        Alert.alert("⏳ Duplikat", "Transaksi sudah diproses sebelumnya");
        clearCart();
      } else {
        await saveToQueue(payload);
        Alert.alert(
          "⚠️ Gagal Terkirim",
          (res?.message || "Terjadi kesalahan") +
            "\nTransaksi disimpan ke antrian offline 📦"
        );
        clearCart();
      }
    } catch (err) {
      console.log("❌ handlePay error:", err);
      await saveToQueue(payload);
      Alert.alert("Network Error", "Transaksi disimpan ke antrian offline 📦");
      clearCart();
    } finally {
      clearTimeout(safetyTimeout);
      setIsPaying(false);
    }
  };

  // ================= UI =================
  return (
    <SafeAreaView style={styles.container}>
      {/* Banner offline */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📴 Mode Offline</Text>
        </View>
      )}

      <View style={styles.left}>
        <MenuList
          menu={menu}
          cart={cart}
          onAddToCart={addToCart}
          onDecrease={removeFromCart}
        />
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.rekapBtn}
          onPress={() => navigation.navigate("Rekap")}
        >
          <Text style={styles.rekapText}>📊 Rekap</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>🧾 Pesanan</Text>

        {cart.length === 0 ? (
          <Text style={styles.emptyCart}>Belum ada item</Text>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(i) => String(i.id_produk)}
            style={{ flexGrow: 0, maxHeight: 200 }}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Text style={styles.cartName} numberOfLines={1}>
                  {item.nama_produk} ×{item.jumlah}
                </Text>
                <Text style={styles.cartHarga}>
                  Rp{" "}
                  {(Number(item.harga) * item.jumlah).toLocaleString("id-ID")}
                </Text>
              </View>
            )}
          />
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            Rp {totalHarga.toLocaleString("id-ID")}
          </Text>
        </View>

        {/* Metode Pembayaran */}
        <View style={styles.metodeRow}>
          <TouchableOpacity
            style={[styles.metodeBtn, metode === "Tunai" && styles.metodeTunaiAktif]}
            onPress={() => setMetode("Tunai")}
          >
            <Text style={[styles.metodeText, metode === "Tunai" && styles.metodeTextAktif]}>
              💵 Tunai
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metodeBtn, metode === "QRIS" && styles.metodeQrisAktif]}
            onPress={() => setMetode("QRIS")}
          >
            <Text style={[styles.metodeText, metode === "QRIS" && styles.metodeTextAktif]}>
              📱 QRIS
            </Text>
          </TouchableOpacity>
        </View>

        {metode === "Tunai" && (
          <>
            <TextInput
              placeholder="Uang bayar"
              keyboardType="numeric"
              value={bayar}
              onChangeText={setBayar}
              style={styles.bayarInput}
            />
            <View style={styles.kembalianRow}>
              <Text style={styles.kembalianLabel}>Kembalian</Text>
              <Text style={styles.kembalianValue}>
                Rp {kembalian.toLocaleString("id-ID")}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={handlePay}
          disabled={isPaying}
          style={[styles.bayarBtn, isPaying && styles.bayarBtnDisabled]}
        >
          <Text style={styles.bayarBtnText}>
            {isPaying ? "⏳ Memproses..." : "💳 BAYAR"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f7f9fc" },
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#e74c3c",
    padding: 6,
    alignItems: "center",
    zIndex: 99,
  },
  offlineText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  left: { flex: 2, paddingTop: 4 },
  right: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderLeftColor: "#eee",
  },
  rekapBtn: {
    backgroundColor: "#eef6ff",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  rekapText: { color: "#007bff", fontWeight: "bold" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 6 },
  emptyCart: { color: "#aaa", fontStyle: "italic", fontSize: 13, marginBottom: 8 },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cartName: { fontSize: 12, flex: 1, color: "#333" },
  cartHarga: { fontSize: 12, fontWeight: "bold", color: "#333" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: { fontWeight: "bold", fontSize: 14 },
  totalValue: { fontWeight: "bold", fontSize: 14, color: "#c00" },
  metodeRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  metodeBtn: {
    flex: 1,
    padding: 8,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignItems: "center",
  },
  metodeTunaiAktif: { backgroundColor: "#3498db" },
  metodeQrisAktif: { backgroundColor: "#2ecc71" },
  metodeText: { color: "#555", fontSize: 12, fontWeight: "bold" },
  metodeTextAktif: { color: "#fff" },
  bayarInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
    fontSize: 14,
  },
  kembalianRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  kembalianLabel: { fontSize: 12, color: "#555" },
  kembalianValue: { fontSize: 12, fontWeight: "bold", color: "#27ae60" },
  bayarBtn: {
    backgroundColor: "#c00",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  bayarBtnDisabled: { backgroundColor: "#999" },
  bayarBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
