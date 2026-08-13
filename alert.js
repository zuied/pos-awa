// Helper notifikasi lintas platform:
//  - Native  → pakai Alert.alert (dialog bawaan)
//  - Web     → pakai window.confirm / window.alert (Alert.alert di react-native-web no-op)

import { Alert, Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

export function confirmAlert(title, message, onYes, opts = {}) {
  const yesText = opts.yesText || "OK";
  if (IS_WEB) {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(message || title)) {
        if (onYes) onYes();
      }
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "Batal", style: "cancel" },
    {
      text: yesText,
      style: opts.destructive ? "destructive" : "default",
      onPress: () => onYes && onYes(),
    },
  ]);
}

export function showAlert(title, message, onOk) {
  if (IS_WEB) {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message || title);
    }
    if (onOk) onOk();
    return;
  }
  Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
}
