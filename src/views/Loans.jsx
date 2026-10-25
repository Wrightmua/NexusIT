import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { ModalShell, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Field, TextInput } from "../components/ui.jsx";
import { LOAN_STATUS_COLOR } from "../lib/constants.js";
import { exportLoansToExcel } from "../lib/excel.js";
import { FirebaseService } from "../lib/service.js";
import { nowISO } from "../lib/utils.js";

/* ============================================================
   DEVICE LOANS
   ============================================================ */
export function LoansView({ db, showToast }) {
  const [filter, setFilter] = useState("All");
  const [pickupTarget, setPickupTarget] = useState(null);

  const statuses = ["All", "Requested", "Reserved", "Collected", "Rejected"];
  const filtered = db.loanRequests.filter(l => filter === "All" || l.status === filter).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  const approve = async (loan) => {
    const unit = db.devices.find(d => d.itemType === loan.itemType && d.status === "Available");
    if (!unit) { showToast("No available unit in stock for this item.", "error"); return; }
    try {
      await FirebaseService.updateDoc("loanRequests", loan.id, { status: "Reserved", serial: unit.serial, approvedAt: nowISO() });
      await FirebaseService.updateDoc("devices", unit.id, { status: "Reserved", assignedTo: loan.employeeId });
      showToast(`Reserved ${unit.serial} for pickup.`);
    } catch (e) { showToast(e.message || "Could not approve request.", "error"); }
  };

  const reject = async (loan) => {
    try {
      await FirebaseService.updateDoc("loanRequests", loan.id, { status: "Rejected" });
      showToast(`Request ${loan.id} rejected.`, "info");
    } catch (e) { showToast(e.message || "Could not reject request.", "error"); }
  };

  const confirmPickup = async (loan) => {
    try {
      const unit = db.devices.find(d => d.serial === loan.serial);
      await FirebaseService.updateDoc("loanRequests", loan.id, { status: "Collected", collectedAt: nowISO() });
      if (unit) await FirebaseService.updateDoc("devices", unit.id, { status: "Issued" });
      showToast(`${loan.serial} handed over and logged.`);
      setPickupTarget(null);
    } catch (e) { showToast(e.message || "Could not confirm pickup.", "error"); }
  };

  return (
    <div>
      <TopBar title="Device Loans" subtitle="Approve requests, verify identity, and log every hand-over."
        right={<Btn variant="secondary" icon="download" onClick={() => exportLoansToExcel(db.loanRequests, db)}>Export sheet</Btn>} />

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + (filter === s ? "transparent" : "var(--line)"),
            background: filter === s ? "var(--ink)" : "var(--white)", color: filter === s ? "#fff" : "var(--ink-soft)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon="box" title="No requests here" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((l, i) => {
            const emp = db.users.find(u => u.id === l.employeeId);
            return (
              <Card key={l.id} hover style={{ padding: 18, animation: `fadeUp .4s ease ${i * 40}ms both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <Avatar name={emp ? emp.name : "?"} size={42} photo={emp && emp.photoUrl} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{emp ? emp.name : "Unknown"}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{l.itemType} {l.serial && <span className="mono" style={{ fontFamily: "var(--font-mono)" }}>· {l.serial}</span>} · {emp ? emp.agency : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge label={l.status} colors={LOAN_STATUS_COLOR[l.status]} />
                    {l.status === "Requested" && (<><Btn size="sm" variant="danger" onClick={() => reject(l)}>Reject</Btn><Btn size="sm" onClick={() => approve(l)}>Approve</Btn></>)}
                    {l.status === "Reserved" && <Btn size="sm" icon="camera" onClick={() => setPickupTarget(l)}>Verify &amp; hand over</Btn>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pickupTarget && <PickupVerifyModal loan={pickupTarget} db={db} onClose={() => setPickupTarget(null)} onConfirm={confirmPickup} />}
    </div>
  );
}

export function PickupVerifyModal({ loan, db, onClose, onConfirm }) {
  const emp = db.users.find(u => u.id === loan.employeeId);
  const [code, setCode] = useState("");
  const matches = code.trim().toLowerCase() === (emp ? (emp.matricule || "").toLowerCase() : "");

  return (
    <ModalShell title="Pickup — identity verification" icon="camera" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "6px 0 18px" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Avatar name={emp ? emp.name : "?"} size={96} photo={emp && emp.photoUrl} />
          {matches && code && (
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 30, height: 30, borderRadius: "50%", background: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff", animation: "scaleIn .3s ease" }}>
              <Icon name="check" size={15} color="#fff" />
            </div>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, marginTop: 12 }}>{emp ? emp.name : "Unknown"}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{emp ? emp.agency : ""}</div>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: 12, padding: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
        <span style={{ color: "var(--ink-soft)" }}>Item to collect</span>
        <span style={{ fontWeight: 700 }}>{loan.itemType} <span className="mono" style={{ fontFamily: "var(--font-mono)", color: "var(--blue)" }}>· {loan.serial}</span></span>
      </div>

      <Field label="Ask employee to re-enter their matricule">
        <TextInput value={code} onChange={setCode} placeholder="e.g. EMP-3391" mono autoFocus />
      </Field>

      {code && (matches
        ? <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, color: "var(--green-deep)", fontSize: 13, fontWeight: 700 }}><Icon name="check" size={15} /> Identity confirmed — photo matches record.</div>
        : <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, color: "#b23a3a", fontSize: 13, fontWeight: 700 }}><Icon name="alert" size={15} /> Matricule does not match this request.</div>)}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn icon="check" disabled={!matches} onClick={() => onConfirm(loan)}>Confirm collected</Btn>
      </div>
    </ModalShell>
  );
}
