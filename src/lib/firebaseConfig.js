/* ============================================================
   FIREBASE — configuration comes from environment variables.
   Copy .env.example to .env and fill in the values from
   Firebase console → Project settings → Your apps → SDK config.
   ============================================================ */
const env = import.meta.env;

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Demo mode runs entirely in the browser on sample data — no Firebase project needed.
// It switches on when VITE_DEMO_MODE=true, or automatically when no Firebase key is set.
export const IS_DEMO = env.VITE_DEMO_MODE === "true" || !FIREBASE_CONFIG.apiKey;
