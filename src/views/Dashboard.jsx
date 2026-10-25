import { Icon } from "../components/Icon.jsx";
import { MascotCharacter } from "../components/MascotCharacter.jsx";
import { MiniTicketRow, SectionHeader, StatCard, TopBar } from "../components/layout.jsx";
import { Badge, Card, EmptyState } from "../components/ui.jsx";

/* ============================================================
   DASHBOARD
   ============================================================ */
export function DashboardView({ db, currentUser, onNav }) {
  const openTickets = db.tickets.filter(t => t.status !== "Closed").length;
  const inQueue = db.tickets.filter(t => t.status === "Received / In Queue").length;
  const resolvedThisWeek = db.tickets.filter(t => t.resolvedAt && (Date.now() - new Date(t.resolvedAt)) < 7 * 864e5).length;
  const pendingLoans = db.loanRequests.filter(l => l.status === "Requested" || l.status === "Reserved").length;
  const lowStockItems = db.deviceCatalog.filter(c => {
    const avail = db.devices.filter(d => d.itemType === c.itemType && d.status === "Available").length;
    return avail <= c.lowStockThreshold;
  });
  const recentTickets = [...db.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div>
      <TopBar title={`Good to see you, ${currentUser.name.split(" ")[0]}`} subtitle="Here's what's happening across NexusIT today." />

      <Card style={{ padding: "20px 26px", marginBottom: 24, background: "linear-gradient(135deg, var(--white), var(--mint) 180%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "var(--ink)" }}>IT Support Hub is Active</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>Monitor incoming tickets, manage physical asset inventory, and issue device requests in real time.</div>
        </div>
        <MascotCharacter size={86} style={{ filter: "drop-shadow(0 6px 14px rgba(11,95,164,0.16))" }} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 26 }}>
        <StatCard label="Open tickets" value={openTickets} icon="ticket" accent="blue" delay={0} />
        <StatCard label="In queue" value={inQueue} icon="clock" accent="amber" delay={60} />
        <StatCard label="Resolved this week" value={resolvedThisWeek} icon="check" accent="green" delay={120} />
        <StatCard label="Pending loan actions" value={pendingLoans} icon="box" accent="blue" delay={180} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }} className="responsive-grid">
        <Card style={{ padding: 22 }}>
          <SectionHeader icon="ticket" title="Recent tickets" action={<button onClick={() => onNav("tickets")} style={{ border: "none", background: "none", color: "var(--blue)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>View all <Icon name="chevronRight" size={13} /></button>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {recentTickets.length === 0 ? <EmptyState icon="ticket" title="No tickets yet" /> : recentTickets.map(t => <MiniTicketRow key={t.id} t={t} onClick={() => onNav("tickets")} />)}
          </div>
        </Card>

        <Card style={{ padding: 22 }}>
          <SectionHeader icon="alert" title="Low stock alerts" count={lowStockItems.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {lowStockItems.length === 0
              ? <div style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", padding: "20px 0" }}>All stock levels healthy.</div>
              : lowStockItems.map(c => {
                const avail = db.devices.filter(d => d.itemType === c.itemType && d.status === "Available").length;
                return (
                  <div key={c.itemType} onClick={() => onNav("inventory")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff8ec", borderRadius: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.itemType}</span>
                    <Badge size="sm" label={`${avail} left`} colors={{ bg: "#fff4e0", fg: "#a3660a", dot: "#e8a13a" }} />
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
