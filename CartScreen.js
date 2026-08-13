import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import { simpanTransaksi } from "./api";

export default function CartScreen({ route, navigation }) {
  const { cartItems } = route.params;
  const [loading, setLoading] = useState(false);

  const totalHarga = cartItems.reduce(
    (sum, item) => sum + Number(item.harga) * (item.jumlah || item.qty || 1),
    0
  );

  const handleBayar = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Keranjang kosong");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        action: "simpanTransaksi",
        transaksi: {
          id_transaksi: `TRX-${Date.now()}`,
          waktu_transaksi: new Date().toLocaleString("id-ID"),
          total_harga: totalHarga,
          metode_pembayaran: "Tunai",
          item_dibeli: cartItems.map((i) => ({
            nama_produk: i.nama_produk,
            harga: i.harga,
            jumlah: i.jumlah || i.qty || 1,
          })),
        },
      };

      const result = await simpanTransaksi(payload);

      if (result?.status === "success") {
        Alert.alert("✅ Sukses", "Transaksi tersimpan!", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      } else {
        Alert.alert("Gagal", result?.message || "Terjadi kesalahan");
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        data={cartItems}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.nama_produk} ×{item.jumlah || item.qty || 1}
            </Text>
            <Text style={styles.itemHarga}>
              Rp{" "}
              {(
                Number(item.harga) * (item.jumlah || item.qty || 1)
              ).toLocaleString("id-ID")}
            </Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <Text style={styles.total}>
          Total: Rp {totalHarga.toLocaleString("id-ID")}
        </Text>
        <TouchableOpacity
          style={[styles.btn, loading && { backgroundColor: "#999" }]}
          onPress={handleBayar}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Menyimpan..." : "💳 Bayar Sekarang"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemName: { fontSize: 14, color: "#333" },
  itemHarga: { fontWeight: "bold", color: "#c00" },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  total: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  btn: {
    backgroundColor: "#c00",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
