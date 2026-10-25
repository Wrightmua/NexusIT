/* ------------------------------------------------------------
   Optional Cloud Function — provisions logins from the admin UI on the server.
   The web app currently creates accounts client-side through a secondary
   Firebase app instance (see src/lib/firebaseService.js → createUser).
   Deploying this moves that work behind an admin-only callable instead.

   Deploy:  firebase init functions   (then replace the generated index.js)
            firebase deploy --only functions
   ------------------------------------------------------------ */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  const callerDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const { matricule, password, name, role, agency } = data;
  const email = matricule.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") + "@nexusit.local";
  const userRecord = await admin.auth().createUser({ email, password, displayName: name });
  await admin.firestore().collection("users").doc(userRecord.uid).set({ matricule, name, role, agency, photoUrl: null });
  return { uid: userRecord.uid };
});
