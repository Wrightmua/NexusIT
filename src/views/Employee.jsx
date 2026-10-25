import { useState } from "react";
import { Icon } from "../components/Icon.jsx";
import { MascotCharacter } from "../components/MascotCharacter.jsx";
import { MiniTicketRow, SectionHeader, StatCard, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Field, Spinner, TextArea } from "../components/ui.jsx";
import { LOAN_STATUS_COLOR } from "../lib/constants.js";
import { FirebaseService } from "../lib/service.js";
import { fmtDateTime, nowISO, uid } from "../lib/utils.js";

/* ============================================================
   EMPLOYEE VIEWS
   ============================================================ */
export function EmployeeHome({ db, currentUser, onNav }) {
  const myTickets = db.tickets.filter(t => t.employeeId === currentUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const myLoans = db.loanRequests.filter(l => l.employeeId === currentUser.id);
  const myAsset = db.assets.find(a => a.employeeId === currentUser.id);
  const openCount = myTickets.filter(t => t.status !== "Closed").length;

  return (
    <div>
      <TopBar title={`Hi ${currentUser.name.split(" ")[0]}`} subtitle="Your devices, tickets, and requests in one place." />

      <Card style={{ padding: 24, marginBottom: 24, background: "linear-gradient(135deg, var(--white), var(--mint) 180%)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flex: "1 1 220px" }}>
            <Avatar name={currentUser.name} size={60} photo={currentUser.photoUrl} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>{currentUser.name}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }} className="mono">{currentUser.matricule} · {currentUser.agency}</div>
            </div>
          </div>
          {myAsset && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", fontWeight: 700 }}>Your machine</div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{myAsset.model}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--blue)", fontFamily: "var(--font-mono)" }}>{myAsset.code}</div>
            </div>
          )}
          <MascotCharacter size={92} style={{ filter: "drop-shadow(0 6px 14px rgba(11,95,164,0.18))" }} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 26 }}>
        <StatCard label="Open tickets" value={openCount} icon="ticket" accent="blue" />
        <StatCard label="Total requests" value={myLoans.length} icon="box" accent="green" delay={60} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="responsive-grid">
        <ActionCard icon="wrench" title="Report an issue" desc="Something wrong with your machine? Log it in seconds." onClick={() => onNav("report")} />
        <ActionCard icon="box" title="Request a device" desc="Need a mouse, keyboard, or cable? Browse what's available." onClick={() => onNav("request")} />
      </div>
    </div>
  );
}

export function ActionCard({ icon, title, desc, onClick }) {
  return (
    <Card hover onClick={onClick} style={{ padding: 22, cursor: "pointer" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--mint)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon name={icon} size={20} /></div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5 }}>{desc}</div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 5, color: "var(--blue)", fontSize: 12.5, fontWeight: 700 }}>Get started <Icon name="chevronRight" size={13} /></div>
    </Card>
  );
}

export function EmployeeReportIssue({ db, currentUser, showToast, onNav }) {
  const myAsset = db.assets.find(a => a.employeeId === currentUser.id);
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!description.trim() || !myAsset) return;
    setSaving(true);
    try {
      const ticket = {
        id: uid("TCK"), assetCode: myAsset.code, employeeId: currentUser.id, agency: currentUser.agency,
        description: description.trim(), status: "Received / In Queue", technicianId: null,
        createdAt: nowISO(), resolvedAt: null, closedAt: null,
        history: [{ status: "Received / In Queue", at: nowISO(), by: currentUser.name }],
      };
      await FirebaseService.setDoc("tickets", ticket.id, ticket, false);
      showToast(`Ticket ${ticket.id} submitted to IT Support.`);
      setSent(true);
    } catch (e) { showToast(e.message || "Could not submit.", "error"); }
    finally { setSaving(false); }
  };

  if (sent) {
    return (
      <div>
        <TopBar title="Report an Issue" />
        <Card style={{ padding: 40, textAlign: "center", animation: "scaleIn .4s ease" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--mint)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}><Icon name="check" size={28} /></div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>Ticket submitted</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 6 }}>IT Support has been notified and your machine's history is attached automatically.</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
            <Btn variant="secondary" onClick={() => { setSent(false); setDescription(""); }}>Report another</Btn>
            <Btn onClick={() => onNav("history")}>View my tickets</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Report an Issue" subtitle="Your machine details are attached automatically — just describe the problem." />
      <Card style={{ padding: 24, maxWidth: 560 }}>
        {myAsset ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--mint)", padding: 14, borderRadius: 12, marginBottom: 20 }}>
            <Icon name="laptop" size={20} style={{ color: "var(--green-deep)" }} />
            <div style={{ fontSize: 13.5 }}><div style={{ fontWeight: 700 }}>{myAsset.model}</div><div className="mono" style={{ color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>{myAsset.code}</div></div>
          </div>
        ) : (
          <div style={{ marginBottom: 20, fontSize: 13, color: "#a3660a", background: "#fff4e0", padding: 12, borderRadius: 10 }}>No machine is registered under your matricule. Contact IT Support directly.</div>
        )}
        <Field label="What's wrong?"><TextArea value={description} onChange={setDescription} placeholder="e.g. Screen flickers randomly and the fan is very loud." rows={5} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Btn icon="check" onClick={submit} disabled={!description.trim() || !myAsset || saving}>{saving ? <><Spinner color="#fff" /> Submitting…</> : "Submit ticket"}</Btn>
        </div>
      </Card>
    </div>
  );
}

export function EmployeeRequestDevice({ db, currentUser, showToast, onNav }) {
  const [selected, setSelected] = useState(null);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSeeDeviceCount = currentUser && (currentUser.role === "admin" || currentUser.role === "agent" || Boolean(currentUser.isItTechnician));

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const loan = { id: uid("LN"), employeeId: currentUser.id, itemType: selected, serial: null, status: "Requested", requestedAt: nowISO(), approvedAt: null, collectedAt: null };
      await FirebaseService.setDoc("loanRequests", loan.id, loan, false);
      showToast(`Request for ${selected} sent to IT Support.`);
      setSent(true);
    } catch (e) { showToast(e.message || "Could not send request.", "error"); }
    finally { setSaving(false); }
  };

  if (sent) {
    return (
      <div>
        <TopBar title="Request a Device" />
        <Card style={{ padding: 40, textAlign: "center", animation: "scaleIn .4s ease" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--mint)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}><Icon name="check" size={28} /></div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>Request sent</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 6 }}>IT Support will check availability and reserve a unit for you.</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
            <Btn variant="secondary" onClick={() => { setSent(false); setSelected(null); }}>Request another</Btn>
            <Btn onClick={() => onNav("history")}>View my requests</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Request a Device" subtitle="Your identity is confirmed with your photo before the request goes out." />
      <Card style={{ padding: 18, marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={currentUser.name} size={48} photo={currentUser.photoUrl} />
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Requesting as</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{currentUser.name} <span className="mono" style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--ink-soft)", fontSize: 12.5 }}>· {currentUser.matricule}</span></div>
        </div>
        <Icon name="check" size={16} style={{ marginLeft: "auto", color: "var(--green-deep)" }} />
      </Card>

      {db.deviceCatalog.length === 0
        ? <EmptyState icon="box" title="No devices available yet" subtitle="Ask IT Support to add stock." />
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {db.deviceCatalog.map(c => {
            const avail = db.devices.filter(d => d.itemType === c.itemType && d.status === "Available").length;
            const isSel = selected === c.itemType;
            return (
              <Card key={c.itemType} hover onClick={() => avail > 0 && setSelected(c.itemType)} style={{
                padding: 18, cursor: avail > 0 ? "pointer" : "not-allowed", opacity: avail > 0 ? 1 : 0.5,
                border: isSel ? "2px solid var(--green)" : "1px solid var(--line)", background: isSel ? "var(--mint)" : "var(--white)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Icon name="box" size={20} style={{ color: isSel ? "var(--green-deep)" : "var(--ink-soft)" }} />
                  {isSel && <Icon name="check" size={16} style={{ color: "var(--green-deep)" }} />}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 12 }}>{c.itemType}</div>
                <div style={{ fontSize: 12, color: avail > 0 ? "var(--ink-soft)" : "#b23a3a", marginTop: 3 }}>
                  {avail > 0 ? (canSeeDeviceCount ? `${avail} available` : "Available") : "Out of stock"}
                </div>
              </Card>
            );
          })}
        </div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <Btn icon="check" onClick={submit} disabled={!selected || saving}>{saving ? <><Spinner color="#fff" /> Sending…</> : "Send request"}</Btn>
      </div>
    </div>
  );
}

export function EmployeeHistory({ db, currentUser }) {
  const myTickets = db.tickets.filter(t => t.employeeId === currentUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const myLoans = db.loanRequests.filter(l => l.employeeId === currentUser.id).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  return (
    <div>
      <TopBar title="My History" subtitle="Every ticket and device request tied to your matricule." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="responsive-grid">
        <Card style={{ padding: 22 }}>
          <SectionHeader icon="ticket" title="My tickets" count={myTickets.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {myTickets.length === 0 ? <EmptyState icon="ticket" title="No tickets yet" /> : myTickets.map(t => <MiniTicketRow key={t.id} t={t} />)}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionHeader icon="box" title="My requests" count={myLoans.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {myLoans.length === 0 ? <EmptyState icon="box" title="No requests yet" /> : myLoans.map(l => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface)", borderRadius: 10 }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.itemType}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{fmtDateTime(l.requestedAt)}</div></div>
                <Badge label={l.status} colors={LOAN_STATUS_COLOR[l.status]} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
