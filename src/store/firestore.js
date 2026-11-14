import { collection, doc, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const oops = (what) => (err) => console.log(what + " failed", err && err.message);

async function batched(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach((fn) => fn(b));
    await b.commit();
  }
}

export const fireStore = {
  mode: "cloud",
  subMembers: (cb) => onSnapshot(collection(db, "members"), (s) => cb(rows(s)), oops("members")),
  subTrips: (cb) => onSnapshot(collection(db, "trips"), (s) => cb(rows(s)), oops("trips")),
  subLists: (cb) => onSnapshot(collection(db, "lists"), (s) => cb(rows(s)), oops("lists")),
  subList: (listId, cb) =>
    onSnapshot(doc(db, "lists", listId), (d) => cb(d.exists() ? { id: d.id, ...d.data() } : null), oops("list")),
  subItems: (listId, cb) =>
    onSnapshot(collection(db, "lists", listId, "items"), (s) => cb(rows(s)), oops("items")),
  setMember: (id, v) => setDoc(doc(db, "members", id), v, { merge: true }),
  setTrip: (id, v) => setDoc(doc(db, "trips", id), v, { merge: true }),
  createList: (id, list, items) =>
    batched([
      (b) => b.set(doc(db, "lists", id), list),
      ...items.map(({ id: iid, ...rest }) => (b) => b.set(doc(db, "lists", id, "items", iid), rest)),
    ]),
  updateList: (id, patch) => updateDoc(doc(db, "lists", id), patch),
  setItem: (listId, id, v) => setDoc(doc(db, "lists", listId, "items", id), v, { merge: true }),
  setItems: (listId, patches) =>
    batched(patches.map(({ id, ...v }) => (b) => b.set(doc(db, "lists", listId, "items", id), v, { merge: true }))),
};
