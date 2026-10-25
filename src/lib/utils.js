import { DEPARTMENTS_AS_AGENCIES, EMPTY_PERSON, ROLE_RANK, SLA_HOURS } from "./constants.js";

export function wait(ms) { return new Promise(res => setTimeout(res, ms)); }
export function uid(prefix) {
  const array = new Uint8Array(6);
  window.crypto.getRandomValues(array);
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let str = "";
  for (let i = 0; i < array.length; i++) {
    str += chars[array[i] % chars.length];
  }
  return prefix + "-" + str;
}
export function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  // Uploaded profile photos are stored as base64 image data URLs — allow those, block every other data:/script URL.
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return trimmed;
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return null;
  return trimmed;
}
export function sanitizeExcelCell(val) {
  if (val === null || val === undefined) return "—";
  const str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}
export function processImageFile(file, maxPx = 240) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith("image/")) return reject(new Error("Please select a valid image file (JPG, PNG or WebP)."));
    if (file.size > 20 * 1024 * 1024) return reject(new Error("Image is too large — please pick one under 20MB."));

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxPx) { h = Math.round((h * maxPx) / w); w = maxPx; }
        } else {
          if (h > maxPx) { w = Math.round((w * maxPx) / h); h = maxPx; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("This image format can’t be read by the browser (e.g. HEIC). Please use a JPG or PNG."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
export function nowISO() { return new Date().toISOString(); }
export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
export function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso) - new Date(startIso);
  const hrs = Math.floor(ms / 36e5);
  const mins = Math.floor((ms % 36e5) / 60000);
  if (hrs < 1) return `${mins}m`;
  if (hrs < 24) return `${hrs}h ${mins}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

export function calcSLAStatus(createdAtIso, priority = "Medium", status = "Open") {
  if (!createdAtIso || status === "Resolved" || status === "Closed") return null;
  const limitHours = SLA_HOURS[priority] || 48;
  const created = new Date(createdAtIso);
  const deadline = new Date(created.getTime() + limitHours * 3600 * 1000);
  const now = new Date();
  const diffMs = deadline - now;
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const hrs = Math.floor(absMs / 36e5);
  const mins = Math.floor((absMs % 36e5) / 60000);
  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  return {
    isOverdue,
    text: isOverdue ? `OVERDUE (+${timeStr})` : `SLA: ${timeStr} remaining`,
    priority,
  };
}
export function initialsOf(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join("");
}
export function avatarColor(seed) {
  const colors = ["#0fa958", "#0b5fa4", "#0a7c41", "#073f6e", "#3ecf7e"];
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// Pick the inventory category that best matches an asset type ("Laptop" -> "Laptop (Computer)").
export function matchCatalogType(assetType, catalogTypes) {
  const t = (assetType || "").toLowerCase();
  const key = t.split(/[\s\/(]/).filter(Boolean)[0] || t;
  return catalogTypes.find(c => c.toLowerCase() === t)
    || catalogTypes.find(c => c.toLowerCase().includes(key))
    || "";
}

// Build the person profile from an employee account.
export function personFromUser(u) {
  if (!u) return { ...EMPTY_PERSON };
  return {
    name: u.name || "", matricule: u.matricule || "", jobTitle: u.jobTitle || "", department: u.department || "",
    agency: u.agency || DEPARTMENTS_AS_AGENCIES[0], phone: u.phone || "", email: u.email || "",
    photoUrl: u.photoUrl || null,
  };
}

// Who holds this asset? Merges the details saved on the asset with the live employee account.
export function assigneeOf(asset, db) {
  if (!asset) return null;
  const u = asset.employeeId ? db.users.find(x => x.id === asset.employeeId) : null;
  const s = asset.assignee || {};
  if (!u && !s.name) return null;
  return {
    name: s.name || (u && u.name) || "",
    matricule: s.matricule || (u && u.matricule) || "",
    jobTitle: s.jobTitle || (u && u.jobTitle) || "",
    department: s.department || (u && u.department) || "",
    agency: s.agency || (u && u.agency) || asset.agency || "",
    phone: s.phone || (u && u.phone) || "",
    email: s.email || (u && u.email) || "",
    photoUrl: (u && u.photoUrl) || s.photoUrl || null,
    userId: u ? u.id : null,
    hasAccount: Boolean(u),
  };
}

// Phone numbers like "+237 6..." must not get the formula-guard apostrophe.
export function excelPhone(val) {
  if (!val) return "—";
  const str = String(val).trim();
  return /^\+?[\d\s().-]+$/.test(str) ? str : sanitizeExcelCell(str);
}

export const sortedUsers = (db) => db.users.slice().sort((a, b) =>
  ((ROLE_RANK[a.role] ?? 3) - (ROLE_RANK[b.role] ?? 3)) || (a.name || "").localeCompare(b.name || ""));
export const defaultUser = (db) => sortedUsers(db).find(u => u.role === "employee") || null;
export const blankPerson = () => ({ ...EMPTY_PERSON, photoUrl: null });

// State + validation + save logic for "who is this asset given to" (Register / Issue again).

export function trimPerson(person) {
  const out = {};
  Object.keys(EMPTY_PERSON).forEach(k => { out[k] = typeof person[k] === "string" ? person[k].trim() : (person[k] || ""); });
  return out;
}

// Save contact details captured on the asset back to the employee's profile (best effort).

export const personSnapshot = (p) => {
  if (!p) return null;
  const out = trimPerson(p);
  out.userId = p.userId || null;
  return out;
};

export const isEmailish = (v) => !(v || "").trim() || /^\S+@\S+\.\S+$/.test((v || "").trim());
