// MenuList.js
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

export default function MenuList({
  cart = [],
  onAddToCart,
  onDecrease,
}) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await getMenu();

      // 🔥 SUPPORT FORMAT GAS
      const data = Array.isArray(res)
        ? res
        : res?.data || [];

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
      (i) => i.id_produk === item.id_produk
    );
    const qty = found ? found.jumlah : 0;

    return (
      <View style={styles.itemContainer}>
        {/* IMAGE */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onAddToCart(item)}
        >
          <Image
            source={{
              uri:
                item.url_gambar ||
                item.gambar ||
                item.image ||
                "https://via.placeholder.com/100x100?text=No+Image",
            }}
            style={styles.itemImage}
          />
        </TouchableOpacity>

        <Text style={styles.itemName}>{item.nama_produk}</Text>

        <Text style={styles.itemPrice}>
          Rp {Number(item.harga).toLocaleString("id-ID")}
        </Text>

        {/* QTY */}
        <View style={styles.qtyBox}>
          <TouchableOpacity
            onPress={() => onDecrease(item)}
            style={styles.btn}
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

  return (
    <FlatList
      data={menuItems}
      renderItem={renderItem}
      keyExtractor={(item, index) =>
        item.id_produk
          ? String(item.id_produk)
          : String(index)
      }
      numColumns={2}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 10 },

  itemContainer: {
    flex: 1,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    padding: 12,
    elevation: 2,
  },

  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 6,
  },

  itemName: {
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },

  itemPrice: {
    color: "#c00",
    marginBottom: 6,
    fontWeight: "bold",
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  btn: {
    backgroundColor: "#c00",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },

  btnText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },

  qty: {
    fontSize: 18,
    fontWeight: "bold",
  },

  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
});
