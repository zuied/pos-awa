import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },
  left: { flex: 2, padding: 8, borderRightWidth: 1, borderRightColor: "#ddd" },
  right: { flex: 1, padding: 8 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  cartItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  cartName: { fontSize: 16 },
  cartPrice: { fontSize: 16, fontWeight: "bold" },
  total: { fontSize: 18, fontWeight: "bold", marginVertical: 8 },
  row: { flexDirection: "row", marginVertical: 8 },
  metodeBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#ccc", alignItems: "center", marginRight: 4, borderRadius: 4 },
  metodeActive: { backgroundColor: "#cce5ff", borderColor: "#3399ff" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginVertical: 4, borderRadius: 4 },
  kembali: { fontSize: 16, marginBottom: 8 },
  payBtn: { backgroundColor: "#3399ff", padding: 12, borderRadius: 6, alignItems: "center" },
  payText: { color: "#fff", fontWeight: "bold" },
});

export default styles;
