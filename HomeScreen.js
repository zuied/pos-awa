import React, { useEffect, useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, SafeAreaView, StyleSheet } from "react-native";
import MenuList from "./MenuList";
import { getMenu, simpanTransaksi } from "./api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

export default function HomeScreen({ navigation }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [metode, setMetode] = useState("Tunai");
  const [bayar, setBayar] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [lastPayTime, setLastPayTime] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getMenu();
      setMenu(data);
    })();
  }, []);

  // ================= NETWORK LISTENER =================
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setIsOffline(!state.isConnected);
  });

  return () => unsubscribe();
}, []);

// ================= AUTO SYNC QUEUE =================
useEffect(() => {
  if (!isOffline) {
    processQueue();
  }
}, [isOffline]);

  const addToCart = (item) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id_produk === item.id_produk);
      if (exist) return prev.map((i) => i.id_produk === item.id_produk ? {...i, jumlah: i.jumlah+1} : i);
      return [...prev, {...item, jumlah:1}];
    });
  };

  const removeFromCart = (item) => {
    setCart((prev) => {
      const exist = prev.find((i) => i.id_produk === item.id_produk);
      if (!exist) return prev;
      if (exist.jumlah === 1) return prev.filter((i) => i.id_produk !== item.id_produk);
      return prev.map((i) => i.id_produk === item.id_produk ? {...i, jumlah: i.jumlah-1} : i);
    });
  };

  const totalHarga = useMemo(() => cart.reduce((sum, i) => sum + Number(i.harga) * i.jumlah, 0), [cart]);
  const kembalian = metode === "Tunai" ? Math.max(Number(bayar || 0) - totalHarga, 0) : 0;

  const PAY_COOLDOWN = 1500; // ms anti spam

  // ================= GENERATE ID TRANSAKSI =================
const generateTrxId = () => {
  const now = new Date();

  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit

  return `TRX-${yy}${mm}${dd}-${rand}`;
};

// ================= OFFLINE QUEUE =================
const QUEUE_KEY = "offline_queue";

const saveToQueue = async (payload) => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const arr = existing ? JSON.parse(existing) : [];

    arr.push(payload);

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
    console.log("💾 Masuk offline queue");
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
        if (res?.status !== "success") {
          remaining.push(payload);
        }
      } catch {
        remaining.push(payload);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    console.log("✅ Queue selesai. Sisa:", remaining.length);
  } catch (e) {
    console.log("❌ processQueue error", e);
  }
};
const handlePay = async () => {
  console.log("🔥 BAYAR DIKLIK");

  const now = Date.now();

  // ================= HARD GUARD =================
  if (isPaying) {
    console.log("⛔ Masih proses...");
    return;
  }

  // ================= ANTI SPAM TAP =================
  if (now - lastPayTime < PAY_COOLDOWN) {
    console.log("⚡ Spam tap blocked");
    return;
  }

  // ================= VALIDASI =================
  if (cart.length === 0) {
    Alert.alert("Keranjang kosong");
    return;
  }

  if (metode === "Tunai" && Number(bayar) < totalHarga) {
    Alert.alert("Uang kurang");
    return;
  }

  setIsPaying(true);
  setLastPayTime(now);

  const safetyTimeout = setTimeout(() => {
    console.log("🛑 Force unlock (timeout)");
    setIsPaying(false);
  }, 15000);

  try {
    const trxId = generateTrxId();

    const payload = {
      action: "simpanTransaksi",
      transaksi: {
        id_transaksi: trxId,
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

    console.log("📦 PAYLOAD:", payload);

    // ================= CEK INTERNET =================
    const net = await NetInfo.fetch();

    if (!net.isConnected) {
      console.log("📴 OFFLINE → simpan ke queue");

      const queue = JSON.parse(
        (await AsyncStorage.getItem("offline_queue")) || "[]"
      );

      queue.push(payload);
      await AsyncStorage.setItem("offline_queue", JSON.stringify(queue));

      Alert.alert("Offline", "Transaksi disimpan ke antrian 📦");

      setCart([]);
      setBayar("");
      return;
    }

    // ================= ONLINE =================
    const res = await simpanTransaksi(payload);

    console.log("📨 RESPONSE:", res);

    if (res?.status === "success") {
      Alert.alert("Transaksi berhasil masuk Sheet ✅");
      setCart([]);
      setBayar("");
    } else if (res?.status === "duplicate") {
      Alert.alert("Transaksi sedang diproses ⏳");
    } else {
      Alert.alert("Gagal simpan ❌", res?.message || "Unknown error");
    }
  } catch (err) {
    console.log("❌ HANDLE PAY ERROR:", err);

    // 🔥 fallback simpan ke queue
    const queue = JSON.parse(
      (await AsyncStorage.getItem("offline_queue")) || "[]"
    );

    queue.push({
      action: "simpanTransaksi",
      transaksi: {
        id_transaksi: `${Date.now()}-offline`,
        waktu_transaksi: new Date().toLocaleString("id-ID"),
        total_harga: totalHarga,
        metode_pembayaran: metode,
        item_dibeli: cart.map((i) => ({
          nama_produk: i.nama_produk,
          jumlah: i.jumlah,
          harga: i.harga,
        })),
      },
    });

    await AsyncStorage.setItem("offline_queue", JSON.stringify(queue));

    Alert.alert("Network error", "Disimpan ke antrian offline 📦");
  } finally {
    clearTimeout(safetyTimeout);
    setIsPaying(false);
  }
};

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text>{item.nama_produk} x{item.jumlah}</Text>
      <Text>Rp {(Number(item.harga)*item.jumlah).toLocaleString("id-ID")}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.left}>
        <MenuList menu={menu} cart={cart} onAddToCart={addToCart} onDecrease={removeFromCart} />
      </View>

      <View style={styles.right}>
        <TouchableOpacity onPress={() => navigation.navigate("Rekap")}>
          <Text style={{color:'blue', marginBottom:6}}>📊 Lihat Rekap</Text>
        </TouchableOpacity>

        <Text style={{fontSize:18,fontWeight:'bold'}}>🧾 Pesanan</Text>
        <FlatList data={cart} renderItem={renderCartItem} keyExtractor={(i)=>i.id_produk} style={{flexGrow:0}} />

        <Text>Total: Rp {totalHarga.toLocaleString("id-ID")}</Text>

        <View style={{flexDirection:'row', marginVertical:6}}>
          <TouchableOpacity onPress={()=>setMetode("Tunai")} style={{marginRight:10, padding:6, backgroundColor: metode==='Tunai'?'#ddd':'#fff'}}><Text>Tunai</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setMetode("QRIS")} style={{padding:6, backgroundColor: metode==='QRIS'?'#ddd':'#fff'}}><Text>QRIS</Text></TouchableOpacity>
        </View>

        {metode==='Tunai' && (
          <>
            <TextInput
              placeholder="Uang bayar"
              keyboardType="numeric"
              value={bayar}
              onChangeText={setBayar}
              style={{borderWidth:1,borderColor:'#ccc',padding:6,marginBottom:6}}
            />
            <Text>Kembalian: Rp {kembalian.toLocaleString("id-ID")}</Text>
          </>
        )}

        <TouchableOpacity
  onPress={handlePay}
  disabled={isPaying}
  style={{
    backgroundColor: isPaying ? "#999" : "blue",
    padding: 10,
    alignItems: "center",
    borderRadius: 6,
  }}
>
  <Text style={{ color: "#fff", fontWeight: "bold" }}>
    {isPaying ? "PROSES YA..." : "BAYAR"}
  </Text>
</TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,flexDirection:'row'},
  left:{flex:2,padding:10},
  right:{flex:1,padding:10,backgroundColor:'#f9f9f9'},
  cartItem:{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}
});
