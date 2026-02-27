import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getRekap } from "./api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";


const screenWidth = Dimensions.get("window").width;

export default function RekapScreen() {
  const [data, setData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tglAwal, setTglAwal] = useState(null);
  const [tglAkhir, setTglAkhir] = useState(null);
  const [showAwal, setShowAwal] = useState(false);
  const [showAkhir, setShowAkhir] = useState(false);

  

  // ================= LOAD DATA =================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getRekap();
      setData(res || []);
    } catch (err) {
      console.log(err);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };


  // ===========HELPER PARSE TANGGAL (WAJIB)=========================
const parseTanggal = (val) => {
    if (!val) return null;

    try {
      const [tglPart, jamPart] = val.split(",");
      if (!tglPart) return null;

      let [dd, mm, yyyy] = tglPart.trim().split("/");

      dd = dd.padStart(2, "0");
      mm = mm.padStart(2, "0");

      const jamFix = jamPart
        ? jamPart.trim().replace(/\./g, ":")
        : "00:00:00";

      return new Date(`${yyyy}-${mm}-${dd}T${jamFix}`);
    } catch {
      return null;
    }
  };

  const parseItems = (trx) => {
    let items = trx.item_dibeli;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    return items || [];
  };

  // ================= FILTER =================
  const filteredData = useMemo(() => {
    if (!tglAwal && !tglAkhir) return data;

    return data.filter((trx) => {
      const tgl = parseTanggal(trx.waktu_transaksi);
      if (!tgl) return false;

      if (tglAwal) {
        const start = new Date(tglAwal);
        start.setHours(0, 0, 0, 0);
        if (tgl < start) return false;
      }

      if (tglAkhir) {
        const end = new Date(tglAkhir);
        end.setHours(23, 59, 59, 999);
        if (tgl > end) return false;
      }

      return true;
    });
  }, [data, tglAwal, tglAkhir]);

  // ================= KPI =================
  const jumlahTransaksi = filteredData.length;

  const totalOmzet = useMemo(() => {
    return filteredData.reduce(
      (sum, i) => sum + Number(i.total_harga || 0),
      0
    );
  }, [filteredData]);

const totalTunai = useMemo(() => {
  return filteredData.reduce((sum, trx) => {
    if (trx.metode_pembayaran === "Tunai") {
      return sum + Number(trx.total_harga || 0);
    }
    return sum;
  }, 0);
}, [filteredData]);

const totalQRIS = useMemo(() => {
  return filteredData.reduce((sum, trx) => {
    if (trx.metode_pembayaran === "QRIS") {
      return sum + Number(trx.total_harga || 0);
    }
    return sum;
  }, 0);
}, [filteredData]);

  // ================= PRODUK TERLARIS =================
  const produkTerjual = useMemo(() => {
    const map = {};

    filteredData.forEach((trx) => {
      const items = parseItems(trx);

      items.forEach((it) => {
        const nama = it.nama_produk || "Tanpa Nama";
        const qty = Number(it.jumlah || 0);
        map[nama] = (map[nama] || 0) + qty;
      });
    });

    return Object.entries(map)
      .map(([nama_produk, jumlah]) => ({ nama_produk, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5);
  }, [filteredData]);

  // ================= CHART =================
  const chartData = useMemo(() => {
    const byDate = {};

    filteredData.forEach((trx) => {
      const tgl = parseTanggal(trx.waktu_transaksi);
      if (!tgl) return;

      const key = tgl.toLocaleDateString("id-ID");
      byDate[key] = (byDate[key] || 0) + Number(trx.total_harga || 0);
    });

    const labels = Object.keys(byDate).slice(-7);
    const values = Object.values(byDate).slice(-7);

    return {
      labels: labels.length ? labels : ["-"],
      datasets: [{ data: values.length ? values : [0] }],
    };
  }, [filteredData]);

  // ================= EXPORT EXCEL =================
  const exportExcel = () => {
    const rows = [];

    filteredData.forEach((trx) => {
      const items = parseItems(trx);

      items.forEach((it) => {
        rows.push({
          id_transaksi: trx.id_transaksi,
          waktu_transaksi: trx.waktu_transaksi,
          metode: trx.metode_pembayaran,
          nama_produk: it.nama_produk,
          qty: it.jumlah,
          harga: it.harga,
          subtotal: Number(it.harga) * Number(it.jumlah),
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Penjualan");

    XLSX.writeFile(wb, "rekap_detail_penjualan.xlsx");
  };

  // ================= EXPORT PDF =================
  const exportPDF = () => {
  const doc = new jsPDF();
  doc.text("Rekap Detail Penjualan", 14, 15);

  let y = 25;
  let grandTotal = 0;

  filteredData.forEach((trx, index) => {
    const trxTotal = Number(trx.total_harga || 0);
    grandTotal += trxTotal;

    const metode = trx.metode_pembayaran || "-";

doc.text(
  `${index + 1}. ${trx.id_transaksi} | ${trx.waktu_transaksi} | ${metode}`,
  14,
  y
);
    y += 6;

    const items = parseItems(trx);

    items.forEach((it) => {
      const subtotal =
        Number(it.harga || 0) * Number(it.jumlah || 0);

      doc.text(
        `- ${it.nama_produk} x${it.jumlah} = Rp ${subtotal.toLocaleString(
          "id-ID"
        )}`,
        18,
        y
      );
      y += 6;

      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    // ✅ GARIS
    doc.text("--------------------------------", 18, y);
    y += 5;

    // ✅ TOTAL PER TRANSAKSI (INI YANG KAMU MAU)
    doc.text(
      `TOTAL: Rp ${trxTotal.toLocaleString("id-ID")}`,
      18,
      y
    );
    y += 8;
  });

  // ================= GRAND TOTAL =================
  doc.text("================================", 14, y);
  y += 6;

  doc.text(
    `GRAND TOTAL: Rp ${grandTotal.toLocaleString("id-ID")}`,
    14,
    y
  );

    doc.save("rekap_detail_penjualan.pdf");
  };

  // ================= PRINT =================
  const printLaporanHarian = () => {
  if (Platform.OS !== "web") {
    Alert.alert("Print hanya jalan di web");
    return;
  }

  let tunai = 0;
  let qris = 0;

  const map = {};

  filteredData.forEach((trx) => {
    const total = Number(trx.total_harga || 0);

    if (trx.metode_pembayaran === "Tunai") tunai += total;
    if (trx.metode_pembayaran === "QRIS") qris += total;

    const items = parseItems(trx);
    items.forEach((it) => {
      const nama = it.nama_produk;
      const qty = Number(it.jumlah || 0);
      map[nama] = (map[nama] || 0) + qty;
    });
  });

  const produkList = Object.entries(map)
    .map(
      ([nama, qty]) =>
        `<div style="display:flex;justify-content:space-between;"><span>${nama}</span><span>${qty}</span></div>`
    )
    .join("");

  const html = `
    <html>
    <body style="font-family: monospace; width:300px;">
      <div style="text-align:center;">
        <b>AWA MERANTI</b><br/>
        Laporan Harian<br/>
        ${new Date().toLocaleDateString("id-ID")}
      </div>
      <hr/>
      <div>Total Transaksi: ${jumlahTransaksi}</div>
      <div>Total Omzet: Rp ${totalOmzet.toLocaleString("id-ID")}</div>
      <div>Tunai: Rp ${tunai.toLocaleString("id-ID")}</div>
      <div>QRIS: Rp ${qris.toLocaleString("id-ID")}</div>
      <hr/>
      <b>Produk Terjual</b>
      ${produkList}
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) return Alert.alert("Popup diblok");

  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

  // ================= LOADING =================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Memuat dashboard...</Text>
      </SafeAreaView>
    );
  }

  const isMobile = screenWidth < 768;

  // ================= UI =================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>📊 Dashboard Penjualan</Text>

        {/* FILTER */}
        <View
          style={[
            styles.filterRow,
            { flexDirection: isMobile ? "column" : "row" },
          ]}
        >
          {/* WEB */}
          {Platform.OS === "web" ? (
            <>
              <input
                type="date"
                style={styles.webInput}
                onChange={(e) =>
                  setTglAwal(e.target.value ? new Date(e.target.value) : null)
                }
              />
              <input
                type="date"
                style={styles.webInput}
                onChange={(e) =>
                  setTglAkhir(e.target.value ? new Date(e.target.value) : null)
                }
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAwal(true)}
              >
                <Text>
                  {tglAwal
                    ? tglAwal.toLocaleDateString("id-ID")
                    : "Tanggal Awal"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAkhir(true)}
              >
                <Text>
                  {tglAkhir
                    ? tglAkhir.toLocaleDateString("id-ID")
                    : "Tanggal Akhir"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* BUTTON */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.btn} onPress={exportExcel}>
            <Text style={styles.btnText}>📥 Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={exportPDF}>
            <Text style={styles.btnText}>📄 PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={printLaporanHarian}>
            <Text style={styles.btnText}>🧾 Print</Text>
          </TouchableOpacity>
        </View>

        {/* KPI */}
        <View
  style={[
    styles.kpiRow,
    { flexDirection: isMobile ? "column" : "row" },
  ]}
  >
  <View style={styles.kpiCard}>
    <Text>🧾 Transaksi</Text>
    <Text style={styles.kpiValue}>{jumlahTransaksi}</Text>
  </View>

  <View style={styles.kpiCard}>
    <Text>💰 Omzet</Text>
    <Text style={styles.kpiValue}>
      Rp {totalOmzet.toLocaleString("id-ID")}
    </Text>
  </View>

  <View style={styles.kpiCard}>
    <Text>💵 Tunai</Text>
    <Text style={styles.kpiValue}>
      Rp {totalTunai.toLocaleString("id-ID")}
    </Text>
  </View>

  <View style={styles.kpiCard}>
    <Text>📱 QRIS</Text>
    <Text style={styles.kpiValue}>
      Rp {totalQRIS.toLocaleString("id-ID")}
    </Text>
  </View>
</View>

        {/* CHART */}
    <Text style={styles.sectionTitle}>📈 Grafik Omzet</Text>
    <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (o = 1) => `rgba(0,123,255,${o})`,
          }}
          bezier
        />

        {/* PRODUK TERLARIS */}
    <Text style={styles.sectionTitle}>🔥 Produk Terlaris</Text>
    {produkTerjual.map((item, i) => (
  <View key={i} style={styles.topItem}>
    <Text style={styles.topName}>
      {i + 1}. {item.nama_produk}
    </Text>

    <View style={styles.qtyBadge}>
      <Text style={styles.qtyText}>{item.jumlah}</Text>
    </View>
  </View>
))}
        {/* LIST */}
        <Text style={styles.sectionTitle}>📋 List Transaksi</Text>
        <FlatList
          data={filteredData}
          renderItem={({ item }) => {
  const items = parseItems(item);
  const totalQty = items.reduce((sum, it) => sum + Number(it.jumlah || 0),
    0
  );

  return (
    <TouchableOpacity
  style={styles.item}
  onPress={() =>
    setExpandedId(
      expandedId === item.id_transaksi
        ? null
        : item.id_transaksi
    )
  }
>
      <Text style={styles.idText}>
        #{item.id_transaksi || item.id || "-"}
      </Text>
      
      <Text style={styles.time}>
        🕒 {item.waktu_transaksi}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={styles.total}>
          Rp {Number(item.total_harga).toLocaleString("id-ID")}
        </Text>

        <Text style={styles.metodeBadge}>
          {item.metode_pembayaran}
        </Text>
      </View>

      <Text style={styles.qtyInfo}>
        {items.length} item • {totalQty} pcs
      </Text>
      {expandedId === item.id_transaksi && (
  <View style={styles.detailBox}>
    {items.map((it, idx) => (
      <Text key={idx} style={styles.detailText}>
        - {it.nama_produk} x{it.jumlah}
      </Text>
    ))}
  </View>
)}
</TouchableOpacity>
  );
}}
      />
    </ScrollView>
    {/* NATIVE PICKER */}
      {showAwal && Platform.OS !== "web" && (
        <DateTimePicker
          value={tglAwal || new Date()}
          mode="date"
          onChange={(e, d) => {
            setShowAwal(false);
            if (d) setTglAwal(d);
          }}
        />
      )}

      {showAkhir && Platform.OS !== "web" && (
        <DateTimePicker
          value={tglAkhir || new Date()}
          mode="date"
          onChange={(e, d) => {
            setShowAkhir(false);
            if (d) setTglAkhir(d);
          }}
        />
      )}
  </SafeAreaView>
);
}

 // ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f7f9fc" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },

  filterRow: { gap: 8, marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    flex: 1,
  },

  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },

  btn: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  btnText: { color: "#fff", fontWeight: "bold" },

  kpiRow: { gap: 10, marginBottom: 16 },

  kpiCard: {
    flex: 1,
    backgroundColor: "#eef6ff",
    padding: 14,
    borderRadius: 10,
  },

  kpiValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
  },

  item: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },

  //id: { fontWeight: "bold" },

  time: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  total: {
    fontWeight: "bold",
    fontSize: 15,
  },

  metodeBadge: {
    fontSize: 11,
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  qtyInfo: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },
  topItem: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},

topName: {
  fontSize: 14,
},

qtyBadge: {
  backgroundColor: "#007bff",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  minWidth: 36,
  alignItems: "center",
},

qtyText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 12,
},

detailBox: {
  marginTop: 8,
  paddingTop: 6,
  borderTopWidth: 1,
  borderTopColor: "#eee",
},

detailText: {
  fontSize: 12,
  color: "#444",
  marginTop: 2,
},
});