import React, { useState } from "react";
import { View, Alert, StyleSheet } from "react-native";
import MenuList from "./MenuList";

export default function ParentComponent({ menu }) {
  const [cart, setCart] = useState([]);

  // Tambah item ke cart
  const addItem = (item) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id_produk === item.id_produk);
      if (found) {
        return prev.map((i) =>
          i.id_produk === item.id_produk ? { ...i, jumlah: i.jumlah + 1 } : i
        );
      } else {
        return [...prev, { ...item, jumlah: 1 }];
      }
    });
  };

  // Hapus / kurangi item dari cart
  const removeItem = (item) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id_produk === item.id_produk ? { ...i, jumlah: i.jumlah - 1 } : i
        )
        .filter((i) => i.jumlah > 0)
    );
  };

  // Callback Bayar
  const handleBayar = ({ total, bayar, kembali, metode }) => {
    Alert.alert(
      "Transaksi Berhasil",
      `Metode: ${metode}\nTotal: Rp ${total}\nBayar: Rp ${bayar}\nKembali: Rp ${kembali}`
    );
    // Reset cart
    setCart([]);
  };

  return (
    <View style={{ flex: 1 }}>
      <MenuList
        menuItems={menu}
        cart={cart}
        onAdd={addItem}
        onRemove={removeItem}
        onBayar={handleBayar} // hanya satu tombol bayar
      />
    </View>
  );
}

const styles = StyleSheet.create({});
