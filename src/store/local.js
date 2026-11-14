// Device-only store used until Firebase is configured. Same interface as
// the Firestore store, backed by one AsyncStorage blob.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "familypacking.local.v1";
let data = { members: {}, trips: {}, lists: {}, items: {} };
let loaded = false;
const subs = new Set();
let saveTimer = null;

const ready = AsyncStorage.getItem(KEY)
  .then((s) => {
    if (s) {
      try {
        data = { members: {}, trips: {}, lists: {}, items: {}, ...JSON.parse(s) };
      } catch {}
    }
  })
  .catch(() => {})
  .then(() => {
    loaded = true;
    emit();
  });

function emit() {
  subs.forEach((fn) => fn());
  if (!loaded) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {}), 150);
}
const arr = (o) => Object.keys(o || {}).map((id) => ({ id, ...o[id] }));
function sub(select, cb) {
  const fn = () => loaded && cb(select());
  subs.add(fn);
  fn();
  return () => subs.delete(fn);
}

export const localStore = {
  mode: "local",
  subMembers: (cb) => sub(() => arr(data.members), cb),
  subTrips: (cb) => sub(() => arr(data.trips), cb),
  subLists: (cb) => sub(() => arr(data.lists), cb),
  subList: (listId, cb) => sub(() => (data.lists[listId] ? { id: listId, ...data.lists[listId] } : null), cb),
  subItems: (listId, cb) => sub(() => arr(data.items[listId]), cb),
  async setMember(id, v) { await ready; data.members[id] = { ...data.members[id], ...v }; emit(); },
  async setTrip(id, v) { await ready; data.trips[id] = { ...data.trips[id], ...v }; emit(); },
  async createList(id, list, items) {
    await ready;
    data.lists[id] = list;
    data.items[id] = {};
    items.forEach(({ id: iid, ...rest }) => (data.items[id][iid] = rest));
    emit();
  },
  async updateList(id, patch) { await ready; if (data.lists[id]) { data.lists[id] = { ...data.lists[id], ...patch }; emit(); } },
  async setItem(listId, id, v) {
    await ready;
    data.items[listId] = data.items[listId] || {};
    data.items[listId][id] = { ...data.items[listId][id], ...v };
    emit();
  },
  async setItems(listId, patches) {
    await ready;
    data.items[listId] = data.items[listId] || {};
    patches.forEach(({ id, ...v }) => (data.items[listId][id] = { ...data.items[listId][id], ...v }));
    emit();
  },
};
