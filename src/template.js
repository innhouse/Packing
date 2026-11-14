// Starting lists. Each section is [title, [[name, note, qty], ...]].

export const TRIP_SEED = {
  name: "Malta, Sicily, Naples & Budapest",
  dates: "Dec 15, 2026 – Jan 9, 2027",
};

export const WINTER_EUROPE = [
  ["Shoes", [
    ["Birkenstocks", "Hotel, pools and warm afternoons in the south"],
    ["Spare insoles or newspaper", "To dry the shoes overnight after a wet run"],
  ]],
  ["Shirts and layers", [
    ["Short-sleeve shirts", "Merino or quick-dry wash fastest", 4],
    ["Long-sleeve shirts", "One smart enough for dinner", 2],
    ["Hoodies", "Light, for Malta, Sicily and Naples"],
    ["Warm hoodies", "For Budapest, over the heated vest"],
  ]],
  ["Outerwear and warmth", [
    ["Scarf"],
    ["Warm gloves"],
    ["Warm hat"],
  ]],
  ["Running (3× a week)", [
    ["Running shorts", "Malta, Sicily, Naples"],
    ["Running tights", "Budapest"],
    ["Quick-dry tee"],
    ["Light long-sleeve top"],
    ["Thermal long-sleeve top"],
    ["Running socks", "", 3],
    ["Thin running gloves"],
    ["Beanie or headband"],
    ["Reflective band or clip-on light", "Sunrise about 7:15, sunset about 16:40"],
    ["Running watch and charger"],
    ["Earbuds"],
  ]],
  ["Strength (2× a week)", [
    ["Mini loop bands"],
    ["Long resistance band"],
    ["Massage ball"],
  ]],
  ["Everyday clothes", [
    ["Trousers", "", 2],
    ["Underwear", "", 6],
    ["Everyday socks", "Include two warm merino pairs for Budapest", 6],
    ["Sleepwear"],
    ["Smart outfit", "Christmas at the Ortea, New Year's Eve in Budapest"],
  ]],
  ["Swim and spa", [
    ["Swimsuit", "Hotel pools and the Budapest thermal baths"],
  ]],
  ["Laundry kit", [
    ["24 L dry bag"],
    ["Detergent sheets", "", 20],
    ["Flat universal sink stopper"],
    ["Braided travel clothesline"],
    ["Inflatable hangers", "Plus a few clips", 2],
    ["Stain pen"],
    ["Mesh bag for dirty clothes"],
  ]],
  ["Electronics", [
    ["Phone"],
    ["Chargers and cables"],
    ["UK three-pin adapter", "Malta and Heathrow"],
    ["European round-pin adapter", "Italy and Hungary"],
  ]],
  ["Health and toiletries", [
    ["Painkillers"],
    ["Blister plasters and small first-aid kit"],
    ["Electrolyte tablets"],
    ["Lip balm with SPF"],
    ["Small sunscreen"],
    ["Toiletries", "Cabin liquids 100 ml or less; the rest checked"],
  ]],
  ["Documents and money", [
    ["Offline copies of bookings and confirmation numbers"],
    ["Aeroplan and Marriott numbers"],
    ["Cards on different networks", "", 2],
    ["Euros, including coins for laundromats"],
    ["A few Hungarian forints"],
  ]],
  ["Cabin bag", [
    ["Heated vest battery and cable", "Lithium batteries can't go in checked bags"],
    ["Power bank", "Not allowed in checked bags"],
    ["Prescription medicines"],
    ["Passports", "Valid at least three months past January 9", 2],
    ["One day's outfit and running kit", "In case a checked bag is delayed"],
  ]],
  ["Wear on the plane", [
    ["Running shoes", "Your one pair: runs, gym, walking and travel days"],
    ["Winter shell", "White Helly Hansen"],
    ["Heated vest", "Under the shell in Budapest"],
    ["Jeans"],
  ]],
  ["Before you leave", [
    ["Check whether a UK ETA is needed for the Heathrow connection"],
    ["Add the Bell Europe 30-day pass on both lines", "On December 15"],
    ["Check stay dates on each Marriott booking in the app"],
    ["Check the name spelling on the easyJet booking against the passport"],
    ["Charge the heated vest battery and power bank"],
  ]],
  ["Packing day", [
    ["Split essentials across both checked bags"],
    ["Weigh the bags", "Cabin 10 kg each; checked 20 kg and 23 kg"],
  ]],
];

export const BASIC = [
  ["Clothes", [["Tops", "", 4], ["Trousers", "", 2], ["Underwear", "", 6], ["Socks", "", 6], ["Sleepwear"], ["Jacket"]]],
  ["Shoes", [["Walking shoes"], ["Sandals or slides"]]],
  ["Toiletries", [["Toothbrush and toothpaste"], ["Toiletries"], ["Medicines"]]],
  ["Electronics", [["Phone"], ["Chargers and cables"], ["Plug adapter"]]],
  ["Documents and money", [["Passport"], ["Cards", "", 2], ["Booking confirmations"]]],
];

export const TEMPLATES = [
  { key: "winter", label: "Winter Europe", sub: "Amin's Malta to Budapest list", data: WINTER_EUROPE },
  { key: "basic", label: "Basic trip", sub: "A short starter list", data: BASIC },
  { key: "blank", label: "Blank", sub: "Start with nothing", data: [] },
];

// Turn template data (or a pasted checklist export) into what createList needs.
export function buildFromSections(data, newId) {
  const sections = [];
  const items = [];
  data.forEach(([title, rows]) => {
    const sid = newId();
    sections.push({ id: sid, title });
    rows.forEach((r, i) => {
      items.push({
        id: newId(),
        name: r[0],
        note: r[1] || "",
        qty: r[2] || 1,
        checked: !!r[3],
        sectionId: sid,
        order: i + 1,
        removed: false,
      });
    });
  });
  return { sections, items };
}

// Accepts the text produced by the "Copy for app" button on the web checklist.
export function parsePasted(text) {
  try {
    const j = JSON.parse(text.trim());
    if (!j || !Array.isArray(j.sections)) return null;
    return j.sections
      .filter((s) => s && typeof s.title === "string" && Array.isArray(s.items))
      .map((s) => [
        s.title.slice(0, 80),
        s.items
          .filter((i) => i && typeof i.name === "string" && i.name.trim())
          .map((i) => [
            i.name.trim().slice(0, 80),
            typeof i.note === "string" ? i.note.slice(0, 160) : "",
            Math.max(1, parseInt(i.qty, 10) || 1),
            !!i.checked,
          ]),
      ]);
  } catch {
    return null;
  }
}
