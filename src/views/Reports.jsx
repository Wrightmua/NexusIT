import { SectionHeader, StatCard, TopBar } from "../components/layout.jsx";
import { Btn, Card, EmptyState } from "../components/ui.jsx";
import { exportAssetsToExcel, exportLoansToExcel, exportTicketsToExcel } from "../lib/excel.js";

/* ============================================================
   REPORTS
   ============================================================ */
export function ReportsView({ db }) {
  const totalTickets = db.tickets.length;
  const avgResolution = (() => {
    const resolved = db.tickets.filter(t => t.resolvedAt);
    if (!resolved.length) return "—";
    const totalMs = resolved.reduce((s, t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)), 0);
    const hrs = totalMs / resolved.length / 36e5;
    return hrs < 24 ? `${hrs.toFixed(1)}h` : `${(hrs / 24).toFixed(1)}d`;
  })();
  const byAgency = {};
  db.tickets.forEach(t => { byAgency[t.agency] = (byAgency[t.agency] || 0) + 1; });
  const maxAgency = Math.max(1, ...Object.values(byAgency));

  return (
    <div>
      <TopBar title="Reports &amp; Export" subtitle="Summaries for management, and full record exports."
        right={<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="secondary" icon="download" onClick={() => exportAssetsToExcel(db.assets, db)}>Asset register (.xlsx)</Btn>
          <Btn variant="secondary" icon="download" onClick={() => exportTicketsToExcel(db.tickets, db)}>Repair sheet (.xlsx)</Btn>
          <Btn icon="download" onClick={() => exportLoansToExcel(db.loanRequests, db)}>Loan sheet (.xlsx)</Btn>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 26 }}>
        <StatCard label="Total tickets logged" value={totalTickets} icon="ticket" accent="blue" />
        <StatCard label="Avg. resolution time" value={avgResolution} icon="clock" accent="green" delay={60} />
        <StatCard label="Devices registered" value={db.devices.length} icon="idcard" accent="blue" delay={120} />
        <StatCard label="Loans collected" value={db.loanRequests.filter(l => l.status === "Collected").length} icon="box" accent="green" delay={180} />
      </div>

      <Card style={{ padding: 24 }}>
        <SectionHeader icon="building" title="Tickets by agency" />
        {Object.keys(byAgency).length === 0
          ? <EmptyState icon="building" title="No ticket data yet" />
          : <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
            {Object.entries(byAgency).map(([agency, count], i) => (
              <div key={agency}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>{agency}</span><span style={{ color: "var(--ink-soft)" }}>{count}</span></div>
                <div style={{ height: 9, background: "var(--surface)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxAgency) * 100}%`, background: "linear-gradient(90deg, var(--green), var(--blue))", borderRadius: 999, animation: `growBar 1s ease ${i * 90}ms both`, transformOrigin: "left" }} />
                </div>
              </div>
            ))}
          </div>}
      </Card>
    </div>
  );
}
