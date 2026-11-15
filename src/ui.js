import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, fonts, radius } from "./theme";

// Web-safe confirm dialog. Alert.alert is a no-op in browsers, and some
// embedded browsers silently block window.confirm, so the web shows its own
// dialog through <ConfirmHost /> (mounted once in App.js).
let showConfirm = null;
export function ConfirmHost() {
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    showConfirm = setAsk;
    return () => {
      showConfirm = null;
    };
  }, []);
  const close = () => setAsk(null);
  return (
    <Sheet visible={!!ask} onClose={close} title={ask ? ask.title : ""}>
      {ask && !!ask.msg && <Text style={{ fontSize: fonts.body, color: colors.inkSoft, marginBottom: 6 }}>{ask.msg}</Text>}
      {ask && (
        <SheetRow
          label={ask.confirmLabel}
          danger
          onPress={() => {
            const go = ask.onConfirm;
            close();
            go();
          }}
        />
      )}
      <SheetRow label="Cancel" onPress={close} />
    </Sheet>
  );
}

export function confirmAction(title, msg, confirmLabel, onConfirm) {
  if (Platform.OS === "web") {
    if (showConfirm) showConfirm({ title, msg, confirmLabel: confirmLabel || "OK", onConfirm });
  } else {
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: onConfirm },
    ]);
  }
}

export function Btn({ label, onPress, kind = "primary", small, disabled, style }) {
  const bg = kind === "primary" ? colors.primary : kind === "danger" ? colors.dangerSoft : colors.card;
  const fg = kind === "primary" ? "#fff" : kind === "danger" ? colors.danger : colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        small ? ui.btnSmall : ui.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
        kind === "ghost" && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: small ? fonts.small : fonts.body, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ label, on, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[ui.pill, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ fontSize: fonts.small, fontWeight: "600", color: on ? "#fff" : colors.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Header({ title, sub, onBack, backLabel = "Back", right }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}>
        {!!onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 10 }}>
            <Text style={{ fontSize: fonts.body, color: colors.primary, fontWeight: "700" }}>‹ {backLabel}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Text style={ui.title}>{title}</Text>
      {!!sub && <Text style={ui.sub}>{sub}</Text>}
    </View>
  );
}

export function Check({ on, onPress, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!on }}
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      style={[ui.check, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      {on ? <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", lineHeight: 18 }}>✓</Text> : null}
    </TouchableOpacity>
  );
}

// Number box that saves when you leave it.
export function QtyBox({ value, onChange, label }) {
  const [t, setT] = useState(String(value || 1));
  useEffect(() => setT(String(value || 1)), [value]);
  const commit = () => {
    const v = Math.max(1, Math.min(999, parseInt(t, 10) || 1));
    setT(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <TextInput
      value={t}
      onChangeText={(x) => setT(x.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      inputMode="numeric"
      selectTextOnFocus
      maxLength={3}
      accessibilityLabel={label || "Quantity"}
      style={ui.qty}
    />
  );
}

// Bottom sheet for menus and small forms.
export function Sheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={ui.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={ui.sheet}>
          {!!title && (
            <Text style={{ fontSize: fonts.big, fontWeight: "800", color: colors.ink, marginBottom: 8 }} numberOfLines={2}>
              {title}
            </Text>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetRow({ label, onPress, danger, disabled, sub }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[ui.sheetRow, disabled && { opacity: 0.35 }]} accessibilityRole="button">
      <Text style={{ fontSize: fonts.body, fontWeight: "600", color: danger ? colors.danger : colors.ink }}>{label}</Text>
      {!!sub && <Text style={{ fontSize: fonts.small, color: colors.inkSoft }}>{sub}</Text>}
    </TouchableOpacity>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 16 },
  title: { fontSize: fonts.title, fontWeight: "800", color: colors.ink },
  sub: { fontSize: fonts.small, color: colors.inkSoft, marginTop: 2 },
  label: {
    fontSize: fonts.tiny,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    overflow: "hidden",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonts.body,
    color: colors.ink,
  },
  btn: { borderRadius: radius, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", marginVertical: 5 },
  btnSmall: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 11, alignItems: "center" },
  pill: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.inkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    width: 46,
    textAlign: "center",
    fontSize: fonts.body,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 30,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    maxHeight: "80%",
  },
  sheetRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 8,
  },
});
