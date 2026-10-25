import { Icon } from "./Icon.jsx";
import { Avatar, Badge, Card } from "./ui.jsx";
import { NAV_BY_ROLE, STATUS_COLOR } from "../lib/constants.js";

/* ============================================================
   APP SHELL
   ============================================================ */

export function Sidebar({ role, active, onNav, user, onLogout, mobileOpen, setMobileOpen, theme, toggleTheme }) {
  const items = NAV_BY_ROLE[role] || [];
  return (
    <>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,34,51,0.4)", zIndex: 40 }} className="mobile-scrim" />}
      <div className="sidebar" style={{
        width: 252, flexShrink: 0, background: "linear-gradient(180deg, var(--blue-deep), #062f52 70%)",
        color: "#fff", display: "flex", flexDirection: "column", padding: "26px 18px",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px 26px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="bolt" size={19} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16.5 }}>NexusIT</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>{role}</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {items.map(it => {
            const isActive = active === it.id;
            return (
              <button key={it.id} onClick={() => { onNav(it.id); setMobileOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
                  border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600,
                  background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.68)",
                  transition: "background .15s ease, color .15s ease",
                  position: "relative",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {isActive && <span style={{ position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)", width: 4, height: 20, borderRadius: 4, background: "var(--green-glow)" }} />}
                <Icon name={it.icon} size={17} />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar name={user.name} size={36} photo={user.photoUrl} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}>{user.matricule}</div>
            </div>
          </div>

          <button onClick={toggleTheme} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, marginBottom: 8
          }}>
            <span>{theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}</span>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: 4 }}>Toggle</span>
          </button>

          <button onClick={onLogout} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            <Icon name="logout" size={15} /> Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export function TopBar({ title, subtitle, right }) {
  return (
    <div className="topbar-container" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
      <div style={{ animation: "fadeUp .45s ease" }}>
        <div className="topbar-title" style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right && <div className="topbar-right" style={{ animation: "fadeUp .45s ease" }}>{right}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, trend, accent = "green", delay = 0 }) {
  const accents = {
    green: { bg: "var(--mint)", fg: "var(--green-deep)" },
    blue: { bg: "#e6f0fb", fg: "var(--blue-deep)" },
    amber: { bg: "#fff4e0", fg: "#a3660a" },
  };
  const a = accents[accent];
  return (
    <Card hover style={{ padding: 22, animation: `fadeUp .5s ease ${delay}ms both` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: a.bg, color: a.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={19} />
        </div>
        {trend != null && <span style={{ fontSize: 12, fontWeight: 700, color: trend > 0 ? "var(--green-deep)" : "#b23a3a", display: "flex", alignItems: "center", gap: 3 }}><Icon name="trend" size={13} />{trend > 0 ? "+" : ""}{trend}%</span>}
      </div>
      <div className="stat-card-value" style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, marginTop: 16, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>{label}</div>
    </Card>
  );
}

export const SectionHeader = ({ icon, title, count, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <Icon name={icon} size={17} />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 12, color: "var(--ink-soft)", background: "var(--surface)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{count}</span>}
    </div>
    {action}
  </div>
);

export const MiniTicketRow = ({ t, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px",
    background: "var(--surface)", borderRadius: 10, cursor: onClick ? "pointer" : "default",
    transition: "background .15s ease",
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.background = "var(--mint)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.background = "var(--surface)")}
  >
    <div style={{ minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>{t.id} · {t.assetCode}</div>
      <div className="mini-ticket-desc" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{t.description}</div>
    </div>
    <Badge label={t.status} colors={STATUS_COLOR[t.status]} size="sm" />
  </div>
);

export const MetaBlock = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    <div className={mono ? "mono" : ""} style={{ fontSize: 15, fontWeight: 700, marginTop: 3, fontFamily: mono ? "var(--font-mono)" : "var(--font-body)" }}>{value}</div>
  </div>
);

export function ModalShell({ title, icon, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(12,34,51,0.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, animation: "fadeIn .2s ease",
    }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{
        background: "var(--white)", borderRadius: 20, width: "100%", maxWidth: wide ? 620 : 480,
        maxHeight: "88vh", overflowY: "auto", padding: 28, boxShadow: "var(--shadow-lg)",
        animation: "scaleIn .28s cubic-bezier(.2,.8,.2,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--mint)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={17} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "var(--surface)", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink-soft)" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
