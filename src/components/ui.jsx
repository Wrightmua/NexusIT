import { useState, useEffect } from "react";
import { Icon } from "./Icon.jsx";
import { avatarColor, initialsOf, sanitizeUrl } from "../lib/utils.js";

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */
export const Btn = ({ children, variant = "primary", size = "md", icon, onClick, disabled, style, type = "button", ...rest }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--font-body)", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 12, transition: "transform .15s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease",
    opacity: disabled ? 0.5 : 1, letterSpacing: "0.01em", whiteSpace: "nowrap",
  };
  const sizes = { sm: { padding: "8px 14px", fontSize: 13 }, md: { padding: "11px 20px", fontSize: 14.5 }, lg: { padding: "14px 26px", fontSize: 15.5 } };
  const variants = {
    primary: { background: "linear-gradient(135deg, var(--green) 0%, var(--blue) 130%)", color: "#fff", boxShadow: "0 6px 18px rgba(11,95,164,0.25)" },
    secondary: { background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--ink-soft)" },
    danger: { background: "#fbe9e9", color: "#b23a3a" },
    subtle: { background: "var(--mint)", color: "var(--green-deep)" },
  };
  const [hover, setHover] = useState(false);
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        ...base, ...sizes[size], ...variants[variant],
        transform: hover && !disabled ? "translateY(-1.5px)" : "translateY(0)",
        boxShadow: hover && !disabled && variant === "primary" ? "0 10px 24px rgba(11,95,164,0.32)" : (variants[variant].boxShadow || "none"),
        ...style
      }} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
};

export const Card = ({ children, style, hover = false, ...rest }) => {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{
        background: "var(--white)", border: "1px solid var(--line)", borderRadius: 18,
        boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)",
        transform: h ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow .25s ease, transform .25s ease",
        ...style,
      }} {...rest}>
      {children}
    </div>
  );
};

export const Badge = ({ label, colors, size = "md" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    background: colors.bg, color: colors.fg, fontWeight: 700,
    fontSize: size === "sm" ? 11.5 : 12.5, padding: size === "sm" ? "4px 9px" : "5px 12px",
    borderRadius: 999, letterSpacing: "0.01em",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot }} />
    {label}
  </span>
);

export const Avatar = ({ name, size = 38, photo }) => {
  const safePhoto = sanitizeUrl(photo);
  if (safePhoto) return <img src={safePhoto} alt={name || "Avatar"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const color = avatarColor(name || "?");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, var(--blue))`,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, fontFamily: "var(--font-display)", flexShrink: 0,
    }}>
      {initialsOf(name)}
    </div>
  );
};

export const Field = ({ label, children, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    {label && <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", letterSpacing: "0.02em", textTransform: "uppercase" }}>{label}</label>}
    {children}
    {hint && <span style={{ fontSize: 12, color: "#8298a3" }}>{hint}</span>}
  </div>
);

export const inputStyle = (focused) => ({
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: `1.5px solid ${focused ? "var(--green)" : "var(--line)"}`,
  fontSize: 14.5, fontFamily: "var(--font-body)", outline: "none", background: "var(--white)",
  boxShadow: focused ? "0 0 0 4px rgba(15,169,88,0.12)" : "none",
  transition: "box-shadow .18s ease, border-color .18s ease", color: "var(--ink)",
});

export const TextInput = ({ value, onChange, placeholder, type = "text", mono = false, autoFocus, onKeyDown, onFocus, onBlur, disabled = false }) => {
  const [f, setF] = useState(false);
  return <input autoFocus={autoFocus} type={type} value={value ?? ""} disabled={disabled} onChange={e => onChange && onChange(e.target.value)}
    onFocus={(e) => { setF(true); if (onFocus) onFocus(e); }}
    onBlur={(e) => { setF(false); if (onBlur) onBlur(e); }}
    onKeyDown={onKeyDown}
    placeholder={placeholder} style={{ ...inputStyle(f), fontFamily: mono ? "var(--font-mono)" : "var(--font-body)", ...(disabled ? { background: "var(--surface)", color: "var(--ink-soft)", cursor: "not-allowed" } : {}) }} />;
};

export const Select = ({ value, onChange, options }) => {
  const [f, setF] = useState(false);
  return (
    <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ ...inputStyle(f), appearance: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
};

export const TextArea = ({ value, onChange, placeholder, rows = 4 }) => {
  const [f, setF] = useState(false);
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ ...inputStyle(f), resize: "vertical", lineHeight: 1.5 }} />;
};

export const EmptyState = ({ icon = "box", title, subtitle }) => (
  <div style={{ textAlign: "center", padding: "56px 20px", color: "var(--ink-soft)" }}>
    <div style={{
      width: 56, height: 56, borderRadius: 16, background: "var(--mint)", color: "var(--green-deep)",
      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
    }}><Icon name={icon} size={26} /></div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13.5 }}>{subtitle}</div>}
  </div>
);

export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  const kind = toast.kind || "success";
  const colors = { success: { bg: "var(--green-deep)", icon: "check" }, error: { bg: "#b23a3a", icon: "alert" }, info: { bg: "var(--blue-deep)", icon: "bell" } }[kind];
  return (
    <div style={{
      position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 999,
      background: colors.bg, color: "#fff", padding: "13px 22px", borderRadius: 14,
      display: "flex", alignItems: "center", gap: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
      fontSize: 14, fontWeight: 600, animation: "fadeUp .35s ease",
    }}>
      <Icon name={colors.icon} size={17} />
      {toast.msg}
    </div>
  );
}

export const Spinner = ({ size = 15, color = "#fff" }) => (
  <span style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    border: `2px solid ${color}55`, borderTopColor: color, animation: "spin .7s linear infinite",
  }} />
);
