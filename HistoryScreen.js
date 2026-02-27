import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { getRiwayat } from "./api";

export default function HistoryScreen() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getRiwayat().then(setData);
  }, []);

  return (
    <FlatList
      data={data}
      keyExtractor={(i, n) => n.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>ID: {item.id_transaksi}</Text>
          <Text>Total: Rp {item.total_harga}</Text>
          <Text>Metode: {item.metode_pembayaran}</Text>
          <Text>Waktu: {item.waktu_transaksi}</Text>
        </View>
      )}
    />
  );
}
