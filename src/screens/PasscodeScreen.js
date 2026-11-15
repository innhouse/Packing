import React, { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { signIn } from "../auth";
import { colors, fonts } from "../theme";
import { ui, Btn, Header } from "../ui";

const MESSAGES = {
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
  "auth/network-request-failed": "Can't reach the family database. Check your connection and try again.",
};

export default function PasscodeScreen() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = () => {
    if (!code || busy) return;
    setBusy(true);
    setErr("");
    signIn(code).catch((e) => {
      setBusy(false);
      setErr(MESSAGES[e && e.code] || "That passcode isn't right.");
    });
  };
  return (
    <ScrollView contentContainerStyle={[ui.body, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
      <Header title="Family Packing" sub="Enter the family passcode. This device will remember it." />
      <Text style={ui.label}>Passcode</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={go}
        returnKeyType="go"
        accessibilityLabel="Family passcode"
        placeholder="Passcode"
        placeholderTextColor={colors.inkSoft}
        style={ui.input}
      />
      {!!err && <Text style={{ color: colors.danger, fontSize: fonts.small, marginTop: 8 }}>{err}</Text>}
      <Btn label={busy ? "Checking…" : "Open"} onPress={go} disabled={!code || busy} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}
