import React, { useEffect, useState } from "react";
import { Platform, StatusBar, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { store } from "./src/store";
import { TRIP_SEED } from "./src/template";
import { colors, fonts } from "./src/theme";
import { ui, ConfirmHost } from "./src/ui";
import WhoScreen from "./src/screens/WhoScreen";
import TripsScreen from "./src/screens/TripsScreen";
import TripScreen from "./src/screens/TripScreen";
import NewListScreen from "./src/screens/NewListScreen";
import ListScreen from "./src/screens/ListScreen";

const ME_KEY = "familypacking.memberId";
const TOP = Platform.OS === "ios" ? 58 : Platform.OS === "android" ? 36 : 18;

export default function App() {
  const [screen, setScreen] = useState("trips"); // who | trips | trip | newlist | list
  const [meId, setMeId] = useState(undefined); // undefined = not read yet
  const [members, setMembers] = useState(null);
  const [trips, setTrips] = useState(null);
  const [lists, setLists] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [listId, setListId] = useState(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(t);
  }, []);

  // Apply over-the-air updates on launch instead of on the next launch.
  useEffect(() => {
    if (Platform.OS === "web" || __DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // offline or no update: carry on with what we have
      }
    })();
  }, []);

  useEffect(() => store.subMembers((m) => setMembers(m.slice().sort((a, b) => a.name.localeCompare(b.name)))), []);
  useEffect(() => store.subTrips((t) => setTrips(t.filter((x) => !x.hidden).sort((a, b) => b.createdAt - a.createdAt))), []);
  useEffect(() => store.subLists((l) => setLists(l.filter((x) => !x.hidden))), []);
  useEffect(() => {
    AsyncStorage.getItem(ME_KEY).then((id) => setMeId(id || null)).catch(() => setMeId(null));
  }, []);

  const pickMe = (id) => {
    setMeId(id);
    AsyncStorage.setItem(ME_KEY, id).catch(() => {});
    setScreen("trips");
  };
  const addMember = (name, makeMe) => {
    const first = members && members.length === 0 && trips && trips.length === 0;
    const id = store.addMember(name);
    // Brand-new family: start them off with the trip this app was built for.
    if (first) store.addTrip(TRIP_SEED.name, TRIP_SEED.dates);
    if (makeMe) pickMe(id);
    return id;
  };

  let body;
  if (members === null || trips === null || lists === null || meId === undefined) {
    body = (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: fonts.big, color: colors.inkSoft }}>Loading…</Text>
        {slow && (
          <Text style={{ fontSize: fonts.small, color: colors.inkSoft, textAlign: "center", marginTop: 12, paddingHorizontal: 30 }}>
            Can't reach the family database yet. Check your connection; the app will carry on as soon as it gets through.
          </Text>
        )}
      </View>
    );
  } else {
    const me = members.find((m) => m.id === meId) || null;
    const trip = trips.find((t) => t.id === tripId) || null;
    if (!me || screen === "who") {
      body = <WhoScreen members={members} me={me} onPick={pickMe} onAdd={addMember} onDone={me ? () => setScreen("trips") : null} />;
    } else if (screen === "list" && listId) {
      body = (
        <ListScreen
          listId={listId}
          members={members}
          trip={trip}
          onBack={() => setScreen(trip ? "trip" : "trips")}
        />
      );
    } else if (screen === "newlist" && trip) {
      body = (
        <NewListScreen
          trip={trip}
          trips={trips}
          me={me}
          members={members}
          lists={lists}
          onCancel={() => setScreen("trip")}
          onCreated={(id) => {
            setListId(id);
            setScreen("list");
          }}
        />
      );
    } else if (screen === "trip" && trip) {
      body = (
        <TripScreen
          trip={trip}
          me={me}
          members={members}
          lists={lists.filter((l) => l.tripId === trip.id)}
          onBack={() => setScreen("trips")}
          onOpen={(id) => {
            setListId(id);
            setScreen("list");
          }}
          onNew={() => setScreen("newlist")}
        />
      );
    } else {
      body = (
        <TripsScreen
          me={me}
          trips={trips}
          lists={lists}
          mode={store.mode}
          onWho={() => setScreen("who")}
          onOpen={(id) => {
            setTripId(id);
            setScreen("trip");
          }}
        />
      );
    }
  }

  return (
    <View style={[ui.screen, { paddingTop: TOP }]}>
      <StatusBar barStyle="dark-content" />
      {body}
      {Platform.OS === "web" && <ConfirmHost />}
    </View>
  );
}
