import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { FormSection, Notice, PersonDetailsFields, PhotoPicker } from "../components/forms.jsx";
import { ModalShell, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Field, Select, Spinner, TextInput } from "../components/ui.jsx";
import { EMPTY_PERSON, STATUS_COLOR } from "../lib/constants.js";
import { FirebaseService } from "../lib/service.js";
import { isEmailish, personFromUser, trimPerson } from "../lib/utils.js";

/* ============================================================
   USERS & ROLES
   ============================================================ */
export function UsersView({ db, showToast }) {
  const [showNew, setShowNew] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  return (
    <div>
      <TopBar title="Users &amp; Roles" subtitle="Manage employee, agent, and administrator accounts." right={<Btn icon="plus" onClick={() => setShowNew(true)}>Add user</Btn>} />
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr style={{ textAlign: "left", background: "var(--surface)" }}>{["Name", "Matricule", "Role & Designation", "Agency", "Actions"].map(h => <th key={h} style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ink-soft)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>)}</tr></thead>
            <tbody>
              {db.users.map((u, i) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--line)", animation: `fadeIn .3s ease ${i * 25}ms both` }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => setEditingUser(u)} title={u.photoUrl ? "Change photo" : "Add photo"} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }}>
                        <Avatar name={u.name} size={34} photo={u.photoUrl} />
                      </button>
                      <div>
                        <div style={{ fontWeight: 700 }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{[u.jobTitle, u.phone].filter(Boolean).join(" · ") || (u.photoUrl ? "" : "No photo yet")}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}><span className="mono" style={{ fontFamily: "var(--font-mono)" }}>{u.matricule}</span></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge size="sm" label={u.role} colors={u.role === "admin" ? STATUS_COLOR["In Progress"] : u.role === "agent" ? STATUS_COLOR["Resolved"] : STATUS_COLOR["Closed"]} />
                      {(u.isItTechnician || u.role === "admin") && (
                        <Badge size="sm" label="IT Tech" colors={{ bg: "#e6f0fa", fg: "#0b5fa4", dot: "#2f8fd8" }} />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--ink-soft)" }}>{u.agency}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button onClick={() => setEditingUser(u)} title="Edit User Profile" style={{ border: "none", background: "transparent", color: "var(--blue)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="edit" size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {db.users.length === 0 && <EmptyState icon="users" title="No users yet" subtitle="Add your first account below." />}
      </Card>
      {showNew && <NewUserModal db={db} onClose={() => setShowNew(false)} showToast={showToast} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} showToast={showToast} />}
    </div>
  );
}

// Profile photo is always optional: no photo -> initials avatar. Admin can add, change or remove it any time.

export function NewUserModal({ db, onClose, showToast }) {
  const [person, setPerson] = useState(() => ({ ...EMPTY_PERSON }));
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [isItTechnician, setIsItTechnician] = useState(false);
  const [saving, setSaving] = useState(false);
  const mat = person.matricule.trim().toLowerCase();
  const dup = Boolean(mat) && db.users.some(u => (u.matricule || "").toLowerCase() === mat);
  const canCreate = person.name.trim() && mat && password.length >= 8 && !dup && isEmailish(person.email) && !saving && !uploadingPhoto;

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const clean = trimPerson(person);
      await FirebaseService.createUser(clean.matricule, password, clean.name, role, clean.agency, isItTechnician, photoUrl, clean);
      showToast(`${clean.name} (${role}${isItTechnician ? " - IT Technician" : ""}) registered${photoUrl ? "" : " — you can add a photo later from Edit"}.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not add user.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Add user account" icon="users" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FormSection step="1" title="Person details" first>
          <Field label="Photo (optional)">
            <PhotoPicker name={person.name} photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} showToast={showToast} busy={uploadingPhoto} setBusy={setUploadingPhoto} />
          </Field>
          <PersonDetailsFields person={person} setPerson={setPerson} requireMatricule />
          {dup && <Notice tone="error">That matricule is already registered.</Notice>}
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>These are the same details asked when registering an asset — selecting this user there fills them all in.</div>
        </FormSection>
        <FormSection step="2" title="Login & role">
          <div className="form-grid-2col">
            <Field label="Initial password *" hint={password && password.length < 8 ? `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed (minimum 8).` : "Minimum 8 characters."}>
              <TextInput value={password} onChange={setPassword} type="password" placeholder="••••••••" />
            </Field>
            <Field label="Role"><Select value={role} onChange={v => setRole(v)} options={["employee", "agent"]} /></Field>
          </div>
          {role === "agent" && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "10px 14px", background: "var(--surface)", borderRadius: 10 }}>
              <input type="checkbox" checked={isItTechnician} onChange={e => setIsItTechnician(e.target.checked)} style={{ width: 17, height: 17, accentColor: "var(--green)" }} />
              <span>Designated IT Support Technician (Can process &amp; take tickets)</span>
            </label>
          )}
        </FormSection>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={create} disabled={!canCreate}>{saving ? <><Spinner color="#fff" /> Creating…</> : "Create user account"}</Btn>
      </div>
    </ModalShell>
  );
}

export function EditUserModal({ user, onClose, showToast }) {
  const [person, setPerson] = useState(() => ({ ...personFromUser(user), name: user.name || "" }));
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [role, setRole] = useState(user.role || "employee");
  const [isItTechnician, setIsItTechnician] = useState(Boolean(user.isItTechnician || user.role === "admin"));
  const [saving, setSaving] = useState(false);
  const canSave = person.name.trim() && isEmailish(person.email) && !uploadingPhoto && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const clean = trimPerson(person);
      await FirebaseService.updateDoc("users", user.id, {
        name: clean.name,
        role,
        agency: clean.agency,
        isItTechnician: (role === "admin" || role === "agent") ? Boolean(isItTechnician) : false,
        photoUrl: photoUrl || null,
        jobTitle: clean.jobTitle,
        department: clean.department,
        phone: clean.phone,
        email: clean.email,
      });
      const photoMsg = (photoUrl || null) !== (user.photoUrl || null) ? (photoUrl ? " Photo updated." : " Photo removed.") : "";
      showToast(`Updated user profile for ${clean.name}.${photoMsg}`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not update user.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Edit Profile — ${user.matricule}`} icon="users" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FormSection step="1" title="Person details" first>
          <Field label="Photo (optional)">
            <PhotoPicker name={person.name} photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} showToast={showToast} busy={uploadingPhoto} setBusy={setUploadingPhoto} />
          </Field>
          <PersonDetailsFields person={person} setPerson={setPerson} lockMatricule />
        </FormSection>
        <FormSection step="2" title="Role">
          <Field label="Role"><Select value={role} onChange={v => setRole(v)} options={user.role === "admin" ? ["admin", "agent", "employee"] : ["employee", "agent"]} /></Field>
          {(role === "agent" || role === "admin") && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "10px 14px", background: "var(--surface)", borderRadius: 10 }}>
              <input type="checkbox" checked={isItTechnician} onChange={e => setIsItTechnician(e.target.checked)} style={{ width: 17, height: 17, accentColor: "var(--green)" }} />
              <span>Designated IT Support Technician (Can process &amp; take tickets)</span>
            </label>
          )}
        </FormSection>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={save} disabled={!canSave}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Save changes"}</Btn>
      </div>
    </ModalShell>
  );
}
