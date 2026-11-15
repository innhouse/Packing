// Sets (or changes) the family passcode. Run:  node scripts/set-passcode.js
// The passcode is the password of the one shared Firebase account that
// firestore.rules lets in. It is typed here and never stored in the project.
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const cfg = fs.readFileSync(path.join(__dirname, "..", "firebaseConfig.js"), "utf8");
const KEY = (cfg.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const EMAIL = "family@family-packing.example";
const api = async (method, body) => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || "request failed");
  return j;
};

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let muted = false;
    rl._writeToOutput = (s) => {
      if (!muted) rl.output.write(s);
      else if (s.includes("\n") || s.includes("\r")) rl.output.write("\n");
    };
    rl.question(question, (a) => {
      rl.close();
      resolve(a);
    });
    muted = true; // typed characters are not shown
  });
}

(async () => {
  console.log("\nFamily Packing: set the family passcode");
  console.log("At least 6 characters. Nothing shows while you type.\n");
  const p1 = await ask("New passcode: ");
  if (p1.length < 6) throw new Error("Too short: use at least 6 characters.");
  const p2 = await ask("Type it again: ");
  if (p1 !== p2) throw new Error("The two didn't match. Run it again.");
  let uid;
  try {
    uid = (await api("signUp", { email: EMAIL, password: p1, returnSecureToken: true })).localId;
    console.log("\nPasscode set.");
  } catch (e) {
    if (!/EMAIL_EXISTS/.test(e.message)) throw e;
    const old = await ask("A passcode already exists. Current passcode: ");
    const s = await api("signInWithPassword", { email: EMAIL, password: old, returnSecureToken: true });
    await api("update", { idToken: s.idToken, password: p1, returnSecureToken: false });
    uid = s.localId;
    console.log("\nPasscode changed. Devices already signed in will be asked for the new one.");
  }
  console.log("Family account id: " + uid + "\n");
})().catch((e) => {
  console.error("\nNot done: " + e.message + "\n");
  process.exit(1);
});
