import React, { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { store, newId } from "../store";
import { TEMPLATES, buildFromSections, parsePasted } from "../template";
import { colors, fonts } from "../theme";
import { ui, Btn, Header, Pill } from "../ui";

export default function NewListScreen({ trip, trips, me, members, lists, onCancel, onCreated }) {
  const [who, setWho] = useState(me.id);
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("winter"); // template key | "copy" | "paste"
  const [copyId, setCopyId] = useState(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const nameOf = (id) => (id === "shared" ? "Shared" : (members.find((m) => m.id === id) || {}).name || "Someone");
  const tripName = (id) => (trips.find((t) => t.id === id) || {}).name || "Old trip";

  const create = async () => {
    setErr("");
    let built;
    if (from === "paste") {
      const data = parsePasted(pasted);
      if (!data || !data.length) {
        setErr("That doesn't look like a copied checklist. Use the “Copy for app” button on the web checklist, then paste here.");
        return;
      }
      built = buildFromSections(data, newId);
    } else if (from === "copy") {
      const src = lists.find((l) => l.id === copyId);
      if (!src) {
        setErr("Pick a list to copy.");
        return;
      }
      setBusy(true);
      // Read the source list's items once, then copy them with ticks cleared.
      const items = await new Promise((resolve) => {
        let done = false;
        let unsub = () => {};
        unsub = store.subItems(src.id, (rows, fromCache) => {
          if (done || fromCache) return;
          done = true;
          setTimeout(() => unsub(), 0);
          resolve(rows);
        });
        setTimeout(() => {
          if (!done) {
            done = true;
            unsub();
            resolve(null);
          }
        }, 8000);
      });
      if (!items) {
        setBusy(false);
        setErr("Couldn't load that list. Check your connection and try again.");
        return;
      }
      const map = {};
      const sections = (src.sections || []).map((s) => {
        map[s.id] = newId();
        return { id: map[s.id], title: s.title };
      });
      built = {
        sections,
        items: items
          .filter((i) => !i.removed && map[i.sectionId])
          .map((i) => ({
            id: newId(),
            name: i.name,
            note: i.note || "",
            qty: i.qty || 1,
            checked: false,
            sectionId: map[i.sectionId],
            order: i.order || 0,
            removed: false,
          })),
      };
    } else {
      built = buildFromSections(TEMPLATES.find((t) => t.key === from).data, newId);
    }
    setBusy(true);
    const id = await store.createList({ tripId: trip.id, memberId: who, title: title.trim(), ...built });
    setBusy(false);
    onCreated(id);
  };

  const copyable = lists.slice().sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScrollView contentContainerStyle={[ui.body, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
      <Header title="New list" sub={trip.name} onBack={onCancel} backLabel="Cancel" />

      <Text style={ui.label}>Whose list?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {members.map((m) => (
          <Pill key={m.id} label={m.id === me.id ? m.name + " (me)" : m.name} on={who === m.id} onPress={() => setWho(m.id)} />
        ))}
        <Pill label="Shared" on={who === "shared"} onPress={() => setWho("shared")} />
      </View>

      <Text style={ui.label}>Name (optional)</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Carry-on only"
        placeholderTextColor={colors.inkSoft}
        maxLength={40}
        accessibilityLabel="List name"
        style={ui.input}
      />

      <Text style={ui.label}>Start from</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {TEMPLATES.map((t) => (
          <Pill key={t.key} label={t.label} on={from === t.key} onPress={() => setFrom(t.key)} />
        ))}
        {copyable.length > 0 && <Pill label="Copy a list" on={from === "copy"} onPress={() => setFrom("copy")} />}
        <Pill label="Paste from web checklist" on={from === "paste"} onPress={() => setFrom("paste")} />
      </View>
      {TEMPLATES.some((t) => t.key === from) && (
        <Text style={ui.sub}>{TEMPLATES.find((t) => t.key === from).sub}</Text>
      )}
      {from === "copy" && (
        <View style={{ marginTop: 6 }}>
          {copyable.map((l) => (
            <Pill
              key={l.id}
              label={`${l.title || nameOf(l.memberId)} · ${tripName(l.tripId)}`}
              on={copyId === l.id}
              onPress={() => setCopyId(l.id)}
            />
          ))}
          <Text style={ui.sub}>Copies the items and quantities with the ticks cleared.</Text>
        </View>
      )}
      {from === "paste" && (
        <TextInput
          value={pasted}
          onChangeText={setPasted}
          placeholder="Paste the copied checklist here"
          placeholderTextColor={colors.inkSoft}
          multiline
          accessibilityLabel="Pasted checklist"
          style={[ui.input, { marginTop: 6, minHeight: 110, textAlignVertical: "top", fontSize: fonts.small }]}
        />
      )}

      {!!err && <Text style={{ color: colors.danger, marginTop: 10 }}>{err}</Text>}
      <View style={{ height: 12 }} />
      <Btn label={busy ? "Creating…" : "Create list"} onPress={create} disabled={busy} />
    </ScrollView>
  );
}
