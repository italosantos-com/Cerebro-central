import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { database } from "./firebase";

export const setUserOnline = (uid: string) => {
  const statusRef = ref(database, "status/" + uid);

  set(statusRef, { online: true, lastSeen: Date.now() });

  onDisconnect(statusRef).set({
    online: false,
    lastSeen: serverTimestamp(),
  });
};
