import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { store, newId } from "../store";
import { colors, fonts } from "../theme";
import { ui, Btn, Check, Header, Pill, QtyBox, Sheet, SheetRow, confirmAction } from "../ui";

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
const byOrder = (a, b) => (a.order || 0) - (b.order || 0) || byName(a, b);

export default function ListScreen({ listId, members, trip, onBack }) {
  const [list, setList] = useState(undefined);
  const [items, setItems] = useState(null);
  const [itemsLive, setItemsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [sortAZ, setSortAZ] = useState(false);
  const [flat, setFlat] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [menu, setMenu] = useState(null); // { kind: "item" | "move" | "edit" | "section" | "rename" | "removed", ... }
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [newSection, setNewSection] = useState("");
  const [clearArmed, setClearArmed] = useState(false);
  const clearTimer = useRef(null);

  useEffect(() => store.subList(listId, (l) => setList(l)), [listId]);
  useEffect(
    () =>
      store.subItems(listId, (rows, fromCache) => {
        setItems(rows);
        if (!fromCache) setItemsLive(true);
      }),
    [listId]
  );
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  // View settings are per device.
  const VIEW_KEY = "familypacking.view." + listId;
  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY)
      .then((s) => {
        if (!s) return;
        const v = JSON.parse(s);
        setCollapsed(v.collapsed || {});
        setSortAZ(!!v.sortAZ);
        setFlat(!!v.flat);
      })
      .catch(() => {});
  }, [VIEW_KEY]);
  const saveView = (patch) => {
    const v = { collapsed, sortAZ, flat, ...patch };
    AsyncStorage.setItem(VIEW_KEY, JSON.stringify(v)).catch(() => {});
  };

  const sections = (list && list.sections) || [];
  const removedSections = (list && list.removedSections) || [];
  const live = useMemo(() => (items || []).filter((i) => !i.removed), [items]);
  const removed = useMemo(() => (items || []).filter((i) => i.removed), [items]);
  const total = live.length;
  const done = live.filter((i) => i.checked).length;

  // Keep the trip screen's progress numbers in step with the list.
  useEffect(() => {
    if (!list || !itemsLive) return;
    if (list.total !== total || list.done !== done) store.updateList(listId, { total, done });
  }, [list, itemsLive, total, done, listId]);

  if (list === undefined || items === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: fonts.big, color: colors.inkSoft }}>Loading…</Text>
      </View>
    );
  }
  if (list === null) {
    return (
      <View style={ui.body}>
        <Header title="List not found" onBack={onBack} />
      </View>
    );
  }

  const owner = list.memberId === "shared" ? "Shared" : (members.find((m) => m.id === list.memberId) || {}).name || "Someone";
  const q = search.trim().toLowerCase();
  const hit = (i) => !q || i.name.toLowerCase().includes(q) || (i.note || "").toLowerCase().includes(q);
  const secIds = sections.map((s) => s.id);
  const homeOf = (i) => (secIds.includes(i.sectionId) ? i.sectionId : secIds[0]);
  const inSection = (sid) => live.filter((i) => homeOf(i) === sid).sort(sortAZ ? byName : byOrder);
  const nextOrder = (sid) => live.filter((i) => homeOf(i) === sid).reduce((m, i) => Math.max(m, i.order || 0), 0) + 1;

  // ----- item actions
  const set = (id, patch) => store.setItem(listId, id, patch);
  const toggle = (i) => set(i.id, { checked: !i.checked });
  const removeItem = (i) => set(i.id, { removed: true, removedWithSection: null, removedAt: Date.now() });
  const addItem = (sid, name, qty) =>
    set(newId(), { name, note: "", qty, checked: false, removed: false, sectionId: sid, order: nextOrder(sid) });
  const moveTo = (i, sid) => set(i.id, { sectionId: sid, order: nextOrder(sid) });
  const nudge = (i, dir) => {
    const rows = live.filter((x) => homeOf(x) === homeOf(i)).sort(byOrder);
    const at = rows.findIndex((x) => x.id === i.id);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= rows.length) return;
    const moved = rows.slice();
    moved.splice(to, 0, moved.splice(at, 1)[0]);
    // Renumber the section so the order is always clean.
    store.setItems(
      listId,
      moved.map((x, n) => ({ id: x.id, order: n + 1 })).filter((p, n) => (moved[n].order || 0) !== p.order)
    );
  };
  const restoreItem = (i) => {
    const sid = i.sectionId;
    const gone = removedSections.find((s) => s.id === sid);
    if (gone) {
      store.updateList(listId, {
        sections: [...sections, gone],
        removedSections: removedSections.filter((s) => s.id !== sid),
      });
    }
    set(i.id, { removed: false, removedWithSection: null });
  };

  // ----- section actions
  const addSection = () => {
    const t = newSection.trim();
    if (!t) return;
    store.updateList(listId, { sections: [...sections, { id: newId(), title: t }] });
    setNewSection("");
  };
  const renameSection = (sid, title) =>
    store.updateList(listId, { sections: sections.map((s) => (s.id === sid ? { ...s, title } : s)) });
  const nudgeSection = (sid, dir) => {
    const at = sections.findIndex((s) => s.id === sid);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= sections.length) return;
    const next = sections.slice();
    next.splice(to, 0, next.splice(at, 1)[0]);
    store.updateList(listId, { sections: next });
  };
  const deleteSection = (sec) => {
    const rows = live.filter((i) => homeOf(i) === sec.id);
    store.setItems(
      listId,
      rows.map((i) => ({ id: i.id, sectionId: sec.id, removed: true, removedWithSection: sec.id, removedAt: Date.now() }))
    );
    store.updateList(listId, {
      sections: sections.filter((s) => s.id !== sec.id),
      removedSections: [...removedSections, sec],
    });
  };
  const restoreSection = (sec) => {
    store.updateList(listId, {
      sections: [...sections, sec],
      removedSections: removedSections.filter((s) => s.id !== sec.id),
    });
    store.setItems(
      listId,
      removed.filter((i) => i.removedWithSection === sec.id).map((i) => ({ id: i.id, removed: false, removedWithSection: null }))
    );
  };
  const restoreAll = () => {
    store.updateList(listId, { sections: [...sections, ...removedSections], removedSections: [] });
    store.setItems(listId, removed.map((i) => ({ id: i.id, removed: false, removedWithSection: null })));
  };

  // ----- top buttons
  const toggleCollapse = (sid) => {
    const next = { ...collapsed, [sid]: !collapsed[sid] };
    setCollapsed(next);
    saveView({ collapsed: next });
  };
  const anyOpen = sections.some((s) => !collapsed[s.id]);
  const collapseAll = () => {
    const next = {};
    if (anyOpen) sections.forEach((s) => (next[s.id] = true));
    setCollapsed(next);
    saveView({ collapsed: next });
  };
  const clearTicks = () => {
    if (!clearArmed) {
      setClearArmed(true);
      clearTimer.current = setTimeout(() => setClearArmed(false), 3000);
      return;
    }
    clearTimeout(clearTimer.current);
    setClearArmed(false);
    store.setItems(listId, live.filter((i) => i.checked).map((i) => ({ id: i.id, checked: false })));
  };

  const close = () => setMenu(null);
  const menuItem = menu && menu.id ? (items || []).find((i) => i.id === menu.id) : null;
  const menuSection = menu && menu.sid ? sections.find((s) => s.id === menu.sid) : null;

  // ----- rows
  const itemRow = (i, opts = {}) => (
    <View key={i.id} style={row.item}>
      <Check on={i.checked} onPress={() => toggle(i)} label={i.name} />
      <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} onPress={() => toggle(i)} activeOpacity={0.6}>
        <Text style={[row.name, i.checked && row.nameDone]}>{i.name}</Text>
        {!!(opts.sub || i.note) && <Text style={row.note}>{opts.sub || i.note}</Text>}
      </TouchableOpacity>
      <QtyBox value={i.qty || 1} onChange={(v) => set(i.id, { qty: v })} label={"Quantity for " + i.name} />
      {opts.flat ? (
        <TouchableOpacity onPress={() => removeItem(i)} style={row.icon} accessibilityLabel={"Remove " + i.name} accessibilityRole="button">
          <Text style={{ fontSize: 22, color: colors.inkSoft }}>×</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setMenu({ kind: "item", id: i.id })} style={row.icon} accessibilityLabel={"Options for " + i.name} accessibilityRole="button">
          <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "800" }}>⋯</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const flatRows = live.filter(hit).sort(byName);
  const shownSections = sections
    .map((s) => ({ s, rows: inSection(s.id).filter(hit) }))
    .filter((x) => !q || x.rows.length);
  const nothing = q && (flat ? flatRows.length === 0 : shownSections.length === 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={[ui.body, { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
        <Header title={list.title || owner + "'s list"} sub={trip ? trip.name : ""} onBack={onBack} />
        <View style={{ height: 8, backgroundColor: colors.line, borderRadius: 99, overflow: "hidden" }}>
          <View style={{ height: 8, width: (total ? (done / total) * 100 : 0) + "%", backgroundColor: colors.primary, borderRadius: 99 }} />
        </View>
        <Text style={[ui.sub, { marginVertical: 6 }]}>
          {done} of {total} packed
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {!flat && (
            <Pill
              label={sortAZ ? "My order" : "Sort A–Z"}
              on={sortAZ}
              onPress={() => {
                setSortAZ(!sortAZ);
                saveView({ sortAZ: !sortAZ });
              }}
            />
          )}
          <Pill
            label={flat ? "Sections" : "One list"}
            on={flat}
            onPress={() => {
              setFlat(!flat);
              saveView({ flat: !flat });
            }}
          />
          {!flat && <Pill label={anyOpen ? "Collapse" : "Expand"} onPress={collapseAll} />}
          <Pill label={clearArmed ? "Tap again to clear" : "Clear ticks"} on={clearArmed} onPress={clearTicks} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items"
            placeholderTextColor={colors.inkSoft}
            autoCorrect={false}
            accessibilityLabel="Search items"
            style={[ui.input, { flex: 1, paddingVertical: 8 }]}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 8 }} accessibilityLabel="Clear search" accessibilityRole="button">
              <Text style={{ fontSize: 22, color: colors.inkSoft }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[ui.body, { paddingTop: 12, paddingBottom: 80 }]} keyboardShouldPersistTaps="handled">
        {nothing && <Text style={{ textAlign: "center", color: colors.inkSoft, padding: 24 }}>No items match.</Text>}

        {flat ? (
          flatRows.length > 0 && <View style={ui.card}>{flatRows.map((i) => itemRow(i, { flat: true }))}</View>
        ) : (
          shownSections.map(({ s, rows }) => {
            const all = live.filter((i) => homeOf(i) === s.id);
            const d = all.filter((i) => i.checked).length;
            const open = q ? true : !collapsed[s.id];
            return (
              <View key={s.id} style={ui.card}>
                <View style={[row.head, !open && { borderBottomWidth: 0 }]}>
                  <TouchableOpacity style={{ flex: 1, flexDirection: "row", alignItems: "center" }} onPress={() => toggleCollapse(s.id)} accessibilityRole="button" accessibilityLabel={(open ? "Collapse " : "Expand ") + s.title}>
                    <Text style={{ width: 20, color: colors.inkSoft, fontSize: fonts.small }}>{open ? "▾" : "▸"}</Text>
                    <Text style={{ flex: 1, fontSize: fonts.body, fontWeight: "800", color: colors.ink }}>{s.title}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: fonts.tiny, fontWeight: "600", color: all.length && d === all.length ? colors.primary : colors.inkSoft, marginHorizontal: 8 }}>
                    {d}/{all.length}
                  </Text>
                  <TouchableOpacity onPress={() => setMenu({ kind: "section", sid: s.id })} style={row.icon} accessibilityLabel={"Options for section " + s.title} accessibilityRole="button">
                    <Text style={{ fontSize: 20, color: colors.primary, fontWeight: "800" }}>⋯</Text>
                  </TouchableOpacity>
                </View>
                {open && rows.map((i) => itemRow(i))}
                {open && !q && <AddRow onAdd={(name, qty) => addItem(s.id, name, qty)} label={"Add item to " + s.title} />}
              </View>
            );
          })
        )}

        {!flat && !q && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <TextInput
              value={newSection}
              onChangeText={setNewSection}
              placeholder="New section"
              placeholderTextColor={colors.inkSoft}
              maxLength={40}
              onSubmitEditing={addSection}
              accessibilityLabel="New section name"
              style={[ui.input, { flex: 1, marginRight: 8 }]}
            />
            <Btn label="Add section" small onPress={addSection} disabled={!newSection.trim()} />
          </View>
        )}

        {(removed.length > 0 || removedSections.length > 0) && (
          <Btn
            label={`Removed: ${removedSections.length ? removedSections.length + " section" + (removedSections.length === 1 ? "" : "s") + ", " : ""}${removed.length} item${removed.length === 1 ? "" : "s"}`}
            kind="ghost"
            small
            style={{ alignSelf: "center", marginTop: 20 }}
            onPress={() => setMenu({ kind: "removed" })}
          />
        )}
        {store.mode === "local" && (
          <Text style={[ui.sub, { textAlign: "center", marginTop: 16 }]}>Saved on this device only.</Text>
        )}
        {!flat && !q && (
          <Btn
            label="Remove this list"
            kind="danger"
            small
            style={{ alignSelf: "flex-start", marginTop: 30 }}
            onPress={() =>
              confirmAction("Remove this list?", "The list will be hidden for everyone.", "Remove", () => {
                store.updateList(listId, { hidden: true });
                onBack();
              })
            }
          />
        )}
      </ScrollView>

      {/* Item menu */}
      <Sheet visible={!!menu && menu.kind === "item" && !!menuItem} onClose={close} title={menuItem ? menuItem.name : ""}>
        {menuItem && (
          <View>
            <SheetRow
              label="Edit name and note"
              onPress={() => {
                setF1(menuItem.name);
                setF2(menuItem.note || "");
                setMenu({ kind: "edit", id: menuItem.id });
              }}
            />
            <SheetRow label="Move to another section" onPress={() => setMenu({ kind: "move", id: menuItem.id })} />
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, marginRight: 4 }}>
                <SheetRow label="Move up ↑" disabled={sortAZ} onPress={() => nudge(menuItem, -1)} />
              </View>
              <View style={{ flex: 1, marginLeft: 4 }}>
                <SheetRow label="Move down ↓" disabled={sortAZ} onPress={() => nudge(menuItem, 1)} />
              </View>
            </View>
            {sortAZ && <Text style={[ui.sub, { marginTop: 6 }]}>Switch back to “My order” to rearrange items.</Text>}
            <SheetRow
              label="Remove"
              danger
              onPress={() => {
                removeItem(menuItem);
                close();
              }}
            />
            <Btn label="Done" kind="ghost" onPress={close} style={{ marginTop: 12 }} />
          </View>
        )}
      </Sheet>

      {/* Move to section */}
      <Sheet visible={!!menu && menu.kind === "move" && !!menuItem} onClose={close} title="Move to…">
        <ScrollView style={{ maxHeight: 380 }}>
          {menuItem &&
            sections.map((s) => (
              <SheetRow
                key={s.id}
                label={s.title}
                sub={homeOf(menuItem) === s.id ? "Current section" : ""}
                disabled={homeOf(menuItem) === s.id}
                onPress={() => {
                  moveTo(menuItem, s.id);
                  close();
                }}
              />
            ))}
        </ScrollView>
      </Sheet>

      {/* Edit item */}
      <Sheet visible={!!menu && menu.kind === "edit" && !!menuItem} onClose={close} title="Edit item">
        <TextInput value={f1} onChangeText={setF1} placeholder="Name" placeholderTextColor={colors.inkSoft} maxLength={80} accessibilityLabel="Item name" style={ui.input} autoFocus />
        <TextInput value={f2} onChangeText={setF2} placeholder="Note (optional)" placeholderTextColor={colors.inkSoft} maxLength={160} accessibilityLabel="Note" style={[ui.input, { marginTop: 8 }]} />
        <Btn
          label="Save"
          disabled={!f1.trim()}
          onPress={() => {
            set(menuItem.id, { name: f1.trim(), note: f2.trim() });
            close();
          }}
          style={{ marginTop: 12 }}
        />
      </Sheet>

      {/* Section menu */}
      <Sheet visible={!!menu && menu.kind === "section" && !!menuSection} onClose={close} title={menuSection ? menuSection.title : ""}>
        {menuSection && (
          <View>
            <SheetRow
              label="Rename"
              onPress={() => {
                setF1(menuSection.title);
                setMenu({ kind: "rename", sid: menuSection.id });
              }}
            />
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, marginRight: 4 }}>
                <SheetRow label="Move up ↑" onPress={() => nudgeSection(menuSection.id, -1)} />
              </View>
              <View style={{ flex: 1, marginLeft: 4 }}>
                <SheetRow label="Move down ↓" onPress={() => nudgeSection(menuSection.id, 1)} />
              </View>
            </View>
            <SheetRow
              label="Delete section"
              danger
              onPress={() => {
                const sec = menuSection;
                close();
                confirmAction(`Delete “${sec.title}”?`, "The section and its items move to Removed, where you can restore them.", "Delete", () => deleteSection(sec));
              }}
            />
            <Btn label="Done" kind="ghost" onPress={close} style={{ marginTop: 12 }} />
          </View>
        )}
      </Sheet>

      {/* Rename section */}
      <Sheet visible={!!menu && menu.kind === "rename" && !!menuSection} onClose={close} title="Rename section">
        <TextInput value={f1} onChangeText={setF1} placeholder="Section name" placeholderTextColor={colors.inkSoft} maxLength={40} accessibilityLabel="Section name" style={ui.input} autoFocus />
        <Btn
          label="Save"
          disabled={!f1.trim()}
          onPress={() => {
            renameSection(menuSection.id, f1.trim());
            close();
          }}
          style={{ marginTop: 12 }}
        />
      </Sheet>

      {/* Removed */}
      <Sheet visible={!!menu && menu.kind === "removed"} onClose={close} title="Removed">
        <ScrollView style={{ maxHeight: 420 }}>
          {removedSections.map((s) => {
            const n = removed.filter((i) => i.removedWithSection === s.id).length;
            return (
              <View key={s.id} style={row.restore}>
                <View style={{ flex: 1 }}>
                  <Text style={row.name}>Section: {s.title}</Text>
                  <Text style={row.note}>
                    {n} item{n === 1 ? "" : "s"}
                  </Text>
                </View>
                <Btn label="Restore" kind="ghost" small onPress={() => restoreSection(s)} />
              </View>
            );
          })}
          {removed
            .filter((i) => !i.removedWithSection || !removedSections.some((s) => s.id === i.removedWithSection))
            .sort(byName)
            .map((i) => {
              const sec = sections.find((s) => s.id === i.sectionId) || removedSections.find((s) => s.id === i.sectionId) || sections[0];
              return (
                <View key={i.id} style={row.restore}>
                  <View style={{ flex: 1 }}>
                    <Text style={row.name}>{i.name}</Text>
                    {!!sec && <Text style={row.note}>Back to {sec.title}</Text>}
                  </View>
                  <Btn label="Restore" kind="ghost" small onPress={() => restoreItem(i)} />
                </View>
              );
            })}
        </ScrollView>
        <Btn
          label="Restore all"
          onPress={() => {
            restoreAll();
            close();
          }}
          style={{ marginTop: 12 }}
        />
        <Btn label="Done" kind="ghost" onPress={close} />
      </Sheet>
    </View>
  );
}

function AddRow({ onAdd, label }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    onAdd(n, qty);
    setName("");
    setQty(1);
  };
  return (
    <View style={[row.item, { borderTopWidth: 1, borderTopColor: colors.line }]}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Add item"
        placeholderTextColor={colors.inkSoft}
        maxLength={80}
        onSubmitEditing={add}
        blurOnSubmit={false}
        returnKeyType="done"
        accessibilityLabel={label}
        style={{ flex: 1, fontSize: fonts.body, color: colors.ink, paddingVertical: 4 }}
      />
      <QtyBox value={qty} onChange={setQty} />
      <TouchableOpacity onPress={add} style={row.icon} accessibilityLabel="Add" accessibilityRole="button">
        <Text style={{ fontSize: 26, color: colors.primary, lineHeight: 28 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const row = {
  head: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: -1,
  },
  name: { fontSize: fonts.body, color: colors.ink },
  nameDone: { color: colors.done, textDecorationLine: "line-through" },
  note: { fontSize: fonts.small, color: colors.inkSoft, marginTop: 1 },
  icon: { width: 42, height: 36, alignItems: "center", justifyContent: "center" },
  restore: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
};
