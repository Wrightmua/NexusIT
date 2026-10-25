import { useState, useEffect } from "react";
import { Icon } from "./components/Icon.jsx";
import { Sidebar } from "./components/layout.jsx";
import { Avatar, Spinner, Toast } from "./components/ui.jsx";
import { COLLECTIONS, EMPTY_DB } from "./lib/constants.js";
import { FirebaseService } from "./lib/service.js";
import { AssetsView } from "./views/Assets.jsx";
import { DashboardView } from "./views/Dashboard.jsx";
import { EmployeeHistory, EmployeeHome, EmployeeReportIssue, EmployeeRequestDevice } from "./views/Employee.jsx";
import { InstantLookup } from "./views/InstantLookup.jsx";
import { InventoryView } from "./views/Inventory.jsx";
import { LoansView } from "./views/Loans.jsx";
import { LoginScreen } from "./views/LoginScreen.jsx";
import { ReportsView } from "./views/Reports.jsx";
import { TicketsView } from "./views/Tickets.jsx";
import { UsersView } from "./views/Users.jsx";

/* ============================================================
   ROOT APP — live Firestore subscriptions
   ============================================================ */

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [nav, setNav] = useState("dashboard");
  const [db, setDb] = useState(EMPTY_DB);
  const [connError, setConnError] = useState(null);
  const [toast, setToast] = useState(null);
  const [prefillTicket, setPrefillTicket] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("nexus-theme");
    return stored === "dark" || stored === "light" ? stored : "light";
  });

  const toggleTheme = () => setTheme(t => {
    const next = t === "dark" ? "light" : "dark";
    localStorage.setItem("nexus-theme", next);
    return next;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const showToast = (msg, kind = "success") => setToast({ msg, kind, key: Date.now() });

  // Init Firebase + auth listener once.
  useEffect(() => {
    try {
      FirebaseService.init();
    } catch (e) {
      setConnError("Could not initialize Firebase: " + e.message);
      setAuthChecked(true);
      return;
    }
    const unsub = FirebaseService.onAuthChange((u) => {
      setUser(u);
      setAuthChecked(true);
      if (u) setNav(u.role === "employee" ? "home" : "dashboard");
    });
    return () => unsub && unsub();
  }, []);

  // Live-subscribe to every collection once signed in.
  useEffect(() => {
    if (!user) return;
    const unsubs = COLLECTIONS.map(col =>
      FirebaseService.subscribe(col, (docs) => {
        setDb(prev => ({ ...prev, [col]: docs }));
      }, (err) => {
        setConnError(`Live sync error on "${col}": ${err.message}. Check your Firestore security rules.`);
      })
    );
    return () => unsubs.forEach(u => u && u());
  }, [user]);

  const handleLogin = (u) => { setUser(u); setNav(u.role === "employee" ? "home" : "dashboard"); };
  const handleLogout = async () => { await FirebaseService.signOut(); setUser(null); setDb(EMPTY_DB); };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <Spinner size={28} color="var(--blue)" />
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>Connecting to NexusIT…</div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />;

  const liveProfile = db.users.find(u => u.id === user.id);
  const me = liveProfile ? { ...user, ...liveProfile } : user;

  const openTicketForEmployee = (employee, asset) => { setPrefillTicket({ employee, asset }); setNav("tickets"); };

  let content = null;
  if (me.role === "employee") {
    if (nav === "home") content = <EmployeeHome db={db} currentUser={me} onNav={setNav} />;
    else if (nav === "report") content = <EmployeeReportIssue db={db} currentUser={me} showToast={showToast} onNav={setNav} />;
    else if (nav === "request") content = <EmployeeRequestDevice db={db} currentUser={me} showToast={showToast} onNav={setNav} />;
    else if (nav === "history") content = <EmployeeHistory db={db} currentUser={me} />;
  } else {
    if (nav === "dashboard") content = <DashboardView db={db} currentUser={me} onNav={setNav} />;
    else if (nav === "lookup") content = <InstantLookup db={db} onOpenTicketForEmployee={openTicketForEmployee} />;
    else if (nav === "tickets") content = <TicketsView db={db} currentUser={me} prefill={prefillTicket} clearPrefill={() => setPrefillTicket(null)} showToast={showToast} />;
    else if (nav === "assets") content = <AssetsView db={db} currentUser={me} showToast={showToast} />;
    else if (nav === "loans") content = <LoansView db={db} showToast={showToast} />;
    else if (nav === "inventory") content = <InventoryView db={db} showToast={showToast} />;
    else if (nav === "users" && me.role === "admin") content = <UsersView db={db} showToast={showToast} />;
    else if (nav === "reports" && me.role === "admin") content = <ReportsView db={db} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`
    @media (max-width: 900px) {
      .sidebar { position: fixed !important; left: 0; transform: translateX(${mobileOpen ? "0" : "-100%"}); transition: transform .28s ease; box-shadow: var(--shadow-lg); }
      .main-content { padding: 22px 16px !important; }
      .responsive-grid { grid-template-columns: 1fr !important; }
      .mobile-scrim { display: block !important; }
      .mobile-topbar { display: flex !important; }
      .brand-panel { display: none !important; }
    }
    @media (min-width: 901px) { .mobile-topbar { display: none !important; } }
  `}</style>

      <Sidebar role={me.role} active={nav} onNav={setNav} user={me} onLogout={handleLogout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} theme={theme} toggleTheme={toggleTheme} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mobile-topbar" style={{ display: "none", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "var(--white)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 30 }}>
          <button onClick={() => setMobileOpen(true)} style={{ border: "none", background: "var(--surface)", borderRadius: 9, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="grid" size={17} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 700 }}><Icon name="bolt" size={16} style={{ color: "var(--green)" }} /> NexusIT</div>
          <Avatar name={me.name} size={32} photo={me.photoUrl} />
        </div>

        <div className="main-content" style={{ padding: "38px 44px", maxWidth: 1180, margin: "0 auto" }}>
          {connError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fbe9e9", color: "#b23a3a", padding: "13px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 22 }}>
              <Icon name="cloudOff" size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{connError}</span>
            </div>
          )}
          {content}
        </div>
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
