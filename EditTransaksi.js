import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { getMenu, editTransaksi } from "./api";

export default function EditTransaksi({ route, navigation }) {
  const data = route?.params?.data || {};

  const parseItems = (raw) => {
    try {
      if (!raw) return [];
      if (typeof raw === "string") {
        const s = raw.trim();
        const unwrapped =
          s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
        const parsed = JSON.parse(unwrapped);
        if (typeof parsed === "string") return JSON.parse(parsed);
        return parsed;
      }
      if (Array.isArray(raw)) return raw;
      return [];
    } catch {
      return [];
    }
  };

  const [items, setItems] = useState(parseItems(data.item_dibeli));
  const [menu, setMenu] = useState([]);
  const [metode, setMetode] = useState(data.metode_pembayaran || "Tunai");
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await getMenu();
      setMenu(res || []);
    } catch (err) {
      console.log("loadMenu error:", err);
    } finally {
      setLoadingMenu(false);
    }
  };

  const tambahItem = (menuItem) => {
    setItems((prev) => {
      const exist = prev.find((i) => i.nama_produk === menuItem.nama_produk);
      if (exist) {
        return prev.map((i) =>
          i.nama_produk === menuItem.nama_produk
            ? { ...i, jumlah: i.jumlah + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          nama_produk: menuItem.nama_produk,
          harga: Number(menuItem.harga || 0),
          jumlah: 1,
        },
      ];
    });
  };

  const tambahQty = (index) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, jumlah: item.jumlah + 1 } : item
      )
    );
  };

  const kurangQty = (index) => {
    setItems((prev) => {
      const copy = prev.map((item, i) =>
        i === index ? { ...item, jumlah: item.jumlah - 1 } : item
      );
      return copy.filter((i) => i.jumlah > 0);
    });
  };

  const hapusItem = (index) => {
    Alert.alert("Hapus Item", "Yakin hapus item ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => setItems((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const total = items.reduce((sum, i) => sum + i.harga * i.jumlah, 0);

  const getQtyDiCart = (namaProduk) => {
    const found = items.find((i) => i.nama_produk === namaProduk);
    return found ? found.jumlah : 0;
  };

  const save = async () => {
    if (items.length === 0) {
      Alert.alert("Gagal", "Transaksi harus memiliki minimal 1 item");
      return;
    }
    try {
      const payload = {
        id_transaksi: data.id_transaksi || data.id,
        waktu_transaksi: data.waktu_transaksi,
        metode_pembayaran: metode,
        total_harga: total,
        item_dibeli: items,
      };
      const res = await editTransaksi(payload);
      if (res?.status === "success") {
        Alert.alert("✅ Sukses", "Transaksi diperbarui", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Gagal", res?.message || "Update gagal");
      }
    } catch (err) {
      Alert.alert("Error", "Terjadi kesalahan: " + err.message);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>✏️ Edit Transaksi</Text>
        <Text style={styles.subtitle}>#{data.id_transaksi || data.id}</Text>
      </View>

      {/* ===== ITEM TRANSAKSI ===== */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧾 Item Transaksi</Text>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Belum ada item — tambah dari menu di bawah
            </Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNama}>{item.nama_produk}</Text>
                <Text style={styles.itemHarga}>
                  Rp {Number(item.harga).toLocaleString("id-ID")} / pcs
                </Text>
                <Text style={styles.itemSubtotal}>
                  Subtotal: Rp {(item.harga * item.jumlah).toLocaleString("id-ID")}
                </Text>
              </View>
              <View style={styles.qtyArea}>
                <TouchableOpacity
                  style={styles.qtyBtnMin}
                  onPress={() => kurangQty(index)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>

                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyValue}>{item.jumlah}</Text>
                </View>

                <TouchableOpacity
                  style={styles.qtyBtnPlus}
                  onPress={() => tambahQty(index)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hapusBtn}
                  onPress={() => hapusItem(index)}
                >
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ===== TAMBAH MENU — GRID 2 KOLOM ===== */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>➕ Tambah Menu</Text>
        <Text style={styles.sectionHint}>Ketuk kartu untuk menambahkan</Text>

        {loadingMenu ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Memuat menu...</Text>
          </View>
        ) : menu.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Menu tidak tersedia</Text>
          </View>
        ) : (
          <View style={styles.menuGrid}>
            {menu.map((menuItem, index) => {
              const qty = getQtyDiCart(menuItem.nama_produk);
              const aktif = qty > 0;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuCard, aktif && styles.menuCardAktif]}
                  onPress={() => tambahItem(menuItem)}
                  activeOpacity={0.75}
                >
                  {/* Gambar */}
                  <Image
                    source={{
                      uri:
                        menuItem.url_gambar ||
                        menuItem.gambar ||
                        menuItem.image ||
                        "https://placehold.co/80x80?text=Menu",
                    }}
                    style={styles.menuGambar}
                  />

                  {/* Badge qty di pojok */}
                  {aktif && (
                    <View style={styles.qtyCartBadge}>
                      <Text style={styles.qtyCartText}>{qty}</Text>
                    </View>
                  )}

                  <Text style={styles.menuNama} numberOfLines={2}>
                    {menuItem.nama_produk}
                  </Text>
                  <Text style={styles.menuHarga}>
                    Rp {Number(menuItem.harga).toLocaleString("id-ID")}
                  </Text>

                  {/* Tombol tambah */}
                  <View style={[styles.tambahBtn, aktif && styles.tambahBtnAktif]}>
                    <Text style={[styles.tambahBtnText, aktif && styles.tambahBtnTextAktif]}>
                      {aktif ? `+ Tambah (${qty})` : "+ Tambah"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ===== METODE PEMBAYARAN ===== */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💳 Metode Pembayaran</Text>
        <View style={styles.metodeRow}>
          <TouchableOpacity
            style={[styles.metodeBtn, metode === "Tunai" && styles.metodeTunaiAktif]}
            onPress={() => setMetode("Tunai")}
          >
            <Text style={styles.metodeIcon}>💵</Text>
            <Text style={[styles.metodeLabel, metode === "Tunai" && styles.metodeLabelAktif]}>
              Tunai
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metodeBtn, metode === "QRIS" && styles.metodeQrisAktif]}
            onPress={() => setMetode("QRIS")}
          >
            <Text style={styles.metodeIcon}>📱</Text>
            <Text style={[styles.metodeLabel, metode === "QRIS" && styles.metodeLabelAktif]}>
              QRIS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== TOTAL & SIMPAN ===== */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalValue}>
            Rp {total.toLocaleString("id-ID")}
          </Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveText}>💾 SIMPAN PERUBAHAN</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f8",
  },

  // HEADER
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  // CARD WRAPPER
  card: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 10,
  },

  // EMPTY STATE
  emptyBox: {
    paddingVertical: 18,
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  emptyText: {
    color: "#bbb",
    fontStyle: "italic",
    fontSize: 13,
  },

  // ITEM TRANSAKSI
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cce0ff",
    padding: 12,
    marginBottom: 8,
  },
  itemNama: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#222",
  },
  itemHarga: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "bold",
    marginTop: 2,
  },
  qtyArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtnMin: {
    backgroundColor: "#e0e0e0",
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnPlus: {
    backgroundColor: "#007bff",
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 22,
  },
  qtyBadge: {
    backgroundColor: "#222",
    minWidth: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  qtyValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  hapusBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  // MENU GRID
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  menuCard: {
    width: "47%",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    padding: 10,
    alignItems: "center",
    position: "relative",
  },
  menuCardAktif: {
    borderColor: "#007bff",
    backgroundColor: "#eef6ff",
  },
  menuGambar: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#eee",
  },
  qtyCartBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#007bff",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  qtyCartText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
  },
  menuNama: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#222",
    textAlign: "center",
    marginBottom: 2,
  },
  menuHarga: {
    fontSize: 12,
    color: "#555",
    marginBottom: 8,
  },
  tambahBtn: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  tambahBtnAktif: {
    backgroundColor: "#007bff",
  },
  tambahBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },
  tambahBtnTextAktif: {
    color: "#fff",
  },

  // METODE
  metodeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  metodeBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  metodeTunaiAktif: {
    backgroundColor: "#eaf4ff",
    borderColor: "#3498db",
  },
  metodeQrisAktif: {
    backgroundColor: "#eafaf1",
    borderColor: "#2ecc71",
  },
  metodeIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  metodeLabel: {
    fontWeight: "bold",
    color: "#888",
    fontSize: 13,
  },
  metodeLabelAktif: {
    color: "#222",
  },

  // FOOTER
  footer: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 15,
    color: "#555",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  saveBtn: {
    backgroundColor: "#27ae60",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  saveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
