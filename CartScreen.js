import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from "react-native";
import { simpanTransaksi } from "./api";

export default function CartScreen({ route, navigation }) {
  const { cartItems } = route.params;
  const [loading, setLoading] = useState(false);

  const totalHarga = cartItems.reduce((sum, item) => sum + item.harga * (item.qty || 1), 0);

  const handleBayar = async () => {
    setLoading(true);
    const transaksi = {
      id_transaksi: Date.now(),
      waktu_transaksi: new Date().toLocaleString(),
      total_harga: totalHarga,
      metode_pembayaran: "Tunai",
      item_dibeli: cartItems.map(i => ({
        nama_produk: i.nama_produk,
        harga: i.harga,
        qty: i.qty || 1
      }))
    };

    const result = await simpanTransaksi(transaksi);
    setLoading(false);

    if (result.status === "success") {
      Alert.alert("Sukses", "Transaksi tersimpan!");
      navigation.navigate("Home");
    } else {
      Alert.alert("Gagal", result.message || "Terjadi kesalahan");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 100 }}
        data={cartItems}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <Text style={{ marginVertical: 4 }}>
            {item.nama_produk} x {item.qty || 1} — Rp {item.harga}
          </Text>
        )}
      />
      <View style={styles.footer}>
        <Text style={styles.total}>Total: Rp {totalHarga}</Text>
        <TouchableOpacity style={styles.btn} onPress={handleBayar} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Menyimpan..." : "Bayar Sekarang"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#c00",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
