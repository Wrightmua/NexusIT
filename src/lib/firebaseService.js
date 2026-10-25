import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { FIREBASE_CONFIG } from "./firebaseConfig.js";
import { nowISO } from "./utils.js";

// Firebase Auth needs an email-shaped identifier. Employees/agents only ever
// type a matricule, so we deterministically map matricule -> a synthetic
// email under a reserved domain. This never sends mail anywhere — it's just
// a stable, unique string Firebase Auth can key on.
export const MATRICULE_EMAIL_DOMAIN = "nexusit.local";
export function matriculeToEmail(matricule) {
  if (!matricule || typeof matricule !== "string") return "invalid@" + MATRICULE_EMAIL_DOMAIN;
  const sanitized = matricule.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return (sanitized || "invalid") + "@" + MATRICULE_EMAIL_DOMAIN;
}

/* ------------------------------------------------------------
   FirebaseService — thin wrapper around the real SDK.
   Collections used in Firestore:
     users            { matricule, name, role, agency, photoUrl, jobTitle,
                         department, phone, email }   (doc id = auth uid; photo optional)
     assets           { code, type, model, employeeId, agency, issueDate, status,
                         serial, inventoryItemType, assignee{name, matricule, jobTitle,
                         department, agency, phone, email, userId}, assignedAt,
                         assignedBy{id,name,matricule}, condition, notes, history[] }
     tickets          { assetCode, employeeId, agency, description, status,
                         technicianId, createdAt, resolvedAt, closedAt, history[] }
     deviceCatalog    { itemType, totalStock, lowStockThreshold }
     devices          { serial, itemType, status, registeredAt, assignedTo,
                         assignedToName, assetCode, issuedAt }
     loanRequests     { employeeId, itemType, serial, status,
                         requestedAt, approvedAt, collectedAt }
   ------------------------------------------------------------ */
export const FirebaseService = {
  _initialized: false,
  init() {
    if (this._initialized && this.auth && this.db) return;
    this._initialized = true;
    this.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
  },

  async signIn(matricule, password) {
    this.init();
    const email = matriculeToEmail(matricule);
    let cred;
    try {
      cred = await this.auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential" || e.code === "auth/invalid-login-credentials") {
        throw new Error("No account found for that matricule.");
      }
      if (e.code === "auth/wrong-password") throw new Error("Incorrect password.");
      throw new Error(e.message || "Sign-in failed.");
    }

    let snap = await this.db.collection("users").doc(cred.user.uid).get();
    if (!snap.exists) {
      const q = await this.db.collection("users").where("matricule", "==", matricule.trim().toUpperCase()).get();
      if (!q.empty) {
        snap = q.docs[0];
      } else {
        await this.auth.signOut();
        throw new Error("Your account has no profile on record in Firestore. Contact an administrator.");
      }
    }
    return { id: snap.id, ...snap.data() };
  },

  async signOut() {
    this.init();
    await this.auth.signOut();
  },

  onAuthChange(callback) {
    this.init();
    return this.auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) { callback(null); return; }
      try {
        let snap = await this.db.collection("users").doc(fbUser.uid).get();
        if (!snap.exists) {
          callback(null);
          return;
        }
        callback({ id: snap.id, ...snap.data() });
      } catch {
        callback(null);
      }
    });
  },

  /* ---- Firestore collection subscriptions (live) ---- */
  subscribe(collectionName, onData, onError) {
    this.init();
    return this.db.collection(collectionName).onSnapshot(
      (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => onError && onError(err)
    );
  },

  /* ---- Writes ---- */
  async addDoc(collectionName, data) {
    this.init();
    const ref = await this.db.collection(collectionName).add(data);
    return ref.id;
  },
  async setDoc(collectionName, id, data, merge = true) {
    this.init();
    await this.db.collection(collectionName).doc(id).set(data, { merge });
  },
  async updateDoc(collectionName, id, patch) {
    this.init();
    await this.db.collection(collectionName).doc(id).update(patch);
  },
  async deleteDoc(collectionName, id) {
    this.init();
    await this.db.collection(collectionName).doc(id).delete();
  },
  arrayUnion(...items) {
    return firebase.firestore.FieldValue.arrayUnion(...items);
  },

  /* ---- Register an asset AND take its unit out of inventory in one atomic step.
          - refuses if the asset code already exists (no silent overwrite)
          - refuses if the chosen serial unit was grabbed by someone else meanwhile
          - marks the unit "Issued" so the Inventory "available" count drops ---- */
  async registerAssetWithStock(asset, deviceId) {
    this.init();
    const assetRef = this.db.collection("assets").doc(asset.code);
    const devRef = deviceId ? this.db.collection("devices").doc(deviceId) : null;
    await this.db.runTransaction(async (tx) => {
      const aSnap = await tx.get(assetRef);
      if (aSnap.exists) throw new Error(`Asset code ${asset.code} already exists. Use a different code.`);
      if (devRef) {
        const dSnap = await tx.get(devRef);
        if (!dSnap.exists) throw new Error("That inventory unit no longer exists. Pick another one.");
        const d = dSnap.data();
        if (d.status !== "Available") throw new Error(`Unit ${d.serial} is no longer available (now ${d.status}). Pick another one.`);
        tx.update(devRef, {
          status: "Issued",
          assignedTo: asset.employeeId || null,
          assignedToName: (asset.assignee && asset.assignee.name) || null,
          assetCode: asset.code,
          issuedAt: asset.assignedAt,
        });
      }
      tx.set(assetRef, asset);
    });
  },

  /* ---- Return an asset's unit to inventory (atomic).
          - linked unit: goes back to "Available" (or "In Maintenance") so stock goes up again
          - asset that never came from stock: a new inventory unit is created for it and the
            category total is increased by 1 ---- */
  async returnAssetToStock({ assetId, deviceId, newUnit, catalogId, unitStatus, assetPatch, historyEntry }) {
    this.init();
    const now = historyEntry.at;
    const assetRef = this.db.collection("assets").doc(assetId);
    await this.db.runTransaction(async (tx) => {
      const aSnap = await tx.get(assetRef);
      if (!aSnap.exists) throw new Error("This asset no longer exists.");
      if (aSnap.data().status === "Returned") throw new Error("This asset is already back in stock.");
      const code = aSnap.data().code || assetId;
      let devRef, catRef = null, catSnap = null;
      if (deviceId) {
        devRef = this.db.collection("devices").doc(deviceId);
        const dSnap = await tx.get(devRef);
        if (!dSnap.exists) throw new Error("The linked inventory unit no longer exists.");
      } else {
        devRef = this.db.collection("devices").doc(newUnit.serial);
        const dSnap = await tx.get(devRef);
        if (dSnap.exists) throw new Error(`A unit with serial ${newUnit.serial} already exists in inventory.`);
        catRef = catalogId ? this.db.collection("deviceCatalog").doc(catalogId) : this.db.collection("deviceCatalog").doc();
        if (catalogId) catSnap = await tx.get(catRef);
      }
      // --- all reads done; writes below ---
      const unitFields = { status: unitStatus, assignedTo: null, assignedToName: null, assetCode: null, issuedAt: null, returnedAt: now, lastAssetCode: code };
      if (deviceId) tx.update(devRef, unitFields);
      else {
        tx.set(devRef, { serial: newUnit.serial, itemType: newUnit.itemType, registeredAt: now, ...unitFields });
        if (catSnap && catSnap.exists) tx.update(catRef, { totalStock: (Number(catSnap.data().totalStock) || 0) + 1 });
        else tx.set(catRef, { itemType: newUnit.itemType, totalStock: 1, lowStockThreshold: 3 });
      }
      tx.update(assetRef, { ...assetPatch, history: firebase.firestore.FieldValue.arrayUnion(historyEntry) });
    });
  },

  /* ---- Give a returned asset (same asset tag) to someone again, taking its unit out of stock ---- */
  async reissueAsset({ assetId, deviceId, assetPatch, historyEntry }) {
    this.init();
    const assetRef = this.db.collection("assets").doc(assetId);
    const devRef = deviceId ? this.db.collection("devices").doc(deviceId) : null;
    await this.db.runTransaction(async (tx) => {
      const aSnap = await tx.get(assetRef);
      if (!aSnap.exists) throw new Error("This asset no longer exists.");
      if (aSnap.data().status !== "Returned") throw new Error("This asset is not in stock right now.");
      if (devRef) {
        const dSnap = await tx.get(devRef);
        if (!dSnap.exists) throw new Error("The linked inventory unit no longer exists.");
        const d = dSnap.data();
        if (d.status !== "Available") throw new Error(`Unit ${d.serial} is "${d.status}". Set it to Available in Inventory first.`);
        tx.update(devRef, {
          status: "Issued", assignedTo: assetPatch.employeeId || null,
          assignedToName: (assetPatch.assignee && assetPatch.assignee.name) || null,
          assetCode: aSnap.data().code || assetId, issuedAt: assetPatch.assignedAt,
        });
      }
      tx.update(assetRef, { ...assetPatch, history: firebase.firestore.FieldValue.arrayUnion(historyEntry) });
    });
  },

  /* ---- Provision real Firebase Auth user + Firestore profile without disrupting current admin session ---- */
  async createUser(matricule, password, name, role, agency, isItTechnician = false, photoUrl = null, details = {}) {
    this.init();
    const email = matriculeToEmail(matricule);
    const secAppName = "SecondaryApp_" + Date.now();
    const secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, secAppName);
    try {
      let userUid = null;
      try {
        const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        userUid = cred.user.uid;
      } catch (authErr) {
        if (authErr.code === "auth/email-already-in-use") {
          // Self-healing: try signing in with secondaryApp to recover missing Firestore document
          try {
            const cred = await secondaryApp.auth().signInWithEmailAndPassword(email, password);
            userUid = cred.user.uid;
          } catch (signInErr) {
            throw new Error("A user with that matricule already exists in Firebase Auth.");
          }
        } else {
          throw authErr;
        }
      }

      const userDoc = {
        matricule: matricule.trim().toUpperCase(),
        name: name.trim(),
        role,
        agency,
        isItTechnician: (role === "admin" || role === "agent") ? Boolean(isItTechnician) : false,
        photoUrl: photoUrl || null,
        jobTitle: (details.jobTitle || "").trim(),
        department: (details.department || "").trim(),
        phone: (details.phone || "").trim(),
        email: (details.email || "").trim(),
        createdAt: nowISO(),
      };

      // Try writing with primary app (admin context: request.auth.uid == adminUid).
      // If admin profile is missing or rules expect self-creation context, fall back to secondaryApp (request.auth.uid == userUid).
      try {
        await this.db.collection("users").doc(userUid).set(userDoc);
      } catch (adminErr) {
        await secondaryApp.firestore().collection("users").doc(userUid).set(userDoc);
      }

      await secondaryApp.auth().signOut();
      return { id: userUid, ...userDoc };
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        throw new Error("A user with that matricule already exists in Firebase Auth.");
      }
      if (e.code === "permission-denied" || (e.message && e.message.toLowerCase().includes("permission"))) {
        throw new Error("Firestore write denied: Missing or insufficient permissions. Update your Firestore Security Rules in Firebase Console.");
      }
      throw new Error(e.message || "Failed to create user account.");
    } finally {
      await secondaryApp.delete().catch(() => { });
    }
  },

  /* ---- Register the very first admin account when initializing a fresh database ---- */
  async registerFirstAdmin(matricule, password, name, agency) {
    this.init();
    const email = matriculeToEmail(matricule);
    const cred = await this.auth.createUserWithEmailAndPassword(email, password);
    const userDoc = {
      matricule: matricule.trim().toUpperCase(),
      name: name.trim(),
      role: "admin",
      agency,
      photoUrl: null,
      createdAt: nowISO(),
    };
    await this.db.collection("users").doc(cred.user.uid).set(userDoc);
    return { id: cred.user.uid, ...userDoc };
  },
};
