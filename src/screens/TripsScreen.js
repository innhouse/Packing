import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { store } from "../store";
import { colors, fonts } from "../theme";
import { ui, Btn, Header } from "../ui";

export default function TripsScreen({ me, trips, lists, mode, onWho, onOpen }) {
  const [name, setName] = useState("");
  const [dates, setDates] = useState("");
  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = store.addTrip(n, dates.trim());
    setName("");
    setDates("");
    onOpen(id);
  };
  return (
    <ScrollView contentContainerStyle={[ui.body, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
      <Header
        title="Family Packing"
        sub={mode === "local" ? "Saved on this device only (sync not set up yet)" : "Synced for the whole family"}
        right={
          <TouchableOpacity onPress={onWho} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
            <Text style={{ fontSize: fonts.small, color: colors.primary, fontWeight: "700" }}>{me.name} · Family</Text>
          </TouchableOpacity>
        }
      />
      <Text style={ui.label}>Trips</Text>
      {trips.length === 0 && <Text style={{ color: colors.inkSoft, marginBottom: 8 }}>No trips yet. Add one below.</Text>}
      {trips.map((t) => {
        const ls = lists.filter((l) => l.tripId === t.id);
        const total = ls.reduce((a, l) => a + (l.total || 0), 0);
        const done = ls.reduce((a, l) => a + (l.done || 0), 0);
        return (
          <TouchableOpacity key={t.id} onPress={() => onOpen(t.id)} style={[ui.card, { padding: 16 }]} accessibilityRole="button">
            <Text style={{ fontSize: fonts.big, fontWeight: "800", color: colors.ink }}>{t.name}</Text>
            {!!t.dates && <Text style={ui.sub}>{t.dates}</Text>}
            <Text style={[ui.sub, { marginTop: 6 }]}>
              {ls.length === 0 ? "No lists yet" : `${ls.length} list${ls.length === 1 ? "" : "s"} · ${done} of ${total} packed`}
            </Text>
          </TouchableOpacity>
        );
      })}
      <Text style={ui.label}>New trip</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Where to?"
        placeholderTextColor={colors.inkSoft}
        maxLength={60}
        accessibilityLabel="Trip name"
        style={ui.input}
      />
      <TextInput
        value={dates}
        onChangeText={setDates}
        placeholder="Dates (optional)"
        placeholderTextColor={colors.inkSoft}
        maxLength={40}
        accessibilityLabel="Trip dates"
        onSubmitEditing={add}
        style={[ui.input, { marginTop: 8 }]}
      />
      <Btn label="Add trip" onPress={add} disabled={!name.trim()} />
    </ScrollView>
  );
}
