import { useState, useEffect, useMemo } from "react";
import { Icon } from "../components/Icon.jsx";
import { MascotCharacter } from "../components/MascotCharacter.jsx";
import { Field, Spinner, TextInput } from "../components/ui.jsx";
import { FirebaseService, IS_DEMO } from "../lib/service.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/demoData.js";

/* ============================================================
   LOGIN SCREEN
   ============================================================ */
export function LoginScreen({ onLogin, theme, toggleTheme }) {
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isDark = theme === "dark";

  const triggerHeadShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 700);
  };

  const submitLogin = async () => {
    setError("");
    if (!matricule || !password) {
      setError("Enter your matricule and password.");
      triggerHeadShake();
      return;
    }
    setBusy(true);
    try {
      const user = await FirebaseService.signIn(matricule, password);
      onLogin(user);
    } catch (e) {
      setError(e.message || "Login failed.");
      triggerHeadShake();
    } finally {
      setBusy(false);
    }
  };

  const eyeOffset = useMemo(() => {
    if (focusedField === "matricule") {
      const len = matricule.length;
      const x = Math.min(10, Math.max(-10, (len - 5) * 1.6));
      const y = 3;
      return { x, y };
    }
    if (focusedField === "password") {
      const len = password.length;
      const x = Math.min(8, Math.max(-8, (len - 4) * 1.5));
      const y = 7;
      return { x, y };
    }
    return { x: 0, y: 0 };
  }, [focusedField, matricule, password]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px", position: "relative", overflow: "hidden",
      background: isDark
        ? "radial-gradient(ellipse at 20% 50%, rgba(11,95,164,0.2) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(15,169,88,0.14) 0%, transparent 55%), #070f17"
        : "radial-gradient(ellipse at 20% 50%, rgba(11,95,164,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(15,169,88,0.06) 0%, transparent 55%), #f0f6fc",
      transition: "background .45s ease",
    }}>

      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-12%", left: "-8%", width: 560, height: 560, borderRadius: "50%", background: isDark ? "rgba(11,95,164,0.13)" : "rgba(11,95,164,0.05)", filter: "blur(90px)", pointerEvents: "none", animation: "floatSlow 10s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "-18%", right: "-8%", width: 640, height: 640, borderRadius: "50%", background: isDark ? "rgba(15,169,88,0.10)" : "rgba(15,169,88,0.05)", filter: "blur(110px)", pointerEvents: "none", animation: "floatSlow 13s ease-in-out infinite 2s" }} />

      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,.022)" : "rgba(11,95,164,.035)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,.022)" : "rgba(11,95,164,.035)"} 1px, transparent 1px)`, backgroundSize: "52px 52px", pointerEvents: "none", transition: "background .45s ease" }} />

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed", top: 18, right: 20, zIndex: 200,
          display: "flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 30,
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.75)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(11,95,164,0.18)"}`,
          color: isDark ? "rgba(255,255,255,0.82)" : "#0b5fa4",
          cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "var(--font-body)",
          backdropFilter: "blur(14px)", transition: "all .3s ease",
          boxShadow: isDark ? "none" : "0 2px 12px rgba(11,95,164,0.10)",
        }}
      >
        <span style={{ fontSize: 14 }}>{isDark ? "🌙" : "☀️"}</span>
        <span>{isDark ? "Dark" : "Light"}</span>
      </button>

      {/* Login card */}
      <div style={{
        width: "100%", maxWidth: 460, position: "relative", zIndex: 1,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(22px)",
        transition: "opacity .5s ease, transform .5s ease",
      }}>

        {/* Glassmorphism card */}
        <div className="login-card" style={{
          background: isDark ? "rgba(10,19,27,0.82)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(11,95,164,0.13)"}`,
          borderRadius: 24, padding: "40px 38px 36px",
          boxShadow: isDark
            ? "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 32px 80px rgba(11,95,164,0.11), 0 0 0 1px rgba(255,255,255,0.9)",
          transition: "background .4s ease, border-color .4s ease, box-shadow .4s ease",
        }}>

          {/* Brand Mascot */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{
              width: 86, height: 86, borderRadius: "50%", margin: "0 auto 14px",
              background: isDark
                ? "radial-gradient(circle, rgba(15,169,88,0.22) 0%, rgba(11,95,164,0.3) 100%)"
                : "radial-gradient(circle, rgba(15,169,88,0.12) 0%, rgba(11,95,164,0.14) 100%)",
              border: `2px solid ${isDark ? "rgba(62,207,126,0.35)" : "rgba(11,95,164,0.2)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(11,95,164,0.18)",
              animation: "floatSlow 6s ease-in-out infinite",
            }}>
              <MascotCharacter size={74} eyeOffset={eyeOffset} isShaking={isShaking} isPassword={focusedField === "password"} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--ink)", letterSpacing: "-0.02em" }}>NexusIT</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600, marginTop: 3 }}>IT Support &amp; Asset Platform</div>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 26, flexWrap: "wrap" }}>
            {[
              { icon: "ticket", label: "Tickets" },
              { icon: "laptop", label: "Assets" },
              { icon: "box", label: "Device Loans" },
              { icon: "users", label: "User Roles" },
            ].map(f => (
              <div key={f.label} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20,
                background: isDark ? "rgba(11,95,164,0.18)" : "rgba(11,95,164,0.07)",
                border: `1px solid ${isDark ? "rgba(11,95,164,0.38)" : "rgba(11,95,164,0.15)"}`,
                fontSize: 11, fontWeight: 700, color: isDark ? "#5aadec" : "#0b5fa4",
                transition: "all .3s ease",
              }}>
                <Icon name={f.icon} size={11} style={{ color: isDark ? "#5aadec" : "#0b5fa4" }} /> {f.label}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(11,95,164,0.10)", marginBottom: 24, transition: "background .4s ease" }} />

          {/* Title */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
              Welcome back
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5, lineHeight: 1.5 }}>
              Sign in with your matricule and password.
            </div>
          </div>

          {IS_DEMO && (
            <div style={{ marginBottom: 18, padding: "11px 14px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.6, background: isDark ? "rgba(15,169,88,0.12)" : "var(--mint)", color: "var(--ink)", border: "1px solid var(--mint-2)" }}>
              <strong>Demo mode</strong> — sample data, nothing leaves your browser.<br />
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.matricule} type="button" onClick={() => { setMatricule(a.matricule); setPassword(DEMO_PASSWORD); }}
                  style={{ border: "none", background: "transparent", padding: 0, marginRight: 12, cursor: "pointer", color: "var(--blue)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  {a.matricule} <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--ink-soft)" }}>({a.role})</span>
                </button>
              ))}
              <div>Password: <code>{DEMO_PASSWORD}</code></div>
            </div>
          )}

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <Field label="Matricule">
              <TextInput value={matricule} onChange={setMatricule} placeholder="e.g. AG-1042 or AD-0001" mono
                autoFocus onKeyDown={e => e.key === "Enter" && submitLogin()}
                onFocus={() => setFocusedField("matricule")} onBlur={() => setFocusedField(null)} />
            </Field>
            <Field label="Password">
              <TextInput value={password} onChange={setPassword} placeholder="••••••••" type="password"
                onKeyDown={e => e.key === "Enter" && submitLogin()}
                onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} />
            </Field>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 10,
                fontSize: 13, fontWeight: 600, animation: "fadeIn .2s ease",
                background: isDark ? "rgba(214,69,69,0.15)" : "#fbe9e9",
                color: "#d64545",
                border: `1px solid ${isDark ? "rgba(214,69,69,0.28)" : "transparent"}`,
              }}>
                <Icon name="alert" size={15} /> {error}
              </div>
            )}

            <button
              onClick={submitLogin}
              disabled={busy}
              style={{
                marginTop: 4, width: "100%", padding: "13px 20px", borderRadius: 13, border: "none",
                background: busy ? (isDark ? "rgba(11,95,164,0.45)" : "rgba(11,95,164,0.38)") : "linear-gradient(135deg, #0b5fa4 0%, #0a7c41 100%)",
                color: "#fff", fontWeight: 700, fontSize: 15.5, cursor: busy ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                boxShadow: busy ? "none" : "0 8px 24px rgba(11,95,164,0.38)",
                transition: "all .25s ease", fontFamily: "var(--font-body)",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(11,95,164,0.46)"; } }}
              onMouseLeave={e => { if (!busy) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(11,95,164,0.38)"; } }}
            >
              {busy
                ? <><Spinner /> Verifying…</>
                : <>Sign in <Icon name="chevronRight" size={17} /></>}
            </button>
          </div>
        </div>

        {/* Footer trust badge */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: isDark ? "rgba(255,255,255,0.28)" : "#93a3ac", justifyContent: "center", transition: "color .4s ease" }}>
          <Icon name="lock" size={12} /> Secured by Firebase Auth · NexusIT Platform
        </div>
      </div>
    </div>
  );
}
