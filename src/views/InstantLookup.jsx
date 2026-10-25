import { useState, useEffect, useRef } from "react";
import { Icon } from "../components/Icon.jsx";
import { MetaBlock, MiniTicketRow, SectionHeader, TopBar } from "../components/layout.jsx";
import { Avatar, Badge, Btn, Card, EmptyState, Spinner } from "../components/ui.jsx";
import { LOAN_STATUS_COLOR } from "../lib/constants.js";
import { assigneeOf } from "../lib/utils.js";

/* ============================================================
   INSTANT LOOKUP
   ============================================================ */
export function InstantLookup({ db, onOpenTicketForEmployee }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResult(null); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const asset = db.assets.find(a => a.code.toLowerCase() === q || a.code.toLowerCase().includes(q))
        || db.assets.find(a => (a.serial || "").toLowerCase() === q)
        || db.assets.find(a => a.assignee && ((a.assignee.name || "").toLowerCase().includes(q) || (a.assignee.matricule || "").toLowerCase() === q));
      const emp = db.users.find(u => (u.matricule || "").toLowerCase() === q || (u.matricule || "").toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q));
      const foundEmp = emp || (asset ? db.users.find(u => u.id === asset.employeeId) : null);
      const foundAsset = asset || (emp ? db.assets.find(a => a.employeeId === emp.id) : null);
      if (foundEmp || foundAsset) {
        const empTickets = db.tickets.filter(t => t.employeeId === (foundEmp && foundEmp.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const empLoans = db.loanRequests.filter(l => l.employeeId === (foundEmp && foundEmp.id));
        setResult({ employee: foundEmp, holder: foundAsset ? assigneeOf(foundAsset, db) : null, asset: foundAsset, tickets: empTickets, loans: empLoans });
      } else {
        setResult({ notFound: true });
      }
      setSearching(false);
    }, 380);
    return () => clearTimeout(debounceRef.current);
  }, [query, db]);

  return (
    <div>
      <TopBar title="Instant Lookup" subtitle="Type an asset code, matricule, or employee name — the full record auto-populates." />

      <Card style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--mint)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="scan" size={21} />
          </div>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="e.g. NX-LT-0101, NX-DT-0201, EM-2003, or employee name…"
            className="mono" style={{ flex: 1, border: "none", outline: "none", fontSize: 18, fontFamily: "var(--font-mono)", background: "transparent", color: "var(--ink)" }} />
          {searching && <Spinner size={18} color="var(--green)" />}
          {query && !searching && (
            <button onClick={() => setQuery("")} style={{ border: "none", background: "var(--surface)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink-soft)" }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </Card>

      {result && result.notFound && <EmptyState icon="search" title="No match found" subtitle="Check the code or try the employee's name." />}

      {result && !result.notFound && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <Card style={{ padding: 26, marginBottom: 20, background: "linear-gradient(135deg, var(--white), var(--mint) 180%)" }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <Avatar name={result.employee ? result.employee.name : "?"} size={64} photo={result.employee && result.employee.photoUrl} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{result.employee ? result.employee.name : (result.holder ? result.holder.name : "Unknown employee")}</div>
                {!result.employee && result.holder && (
                  <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap", fontSize: 13.5, color: "var(--ink-soft)" }}>
                    {result.holder.matricule && <span className="mono" style={{ fontFamily: "var(--font-mono)" }}>{result.holder.matricule}</span>}
                    {result.holder.agency && <span>· {result.holder.agency}</span>}
                    {result.holder.phone && <span>· {result.holder.phone}</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap", fontSize: 13.5, color: "var(--ink-soft)" }}>
                  {result.employee && <span className="mono" style={{ fontFamily: "var(--font-mono)" }}>{result.employee.matricule}</span>}
                  {result.employee && <span>· {result.employee.agency}</span>}
                  {result.employee && <span style={{ textTransform: "capitalize" }}>· {result.employee.role}</span>}
                </div>
              </div>
              {onOpenTicketForEmployee && result.employee && (
                <Btn icon="plus" onClick={() => onOpenTicketForEmployee(result.employee, result.asset)}>New ticket</Btn>
              )}
            </div>

            {result.asset && (
              <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px dashed var(--line)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 16 }}>
                <MetaBlock label="Asset code" value={result.asset.code} mono />
                <MetaBlock label="Device" value={result.asset.model} />
                <MetaBlock label="Type" value={result.asset.type} />
                <MetaBlock label="Issued" value={result.asset.issueDate} />
                <MetaBlock label="Status" value={result.asset.status} />
                {result.asset.serial && <MetaBlock label="Inventory unit" value={result.asset.serial} mono />}
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }} className="responsive-grid">
            <Card style={{ padding: 22 }}>
              <SectionHeader icon="ticket" title="Ticket history" count={result.tickets.length} />
              {result.tickets.length === 0
                ? <EmptyState icon="ticket" title="No tickets yet" />
                : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>{result.tickets.map(t => <MiniTicketRow key={t.id} t={t} />)}</div>}
            </Card>
            <Card style={{ padding: 22 }}>
              <SectionHeader icon="box" title="Loan history" count={result.loans.length} />
              {result.loans.length === 0
                ? <EmptyState icon="box" title="No loans yet" />
                : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  {result.loans.map(l => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface)", borderRadius: 10 }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.itemType}</div>
                        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>{l.serial || "—"}</div>
                      </div>
                      <Badge label={l.status} colors={LOAN_STATUS_COLOR[l.status]} size="sm" />
                    </div>
                  ))}
                </div>}
            </Card>
          </div>
        </div>
      )}

      {!query && <EmptyState icon="scan" title="Start typing to look someone up" subtitle="Results appear instantly as you type." />}
    </div>
  );
}
