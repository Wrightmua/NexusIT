import { useState, useEffect } from "react";
import { Icon } from "../components/Icon.jsx";
import { ModalShell, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Field, Select, Spinner, TextArea, TextInput, inputStyle } from "../components/ui.jsx";
import { PRIORITIES, PRIORITY_COLOR, SLA_HOURS, STATUS_COLOR, TICKET_STATUSES } from "../lib/constants.js";
import { exportTicketsToExcel } from "../lib/excel.js";
import { FirebaseService } from "../lib/service.js";
import { assigneeOf, calcSLAStatus, fmtDateTime, fmtDuration, nowISO, uid } from "../lib/utils.js";

/* ============================================================
   TICKETING MODULE — writes go to Firestore via FirebaseService
   ============================================================ */
export function TicketsView({ db, currentUser, prefill, clearPrefill, showToast }) {
  const [showNew, setShowNew] = useState(!!prefill);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [openTicket, setOpenTicket] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { if (prefill) setShowNew(true); }, [prefill]);

  const filtered = db.tickets
    .filter(t => filterStatus === "All" || t.status === filterStatus)
    .filter(t => filterPriority === "All" || (t.priority || "Medium") === filterPriority)
    .filter(t => !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      (db.users.find(u => u.id === t.employeeId) || {}).name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const advanceStatus = async (ticket, newStatus) => {
    try {
      const patch = { status: newStatus, history: [...ticket.history, { status: newStatus, at: nowISO(), by: currentUser.name }] };
      if (newStatus === "Resolved") patch.resolvedAt = nowISO();
      if (newStatus === "Closed") patch.closedAt = nowISO();
      await FirebaseService.updateDoc("tickets", ticket.id, patch);
      showToast(`Ticket ${ticket.id} marked as ${newStatus}.`);
      setOpenTicket(t => t && { ...t, ...patch });
    } catch (e) {
      showToast(e.message || "Could not update ticket.", "error");
    }
  };

  return (
    <div>
      <TopBar title="Support Tickets" subtitle="Intake, track, and resolve IT support requests."
        right={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" icon="download" onClick={() => exportTicketsToExcel(db.tickets, db)}>Export sheet</Btn>
            <Btn icon="plus" onClick={() => setShowNew(true)}>New ticket</Btn>
          </div>
        } />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
          <Icon name="search" size={15} style={{ position: "absolute", left: 13, top: 13, color: "#93a3ac" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket, code, or name…" style={{ ...inputStyle(false), paddingLeft: 36 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {["All", ...TICKET_STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "7px 13px", borderRadius: 999, border: "1.5px solid " + (filterStatus === s ? "transparent" : "var(--line)"),
              background: filterStatus === s ? "var(--ink)" : "var(--white)", color: filterStatus === s ? "#fff" : "var(--ink-soft)",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginLeft: 6 }}>Priority:</span>
          {["All", ...PRIORITIES].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)} style={{
              padding: "6px 11px", borderRadius: 8, border: "1px solid " + (filterPriority === p ? "var(--blue)" : "var(--line)"),
              background: filterPriority === p ? "var(--mint)" : "var(--white)", color: filterPriority === p ? "var(--blue-deep)" : "var(--ink-soft)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <EmptyState icon="ticket" title="No tickets match" subtitle="Try a different filter, or create the first one." />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((t, i) => {
              const emp = db.users.find(u => u.id === t.employeeId);
              const asset = db.assets.find(a => a.code === t.assetCode);
              const tech = db.users.find(u => u.id === t.technicianId);
              const sla = calcSLAStatus(t.createdAt, t.priority || "Medium", t.status);
              const prioCol = PRIORITY_COLOR[t.priority || "Medium"];
              return (
                <Card key={t.id} hover style={{ padding: 18, cursor: "pointer", animation: `fadeUp .4s ease ${i * 35}ms both` }} onClick={() => setOpenTicket(t)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1, minWidth: 240 }}>
                      <Avatar name={emp ? emp.name : "?"} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)" }}>{t.id}</span>
                          <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--blue)" }}>{t.assetCode}</span>
                          <Badge size="sm" label={t.priority || "Medium"} colors={prioCol} />
                          {sla && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                              background: sla.isOverdue ? "#fce8e8" : "var(--mint)", color: sla.isOverdue ? "#d64545" : "var(--green-deep)"
                            }}>{sla.text}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4 }}>{t.description}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3 }}>
                          {emp ? emp.name : (t.employeeName || "Unknown")} · {t.agency} {asset ? `· ${asset.model}` : ""} {tech ? `· Tech: ${tech.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <Badge label={t.status} colors={STATUS_COLOR[t.status]} />
                      <div style={{ fontSize: 11.5, color: "#93a3ac" }}>{fmtDateTime(t.createdAt)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      {showNew && <NewTicketModal db={db} currentUser={currentUser} prefill={prefill} onClose={() => { setShowNew(false); clearPrefill && clearPrefill(); }} showToast={showToast} />}
      {openTicket && <TicketDetailModal ticket={db.tickets.find(t => t.id === openTicket.id) || openTicket} db={db} onClose={() => setOpenTicket(null)} onAdvance={advanceStatus} showToast={showToast} />}
    </div>
  );
}

export function NewTicketModal({ db, currentUser, prefill, onClose, showToast }) {
  const [assetCode, setAssetCode] = useState((prefill && prefill.asset && prefill.asset.code) || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const techList = db.users.filter(u => u.isItTechnician || u.role === "admin");
  const [technicianId, setTechnicianId] = useState(techList[0]?.id || currentUser.id);
  const [matched, setMatched] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const a = db.assets.find(x => x.code.toLowerCase() === assetCode.trim().toLowerCase());
    if (a) {
      const u = db.users.find(x => x.id === a.employeeId);
      const holder = assigneeOf(a, db);
      setMatched({ asset: a, employee: u || (holder ? { id: null, name: holder.name, agency: holder.agency } : { id: null, name: "Unassigned", agency: a.agency || "—" }) });
    }
    else setMatched(null);
  }, [assetCode, db]);

  useEffect(() => { if (prefill && prefill.employee) setMatched({ asset: prefill.asset, employee: prefill.employee }); }, [prefill]);

  const create = async () => {
    if (!assetCode.trim() || !matched || !description.trim()) return;
    setSaving(true);
    try {
      const ticket = {
        id: uid("TCK"), assetCode: matched.asset.code, employeeId: matched.employee.id || null, employeeName: matched.employee.name || null,
        agency: matched.employee.agency || matched.asset.agency || "—",
        description: description.trim(), priority, status: "Received / In Queue", technicianId,
        createdAt: nowISO(), resolvedAt: null, closedAt: null,
        history: [{ status: "Received / In Queue", at: nowISO(), by: currentUser.name }],
      };
      await FirebaseService.setDoc("tickets", ticket.id, ticket, false);
      showToast(`Ticket ${ticket.id} created and queued.`);
      onClose();
    } catch (e) {
      showToast(e.message || "Could not create ticket.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="New support ticket" onClose={onClose} icon="ticket">
      <Field label="Asset code">
        <TextInput value={assetCode} onChange={setAssetCode} placeholder="Type asset code, e.g. NX-LT-0101 or NX-DT-0201" mono autoFocus />
      </Field>

      {assetCode && (
        matched ? (
          <div style={{ marginTop: 14, padding: 14, background: "var(--mint)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, animation: "scaleIn .25s ease" }}>
            <Avatar name={matched.employee.name} size={38} />
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{matched.employee.name} · {matched.employee.agency}</div>
              <div style={{ color: "var(--ink-soft)" }}>{matched.asset.type} — {matched.asset.model} · Auto-filled</div>
            </div>
            <Icon name="check" size={16} style={{ marginLeft: "auto", color: "var(--green-deep)" }} />
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: 12, background: "#fff4e0", color: "#a3660a", borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>
            No asset found for that code yet — keep typing or check the Asset Registry.
          </div>
        )
      )}

      <div className="form-grid-2col" style={{ marginTop: 18 }}>
        <Field label="Priority Level">
          <Select value={priority} onChange={setPriority} options={PRIORITIES} />
        </Field>
        <Field label="Assigned IT Technician">
          {techList.length === 0
            ? <div style={{ fontSize: 12, color: "#a3660a" }}>No designated IT Technicians on record.</div>
            : <Select value={technicianId} onChange={setTechnicianId} options={techList.map(t => ({ value: t.id, label: `${t.name} (IT Tech)` }))} />}
        </Field>
      </div>

      <div style={{ marginTop: 18 }}>
        <Field label="Problem description">
          <TextArea value={description} onChange={setDescription} placeholder="Describe the fault reported by the employee…" />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn icon="check" onClick={create} disabled={!matched || !description.trim() || saving}>{saving ? <><Spinner color="#fff" /> Saving…</> : "Create ticket"}</Btn>
      </div>
    </ModalShell>
  );
}

export function TicketDetailModal({ ticket, db, onClose, onAdvance, showToast }) {
  const emp = db.users.find(u => u.id === ticket.employeeId);
  const asset = db.assets.find(a => a.code === ticket.assetCode);
  const techList = db.users.filter(u => u.isItTechnician || u.role === "admin");
  const [assignedTech, setAssignedTech] = useState(ticket.technicianId || techList[0]?.id || "");
  const nextStatus = { "Received / In Queue": "In Progress", "In Progress": "Resolved", "Resolved": "Closed" }[ticket.status];
  const nextLabel = { "In Progress": "Start work", "Resolved": "Mark as Resolved", "Closed": "Confirm & close" }[nextStatus];

  const reassignTech = async (newTechId) => {
    setAssignedTech(newTechId);
    try {
      await FirebaseService.updateDoc("tickets", ticket.id, { technicianId: newTechId });
      const techObj = db.users.find(u => u.id === newTechId);
      showToast && showToast(`Reassigned ticket ${ticket.id} to ${techObj ? techObj.name : "technician"}.`);
    } catch (e) {
      showToast && showToast("Could not reassign technician.", "error");
    }
  };

  const sla = calcSLAStatus(ticket.createdAt, ticket.priority || "Medium", ticket.status);

  return (
    <ModalShell title={ticket.id} onClose={onClose} icon="ticket" wide>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Avatar name={emp ? emp.name : "?"} size={44} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{emp ? emp.name : (ticket.employeeName || "Unknown")}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{ticket.agency} · {asset ? asset.model : ticket.assetCode}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge label={ticket.priority || "Medium"} colors={PRIORITY_COLOR[ticket.priority || "Medium"]} />
          <Badge label={ticket.status} colors={STATUS_COLOR[ticket.status]} />
        </div>
      </div>

      {sla && (
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
          background: sla.isOverdue ? "#fce8e8" : "var(--mint)", color: sla.isOverdue ? "#d64545" : "var(--green-deep)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span>SLA Target: {SLA_HOURS[ticket.priority || "Medium"]} Hours</span>
          <span>{sla.text}</span>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 16, background: "var(--surface)", borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>{ticket.description}</div>

      <div style={{ marginTop: 20 }}>
        <Field label="Assigned IT Support Technician">
          <Select value={assignedTech} onChange={reassignTech} options={techList.map(t => ({ value: t.id, label: `${t.name} (IT Tech)` }))} />
        </Field>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>Status timeline</div>
        <Timeline history={ticket.history} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: "#93a3ac" }}>
          Brought in {fmtDateTime(ticket.createdAt)}{ticket.resolvedAt && <> · Resolved {fmtDateTime(ticket.resolvedAt)} · Duration {fmtDuration(ticket.createdAt, ticket.resolvedAt)}</>}
        </div>
        {nextStatus ? <Btn icon="check" onClick={() => onAdvance(ticket, nextStatus)}>{nextLabel}</Btn> : <Badge label="Fully closed" colors={STATUS_COLOR["Closed"]} />}
      </div>
    </ModalShell>
  );
}

export function Timeline({ history }) {
  return (
    <div style={{ position: "relative", paddingLeft: 26 }}>
      <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: "var(--line)" }} />
      {history.map((h, i) => {
        const c = STATUS_COLOR[h.status];
        return (
          <div key={i} style={{ position: "relative", paddingBottom: i === history.length - 1 ? 0 : 22, animation: `fadeUp .4s ease ${i * 90}ms both` }}>
            <div style={{ position: "absolute", left: -26, top: 2, width: 14, height: 14, borderRadius: "50%", background: c.dot, border: "3px solid #fff", boxShadow: "0 0 0 1px " + c.dot }} />
            <div style={{ fontWeight: 700, fontSize: 13.5, color: c.fg }}>{h.status}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{fmtDateTime(h.at)} · by {h.by}</div>
          </div>
        );
      })}
    </div>
  );
}
