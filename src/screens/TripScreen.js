import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { store } from "../store";
import { colors, fonts } from "../theme";
import { ui, Btn, Header, confirmAction } from "../ui";

export default function TripScreen({ trip, me, members, lists, onBack, onOpen, onNew }) {
  const nameOf = (id) => (id === "shared" ? "Shared" : (members.find((m) => m.id === id) || {}).name || "Someone");
  const sorted = lists.slice().sort((a, b) => {
    const am = a.memberId === me.id ? 0 : 1;
    const bm = b.memberId === me.id ? 0 : 1;
    return am - bm || a.createdAt - b.createdAt;
  });
  return (
    <ScrollView contentContainerStyle={[ui.body, { paddingBottom: 60 }]}>
      <Header title={trip.name} sub={trip.dates} onBack={onBack} backLabel="Trips" />
      <Text style={ui.label}>Packing lists</Text>
      {sorted.length === 0 && <Text style={{ color: colors.inkSoft, marginBottom: 8 }}>Nobody has a list for this trip yet.</Text>}
      {sorted.map((l) => {
        const pct = l.total ? Math.round(((l.done || 0) / l.total) * 100) : 0;
        return (
          <TouchableOpacity key={l.id} onPress={() => onOpen(l.id)} style={[ui.card, { padding: 16 }]} accessibilityRole="button">
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ flex: 1, fontSize: fonts.big, fontWeight: "800", color: colors.ink }}>
                {l.title || nameOf(l.memberId)}
              </Text>
              <Text style={{ fontSize: fonts.small, color: colors.inkSoft }}>
                {l.done || 0} of {l.total || 0}
              </Text>
            </View>
            {!!l.title && <Text style={ui.sub}>{nameOf(l.memberId)}</Text>}
            <View style={{ height: 8, backgroundColor: colors.line, borderRadius: 99, marginTop: 10, overflow: "hidden" }}>
              <View style={{ height: 8, width: pct + "%", backgroundColor: colors.primary, borderRadius: 99 }} />
            </View>
          </TouchableOpacity>
        );
      })}
      <Btn label="Add a list" onPress={onNew} />
      <View style={{ height: 30 }} />
      <Btn
        label="Remove this trip"
        kind="danger"
        small
        style={{ alignSelf: "flex-start" }}
        onPress={() =>
          confirmAction("Remove this trip?", "The trip and its lists will be hidden for everyone.", "Remove", () => {
            store.updateTrip(trip.id, { hidden: true });
            onBack();
          })
        }
      />
    </ScrollView>
  );
}
