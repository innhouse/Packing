// One data interface for the whole app. Uses Firestore once firebaseConfig.js
// is filled in; until then everything stays on the device (local mode).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firebaseReady } from "../firebase";
import { localStore } from "./local";
import { fireStore } from "./firestore";

const base = firebaseReady ? fireStore : localStore;

export function newId() {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

// Cloud mode: remember the last data seen so screens open instantly and
// still show something with no signal. Live data replaces it when it arrives.
function cached(key, subscribe, cb) {
  if (!firebaseReady) return subscribe(cb);
  let live = false;
  AsyncStorage.getItem("familypacking.cache." + key)
    .then((s) => {
      if (!live && s) cb(JSON.parse(s), true);
    })
    .catch(() => {});
  return subscribe((v) => {
    live = true;
    cb(v, false);
    AsyncStorage.setItem("familypacking.cache." + key, JSON.stringify(v)).catch(() => {});
  });
}

const fail = (p) => Promise.resolve(p).catch((e) => console.log("save failed", e && e.message));

export const store = {
  mode: base.mode,
  subMembers: (cb) => cached("members", base.subMembers, cb),
  subTrips: (cb) => cached("trips", base.subTrips, cb),
  subLists: (cb) => cached("lists", base.subLists, cb),
  subList: (id, cb) => cached("list." + id, (f) => base.subList(id, f), cb),
  subItems: (id, cb) => cached("items." + id, (f) => base.subItems(id, f), cb),
  addMember(name) {
    const id = newId();
    fail(base.setMember(id, { name, createdAt: Date.now() }));
    return id;
  },
  addTrip(name, dates) {
    const id = newId();
    fail(base.setTrip(id, { name, dates: dates || "", createdAt: Date.now(), hidden: false }));
    return id;
  },
  updateTrip: (id, patch) => fail(base.setTrip(id, patch)),
  createList({ tripId, memberId, title, sections, items }) {
    const id = newId();
    const live = items.filter((i) => !i.removed);
    const list = {
      tripId,
      memberId,
      title,
      sections,
      removedSections: [],
      total: live.length,
      done: live.filter((i) => i.checked).length,
      hidden: false,
      createdAt: Date.now(),
    };
    return fail(base.createList(id, list, items)).then(() => id);
  },
  updateList: (id, patch) => fail(base.updateList(id, patch)),
  setItem: (listId, id, v) => fail(base.setItem(listId, id, v)),
  setItems: (listId, patches) => (patches.length ? fail(base.setItems(listId, patches)) : Promise.resolve()),
};
