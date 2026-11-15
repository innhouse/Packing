// Family passcode (web). See auth.js; the browser remembers the sign-in itself.
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebase";

export const FAMILY_EMAIL = "family@family-packing.example";

const _auth = app ? getAuth(app) : null;

export const watchSignedIn = (cb) => (_auth ? onAuthStateChanged(_auth, (u) => cb(!!u), () => cb(false)) : (cb(true), () => {}));
export const signIn = (passcode) => signInWithEmailAndPassword(_auth, FAMILY_EMAIL, passcode);
