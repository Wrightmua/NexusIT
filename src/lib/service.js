// Every view talks to the backend through this one object.
// Live: Firebase Auth + Firestore. Demo: an in-memory store seeded with sample data.
import { IS_DEMO } from "./firebaseConfig.js";
import { FirebaseService as LiveService } from "./firebaseService.js";
import { DemoService } from "./demoService.js";

export const FirebaseService = IS_DEMO ? DemoService : LiveService;
export { IS_DEMO };
