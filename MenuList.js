import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { getMenu } from "./api";

export default function MenuList({ menu: menuProp, cart = [], onAddToCart, onDecrease }) {
  const [menuItems, setMenuItems] = useState(menuProp || []);
  const [loading, setLoading] = useState(!menuProp || menuProp.length === 0);

  useEffect(() => {
    // Jika menu dikirim dari parent (HomeScreen), langsung pakai — bahkan saat kosong
    if (menuProp !== undefined) {
      setMenuItems(menuProp || []);
      setLoading(false);
      return;
    }
    // Fallback: load sendiri
    loadMenu();
  }, [menuProp]);

  const loadMenu = async () => {
    try {
      const res = await getMenu();
      const data = Array.isArray(res) ? res : res?.data || [];
      setMenuItems(data);
    } catch (err) {
      console.log("Load menu error:", err);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const found = cart.find(
      (i) => String(i.id_produk) === String(item.id_produk)
    );
    const qty = found ? found.jumlah : 0;

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => onAddToCart(item)}>
          <Image
            source={{
              uri:
                item.url_gambar ||
                item.gambar ||
                item.image ||
                "https://placehold.co/100x100?text=Menu",
            }}
            style={styles.itemImage}
          />
        </TouchableOpacity>

        <Text style={styles.itemName} numberOfLines={2}>
          {item.nama_produk}
        </Text>
        <Text style={styles.itemPrice}>
          Rp {Number(item.harga).toLocaleString("id-ID")}
        </Text>

        <View style={styles.qtyBox}>
          <TouchableOpacity
            onPress={() => onDecrease(item)}
            style={[styles.btn, qty === 0 && styles.btnDisabled]}
            disabled={qty === 0}
          >
            <Text style={styles.btnText}>−</Text>
          </TouchableOpacity>

          <Text style={styles.qty}>{qty}</Text>

          <TouchableOpacity
            onPress={() => onAddToCart(item)}
            style={styles.btn}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Memuat menu...</Text>
      </View>
    );
  }

  if (menuItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "#aaa" }}>Menu tidak tersedia</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={menuItems}
      renderItem={renderItem}
      keyExtractor={(item, index) =>
        item.id_produk ? String(item.id_produk) : String(index)
      }
      numColumns={2}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 6 },
  itemContainer: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    padding: 10,
    elevation: 2,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#f0f0f0",
  },
  itemName: {
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 13,
    color: "#222",
    marginBottom: 2,
  },
  itemPrice: {
    color: "#c00",
    marginBottom: 6,
    fontWeight: "bold",
    fontSize: 13,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    backgroundColor: "#c00",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnDisabled: {
    backgroundColor: "#ddd",
  },
  btnText: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  qty: { fontSize: 16, fontWeight: "bold", minWidth: 20, textAlign: "center" },
  loadingContainer: { padding: 20, alignItems: "center" },
});
