import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors, fonts } from "../theme";
import { ui, Btn, Header } from "../ui";

export default function WhoScreen({ members, me, onPick, onAdd, onDone }) {
  const [name, setName] = useState("");
  const add = () => {
    const n = name.trim();
    if (!n) return;
    setName("");
    onAdd(n, !me);
  };
  return (
    <ScrollView contentContainerStyle={[ui.body, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
      <Header
        title={members.length ? "Who's packing?" : "Welcome"}
        sub={
          members.length
            ? "Tap your name. This phone will remember it."
            : "Add yourself to get started. You can add the rest of the family afterwards."
        }
        onBack={onDone}
        backLabel="Done"
      />
      {members.map((m) => (
        <TouchableOpacity key={m.id} onPress={() => onPick(m.id)} style={[ui.card, { padding: 16, flexDirection: "row", alignItems: "center" }]} accessibilityRole="button">
          <Text style={{ flex: 1, fontSize: fonts.big, fontWeight: "700", color: colors.ink }}>{m.name}</Text>
          {me && me.id === m.id && <Text style={{ color: colors.primary, fontWeight: "700" }}>You</Text>}
        </TouchableOpacity>
      ))}
      <Text style={ui.label}>{members.length ? "Add a family member" : "Your name"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.inkSoft}
          maxLength={30}
          onSubmitEditing={add}
          returnKeyType="done"
          accessibilityLabel="Name"
          style={[ui.input, { flex: 1, marginRight: 8 }]}
        />
        <Btn label="Add" onPress={add} disabled={!name.trim()} />
      </View>
    </ScrollView>
  );
}
