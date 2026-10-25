import { useState, useRef } from "react";
import { Icon } from "./Icon.jsx";
import { Avatar, Field, Select, Spinner, TextInput } from "./ui.jsx";
import { DEPARTMENTS_AS_AGENCIES } from "../lib/constants.js";
import { FirebaseService } from "../lib/service.js";
import { blankPerson, defaultUser, isEmailish, personFromUser, processImageFile, sortedUsers, trimPerson } from "../lib/utils.js";

export const FormSection = ({ step, title, first, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: first ? 0 : 18, marginTop: first ? 0 : 4, borderTop: first ? "none" : "1px dashed var(--line)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--mint)", color: "var(--green-deep)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{step}</span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{title}</span>
    </div>
    {children}
  </div>
);

export const Notice = ({ tone = "info", icon = "alert", children }) => {
  const tones = {
    info: { bg: "#e6f0fb", fg: "#073f6e" },
    warn: { bg: "#fff4e0", fg: "#a3660a" },
    error: { bg: "#fbe9e9", fg: "#b23a3a" },
    ok: { bg: "#e6f5ec", fg: "#0a7c41" },
  };
  const t = tones[tone];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: t.bg, color: t.fg, borderRadius: 10, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
      <Icon name={icon} size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
};

export const Detail = ({ label, value, mono }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, fontFamily: mono ? "var(--font-mono)" : "var(--font-body)", wordBreak: "break-word" }}>{value || "—"}</div>
  </div>
);

// ONE set of person fields, used by BOTH "Add user" and "Register asset" so the info is always the same.
export function PersonDetailsFields({ person, setPerson, lockName = false, lockMatricule = false, requireMatricule = false, missingHint = false }) {
  const set = (k) => (v) => setPerson(p => ({ ...p, [k]: v }));
  const ph = (k, example) => (missingHint && !person[k] ? "Not in profile yet — add it here" : example);
  const agencyOptions = person.agency && !DEPARTMENTS_AS_AGENCIES.includes(person.agency) ? [person.agency, ...DEPARTMENTS_AS_AGENCIES] : DEPARTMENTS_AS_AGENCIES;
  const emailBad = !isEmailish(person.email || "");
  return (
    <>
      <div className="form-grid-2col">
        <Field label="Full name *"><TextInput value={person.name} onChange={set("name")} placeholder="e.g. Achille Ndongo" disabled={lockName} /></Field>
        <Field label={requireMatricule ? "Matricule *" : "Matricule"} hint={lockMatricule ? "Login ID — can’t be changed here." : undefined}>
          <TextInput value={person.matricule} onChange={set("matricule")} placeholder="e.g. EMP-4021" mono disabled={lockMatricule} />
        </Field>
      </div>
      <div className="form-grid-2col">
        <Field label="Job title"><TextInput value={person.jobTitle} onChange={set("jobTitle")} placeholder={ph("jobTitle", "e.g. Billing Officer")} /></Field>
        <Field label="Department / Service"><TextInput value={person.department} onChange={set("department")} placeholder={ph("department", "e.g. Commercial")} /></Field>
      </div>
      <div className="form-grid-2col">
        <Field label="Phone"><TextInput type="tel" value={person.phone} onChange={set("phone")} placeholder={ph("phone", "e.g. +237 6XX XXX XXX")} /></Field>
        <Field label="Email"><TextInput type="email" value={person.email} onChange={set("email")} placeholder={ph("email", "e.g. name@company.cm")} /></Field>
      </div>
      {emailBad && <Notice tone="error">That email address doesn’t look right.</Notice>}
      <Field label="Agency"><Select value={person.agency} onChange={set("agency")} options={agencyOptions} /></Field>
    </>
  );
}

export function useRecipient(db) {
  const first = defaultUser(db);
  const [mode, setMode] = useState(db.users.length ? "existing" : "new");
  const [employeeId, setEmployeeId] = useState(first ? first.id : "");
  const [person, setPerson] = useState(() => (first ? personFromUser(first) : blankPerson()));
  const [account, setAccount] = useState({ create: false, password: "", role: "employee" });
  const [photoBusy, setPhotoBusy] = useState(false);

  const mat = person.matricule.trim().toLowerCase();
  const creatingAccount = mode === "new" && account.create;
  const matDup = mode === "new" && Boolean(mat) && db.users.some(u => (u.matricule || "").toLowerCase() === mat);
  const emailBad = !isEmailish(person.email);
  const personOk = Boolean(person.name.trim()) && (mode === "new" || Boolean(employeeId));
  const acctOk = !creatingAccount || (Boolean(mat) && account.password.length >= 8 && !matDup);
  const valid = personOk && !emailBad && acctOk && !photoBusy;
  const missing = !personOk ? "who it’s given to" : !acctOk ? "login details (matricule + 8-character password)" : null;

  // Creates the login account first when requested, then returns what to store on the asset.
  async function commit() {
    const clean = trimPerson(person);
    let empId = mode === "existing" ? employeeId : null;
    if (creatingAccount) {
      const created = await FirebaseService.createUser(clean.matricule, account.password, clean.name, account.role, clean.agency, false, person.photoUrl || null, clean);
      empId = created.id;
      // If the asset step fails after this, a retry just uses the new account.
      setMode("existing"); setEmployeeId(empId); setAccount(a => ({ ...a, create: false, password: "" }));
    } else if (empId) {
      await syncEmployeeProfile(db, empId, clean);
    }
    return {
      empId: empId || null, clean, createdAccount: creatingAccount,
      assignee: { ...clean, photoUrl: empId ? null : (person.photoUrl || null), userId: empId || null },
    };
  }

  const fieldProps = { db, mode, setMode, employeeId, setEmployeeId, person, setPerson, account, setAccount, photoBusy, setPhotoBusy };
  return { fieldProps, person, valid, missing, commit };
}

// Shared "given to" form: pick a user (everything fills in from their profile) or enter a new person.
export function RecipientFields({ db, mode, setMode, employeeId, setEmployeeId, person, setPerson, allowUnassigned = false, account, setAccount, photoBusy, setPhotoBusy, showToast }) {
  const [localBusy, setLocalBusy] = useState(false);
  const busy = setPhotoBusy ? photoBusy : localBusy;
  const setBusy = setPhotoBusy || setLocalBusy;
  const users = sortedUsers(db);
  const pickUser = (id) => {
    setEmployeeId(id);
    const u = db.users.find(x => x.id === id);
    setPerson(u ? personFromUser(u) : blankPerson());
  };
  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    if (m === "new") { setEmployeeId(""); setPerson(blankPerson()); }
    else { const d = defaultUser(db) || users[0]; pickUser(allowUnassigned ? "" : (d ? d.id : "")); }
  };
  const selected = mode === "existing" && employeeId ? db.users.find(u => u.id === employeeId) : null;
  const missingInProfile = selected ? ["jobTitle", "department", "phone", "email"].filter(k => !selected[k]) : [];
  const mat = person.matricule.trim().toLowerCase();
  const matchUser = mode === "new" && mat ? db.users.find(u => (u.matricule || "").toLowerCase() === mat) : null;
  const creating = mode === "new" && account && account.create;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 12, width: "fit-content", maxWidth: "100%", flexWrap: "wrap", border: "1px solid var(--line)" }}>
        {[["existing", "Select a user"], ["new", "New person"]].map(([m, label]) => (
          <button key={m} type="button" onClick={() => switchMode(m)} style={{
            border: "none", padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            background: mode === m ? "var(--white)" : "transparent", color: mode === m ? "var(--ink)" : "var(--ink-soft)",
            boxShadow: mode === m ? "var(--shadow-md)" : "none", fontFamily: "var(--font-body)",
          }}>{label}</button>
        ))}
      </div>

      {mode === "existing" && (
        <Field label="User">
          {users.length === 0
            ? <Notice tone="warn">No user accounts yet. Add them under Users &amp; Roles, or switch to “New person”.</Notice>
            : <Select value={employeeId} onChange={pickUser} options={[
              ...(allowUnassigned || !employeeId ? [{ value: "", label: allowUnassigned ? "— Unassigned —" : "— Choose a user —" }] : []),
              ...users.map(u => ({ value: u.id, label: `${u.name} — ${u.matricule}${u.role !== "employee" ? ` (${u.role})` : ""}` })),
            ]} />}
        </Field>
      )}

      {selected && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "var(--mint)", borderRadius: 12 }}>
          <Avatar name={selected.name} size={46} photo={selected.photoUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{selected.name} <span style={{ fontWeight: 600, fontSize: 12, color: "var(--ink-soft)", textTransform: "capitalize" }}>· {selected.role}</span></div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45 }}>
              {missingInProfile.length === 0
                ? "All details below are filled in from their user profile."
                : `Filled in from their user profile — ${missingInProfile.length} detail${missingInProfile.length === 1 ? " is" : "s are"} missing. Anything you add is saved to their profile too.`}
            </div>
          </div>
          <Icon name="check" size={16} style={{ color: "var(--green-deep)", flexShrink: 0 }} />
        </div>
      )}

      {mode === "new" && (
        <Field label="Photo (optional)">
          <PhotoPicker name={person.name} photoUrl={person.photoUrl || null} setPhotoUrl={(v) => setPerson(p => ({ ...p, photoUrl: v }))}
            showToast={showToast || (() => { })} busy={busy} setBusy={setBusy} />
        </Field>
      )}

      {(mode === "new" || selected) && (
        <PersonDetailsFields person={person} setPerson={setPerson} lockName={Boolean(selected)} lockMatricule={Boolean(selected)} requireMatricule={Boolean(creating)} missingHint={Boolean(selected)} />
      )}

      {matchUser && (
        <Notice tone="warn">
          Matricule {matchUser.matricule} already belongs to {matchUser.name}.{" "}
          <button type="button" onClick={() => { setMode("existing"); pickUser(matchUser.id); }} style={{ border: "none", background: "none", padding: 0, color: "inherit", fontWeight: 800, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Use their profile</button>
        </Notice>
      )}

      {mode === "new" && setAccount && (
        <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={account.create} onChange={e => setAccount(a => ({ ...a, create: e.target.checked }))} style={{ width: 17, height: 17, marginTop: 1, accentColor: "var(--green)" }} />
            <span>Also create a login account for them<br /><span style={{ fontWeight: 500, fontSize: 12, color: "var(--ink-soft)" }}>They’ll appear in Users &amp; Roles, so next time you just select them.</span></span>
          </label>
          {account.create && (
            <div className="form-grid-2col">
              <Field label="Initial password *" hint={account.password && account.password.length < 8 ? `${8 - account.password.length} more character${8 - account.password.length === 1 ? "" : "s"} needed (minimum 8).` : "Minimum 8 characters."}>
                <TextInput type="password" value={account.password} onChange={v => setAccount(a => ({ ...a, password: v }))} placeholder="••••••••" />
              </Field>
              <Field label="Role"><Select value={account.role} onChange={v => setAccount(a => ({ ...a, role: v }))} options={["employee", "agent"]} /></Field>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export async function syncEmployeeProfile(db, empId, cleanPerson) {
  if (!empId) return;
  const u = db.users.find(x => x.id === empId) || {};
  const patch = {};
  ["jobTitle", "department", "phone", "email", "agency"].forEach(k => { if (cleanPerson[k] && cleanPerson[k] !== (u[k] || "")) patch[k] = cleanPerson[k]; });
  if (Object.keys(patch).length) { try { await FirebaseService.updateDoc("users", empId, patch); } catch (_) { /* profile sync is optional */ } }
}

export function PhotoPicker({ name, photoUrl, setPhotoUrl, showToast, busy, setBusy }) {
  const inputRef = useRef(null);
  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow picking the same file again after "Remove"
    if (!file) return;
    setBusy(true);
    try {
      setPhotoUrl(await processImageFile(file));
    } catch (err) {
      showToast((err && err.message) || "Couldn’t load that photo. The account can still be saved without one.", "error");
    } finally { setBusy(false); }
  };
  const btn = {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9,
    background: "var(--white)", border: "1.5px solid var(--line)", cursor: busy ? "wait" : "pointer",
    fontSize: 12.5, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-body)",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", padding: 12, borderRadius: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={() => !busy && inputRef.current && inputRef.current.click()} title="Upload photo"
        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", borderRadius: "50%", position: "relative" }}>
        <Avatar name={name || "New User"} size={58} photo={photoUrl} />
        {busy && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(12,34,51,0.45)", borderRadius: "50%" }}><Spinner size={18} /></span>}
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 170 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()} style={btn}>
            <Icon name="camera" size={14} /> {busy ? "Processing…" : photoUrl ? "Change photo" : "Upload photo"}
          </button>
          {photoUrl && !busy && (
            <button type="button" onClick={() => setPhotoUrl(null)} style={{ ...btn, color: "#b23a3a", borderColor: "transparent", background: "transparent", padding: "7px 6px" }}>Remove</button>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
          {photoUrl ? "Photo is used to confirm identity at device pickup." : "Optional. Without a photo, their initials are shown instead."}
        </span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </div>
  );
}
