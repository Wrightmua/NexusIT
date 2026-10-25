import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { ModalShell, SectionHeader, TopBar } from "../components/layout.jsx";
import { Badge, Btn, Card, EmptyState, Field, Select, Spinner, TextInput } from "../components/ui.jsx";
import { PRESET_DEVICE_TYPES, STATUS_COLOR } from "../lib/constants.js";
import { FirebaseService } from "../lib/service.js";
import { fmtDateTime, nowISO } from "../lib/utils.js";

/* ============================================================
   INVENTORY & DEVICE MANAGEMENT
   ============================================================ */
export function InventoryView({ db, showToast }) {
  const [showRegister, setShowRegister] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [printItem, setPrintItem] = useState(null);

  const stockFor = (itemType) => {
    const units = db.devices.filter(d => d.itemType === itemType);
    const cat = db.deviceCatalog.find(c => c.itemType === itemType);
    return {
      total: cat ? cat.totalStock : units.length,
      available: units.filter(u => u.status === "Available").length,
      reserved: units.filter(u => u.status === "Reserved").length,
      issued: units.filter(u => u.status === "Issued").length,
      threshold: cat ? cat.lowStockThreshold : 0,
    };
  };

  return (
    <div>
      <TopBar title="Inventory" subtitle="Live stock per device type, and every serial-numbered unit on record. Registering an asset takes a unit out of stock automatically."
        right={<Btn icon="plus" onClick={() => setShowRegister(true)}>Register device</Btn>} />

      {db.deviceCatalog.length === 0 && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <EmptyState icon="warehouse" title="No device categories yet" subtitle="Register a device below to create its category automatically." />
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {db.deviceCatalog.map((c, i) => {
          const s = stockFor(c.itemType);
          const pct = Math.round((s.available / Math.max(s.total, 1)) * 100);
          const low = s.available <= s.threshold;
          return (
            <Card key={c.itemType} hover style={{ padding: 18, animation: `fadeUp .4s ease ${i * 40}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.itemType}</div>
                {low && <Badge size="sm" label="Low stock" colors={{ bg: "#fff4e0", fg: "#a3660a", dot: "#e8a13a" }} />}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>{s.available}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>available / {s.total} total</span>
              </div>
              <div style={{ height: 7, background: "var(--surface)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: low ? "linear-gradient(90deg,#e8a13a,#d64545)" : "linear-gradient(90deg, var(--green), var(--blue))", transition: "width 1s cubic-bezier(.2,.8,.2,1)" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11.5, color: "var(--ink-soft)" }}>
                <span>{s.reserved} reserved</span><span>·</span><span>{s.issued} issued</span>
              </div>
              <button onClick={() => setShowRestock(c)} style={{ marginTop: 12, border: "none", background: "var(--mint)", color: "var(--green-deep)", padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="edit" size={13} /> Update stock
              </button>
            </Card>
          );
        })}
      </div>

      <SectionHeader icon="idcard" title="Registered devices" count={db.devices.length} />
      <Card style={{ marginTop: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--surface)" }}>
                {["Serial No.", "Item type", "Status", "Assigned to / Asset", "Registered", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ink-soft)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {db.devices.map((d, i) => {
                const emp = d.assignedTo ? db.users.find(u => u.id === d.assignedTo) : null;
                const st = { Available: STATUS_COLOR["Resolved"], Reserved: STATUS_COLOR["In Progress"], Issued: STATUS_COLOR["Closed"], "In Maintenance": STATUS_COLOR["Received / In Queue"], Decommissioned: { bg: "#fce8e8", fg: "#d64545", dot: "#d64545" } }[d.status] || STATUS_COLOR["Closed"];
                return (
                  <tr key={d.id} style={{ borderTop: "1px solid var(--line)", animation: `fadeIn .3s ease ${i * 25}ms both` }}>
                    <td style={{ padding: "13px 16px" }}><span className="mono" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--blue)" }}>{d.serial}</span></td>
                    <td style={{ padding: "13px 16px" }}>{d.itemType}</td>
                    <td style={{ padding: "13px 16px" }}><Badge size="sm" label={d.status} colors={st} /></td>
                    <td style={{ padding: "13px 16px", color: "var(--ink-soft)" }}>
                      <div>{emp ? emp.name : (d.assignedToName || "—")}</div>
                      {d.assetCode && <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--blue)" }}>{d.assetCode}</div>}
                      {!d.assetCode && d.lastAssetCode && <div style={{ fontSize: 11.5 }}>returned from <span className="mono" style={{ fontFamily: "var(--font-mono)" }}>{d.lastAssetCode}</span></div>}
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--ink-soft)" }}>{fmtDateTime(d.registeredAt).split(" · ")[0]}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <button onClick={() => setPrintItem(d)} title="Print Barcode Tag" style={{ border: "none", background: "transparent", color: "var(--blue)", cursor: "pointer", marginRight: 10, fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Icon name="printer" size={14} /> Tag
                      </button>
                      <button onClick={() => setEditingDevice(d)} title="Manage Device" style={{ border: "none", background: "transparent", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Icon name="edit" size={14} /> Status
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {db.devices.length === 0 && <EmptyState icon="idcard" title="No devices registered yet" />}
      </Card>

      {showRegister && <RegisterDeviceModal db={db} onClose={() => setShowRegister(false)} showToast={showToast} />}
      {showRestock && <UpdateStockModal category={showRestock} onClose={() => setShowRestock(null)} showToast={showToast} />}
      {editingDevice && <EditDeviceModal device={editingDevice} onClose={() => setEditingDevice(null)} showToast={showToast} />}
      {printItem && <PrintTagModal item={printItem} type="device" onClose={() => setPrintItem(null)} />}
    </div>
  );
}

export function EditDeviceModal({ device, onClose, showToast }) {
  const [status, setStatus] = useState(device.status || "Available");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await FirebaseService.updateDoc("devices", device.id, { status });
      showToast(`Updated status for device ${device.serial} to ${status}.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not update device.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Manage Device — ${device.serial}`} icon="idcard" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Item Type"><TextInput value={device.itemType} disabled /></Field>
        <Field label="Device Status">
          <Select value={status} onChange={setStatus} options={["Available", "Issued", "Reserved", "In Maintenance", "Decommissioned"]} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={save} disabled={saving}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Update status"}</Btn>
      </div>
    </ModalShell>
  );
}

export function PrintTagModal({ item, type = "device", onClose }) {
  const codeStr = type === "asset" ? (item.code || item.id) : (item.serial || item.id);
  const titleStr = type === "asset" ? (item.model || item.type) : item.itemType;
  const agencyStr = item.agency || "NEXUS IT SUPPORT";

  return (
    <ModalShell title={`Print Sticker Tag — ${codeStr}`} icon="printer" onClose={onClose}>
      <div className="printable-tag-area" style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{
          width: 320, margin: "0 auto", padding: 22, border: "2px dashed var(--blue)",
          borderRadius: 16, background: "#ffffff", color: "#0c2233", textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)"
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0b5fa4" }}>NexusIT Asset Tag</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, marginTop: 6, letterSpacing: "0.05em", color: "#0c2233" }}>{codeStr}</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "#3c5568" }}>{titleStr}</div>

          {/* Simulated barcode SVG lines */}
          <div style={{ margin: "14px 0", display: "flex", justifyContent: "center", gap: 3 }}>
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 4, 1, 2, 1, 3, 2, 4, 1].map((w, i) => (
              <div key={i} style={{ width: w * 2, height: 42, background: i % 2 === 0 ? "#0c2233" : "transparent" }} />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#3c5568", borderTop: "1px solid #dfe9e4", paddingTop: 8, marginTop: 8 }}>
            <span>Agency: {agencyStr}</span>
            <span>NexusIT Support</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose}>Close</Btn>
        <Btn icon="printer" onClick={() => window.print()}>Print Sticker Tag</Btn>
      </div>
    </ModalShell>
  );
}

export function RegisterDeviceModal({ db, onClose, showToast }) {
  const catalogTypes = db.deviceCatalog.map(c => c.itemType);
  const combinedTypes = Array.from(new Set([...catalogTypes, ...PRESET_DEVICE_TYPES]));
  const [itemType, setItemType] = useState(combinedTypes[0] || "Laptop (Computer)");
  const [customType, setCustomType] = useState("");
  const [serial, setSerial] = useState("");
  const [saving, setSaving] = useState(false);
  const isNewType = itemType === "__new__";
  const finalType = isNewType ? customType.trim() : itemType;
  const duplicate = db.devices.some(d => d.serial.toLowerCase() === serial.trim().toLowerCase());

  const create = async () => {
    if (!serial.trim() || !finalType || duplicate) return;
    setSaving(true);
    try {
      const finalSerial = serial.trim().toUpperCase();
      await FirebaseService.setDoc("devices", finalSerial, { serial: finalSerial, itemType: finalType, status: "Available", registeredAt: nowISO(), assignedTo: null }, false);
      const existingCat = db.deviceCatalog.find(c => c.itemType === finalType);
      if (existingCat) {
        await FirebaseService.updateDoc("deviceCatalog", existingCat.id, { totalStock: existingCat.totalStock + 1 });
      } else {
        await FirebaseService.addDoc("deviceCatalog", { itemType: finalType, totalStock: 1, lowStockThreshold: 3 });
      }
      showToast(`Device ${finalSerial} (${finalType}) registered and added to stock.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not register device.", "error");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Register incoming device" icon="idcard" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Item type">
          <Select value={itemType} onChange={setItemType} options={[...combinedTypes.map(t => ({ value: t, label: t })), { value: "__new__", label: "+ Custom item type…" }]} />
        </Field>
        {isNewType && <Field label="Custom item type name"><TextInput value={customType} onChange={setCustomType} placeholder="e.g. Smart Watch" autoFocus /></Field>}
        <Field label="Unique serial number" hint="Every physical unit gets its own serial for identification.">
          <TextInput value={serial} onChange={setSerial} placeholder="e.g. LAP-00412 or PHN-98210" mono autoFocus={!isNewType} />
        </Field>
        {duplicate && <div style={{ fontSize: 12.5, color: "#b23a3a", fontWeight: 600 }}>A device with this serial already exists.</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={create} disabled={!serial.trim() || !finalType || duplicate || saving}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Register device"}</Btn>
      </div>
    </ModalShell>
  );
}

export function UpdateStockModal({ category, onClose, showToast }) {
  const [total, setTotal] = useState(category.totalStock);
  const [threshold, setThreshold] = useState(category.lowStockThreshold);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await FirebaseService.updateDoc("deviceCatalog", category.id, { totalStock: Number(total), lowStockThreshold: Number(threshold) });
      showToast(`${category.itemType} inventory updated.`);
      onClose();
    } catch (e) { showToast(e.message || "Update failed.", "error"); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell title={`Update — ${category.itemType}`} icon="warehouse" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Total stock"><TextInput type="number" value={total} onChange={setTotal} /></Field>
        <Field label="Low-stock alert threshold"><TextInput type="number" value={threshold} onChange={setThreshold} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={save} disabled={saving}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Save"}</Btn>
      </div>
    </ModalShell>
  );
}
