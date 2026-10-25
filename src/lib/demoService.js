// In-memory stand-in for FirebaseService, used in demo mode.
// Same method names and error messages as the live service, so the views don't know the difference.
// Data lives for the browser tab only: a reload starts again from the sample data.
import { makeDemoData, DEMO_PASSWORD } from "./demoData.js";
import { nowISO, uid, wait } from "./utils.js";

const SESSION_KEY = "nexus-demo-user";
const ARRAY_UNION = "__arrayUnion";

const clone = (v) => JSON.parse(JSON.stringify(v));
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function applyPatch(doc, patch) {
  const out = { ...doc };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && v[ARRAY_UNION]) {
      const cur = Array.isArray(out[k]) ? out[k] : [];
      out[k] = [...cur, ...v[ARRAY_UNION].filter(item => !cur.some(c => sameJson(c, item)))];
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const DemoService = {
  _store: null,
  _listeners: {},

  init() {
    if (this._store) return;
    this._store = {};
    for (const [col, docs] of Object.entries(makeDemoData())) {
      this._store[col] = new Map(docs.map(({ id, ...rest }) => [id, rest]));
    }
  },

  _col(name) {
    this.init();
    if (!this._store[name]) this._store[name] = new Map();
    return this._store[name];
  },
  _get(name, id) {
    const d = this._col(name).get(id);
    return d ? { id, ...clone(d) } : null;
  },
  _emit(name) {
    const docs = [...this._col(name).entries()].map(([id, d]) => ({ id, ...clone(d) }));
    (this._listeners[name] || []).forEach(fn => fn(docs));
  },
  _write(name, id, data) {
    const { id: _ignored, ...rest } = data;
    this._col(name).set(id, clone(rest));
    this._emit(name);
  },

  async signIn(matricule, password) {
    this.init();
    await wait(450);
    const mat = (matricule || "").trim().toUpperCase();
    const entry = [...this._col("users").entries()].find(([, u]) => u.matricule === mat);
    if (!entry) throw new Error("No account found for that matricule.");
    if (password !== DEMO_PASSWORD) throw new Error("Incorrect password.");
    try { sessionStorage.setItem(SESSION_KEY, entry[0]); } catch (_) { /* private mode */ }
    return this._get("users", entry[0]);
  },

  async signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* private mode */ }
  },

  onAuthChange(callback) {
    this.init();
    let id = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch (_) { /* private mode */ }
    setTimeout(() => callback(id ? this._get("users", id) : null), 250);
    return () => { };
  },

  subscribe(collectionName, onData) {
    const list = (this._listeners[collectionName] ||= []);
    list.push(onData);
    setTimeout(() => this._emit(collectionName), 0);
    return () => { this._listeners[collectionName] = list.filter(fn => fn !== onData); };
  },

  async addDoc(collectionName, data) {
    const id = uid("DOC");
    this._write(collectionName, id, data);
    return id;
  },
  async setDoc(collectionName, id, data, merge = true) {
    const existing = this._get(collectionName, id);
    this._write(collectionName, id, merge && existing ? applyPatch(existing, data) : data);
  },
  async updateDoc(collectionName, id, patch) {
    const existing = this._get(collectionName, id);
    if (!existing) throw new Error(`No document to update: ${collectionName}/${id}`);
    this._write(collectionName, id, applyPatch(existing, patch));
  },
  async deleteDoc(collectionName, id) {
    this._col(collectionName).delete(id);
    this._emit(collectionName);
  },
  arrayUnion(...items) {
    return { [ARRAY_UNION]: items };
  },

  async registerAssetWithStock(asset, deviceId) {
    if (this._get("assets", asset.code)) throw new Error(`Asset code ${asset.code} already exists. Use a different code.`);
    if (deviceId) {
      const d = this._get("devices", deviceId);
      if (!d) throw new Error("That inventory unit no longer exists. Pick another one.");
      if (d.status !== "Available") throw new Error(`Unit ${d.serial} is no longer available (now ${d.status}). Pick another one.`);
      await this.updateDoc("devices", deviceId, {
        status: "Issued", assignedTo: asset.employeeId || null,
        assignedToName: (asset.assignee && asset.assignee.name) || null,
        assetCode: asset.code, issuedAt: asset.assignedAt,
      });
    }
    this._write("assets", asset.code, asset);
  },

  async returnAssetToStock({ assetId, deviceId, newUnit, catalogId, unitStatus, assetPatch, historyEntry }) {
    const a = this._get("assets", assetId);
    if (!a) throw new Error("This asset no longer exists.");
    if (a.status === "Returned") throw new Error("This asset is already back in stock.");
    const now = historyEntry.at;
    const unitFields = { status: unitStatus, assignedTo: null, assignedToName: null, assetCode: null, issuedAt: null, returnedAt: now, lastAssetCode: a.code || assetId };
    if (deviceId) {
      if (!this._get("devices", deviceId)) throw new Error("The linked inventory unit no longer exists.");
      await this.updateDoc("devices", deviceId, unitFields);
    } else {
      if (this._get("devices", newUnit.serial)) throw new Error(`A unit with serial ${newUnit.serial} already exists in inventory.`);
      this._write("devices", newUnit.serial, { serial: newUnit.serial, itemType: newUnit.itemType, registeredAt: now, ...unitFields });
      const cat = catalogId ? this._get("deviceCatalog", catalogId) : null;
      if (cat) await this.updateDoc("deviceCatalog", catalogId, { totalStock: (Number(cat.totalStock) || 0) + 1 });
      else await this.addDoc("deviceCatalog", { itemType: newUnit.itemType, totalStock: 1, lowStockThreshold: 3 });
    }
    await this.updateDoc("assets", assetId, { ...assetPatch, history: this.arrayUnion(historyEntry) });
  },

  async reissueAsset({ assetId, deviceId, assetPatch, historyEntry }) {
    const a = this._get("assets", assetId);
    if (!a) throw new Error("This asset no longer exists.");
    if (a.status !== "Returned") throw new Error("This asset is not in stock right now.");
    if (deviceId) {
      const d = this._get("devices", deviceId);
      if (!d) throw new Error("The linked inventory unit no longer exists.");
      if (d.status !== "Available") throw new Error(`Unit ${d.serial} is "${d.status}". Set it to Available in Inventory first.`);
      await this.updateDoc("devices", deviceId, {
        status: "Issued", assignedTo: assetPatch.employeeId || null,
        assignedToName: (assetPatch.assignee && assetPatch.assignee.name) || null,
        assetCode: a.code || assetId, issuedAt: assetPatch.assignedAt,
      });
    }
    await this.updateDoc("assets", assetId, { ...assetPatch, history: this.arrayUnion(historyEntry) });
  },

  async createUser(matricule, password, name, role, agency, isItTechnician = false, photoUrl = null, details = {}) {
    const mat = matricule.trim().toUpperCase();
    if ([...this._col("users").values()].some(u => u.matricule === mat)) {
      throw new Error("A user with that matricule already exists in Firebase Auth.");
    }
    const id = uid("U");
    const userDoc = {
      matricule: mat, name: name.trim(), role, agency,
      isItTechnician: (role === "admin" || role === "agent") ? Boolean(isItTechnician) : false,
      photoUrl: photoUrl || null,
      jobTitle: (details.jobTitle || "").trim(), department: (details.department || "").trim(),
      phone: (details.phone || "").trim(), email: (details.email || "").trim(),
      createdAt: nowISO(),
    };
    this._write("users", id, userDoc);
    return { id, ...userDoc };
  },

  async registerFirstAdmin(matricule, password, name, agency) {
    return this.createUser(matricule, password, name, "admin", agency);
  },
};
