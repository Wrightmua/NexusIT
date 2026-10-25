import { useState, useEffect, useMemo } from "react";
import { Icon } from "../components/Icon.jsx";
import { Detail, FormSection, Notice, RecipientFields, syncEmployeeProfile, useRecipient } from "../components/forms.jsx";
import { ModalShell, StatCard, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Field, Select, Spinner, TextArea, TextInput, inputStyle } from "../components/ui.jsx";
import { ASSET_CONDITIONS, ASSET_STATUS_COLOR, ASSET_TYPES, DEPARTMENTS_AS_AGENCIES, EMPTY_PERSON, NO_STOCK, RETURN_CONDITIONS, STATUS_COLOR } from "../lib/constants.js";
import { exportAssetsToExcel } from "../lib/excel.js";
import { FirebaseService } from "../lib/service.js";
import { assigneeOf, blankPerson, fmtDateTime, isEmailish, matchCatalogType, nowISO, personSnapshot, trimPerson } from "../lib/utils.js";
import { PrintTagModal } from "./Inventory.jsx";

/* ============================================================
   ASSET REGISTRY
   Registering an asset now:
     1. takes a serial-numbered unit out of Inventory (unit -> "Issued"),
        so the "available" count on the Inventory page drops;
     2. saves the full details of the person it was given to;
     3. shows up here with filters, a details view and Excel export.
   ============================================================ */

export function AssetsView({ db, currentUser, showToast }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [agencyFilter, setAgencyFilter] = useState("All");
  const [showNew, setShowNew] = useState(false);
  const [printAsset, setPrintAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const [reissuingId, setReissuingId] = useState(null);
  const canEdit = currentUser.role === "admin";

  const rows = useMemo(() => db.assets
    .map(a => ({ a, p: assigneeOf(a, db) }))
    .sort((x, y) => new Date(y.a.assignedAt || y.a.issueDate || 0) - new Date(x.a.assignedAt || x.a.issueDate || 0)),
    [db.assets, db.users]);

  const agencyOf = ({ a, p }) => (p && p.agency) || a.agency || "";
  const agencies = Array.from(new Set(rows.map(agencyOf).filter(Boolean))).sort();
  const q = search.trim().toLowerCase();
  const filtered = rows.filter(r => {
    const { a, p } = r;
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (agencyFilter !== "All" && agencyOf(r) !== agencyFilter) return false;
    if (!q) return true;
    const prev = a.previousAssignee || {};
    return [a.code, a.model, a.type, a.serial, a.agency, p && p.name, p && p.matricule, p && p.phone, p && p.email, p && p.department, p && p.jobTitle, prev.name, prev.matricule]
      .some(v => (v || "").toLowerCase().includes(q));
  });
  const isFiltered = filtered.length !== rows.length;
  const viewing = viewingId ? db.assets.find(a => a.id === viewingId) : null;
  const returning = returningId ? db.assets.find(a => a.id === returningId) : null;
  const reissuing = reissuingId ? db.assets.find(a => a.id === reissuingId) : null;

  const stats = {
    total: db.assets.length,
    inService: db.assets.filter(a => a.status === "In Service").length,
    fromStock: db.assets.filter(a => a.serial && a.status !== "Returned").length,
    returned: db.assets.filter(a => a.status === "Returned").length,
    retired: db.assets.filter(a => a.status === "Retired").length,
  };

  const toggleStatus = async (a) => {
    const next = a.status === "In Service" ? "Retired" : "In Service";
    try {
      await FirebaseService.updateDoc("assets", a.id, {
        status: next,
        history: FirebaseService.arrayUnion({ action: next === "Retired" ? "Retired" : "Restored to service", at: nowISO(), by: currentUser.name || "" }),
      });
      showToast(`${a.code} marked as ${next}.`);
    } catch (e) { showToast(e.message || "Update failed.", "error"); }
  };

  const linkBtn = (color) => ({ border: "none", background: "transparent", color, cursor: "pointer", marginRight: 6, fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 2px" });
  const th = { padding: "12px 11px", fontWeight: 700, color: "var(--ink-soft)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" };
  const td = { padding: "12px 11px", verticalAlign: "middle" };
  const small = { fontSize: 11.5, color: "var(--ink-soft)" };

  return (
    <div>
      <TopBar title="Asset Registry" subtitle="Every machine issued, who it was given to, and where it came from in stock."
        right={<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="secondary" icon="download" disabled={db.assets.length === 0 || filtered.length === 0}
            onClick={() => exportAssetsToExcel(filtered.map(r => r.a), db, isFiltered ? "Asset_Register_Filtered" : "Asset_Register")}>
            {isFiltered ? `Export ${filtered.length} to Excel` : "Export to Excel"}
          </Btn>
          {canEdit && <Btn icon="plus" onClick={() => setShowNew(true)}>Register asset</Btn>}
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Assets registered" value={stats.total} icon="laptop" accent="blue" />
        <StatCard label="In service" value={stats.inService} icon="check" accent="green" delay={60} />
        <StatCard label="Out from inventory" value={stats.fromStock} icon="warehouse" accent="blue" delay={120} />
        <StatCard label="Returned to stock" value={stats.returned} icon="box" accent="green" delay={180} />
        <StatCard label="Retired" value={stats.retired} icon="archive" accent="amber" delay={240} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 420 }}>
          <Icon name="search" size={15} style={{ position: "absolute", left: 13, top: 13, color: "#93a3ac" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, serial, model, person, matricule, phone…" style={{ ...inputStyle(false), paddingLeft: 36 }} />
        </div>
        <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} style={{ ...inputStyle(false), width: "auto", maxWidth: "100%", cursor: "pointer" }}>
          <option value="All">All agencies</option>
          {agencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "In Service", "Returned", "Retired"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + (statusFilter === s ? "transparent" : "var(--line)"),
              background: statusFilter === s ? "var(--ink)" : "var(--white)", color: statusFilter === s ? "var(--white)" : "var(--ink-soft)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>{s}</button>
          ))}
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--surface)" }}>
                {["Asset", "Device", "Given to", "Agency", "Issued", "Status", ""].map((h, i) => <th key={i} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ a, p }, i) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--line)", animation: `fadeIn .3s ease ${Math.min(i, 20) * 25}ms both` }}>
                  <td style={td}>
                    <div className="mono" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--blue)", whiteSpace: "nowrap" }}>{a.code}</div>
                    <div className="mono" style={{ ...small, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{a.serial ? `Unit ${a.serial}` : "Not from stock"}</div>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{a.model}</div>
                    <div style={small}>{a.type}</div>
                  </td>
                  <td style={td}>
                    {p ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={p.name} size={28} photo={p.photoUrl} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                          <div style={small}>
                            {p.matricule && <span className="mono" style={{ fontFamily: "var(--font-mono)" }}>{p.matricule}</span>}
                            {p.matricule && p.jobTitle ? " · " : ""}{p.jobTitle}
                          </div>
                          {p.phone && <div style={{ ...small, whiteSpace: "nowrap" }}>{p.phone}</div>}
                        </div>
                      </div>
                    ) : a.status === "Returned" ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--blue)" }}>Back in stock</div>
                        {a.previousAssignee && a.previousAssignee.name && <div style={small}>last: {a.previousAssignee.name}</div>}
                      </div>
                    ) : <span style={{ color: "var(--ink-soft)" }}>Unassigned</span>}
                  </td>
                  <td style={{ ...td, color: "var(--ink-soft)", fontSize: 12.5 }}>{(p && p.agency) || a.agency || "—"}</td>
                  <td style={{ ...td, fontSize: 12.5, whiteSpace: "nowrap" }}>
                    <div>{a.assignedAt ? fmtDateTime(a.assignedAt).split(" · ")[0] : (a.issueDate || "—")}</div>
                    {a.assignedBy && a.assignedBy.name && <div style={small}>by {a.assignedBy.name}</div>}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}><Badge size="sm" label={a.status} colors={ASSET_STATUS_COLOR[a.status] || STATUS_COLOR["Closed"]} /></td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => setViewingId(a.id)} title="View full record" style={linkBtn("var(--blue)")}><Icon name="idcard" size={14} /> View</button>
                    <button onClick={() => setPrintAsset(a)} title="Print asset tag" aria-label="Print asset tag" style={linkBtn("var(--blue)")}><Icon name="printer" size={15} /></button>
                    {canEdit && <button onClick={() => setEditingAsset(a)} title="Edit Asset" style={linkBtn("var(--green-deep)")}><Icon name="edit" size={14} /> Edit</button>}
                    {canEdit && a.status === "In Service" && <button onClick={() => setReturningId(a.id)} title="Return this machine to inventory" style={linkBtn("var(--blue)")}><Icon name="warehouse" size={14} /> Return</button>}
                    {canEdit && a.status === "Returned" && <button onClick={() => setReissuingId(a.id)} title="Give this machine to someone" style={linkBtn("var(--green-deep)")}><Icon name="plus" size={14} /> Issue</button>}
                    {canEdit && a.status !== "Returned" && <button onClick={() => toggleStatus(a)} title={a.status === "In Service" ? "Retire (end of life)" : "Restore to service"} style={{ ...linkBtn("var(--ink-soft)"), marginRight: 0 }}><Icon name="archive" size={14} /> {a.status === "In Service" ? "Retire" : "Restore"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="laptop" title={db.assets.length === 0 ? "No assets registered yet" : "No assets match these filters"} subtitle={db.assets.length === 0 ? "Register the first machine to get started." : undefined} />}
        {filtered.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-soft)" }}>
            Showing {filtered.length} of {rows.length} asset{rows.length === 1 ? "" : "s"}
          </div>
        )}
      </Card>

      {showNew && <RegisterAssetModal db={db} currentUser={currentUser} onClose={() => setShowNew(false)} showToast={showToast} />}
      {editingAsset && <EditAssetModal asset={editingAsset} db={db} currentUser={currentUser} onClose={() => setEditingAsset(null)} showToast={showToast} />}
      {printAsset && <PrintTagModal item={printAsset} type="asset" onClose={() => setPrintAsset(null)} />}
      {viewing && <AssetDetailModal asset={viewing} db={db} canEdit={canEdit} onClose={() => setViewingId(null)}
        onEdit={() => { setViewingId(null); setEditingAsset(viewing); }}
        onPrint={() => { setViewingId(null); setPrintAsset(viewing); }}
        onReturn={() => { setViewingId(null); setReturningId(viewing.id); }}
        onReissue={() => { setViewingId(null); setReissuingId(viewing.id); }} />}
      {returning && <ReturnAssetModal asset={returning} db={db} currentUser={currentUser} onClose={() => setReturningId(null)} showToast={showToast} />}
      {reissuing && <ReissueAssetModal asset={reissuing} db={db} currentUser={currentUser} onClose={() => setReissuingId(null)} showToast={showToast} />}
    </div>
  );
}

export function AssetDetailModal({ asset, db, canEdit, onClose, onEdit, onPrint, onReturn, onReissue }) {
  const p = assigneeOf(asset, db);
  const unit = asset.serial ? db.devices.find(d => d.serial === asset.serial) : null;
  const history = [...(asset.history || [])].sort((x, y) => new Date(y.at) - new Date(x.at));
  const sectionTitle = { fontSize: 11.5, fontWeight: 800, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "20px 0 10px" };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 };

  return (
    <ModalShell title={`Asset record — ${asset.code}`} icon="idcard" onClose={onClose} wide>
      {p ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "var(--mint)", borderRadius: 14, flexWrap: "wrap" }}>
          <Avatar name={p.name} size={56} photo={p.photoUrl} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Given to</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{[p.jobTitle, p.department].filter(Boolean).join(" · ") || "—"}</div>
          </div>
          <Badge size="sm" label={p.hasAccount ? "Has login account" : "No login account"} colors={p.hasAccount ? STATUS_COLOR["Resolved"] : STATUS_COLOR["Closed"]} />
        </div>
      ) : asset.status === "Returned" ? (
        <Notice tone="info" icon="warehouse">
          Back in stock since {fmtDateTime(asset.returnedAt)}{asset.returnedBy && asset.returnedBy.name ? ` · received by ${asset.returnedBy.name}` : ""}.
          {asset.previousAssignee && asset.previousAssignee.name ? ` Last holder: ${asset.previousAssignee.name}${asset.previousAssignee.matricule ? ` (${asset.previousAssignee.matricule})` : ""}.` : ""}
          {asset.returnCondition ? ` Condition on return: ${asset.returnCondition}.` : ""}
        </Notice>
      ) : <Notice tone="warn">This asset isn’t assigned to anyone yet.</Notice>}

      {p && <>
        <div style={sectionTitle}>Recipient details</div>
        <div style={grid}>
          <Detail label="Matricule / Staff ID" value={p.matricule} mono />
          <Detail label="Agency" value={p.agency} />
          <Detail label="Phone" value={p.phone} />
          <Detail label="Email" value={p.email} />
          <Detail label="Job title" value={p.jobTitle} />
          <Detail label="Department" value={p.department} />
        </div>
      </>}

      <div style={sectionTitle}>Device</div>
      <div style={grid}>
        <Detail label="Asset code" value={asset.code} mono />
        <Detail label="Type" value={asset.type} />
        <Detail label="Model" value={asset.model} />
        <Detail label="Status" value={asset.status} />
        <Detail label="Inventory unit" value={asset.serial || "Not taken from stock"} mono={Boolean(asset.serial)} />
        <Detail label="Inventory category" value={asset.inventoryItemType} />
        {unit && <Detail label="Unit status in inventory" value={unit.status} />}
      </div>

      <div style={sectionTitle}>Handover</div>
      <div style={grid}>
        <Detail label="Date issued" value={asset.assignedAt ? fmtDateTime(asset.assignedAt) : asset.issueDate} />
        <Detail label="Issued by" value={asset.assignedBy ? asset.assignedBy.name : ""} />
        <Detail label="Condition" value={asset.condition} />
      </div>
      {asset.notes && <div style={{ marginTop: 12, padding: 12, background: "var(--surface)", borderRadius: 10, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{asset.notes}</div>}

      {history.length > 0 && <>
        <div style={sectionTitle}>History</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "9px 12px", background: "var(--surface)", borderRadius: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{h.action}{h.to ? ` → ${h.to}` : ""}</div>
                {h.detail && <div style={{ color: "var(--ink-soft)" }}>{h.detail}</div>}
                <div style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>{fmtDateTime(h.at)}{h.by ? ` · ${h.by}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      </>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <Btn variant="secondary" icon="download" onClick={() => exportAssetsToExcel([asset], db, `Asset_${asset.code}`)}>Excel</Btn>
        <Btn variant="secondary" icon="printer" onClick={onPrint}>Tag</Btn>
        {canEdit && asset.status === "In Service" && <Btn variant="secondary" icon="warehouse" onClick={onReturn}>Return to stock</Btn>}
        {canEdit && <Btn variant={asset.status === "Returned" ? "secondary" : "primary"} icon="edit" onClick={onEdit}>Edit</Btn>}
        {canEdit && asset.status === "Returned" && <Btn icon="plus" onClick={onReissue}>Issue again</Btn>}
      </div>
    </ModalShell>
  );
}

export function ReturnAssetModal({ asset, db, currentUser, onClose, showToast }) {
  const holder = assigneeOf(asset, db);
  const unit = asset.serial ? db.devices.find(d => d.serial === asset.serial) : null;
  const catalogTypes = db.deviceCatalog.map(c => c.itemType);
  const guessType = matchCatalogType(asset.type, catalogTypes);
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  // Only used when the asset never came from stock (no linked unit yet):
  const [category, setCategory] = useState(guessType || "__new__");
  const [customType, setCustomType] = useState(asset.type === "Laptop" ? "Laptop (Computer)" : (asset.type || ""));
  const [serial, setSerial] = useState(asset.serial || asset.code || "");
  const [saving, setSaving] = useState(false);

  const needsNewUnit = !unit;
  const itemType = needsNewUnit ? (category === "__new__" ? customType.trim() : category) : unit.itemType;
  const finalSerial = serial.trim().toUpperCase();
  const serialTaken = needsNewUnit && Boolean(finalSerial) && db.devices.some(d => (d.serial || "").toUpperCase() === finalSerial || d.id === finalSerial);
  const unitStatus = RETURN_CONDITIONS.find(c => c.value === condition).unit;
  const canSave = !saving && (!needsNewUnit || (Boolean(finalSerial) && Boolean(itemType) && !serialTaken));
  const catStats = (t) => db.devices.filter(d => d.itemType === t && d.status === "Available").length;

  const confirm = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = nowISO();
      const by = currentUser.name || "";
      const cat = needsNewUnit ? db.deviceCatalog.find(c => c.itemType === itemType) : null;
      const useSerial = needsNewUnit ? finalSerial : unit.serial;
      await FirebaseService.returnAssetToStock({
        assetId: asset.id,
        deviceId: needsNewUnit ? null : unit.id,
        newUnit: needsNewUnit ? { serial: useSerial, itemType } : null,
        catalogId: cat ? cat.id : null,
        unitStatus,
        assetPatch: {
          status: "Returned", employeeId: null, assignee: null,
          previousAssignee: personSnapshot(holder),
          returnedAt: now,
          returnedBy: { id: currentUser.id || null, name: by, matricule: currentUser.matricule || "" },
          returnCondition: condition,
          serial: useSerial, inventoryItemType: itemType,
        },
        historyEntry: {
          action: "Returned to stock", at: now, by, to: "",
          detail: `${holder ? `From ${holder.name} · ` : ""}unit ${useSerial} → ${unitStatus} (${condition})${notes.trim() ? ` · ${notes.trim()}` : ""}`,
        },
      });
      showToast(unitStatus === "Available"
        ? `${asset.code} returned — ${useSerial} is back in ${itemType} stock.`
        : `${asset.code} returned — ${useSerial} marked ${unitStatus}.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not return asset.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Return to stock — ${asset.code}`} icon="warehouse" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--surface)", borderRadius: 12 }}>
          <Avatar name={holder ? holder.name : "?"} size={42} photo={holder && holder.photoUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Returning from</div>
            <div style={{ fontWeight: 700 }}>{holder ? holder.name : "Nobody (unassigned)"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{asset.type} — {asset.model}</div>
          </div>
        </div>

        <Field label="Condition on return">
          <Select value={condition} onChange={setCondition} options={RETURN_CONDITIONS.map(c => ({ value: c.value, label: c.label }))} />
        </Field>

        {needsNewUnit ? (
          <>
            <Notice tone="warn" icon="warehouse">This machine was never taken from inventory, so a new inventory unit will be created for it and the category total goes up by 1.</Notice>
            <div className="form-grid-2col">
              <Field label="Inventory category">
                <Select value={category} onChange={setCategory} options={[...catalogTypes.map(t => ({ value: t, label: t })), { value: "__new__", label: "+ New category…" }]} />
              </Field>
              <Field label="Unit serial no.">
                <TextInput value={serial} onChange={setSerial} mono placeholder="e.g. LAP-00412" />
              </Field>
            </div>
            {category === "__new__" && <Field label="New category name"><TextInput value={customType} onChange={setCustomType} placeholder="e.g. Tablet" /></Field>}
            {serialTaken && <Notice tone="error">A unit with serial {finalSerial} already exists. Use a different serial.</Notice>}
          </>
        ) : (
          <Notice tone={unitStatus === "Available" ? "ok" : "warn"} icon="warehouse">
            Unit <b className="mono" style={{ fontFamily: "var(--font-mono)" }}>{unit.serial}</b> will be set to <b>{unitStatus}</b>
            {unitStatus === "Available" ? <> — {unit.itemType} available goes {catStats(unit.itemType)} → <b>{catStats(unit.itemType) + 1}</b>.</> : " and won’t count as available stock."}
          </Notice>
        )}

        <Field label="Notes (optional)"><TextArea value={notes} onChange={setNotes} rows={2} placeholder="e.g. Returned without charger" /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={confirm} disabled={!canSave}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Confirm return"}</Btn>
      </div>
    </ModalShell>
  );
}

export function ReissueAssetModal({ asset, db, currentUser, onClose, showToast }) {
  const unit = asset.serial ? db.devices.find(d => d.serial === asset.serial) : null;
  const recipient = useRecipient(db);
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const unitBlocked = Boolean(unit) && unit.status !== "Available";
  const canSave = recipient.valid && !unitBlocked && !saving;

  const confirm = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = nowISO();
      const { empId, clean, assignee } = await recipient.commit();
      await FirebaseService.reissueAsset({
        assetId: asset.id,
        deviceId: unit ? unit.id : null,
        assetPatch: {
          status: "In Service", employeeId: empId, agency: clean.agency,
          assignee,
          assignedAt: now, issueDate: now.slice(0, 10),
          assignedBy: { id: currentUser.id || null, name: currentUser.name || "", matricule: currentUser.matricule || "" },
          condition, notes: notes.trim() || asset.notes || "",
        },
        historyEntry: { action: "Re-issued", at: now, by: currentUser.name || "", to: clean.name, detail: unit ? `Unit ${unit.serial} taken from ${unit.itemType} stock` : "" },
      });
      showToast(`${asset.code} issued to ${clean.name}${unit ? ` — ${unit.serial} removed from stock` : ""}.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not issue asset.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Issue again — ${asset.code}`} icon="laptop" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {unit && (unitBlocked
          ? <Notice tone="error" icon="warehouse">Unit {unit.serial} is “{unit.status}”. Set it back to Available in Inventory before issuing it again.</Notice>
          : <Notice tone="info" icon="warehouse">Unit <b className="mono" style={{ fontFamily: "var(--font-mono)" }}>{unit.serial}</b> will be taken out of {unit.itemType} stock again.</Notice>)}
        <FormSection step="1" title="Given to" first>
          <RecipientFields {...recipient.fieldProps} showToast={showToast} />
        </FormSection>
        <FormSection step="2" title="Handover">
          <Field label="Condition at handover"><Select value={condition} onChange={setCondition} options={ASSET_CONDITIONS} /></Field>
          <Field label="Notes (optional)"><TextArea value={notes} onChange={setNotes} rows={2} /></Field>
        </FormSection>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={confirm} disabled={!canSave}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Issue asset"}</Btn>
      </div>
    </ModalShell>
  );
}

export function RegisterAssetModal({ db, currentUser, onClose, showToast }) {
  const catalogTypes = db.deviceCatalog.map(c => c.itemType);
  const availableUnits = (itemType) => db.devices
    .filter(d => d.itemType === itemType && d.status === "Available")
    .sort((x, y) => (x.serial || "").localeCompare(y.serial || ""));

  const [type, setType] = useState("Laptop");
  const [code, setCode] = useState("NX-LT-");
  const [model, setModel] = useState("");
  const [stockType, setStockType] = useState(() => matchCatalogType("Laptop", catalogTypes));
  const [stockTouched, setStockTouched] = useState(false);
  const [unitId, setUnitId] = useState("");
  const recipient = useRecipient(db);
  const [condition, setCondition] = useState("New");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const takingStock = Boolean(stockType) && stockType !== NO_STOCK;
  const units = takingStock ? availableUnits(stockType) : [];
  const unitKey = units.map(u => u.id).join("|");
  useEffect(() => {
    if (!units.find(u => u.id === unitId)) setUnitId(units[0] ? units[0].id : "");
  }, [stockType, unitKey]);

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "Desktop Computer") {
      if (!code || code.startsWith("NX-")) setCode("NX-DT-");
    } else if (newType === "Laptop") {
      if (!code || code.startsWith("NX-")) setCode("NX-LT-");
    }
    if (!stockTouched) setStockType(matchCatalogType(newType, catalogTypes));
  };

  const finalCode = code.trim().toUpperCase();
  const dupCode = Boolean(finalCode) && db.assets.some(a => (a.code || "").toUpperCase() === finalCode || a.id === finalCode);
  const stockOk = stockType === NO_STOCK || (takingStock && Boolean(unitId));
  const canSave = Boolean(finalCode) && !dupCode && Boolean(model.trim()) && stockOk && recipient.valid && !saving;

  const missing = [];
  if (!finalCode) missing.push("asset code");
  if (!model.trim()) missing.push("model");
  if (!stockType) missing.push("inventory category");
  else if (takingStock && !unitId) missing.push("an available unit");
  if (recipient.missing) missing.push(recipient.missing);

  const create = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const unit = takingStock ? db.devices.find(d => d.id === unitId) : null;
      const now = nowISO();
      const { empId, clean: cleanPerson, assignee, createdAccount } = await recipient.commit();
      const asset = {
        code: finalCode, type, model: model.trim(),
        employeeId: empId, agency: cleanPerson.agency,
        issueDate: now.slice(0, 10), status: "In Service",
        serial: unit ? unit.serial : null, inventoryItemType: unit ? unit.itemType : null,
        assignee,
        assignedAt: now,
        assignedBy: { id: currentUser.id || null, name: currentUser.name || "", matricule: currentUser.matricule || "" },
        condition, notes: notes.trim(),
        history: [{
          action: "Assigned", at: now, by: currentUser.name || "", to: cleanPerson.name,
          detail: unit ? `Unit ${unit.serial} taken from ${unit.itemType} stock` : "Not taken from inventory stock",
        }],
      };
      await FirebaseService.registerAssetWithStock(asset, unit ? unit.id : null);
      showToast((unit
        ? `Asset ${finalCode} registered to ${cleanPerson.name}. ${unit.serial} removed from ${unit.itemType} stock.`
        : `Asset ${finalCode} registered to ${cleanPerson.name}.`) + (createdAccount ? " Login account created." : ""));
      onClose();
    } catch (e) {
      showToast(e.message || "Could not register asset.", "error");
    } finally { setSaving(false); }
  };

  const categoryOptions = [
    { value: "", label: "— Choose inventory category —" },
    ...db.deviceCatalog.map(c => ({ value: c.itemType, label: `${c.itemType} — ${availableUnits(c.itemType).length} available` })),
    { value: NO_STOCK, label: "Don’t take from inventory (machine already deployed)" },
  ];

  return (
    <ModalShell title="Register new asset" icon="laptop" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FormSection step="1" title="Device" first>
          <div className="form-grid-2col">
            <Field label="Type"><Select value={type} onChange={handleTypeChange} options={ASSET_TYPES} /></Field>
            <Field label="Model *"><TextInput value={model} onChange={setModel} placeholder="e.g. HP EliteBook 840 / Dell OptiPlex" /></Field>
          </div>
          <Field label="Asset Code *">
            <TextInput value={code} onChange={setCode} placeholder={type === "Desktop Computer" ? "e.g. NX-DT-0201" : "e.g. NX-LT-0101"} mono autoFocus />
          </Field>
          {dupCode && <Notice tone="error">Asset code {finalCode} is already registered. Use a different code.</Notice>}
        </FormSection>

        <FormSection step="2" title="Take from inventory">
          <div className="form-grid-2col">
            <Field label="Inventory category">
              <Select value={stockType} onChange={(v) => { setStockType(v); setStockTouched(true); }} options={categoryOptions} />
            </Field>
            <Field label="Unit (serial no.)">
              {takingStock && units.length > 0
                ? <Select value={unitId} onChange={setUnitId} options={units.map(u => ({ value: u.id, label: u.serial }))} />
                : <div style={{ ...inputStyle(false), color: "var(--ink-soft)", background: "var(--surface)" }}>{stockType === NO_STOCK ? "Not needed" : "—"}</div>}
            </Field>
          </div>
          {takingStock && units.length > 0 && (
            <Notice tone="info" icon="warehouse">
              {stockType}: <b>{units.length}</b> available → <b>{units.length - 1}</b> after this registration. Unit {(units.find(u => u.id === unitId) || {}).serial} will be marked “Issued”.
            </Notice>
          )}
          {takingStock && units.length === 0 && (
            <Notice tone="warn">No available {stockType} units in inventory. Register the incoming device under Inventory first, or pick “Don’t take from inventory” for a machine that was already deployed.</Notice>
          )}
          {!stockType && db.deviceCatalog.length === 0 && (
            <Notice tone="warn">Your inventory is empty. Add units under Inventory → Register device, or pick “Don’t take from inventory”.</Notice>
          )}
        </FormSection>

        <FormSection step="3" title="Given to">
          <RecipientFields {...recipient.fieldProps} showToast={showToast} />
        </FormSection>

        <FormSection step="4" title="Handover">
          <div className="form-grid-2col">
            <Field label="Condition at handover"><Select value={condition} onChange={setCondition} options={ASSET_CONDITIONS} /></Field>
            <Field label="Issued by"><div style={{ ...inputStyle(false), background: "var(--surface)" }}>{currentUser.name}</div></Field>
          </div>
          <Field label="Notes (optional)"><TextArea value={notes} onChange={setNotes} rows={2} placeholder="e.g. Delivered with charger and bag" /></Field>
        </FormSection>
      </div>

      {!canSave && !saving && missing.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-soft)" }}>Still needed: {missing.join(", ")}.</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={create} disabled={!canSave}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Register asset"}</Btn>
      </div>
    </ModalShell>
  );
}

export function EditAssetModal({ asset, db, currentUser, onClose, showToast }) {
  const current = assigneeOf(asset, db);
  const [code, setCode] = useState(asset.code || "");
  const [type, setType] = useState(asset.type || "Laptop");
  const [model, setModel] = useState(asset.model || "");
  const [mode, setMode] = useState(!asset.employeeId && asset.assignee && asset.assignee.name ? "new" : "existing");
  const [employeeId, setEmployeeId] = useState(asset.employeeId || "");
  const [person, setPerson] = useState(() => current
    ? { ...trimPerson({ ...EMPTY_PERSON, ...current, agency: current.agency || asset.agency || DEPARTMENTS_AS_AGENCIES[0] }), photoUrl: current.photoUrl || null }
    : { ...blankPerson(), agency: asset.agency || DEPARTMENTS_AS_AGENCIES[0] });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState(asset.status || "In Service");
  const [condition, setCondition] = useState(asset.condition || "Good");
  const [notes, setNotes] = useState(asset.notes || "");
  const [saving, setSaving] = useState(false);

  const codeChanged = code.trim().toUpperCase() !== asset.code;
  const emailBad = !isEmailish(person.email);
  const personOk = (mode === "existing" || Boolean(person.name.trim())) && !photoBusy;
  const isReturned = asset.status === "Returned";
  const statusOptions = isReturned ? ["Returned"] : ["In Service", "Retired"].concat(asset.status && !["In Service", "Retired"].includes(asset.status) ? [asset.status] : []);

  const save = async () => {
    if (!code.trim() || !model.trim() || !personOk || emailBad) return;
    setSaving(true);
    try {
      const newCode = code.trim().toUpperCase();
      const now = nowISO();
      const empId = mode === "existing" ? (employeeId || null) : null;
      const cleanPerson = trimPerson(person);
      const hasPerson = Boolean(cleanPerson.name) && (mode === "new" || Boolean(empId));
      const prevKey = `${asset.employeeId || ""}|${current ? current.name : ""}`;
      const nextKey = `${empId || ""}|${hasPerson ? cleanPerson.name : ""}`;
      const holderChanged = prevKey !== nextKey;
      const by = currentUser.name || "";

      const historyEntries = [];
      if (holderChanged) historyEntries.push({
        action: hasPerson ? "Reassigned" : "Unassigned", at: now, by, to: hasPerson ? cleanPerson.name : "",
        detail: current ? `Previously with ${current.name}` : "",
      });
      if (status !== asset.status) historyEntries.push({ action: status === "Retired" ? "Retired" : "Restored to service", at: now, by });

      const updatedData = {
        code: newCode, type, model: model.trim(), status, condition, notes: notes.trim(),
        employeeId: empId,
        agency: hasPerson ? cleanPerson.agency : (asset.agency || cleanPerson.agency),
        assignee: hasPerson ? { ...cleanPerson, photoUrl: empId ? null : (person.photoUrl || null), userId: empId } : null,
        ...(holderChanged ? { assignedAt: now, assignedBy: { id: currentUser.id || null, name: by, matricule: currentUser.matricule || "" } } : {}),
      };

      if (codeChanged) {
        const existing = db.assets.find(a => a.code === newCode && a.id !== asset.id);
        if (existing) {
          showToast(`Asset code ${newCode} already exists. Choose a different code.`, "error");
          setSaving(false);
          return;
        }
        // Copy the WHOLE record (recipient, serial, history…) to the new code, then delete the old doc.
        const { id: _oldId, ...rest } = asset;
        await FirebaseService.setDoc("assets", newCode, {
          ...rest, ...updatedData,
          issueDate: asset.issueDate || now.slice(0, 10),
          history: [...(asset.history || []), ...historyEntries, { action: "Code changed", at: now, by, detail: `${asset.code} → ${newCode}` }],
        }, false);
        try { await FirebaseService.deleteDoc("assets", asset.id); } catch (delErr) { /* new doc exists — acceptable */ }
        const relatedTickets = db.tickets.filter(t => t.assetCode === asset.code);
        for (const t of relatedTickets) {
          try { await FirebaseService.updateDoc("tickets", t.id, { assetCode: newCode }); } catch (e) { /* best effort */ }
        }
        showToast(`Asset renamed from ${asset.code} → ${newCode} and updated.`);
      } else {
        const patch = { ...updatedData };
        if (historyEntries.length) patch.history = FirebaseService.arrayUnion(...historyEntries);
        await FirebaseService.updateDoc("assets", asset.id, patch);
        showToast(`Asset ${newCode} updated successfully.`);
      }

      // Keep the linked inventory unit in sync with the asset.
      if (asset.serial && (holderChanged || codeChanged)) {
        const unit = db.devices.find(d => d.serial === asset.serial);
        if (unit) {
          try { await FirebaseService.updateDoc("devices", unit.id, { assetCode: newCode, assignedTo: empId, assignedToName: hasPerson ? cleanPerson.name : null }); } catch (e) { /* best effort */ }
        }
      }
      if (hasPerson) await syncEmployeeProfile(db, empId, cleanPerson);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not update asset.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Edit Asset — ${asset.code}`} icon="edit" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FormSection step="1" title="Device" first>
          <Field label="Asset Code" hint="Change this to rename the asset (e.g. NX-LT-0101)">
            <TextInput value={code} onChange={setCode} placeholder="e.g. NX-LT-0101" mono autoFocus />
          </Field>
          {codeChanged && code.trim() && (
            <Notice tone="info">
              Code will change: <span className="mono" style={{ fontFamily: "var(--font-mono)", textDecoration: "line-through", opacity: 0.6 }}>{asset.code}</span> → <span className="mono" style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>{code.trim().toUpperCase()}</span> (tickets and the inventory unit will be updated automatically)
            </Notice>
          )}
          <div className="form-grid-2col">
            <Field label="Type"><Select value={type} onChange={setType} options={ASSET_TYPES.includes(type) ? ASSET_TYPES : [type, ...ASSET_TYPES]} /></Field>
            <Field label="Model"><TextInput value={model} onChange={setModel} placeholder="e.g. HP EliteBook 840" /></Field>
          </div>
          {asset.serial && <Notice tone="ok" icon="warehouse">Linked to inventory unit <b className="mono" style={{ fontFamily: "var(--font-mono)" }}>{asset.serial}</b>{asset.inventoryItemType ? ` (${asset.inventoryItemType})` : ""}.</Notice>}
        </FormSection>

        <FormSection step="2" title="Given to">
          {isReturned
            ? <Notice tone="info" icon="warehouse">This machine is back in stock. Use “Issue” in the registry to give it to someone — that also takes its unit out of inventory again.</Notice>
            : <RecipientFields db={db} mode={mode} setMode={setMode} employeeId={employeeId} setEmployeeId={setEmployeeId} person={person} setPerson={setPerson} allowUnassigned photoBusy={photoBusy} setPhotoBusy={setPhotoBusy} showToast={showToast} />}
        </FormSection>

        <FormSection step="3" title="Status & handover">
          <div className="form-grid-2col">
            <Field label="Status"><Select value={status} onChange={setStatus} options={statusOptions} /></Field>
            <Field label="Condition"><Select value={condition} onChange={setCondition} options={ASSET_CONDITIONS.includes(condition) ? ASSET_CONDITIONS : [condition, ...ASSET_CONDITIONS]} /></Field>
          </div>
          <Field label="Notes"><TextArea value={notes} onChange={setNotes} rows={2} /></Field>
        </FormSection>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={save} disabled={!code.trim() || !model.trim() || !personOk || emailBad || saving}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Save changes"}</Btn>
      </div>
    </ModalShell>
  );
}
