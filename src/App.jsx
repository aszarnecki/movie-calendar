import { useState, useEffect, useRef } from "react";
import { login, getRole, logout } from "./auth.js";

// ─── Global styles injected once ────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cinzel:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #c9a96e;
    --gold-dim: #7a6340;
    --bg: #050505;
    --surface: #0d0d0d;
    --border: #1a1a1a;
  }

  body { background: var(--bg); overscroll-behavior: none; }

  /* Film grain overlay */
  body::after {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    opacity: 0.4;
  }

  /* Keyframes */
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(40px) scale(0.97); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes revealPoster {
    from { opacity:0; transform:scale(0.88) translateY(24px); filter:blur(8px); }
    to   { opacity:1; transform:scale(1) translateY(0); filter:blur(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse {
    0%, 100% { opacity:1; }
    50%       { opacity:0.5; }
  }
  @keyframes spinnerRing {
    to { transform: rotate(360deg); }
  }
  @keyframes dotPop {
    0%  { transform: scale(0.6); opacity:0; }
    60% { transform: scale(1.3); }
    100%{ transform: scale(1); opacity:1; }
  }
  @keyframes cardReveal {
    from { opacity:0; transform:scale(0.94); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes expandFromLeft {
    from { transform: scaleX(0.5) translateX(-50%) scaleY(0.78); opacity:0.5; }
    to   { transform: scaleX(1)   translateX(0)    scaleY(1);    opacity:1;   }
  }
  @keyframes expandFromRight {
    from { transform: scaleX(0.5) translateX(50%)  scaleY(0.78); opacity:0.5; }
    to   { transform: scaleX(1)   translateX(0)    scaleY(1);    opacity:1;   }
  }
  @keyframes shrinkToLeft {
    from { transform: scaleX(1)   translateX(0)    scaleY(1);    opacity:1;   }
    to   { transform: scaleX(0.5) translateX(-50%) scaleY(0.78); opacity:0;   }
  }
  @keyframes shrinkToRight {
    from { transform: scaleX(1)   translateX(0)    scaleY(1);    opacity:1;   }
    to   { transform: scaleX(0.5) translateX(50%)  scaleY(0.78); opacity:0;   }
  }

  .film-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .film-card:active { transform: scale(0.97) !important; }

  .day-btn { transition: all 0.18s ease; }
  .day-btn:active { transform: scale(0.93); }

  .numpad-btn { transition: background 0.1s, transform 0.1s; }
  .numpad-btn:active { transform: scale(0.9); background: #1e1e1e !important; }

  .action-btn { transition: all 0.2s ease; }
  .action-btn:hover { filter: brightness(1.1); }
  .action-btn:active { transform: scale(0.96); }

  input::placeholder { color: #2e2e2e; }
  input:focus { border-color: #333 !important; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
`;

const BASE_DAYS = [
  { key:"mon", name:"Azjatycki Poniedziałek", icon:"🎋", color:"#e07a5f", short:"Pon", jsDay:1 },
  { key:"tue", name:"Polski Wtorek",          icon:"🦅", color:"#f2cc8f", short:"Wt",  jsDay:2 },
  { key:"wed", name:"Oscarowa Środa",         icon:"🏆", color:"#f4d03f", short:"Śr",  jsDay:3 },
  { key:"thu", name:"Komediowy Czwartek",     icon:"😄", color:"#81b29a", short:"Czw", jsDay:4 },
  { key:"fri", name:"Horror Piątek",          icon:"🩸", color:"#e63946", short:"Pt",  jsDay:5 },
  { key:"sat", name:"Kinowa Sobota",          icon:"🎬", color:"#c77dff", short:"Sob", jsDay:6 },
  { key:"sun", name:"Przygodowa Niedziela",   icon:"🌄", color:"#48cae4", short:"Nd",  jsDay:0 },
];

function todayKey() {
  const d = new Date().getDay(); // 0=Sun
  return BASE_DAYS.find(x => x.jsDay === d)?.key || "mon";
}

function resolveDay(key, configs) {
  const base = BASE_DAYS.find(d => d.key === key);
  const cfg  = configs?.[key] || {};
  const ov   = cfg.override;
  if (ov?.until && new Date() <= new Date(ov.until + "T23:59:59"))
    return { ...base, name:ov.name||base.name, icon:ov.icon||base.icon, color:ov.color||base.color, isTemp:true, tempUntil:ov.until };
  return { ...base, name:cfg.name||base.name, icon:cfg.icon||base.icon, color:cfg.color||base.color, isTemp:false };
}

// ─── CSS injection ───────────────────────────────────────────────
function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

// ─── Logo SVG ────────────────────────────────────────────────────
function CinemaLogo({ size = 64, glow = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: glow ? "drop-shadow(0 0 20px rgba(201,169,110,0.5))" : "none" }}>
      {/* Film strip body */}
      <rect x="8" y="18" width="48" height="28" rx="3" fill="#1a1a1a" stroke="#c9a96e" strokeWidth="1.5"/>
      {/* Sprocket holes left */}
      <rect x="11" y="22" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      <rect x="11" y="30" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      <rect x="11" y="38" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      {/* Sprocket holes right */}
      <rect x="48" y="22" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      <rect x="48" y="30" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      <rect x="48" y="38" width="5" height="5" rx="1" fill="#050505" stroke="#c9a96e44" strokeWidth="0.5"/>
      {/* Frame area */}
      <rect x="20" y="21" width="24" height="22" rx="2" fill="#0a0a0a" stroke="#c9a96e33" strokeWidth="0.5"/>
      {/* Play triangle */}
      <path d="M27 27 L27 37 L37 32 Z" fill="#c9a96e" opacity="0.9"/>
      {/* Top/bottom strips */}
      <rect x="8" y="14" width="48" height="4" rx="1.5" fill="#111" stroke="#c9a96e33" strokeWidth="0.5"/>
      <rect x="8" y="46" width="48" height="4" rx="1.5" fill="#111" stroke="#c9a96e33" strokeWidth="0.5"/>
      {/* Dot accents on strips */}
      {[14,22,30,38,46,54].map(x => (
        <circle key={x} cx={x} cy="16" r="1" fill="#c9a96e55"/>
      ))}
      {[14,22,30,38,46,54].map(x => (
        <circle key={x} cx={x} cy="48" r="1" fill="#c9a96e55"/>
      ))}
    </svg>
  );
}

// ─── utils ───────────────────────────────────────────────────────
function Lnk({ href, label, bgColor, bdrColor, txtColor }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer"
    style={{ fontSize:11, padding:"5px 12px", background:bgColor, border:`1px solid ${bdrColor}`,
      borderRadius:20, color:txtColor, textDecoration:"none", fontWeight:600,
      letterSpacing:"0.04em", transition:"opacity 0.15s" }}
    onMouseEnter={e=>e.target.style.opacity=0.8}
    onMouseLeave={e=>e.target.style.opacity=1}>
    {label} ↗
  </a>;
}

function Field({ label, value, onChange, placeholder, mono, hint }) {
  return (
    <div>
      <label style={{ fontSize:10, color:"#383838", letterSpacing:"0.12em",
        textTransform:"uppercase", display:"block", marginBottom:6,
        fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", background:"#080808", border:"1px solid #1e1e1e",
          borderRadius:10, padding:"11px 14px", color:"#e8e0d0",
          fontSize:mono?12:14, outline:"none",
          fontFamily:mono?"monospace":"'DM Sans',sans-serif",
          transition:"border-color 0.15s" }}/>
      {hint && <div style={{ fontSize:10, color:"#252525", marginTop:5,
        fontFamily:"'DM Sans',sans-serif" }}>{hint}</div>}
    </div>
  );
}

// ─── Film Add/Edit Modal ─────────────────────────────────────────
function FilmModal({ existing, color, onSave, onClose }) {
  const [f, setF] = useState(existing || { title:"", year:"", duration:"", poster:"", desc:"", filmweb:"", letterboxd:"" });
  const set = k => v => setF(p => ({...p,[k]:v}));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:100,
      display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 0 0 0" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:520, background:"#0e0e0e",
        borderRadius:"16px 16px 0 0", padding:"20px 20px 32px",
        border:"1px solid #1e1e1e", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color, letterSpacing:"0.06em" }}>
            {existing ? "✏️ Edytuj film" : "➕ Dodaj film"}
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#444",
            fontSize:20, cursor:"pointer", padding:"0 4px" }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 72px", gap:10 }}>
            <Field label="Tytuł *" value={f.title} onChange={set("title")} placeholder="np. Parasite"/>
            <div>
              <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
                textTransform:"uppercase", display:"block", marginBottom:5 }}>Rok</label>
              <input value={f.year} onChange={e=>set("year")(e.target.value)} placeholder="2019" maxLength={4}
                style={{ width:"100%", boxSizing:"border-box", background:"#111", border:"1px solid #1e1e1e",
                  borderRadius:8, padding:"10px 6px", color:"#e8e0d0", fontSize:13,
                  outline:"none", textAlign:"center", fontFamily:"'Lato',sans-serif" }}/>
            </div>
          </div>
          <Field label="Opis" value={f.desc} onChange={set("desc")} placeholder="Krótki opis…"/>
          <div>
            <label style={{ fontSize:10, color:"#383838", letterSpacing:"0.12em",
              textTransform:"uppercase", display:"block", marginBottom:6,
              fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Czas trwania (minuty)</label>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="number" value={f.duration} onChange={e=>set("duration")(e.target.value)}
                placeholder="np. 120" min="1" max="300"
                style={{ width:100, background:"#080808", border:"1px solid #1e1e1e",
                  borderRadius:10, padding:"11px 14px", color:"#e8e0d0", fontSize:14,
                  outline:"none", fontFamily:"'DM Sans',sans-serif" }}/>
              {parseDuration(f.duration) && (() => {
                const dur = durationLabel(parseDuration(f.duration));
                return (
                  <span style={{ fontSize:12, color:dur.color, fontFamily:"'DM Sans',sans-serif" }}>
                    {formatDuration(parseDuration(f.duration))} · {dur.label}
                  </span>
                );
              })()}
            </div>
          </div>
          <Field label="URL plakatu" value={f.poster} onChange={set("poster")}
            placeholder="https://…jpg" mono
            hint="Google Grafika → prawy klik na plakat → Kopiuj adres obrazu"/>
          {f.poster && (
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <img src={f.poster} alt="preview" style={{ width:44, height:62, objectFit:"cover",
                borderRadius:5 }} onError={e=>e.target.style.opacity=0.15}/>
              <span style={{ fontSize:11, color:"#3a3a3a" }}>podgląd plakatu</span>
            </div>
          )}
          <Field label="Filmweb" value={f.filmweb} onChange={set("filmweb")}
            placeholder="https://www.filmweb.pl/film/…" mono/>
          <Field label="Letterboxd" value={f.letterboxd} onChange={set("letterboxd")}
            placeholder="https://letterboxd.com/film/…" mono/>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button onClick={() => f.title.trim() && onSave(f)}
              disabled={!f.title.trim()}
              style={{ flex:1, background:f.title.trim()?color:"#1a1a1a", border:"none",
                borderRadius:8, padding:"13px 0", color:f.title.trim()?"#060606":"#333",
                fontWeight:700, cursor:f.title.trim()?"pointer":"default", fontSize:15,
                transition:"all 0.15s" }}>
              {existing ? "Zapisz" : "Dodaj"}
            </button>
            <button onClick={onClose}
              style={{ background:"transparent", border:"1px solid #222", borderRadius:8,
                padding:"13px 18px", color:"#555", cursor:"pointer", fontSize:14 }}>Anuluj</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── JSON Import Modal ───────────────────────────────────────────
/*
  Oczekiwany format JSON — tablica filmów (1 lub 2):
  [
    {
      "title":      "Parasite",          // wymagane
      "year":       "2019",              // opcjonalne
      "poster":     "https://…jpg",      // opcjonalne
      "desc":       "Opis filmu",        // opcjonalne
      "filmweb":    "https://filmweb…",  // opcjonalne
      "letterboxd": "https://letterboxd…" // opcjonalne
    }
  ]
  Możesz też podać pojedynczy obiekt zamiast tablicy.
*/
function ImportModal({ color, existingCount, onImport, onClose }) {
  const [films,   setFilms]   = useState(null); // parsed preview
  const [error,   setError]   = useState("");
  const [replace, setReplace] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) parsed = [parsed];
        // validate
        const valid = parsed.filter(f => f && typeof f.title === "string" && f.title.trim());
        if (valid.length === 0) { setError("Brak filmów z polem 'title' w pliku."); setFilms(null); return; }
        if (valid.length > 2)   { setError(`Plik zawiera ${valid.length} filmów — załaduję pierwsze 2.`); }
        else { setError(""); }
        setFilms(valid.slice(0, 2).map(f => ({
          title:      String(f.title || "").trim(),
          year:       String(f.year  || "").trim(),
          poster:     String(f.poster || "").trim(),
          desc:       String(f.desc  || f.description || "").trim(),
          filmweb:    String(f.filmweb    || "").trim(),
          letterboxd: String(f.letterboxd || "").trim(),
        })));
      } catch {
        setError("Nieprawidłowy JSON. Sprawdź format pliku.");
        setFilms(null);
      }
    };
    reader.readAsText(file);
  };

  const slots = 2 - (replace ? 0 : existingCount);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:100,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:520, background:"#0e0e0e",
        borderRadius:"16px 16px 0 0", padding:"20px 20px 36px",
        border:"1px solid #1e1e1e", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color, letterSpacing:"0.06em" }}>
            📂 Import JSON
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"#444", fontSize:20, cursor:"pointer" }}>×</button>
        </div>

        {/* Format hint */}
        <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:10,
          padding:"12px 14px", marginBottom:16, fontSize:11, color:"#3a3a3a", lineHeight:1.8 }}>
          <div style={{ color:"#555", marginBottom:6, fontWeight:700 }}>Oczekiwany format:</div>
          <pre style={{ margin:0, fontFamily:"monospace", fontSize:10, color:"#2e2e2e",
            whiteSpace:"pre-wrap" }}>{`[
  {
    "title":      "Parasite",
    "year":       "2019",
    "poster":     "https://…jpg",
    "desc":       "Opis",
    "filmweb":    "https://filmweb.pl/…",
    "letterboxd": "https://letterboxd.com/…"
  }
]`}</pre>
        </div>

        {/* File picker */}
        <input ref={fileRef} type="file" accept=".json,application/json"
          onChange={handleFile} style={{ display:"none" }}/>
        <button onClick={() => fileRef.current?.click()}
          style={{ width:"100%", background:"transparent",
            border:`1px dashed ${color}55`, borderRadius:10, padding:"14px 0",
            color, cursor:"pointer", fontSize:13, marginBottom:12,
            fontFamily:"'Lato',sans-serif" }}>
          📁 Wybierz plik .json
        </button>

        {error && (
          <div style={{ fontSize:11, color:"#e07a5f", background:"rgba(224,122,95,0.08)",
            border:"1px solid rgba(224,122,95,0.2)", borderRadius:8,
            padding:"8px 12px", marginBottom:12 }}>{error}</div>
        )}

        {/* Preview */}
        {films && (
          <>
            <div style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
              textTransform:"uppercase", marginBottom:8 }}>
              Podgląd · {films.length} film{films.length > 1 ? "y" : ""}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {films.map((m, i) => (
                <div key={i} style={{ display:"flex", gap:10, background:"#111",
                  borderRadius:10, padding:"10px 12px", border:"1px solid #1a1a1a",
                  alignItems:"center" }}>
                  {m.poster
                    ? <img src={m.poster} alt={m.title}
                        style={{ width:38, height:54, objectFit:"cover", borderRadius:5, flexShrink:0 }}
                        onError={e=>e.target.style.opacity=0.15}/>
                    : <div style={{ width:38, height:54, borderRadius:5, background:"#1a1a1a",
                        flexShrink:0, display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:16 }}>🎞</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{m.title}</div>
                    <div style={{ fontSize:11, color:"#555" }}>
                      {[m.year, m.filmweb&&"Filmweb ✓", m.letterboxd&&"Letterboxd ✓"]
                        .filter(Boolean).join(" · ")}
                    </div>
                    {m.desc && <div style={{ fontSize:11, color:"#3a3a3a", marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.desc}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Replace toggle */}
            {existingCount > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
                background:"#0a0a0a", borderRadius:8, padding:"10px 14px",
                border:"1px solid #1a1a1a" }}>
                <button onClick={() => setReplace(p=>!p)}
                  style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                    background: replace?color:"#222", position:"relative", flexShrink:0,
                    transition:"background 0.2s" }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:"#e8e0d0",
                    position:"absolute", top:3, transition:"left 0.2s",
                    left: replace?"19px":"3px" }}/>
                </button>
                <span style={{ fontSize:12, color:"#555" }}>
                  {replace
                    ? "Zastąp istniejące filmy"
                    : `Dodaj do istniejących (wolne miejsca: ${slots})`}
                </span>
              </div>
            )}

            <button
              onClick={() => onImport(films, replace)}
              style={{ width:"100%", background:color, border:"none", borderRadius:8,
                padding:"13px 0", color:"#060606", fontWeight:700,
                cursor:"pointer", fontSize:15 }}>
              ✓ Importuj {films.length > slots && !replace ? `(${slots} z ${films.length})` : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Theme Modal ─────────────────────────────────────────────────
function ThemeModal({ dayKey, configs, onSave, onClose }) {
  const cur  = resolveDay(dayKey, configs);
  const base = BASE_DAYS.find(d => d.key === dayKey);
  const [name,setName]     = useState(cur.name);
  const [icon,setIcon]     = useState(cur.icon);
  const [color,setColor]   = useState(cur.color);
  const [isTemp,setIsTemp] = useState(false);
  const [until,setUntil]   = useState("");

  const save = () => {
    onSave(dayKey, name, icon, color, isTemp ? until : null);
    onClose();
  };
  const reset = () => { onSave(dayKey, base.name, base.icon, base.color, null, true); onClose(); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:100,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:520, background:"#0e0e0e",
        borderRadius:"16px 16px 0 0", padding:"20px 20px 32px",
        border:"1px solid #1e1e1e", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color, letterSpacing:"0.06em" }}>
            ✏️ Motyw dnia
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#444",
            fontSize:20, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", background:"#0a0a0a", borderRadius:8, padding:3, gap:3 }}>
            {[{v:false,l:"Stała zmiana"},{v:true,l:"Tymczasowy motyw"}].map(o=>(
              <button key={String(o.v)} onClick={()=>setIsTemp(o.v)}
                style={{ flex:1, background:isTemp===o.v?"#181818":"transparent", border:"none",
                  borderRadius:6, padding:"9px 0", color:isTemp===o.v?color:"#3a3a3a",
                  cursor:"pointer", fontSize:12, fontWeight:isTemp===o.v?700:400 }}>
                {o.l}
              </button>
            ))}
          </div>
          <Field label="Nazwa dnia" value={name} onChange={setName} placeholder="np. Dramatyczny Wtorek"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
                textTransform:"uppercase", display:"block", marginBottom:5 }}>Emoji</label>
              <input value={icon} onChange={e=>setIcon(e.target.value)}
                style={{ width:"100%", boxSizing:"border-box", background:"#111", border:"1px solid #1e1e1e",
                  borderRadius:8, padding:"9px 8px", color:"#e8e0d0", fontSize:24,
                  outline:"none", textAlign:"center" }}/>
            </div>
            <div>
              <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
                textTransform:"uppercase", display:"block", marginBottom:5 }}>Kolor</label>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                style={{ width:"100%", height:44, background:"#111", border:"1px solid #1e1e1e",
                  borderRadius:8, padding:3, cursor:"pointer" }}/>
            </div>
          </div>
          {isTemp && (
            <div>
              <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
                textTransform:"uppercase", display:"block", marginBottom:5 }}>Aktywny do</label>
              <input type="date" value={until} onChange={e=>setUntil(e.target.value)}
                min={new Date().toISOString().slice(0,10)}
                style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:8,
                  padding:"10px 12px", color:"#e8e0d0", fontSize:14, outline:"none",
                  colorScheme:"dark", fontFamily:"'Lato',sans-serif" }}/>
            </div>
          )}
          <div style={{ background:"#0a0a0a", border:`1px solid ${color}33`, borderRadius:10,
            padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:28 }}>{icon}</span>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", color, fontSize:14 }}>{name}</div>
              <div style={{ fontSize:10, color:"#3a3a3a" }}>{isTemp&&until?`tymczasowy · do ${until}`:"stały"}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} disabled={isTemp&&!until}
              style={{ flex:1, background:(isTemp&&!until)?"#1a1a1a":color, border:"none",
                borderRadius:8, padding:"13px 0", color:(isTemp&&!until)?"#333":"#060606",
                fontWeight:700, cursor:(isTemp&&!until)?"default":"pointer", fontSize:14 }}>
              Zapisz motyw
            </button>
            <button onClick={reset}
              style={{ background:"transparent", border:"1px solid #222", borderRadius:8,
                padding:"13px 14px", color:"#555", cursor:"pointer", fontSize:13 }}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Duration helpers ────────────────────────────────────────────
function parseDuration(val) {
  if (!val) return null;
  const n = parseInt(val);
  return isNaN(n) || n <= 0 ? null : n;
}
function formatDuration(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
}
function durationLabel(min) {
  if (!min) return null;
  if (min < 90)  return { label:"Krótki",  color:"#81b29a" };
  if (min < 130) return { label:"Średni",  color:"#c9a96e" };
  return             { label:"Długi",   color:"#e07a5f" };
}

// ─── Split Hero — 2 filmy obok siebie ────────────────────────────
function SplitHero({ day, movies, chosenId, watched, isAdmin, onChoose, onReset, onWatched, onEditFilm, onAddFilm }) {
  const [spinning,  setSpinning]  = useState(false);
  const [hlit,      setHlit]      = useState(null);
  const [rect,      setRect]      = useState(null);   // {top,left,width,height} of clicked card
  const [expanded,  setExpanded]  = useState(false);  // overlay reached full size
  const [collapsing,setCollapsing]= useState(false);  // shrinking back
  const timerRef  = useRef(null);
  const leftRef   = useRef(null);
  const rightRef  = useRef(null);
  const [a, b]    = movies;
  const chosen    = movies.find(m => m.id === chosenId);

  useEffect(() => {
    if (!chosenId) { setHlit(null); setRect(null); setExpanded(false); setCollapsing(false); }
  }, [chosenId]);

  const handleChoose = (id, ref) => {
    if (!ref?.current) { onChoose(id); return; }
    const r = ref.current.getBoundingClientRect();
    setRect({ top:r.top, left:r.left, width:r.width, height:r.height });
    setExpanded(false);
    onChoose(id);
    // after one frame start expanding
    requestAnimationFrame(() => requestAnimationFrame(() => setExpanded(true)));
  };

  const handleReset = () => {
    setCollapsing(true);
    setExpanded(false);
    setTimeout(() => { onReset(); setCollapsing(false); }, 400);
  };

  const doSpin = () => {
    if (spinning || movies.length < 2) return;
    setSpinning(true);
    const winner = movies[Math.floor(Math.random()*2)];
    let count=0; const total=18+Math.floor(Math.random()*8);
    const ids=[a?.id,b?.id].filter(Boolean);
    const tick=()=>{
      setHlit(ids[count%2]); count++;
      const delay=count<total-5?80:80+(count-(total-5))*130;
      if(count<total){timerRef.current=setTimeout(tick,delay);}
      else{
        setHlit(winner.id); setSpinning(false);
        const ref = (winner.id === a?.id) ? leftRef : rightRef;
        handleChoose(winner.id, ref);
      }
    };
    tick();
  };
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);

  // ── Overlay (hero transition) ──
  if (chosen && !spinning && rect) {
    const dur = parseDuration(chosen.duration);
    const durLabel = durationLabel(dur);
    // Collapsed = card rect, Expanded = full viewport
    const style = {
      position:   "fixed",
      overflow:   "hidden",
      zIndex:     50,
      transition: collapsing
        ? "top 0.38s cubic-bezier(0.4,0,0.6,1), left 0.38s cubic-bezier(0.4,0,0.6,1), width 0.38s cubic-bezier(0.4,0,0.6,1), height 0.38s cubic-bezier(0.4,0,0.6,1), border-radius 0.38s cubic-bezier(0.4,0,0.6,1)"
        : "top 0.44s cubic-bezier(0.22,1,0.36,1), left 0.44s cubic-bezier(0.22,1,0.36,1), width 0.44s cubic-bezier(0.22,1,0.36,1), height 0.44s cubic-bezier(0.22,1,0.36,1), border-radius 0.44s cubic-bezier(0.22,1,0.36,1)",
      top:          (collapsing || !expanded) ? rect.top    : 0,
      left:         (collapsing || !expanded) ? rect.left   : 0,
      width:        (collapsing || !expanded) ? rect.width  : "100vw",
      height:       (collapsing || !expanded) ? rect.height : "100dvh",
      borderRadius: (collapsing || !expanded) ? "14px"      : "0px",
    };

    return (
      <div style={style}>
        {/* Poster blurs into bg as overlay expands */}
        {chosen.poster && (
          <div style={{ position:"absolute", inset:0,
            backgroundImage:`url(${chosen.poster})`,
            backgroundSize:"cover", backgroundPosition:"center",
            filter: expanded && !collapsing
              ? "blur(30px) brightness(0.18) saturate(1.5)"
              : "blur(2px) brightness(0.55)",
            transform:"scale(1.08)",
            transition:"filter 0.55s ease 0.1s" }}/>
        )}
        {!chosen.poster && <div style={{ position:"absolute", inset:0, background:"#050505" }}/>}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(to bottom, rgba(5,5,5,0.1) 0%, transparent 40%, rgba(5,5,5,0.75) 100%)",
          opacity: expanded && !collapsing ? 1 : 0, transition:"opacity 0.4s ease 0.15s" }}/>

        {/* Content — only visible when fully expanded */}
        <div style={{ position:"relative", height:"100%", display:"flex", flexDirection:"column",
          opacity: expanded && !collapsing ? 1 : 0,
          transition:"opacity 0.35s ease 0.2s",
          pointerEvents: expanded && !collapsing ? "auto" : "none" }}>

          <div style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            padding:"20px 24px 8px", gap:12, textAlign:"center" }}>

            <div style={{ fontSize:10, color:`${day.color}99`, letterSpacing:"0.2em",
              textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
              {watched ? "✓ Obejrzane" : "Film na ten wieczór"}
            </div>

            <div style={{ position:"relative" }}>
              {chosen.poster
                ? <img src={chosen.poster} alt={chosen.title}
                    style={{ width:140, height:200, borderRadius:14, objectFit:"cover",
                      filter:watched?"grayscale(60%) brightness(0.45)":"none",
                      boxShadow:`0 16px 80px ${day.color}55, 0 4px 24px rgba(0,0,0,0.9)`,
                      display:"block", border:`1px solid ${day.color}22` }}/>
                : <div style={{ width:140, height:200, borderRadius:14, background:"#141414",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🎞</div>
              }
              {watched && (
                <div style={{ position:"absolute", inset:0, borderRadius:14,
                  background:"rgba(0,0,0,0.62)", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:48 }}>✅</div>
              )}
            </div>

            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:"#f0e8d8",
                lineHeight:1.35, fontWeight:700, marginBottom:4, maxWidth:250 }}>
                {chosen.title}
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                gap:8, flexWrap:"wrap" }}>
                {chosen.year && (
                  <span style={{ fontSize:12, color:"#444", fontFamily:"'DM Sans',sans-serif" }}>
                    {chosen.year}
                  </span>
                )}
                {dur && (
                  <>
                    <span style={{ color:"#222", fontSize:10 }}>·</span>
                    <span style={{ fontSize:11, color:"#555", fontFamily:"'DM Sans',sans-serif" }}>
                      {formatDuration(dur)}
                    </span>
                    <span style={{ fontSize:10, padding:"2px 8px",
                      background:`${durLabel.color}18`, border:`1px solid ${durLabel.color}33`,
                      borderRadius:20, color:durLabel.color,
                      fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                      {durLabel.label}
                    </span>
                  </>
                )}
              </div>
              {chosen.desc && (
                <div style={{ fontSize:12, color:"#3a3a3a", lineHeight:1.65, marginTop:8,
                  fontStyle:"italic", maxWidth:240, fontFamily:"'Playfair Display',serif" }}>
                  {chosen.desc}
                </div>
              )}
            </div>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
              <Lnk href={chosen.filmweb}    label="Filmweb"    bgColor="rgba(255,102,0,0.1)"  bdrColor="rgba(255,102,0,0.3)"  txtColor="#ff8833"/>
              <Lnk href={chosen.letterboxd} label="Letterboxd" bgColor="rgba(0,230,130,0.07)" bdrColor="rgba(0,230,130,0.3)"  txtColor="#00c27a"/>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, padding:"10px 20px 20px" }}>
            {!watched ? (
              <button className="action-btn" onClick={onWatched}
                style={{ flex:1, background:`linear-gradient(135deg, ${day.color}ee, ${day.color}99)`,
                  border:"none", borderRadius:14, padding:"14px 0",
                  color:"#050505", cursor:"pointer", fontSize:14, fontWeight:700,
                  fontFamily:"'DM Sans',sans-serif", boxShadow:`0 4px 24px ${day.color}44` }}>
                ✓ Obejrzane
              </button>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, color:"#2e2e2e", fontFamily:"'DM Sans',sans-serif" }}>
                Dobry wybór 🎉
              </div>
            )}
            <button className="action-btn" onClick={handleReset}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e1e1e",
                borderRadius:14, padding:"14px 18px", color:"#444",
                cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                whiteSpace:"nowrap" }}>
              Zmień
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Split view ──
  const noFilms = movies.length === 0;
  const oneFilm = movies.length === 1;

  if (noFilms) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16, padding:32 }}>
      <div style={{ fontSize:52, opacity:0.15 }}>🎭</div>
      <p style={{ fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:"0.1em",
        color:"#252525", textAlign:"center" }}>Brak propozycji na ten dzień</p>
      <button onClick={onAddFilm}
        style={{ background:`${day.color}18`, border:`1px dashed ${day.color}44`,
          borderRadius:10, padding:"12px 24px", color:day.color,
          cursor:"pointer", fontSize:13 }}>
        ➕ Dodaj film
      </button>
    </div>
  );

  const CardHalf = ({ movie, side, lit, cardRef }) => {
    const bg = movie?.poster;
    const isLeft = side === "left";
    return (
      <div ref={cardRef} className="film-card"
        style={{ flex:1, position:"relative", overflow:"hidden",
          cursor: movie||isAdmin?"pointer":"default",
          borderRadius: isLeft?"14px 0 0 14px":"0 14px 14px 14px",
          transform: lit ? "scale(1.03)" : "scale(1)",
          boxShadow: lit ? `0 0 40px ${day.color}55` : "none",
          transition:"transform 0.15s ease, box-shadow 0.15s ease" }}
        onClick={() => !spinning && movie && handleChoose(movie.id, cardRef)}>

        {bg
          ? <div style={{ position:"absolute", inset:0,
              backgroundImage:`url(${bg})`, backgroundSize:"cover", backgroundPosition:"center",
              filter:`brightness(${lit?"0.6":"0.25"}) saturate(${lit?"1.3":"1"})`,
              transform:"scale(1.04)", transition:"filter 0.2s" }}/>
          : <div style={{ position:"absolute", inset:0, background:"#080808" }}/>
        }
        <div style={{ position:"absolute", inset:0, borderRadius:"inherit",
          background:"linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.88) 100%)" }}/>
        {lit && <div style={{ position:"absolute", inset:0, borderRadius:"inherit",
          background:`radial-gradient(ellipse at 50% 30%, ${day.color}14 0%, transparent 65%)` }}/>}
        <div style={{ position:"absolute", inset:0, borderRadius:"inherit", pointerEvents:"none",
          border:`1.5px solid ${lit ? day.color+"99" : "rgba(255,255,255,0.04)"}`,
          transition:"border-color 0.15s" }}/>

        <div style={{ position:"relative", height:"100%", display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"flex-end",
          padding:"0 12px 20px", gap:6, textAlign:"center" }}>
          {bg && (
            <img src={bg} alt={movie?.title}
              style={{ width:70, height:98, objectFit:"cover", borderRadius:10,
                boxShadow:"0 6px 28px rgba(0,0,0,0.85)",
                filter: lit ? "none" : "brightness(0.6) saturate(0.7)",
                transition:"filter 0.2s", border:"1px solid rgba(255,255,255,0.07)" }}/>
          )}
          {!bg && movie && (
            <div style={{ width:70, height:98, borderRadius:10, background:"#111",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24, color:"#1e1e1e", border:"1px solid #1a1a1a" }}>🎞</div>
          )}
          {movie ? (
            <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
                fontSize:13, lineHeight:1.35, maxWidth:110,
                color: lit ? "#f0e8d8" : "#555",
                transition:"color 0.15s", textShadow:"0 2px 12px rgba(0,0,0,0.95)" }}>
                {movie.title}
              </div>
              {movie.year && (
                <div style={{ fontSize:10, color: lit ? "#666" : "#2a2a2a",
                  fontFamily:"'DM Sans',sans-serif", transition:"color 0.15s" }}>
                  {movie.year}
                </div>
              )}
              {parseDuration(movie.duration) && (() => {
                const dl = durationLabel(parseDuration(movie.duration));
                return (
                  <span style={{ fontSize:9, padding:"1px 6px",
                    background: lit ? `${dl.color}25` : `${dl.color}0e`,
                    border:`1px solid ${lit ? dl.color+"55" : dl.color+"22"}`,
                    borderRadius:20, color: lit ? dl.color : dl.color+"77",
                    fontFamily:"'DM Sans',sans-serif", fontWeight:600,
                    transition:"all 0.15s" }}>
                    {formatDuration(parseDuration(movie.duration))}
                  </span>
                );
              })()}
              {isAdmin && (
                <button onClick={e=>{e.stopPropagation();onEditFilm(movie);}}
                  style={{ position:"absolute", top:10, right:10,
                    background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)",
                    border:"1px solid #252525", borderRadius:8,
                    padding:"4px 9px", color:"#3a3a3a",
                    cursor:"pointer", fontSize:10, transition:"color 0.15s" }}>✏️</button>
              )}
            </>
          ) : (
            isAdmin ? (
              <button onClick={e=>{e.stopPropagation();onAddFilm();}}
                style={{ background:`${day.color}18`, border:`1px dashed ${day.color}44`,
                  borderRadius:10, padding:"8px 16px", color:day.color,
                  cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                + Dodaj
              </button>
            ) : null
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ flex:1, display:"flex", gap:3, minHeight:0, padding:"12px 12px 0" }}>
        <CardHalf movie={a} side="left"  lit={hlit===a?.id} cardRef={leftRef}/>
        <CardHalf movie={oneFilm?null:b} side="right" lit={hlit===b?.id} cardRef={rightRef}/>
      </div>

      {movies.length === 2 && !spinning && (
        <div style={{ textAlign:"center", marginTop:10,
          fontSize:10, color:"#1e1e1e", letterSpacing:"0.16em",
          fontFamily:"'DM Sans',sans-serif", fontWeight:600,
          textTransform:"uppercase" }}>vs</div>
      )}

      <div style={{ padding:"10px 16px 16px", textAlign:"center" }}>
        {movies.length >= 2 ? (
          <button className="action-btn" onClick={doSpin} disabled={spinning}
            style={{
              background: spinning
                ? "#0d0d0d"
                : `linear-gradient(135deg, ${day.color}ee, ${day.color}aa)`,
              border: `1.5px solid ${spinning ? "#1a1a1a" : day.color+"88"}`,
              borderRadius:16, padding:"15px 0", width:"100%",
              fontWeight:700, fontSize:16,
              cursor:spinning?"default":"pointer",
              color:spinning?"#333":"#050505",
              fontFamily:"'Playfair Display',serif",
              fontStyle:"italic", letterSpacing:"0.04em",
              boxShadow: spinning ? "none" : `0 6px 36px ${day.color}44, 0 2px 8px rgba(0,0,0,0.5)`,
              transition:"all 0.25s ease" }}>
            {spinning ? "Losowanie…" : "🎲 Losuj film"}
          </button>
        ) : (
          <p style={{ color:"#1e1e1e", fontSize:11, fontFamily:"'DM Sans',sans-serif",
            letterSpacing:"0.04em" }}>
            Kliknij plakat · dodaj 2 filmy do losowania
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Week Overview ────────────────────────────────────────────────
function WeekView({ dayConfigs, dayMovies, currentKey, onSelectDay, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:100,
      display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 20px", borderBottom:"1px solid #161616" }}>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#c9a96e",
          letterSpacing:"0.1em" }}>📅 Cały tydzień</span>
        <button onClick={onClose} style={{ background:"none", border:"none",
          color:"#444", fontSize:22, cursor:"pointer" }}>×</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px",
        display:"flex", flexDirection:"column", gap:8 }}>
        {BASE_DAYS.map(base => {
          const day   = resolveDay(base.key, dayConfigs);
          const mov   = dayMovies[base.key] || {};
          const cands = mov.candidates || [];
          const isToday = base.key === currentKey;
          return (
            <div key={base.key}
              onClick={() => { onSelectDay(base.key); onClose(); }}
              style={{ background: isToday?"#111":"#0a0a0a",
                border:`1px solid ${isToday?day.color+"55":"#161616"}`,
                borderRadius:12, padding:"14px 16px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:14,
                transition:"background 0.15s" }}>
              <div style={{ fontSize:28, lineHeight:1, flexShrink:0 }}>{day.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Cinzel',serif", color:isToday?day.color:"#888",
                  fontSize:13, letterSpacing:"0.05em", marginBottom:4 }}>
                  {day.name}
                  {isToday && <span style={{ fontSize:9, color:day.color+"99",
                    marginLeft:8, letterSpacing:"0.1em" }}>DZIŚ</span>}
                </div>
                {cands.length > 0 ? (
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    {cands.map(c => c.poster
                      ? <img key={c.id} src={c.poster} alt={c.title}
                          style={{ width:24, height:34, objectFit:"cover", borderRadius:3,
                            opacity:mov.watched&&c.id!==mov.chosenId?0.3:1,
                            border:c.id===mov.chosenId?`1px solid ${day.color}`:"none" }}/>
                      : <div key={c.id} style={{ width:24, height:34, borderRadius:3,
                          background:"#1e1e1e", display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:10, color:"#333" }}>🎞</div>
                    )}
                    <span style={{ fontSize:11, color:"#3a3a3a", marginLeft:4 }}>
                      {mov.chosenId
                        ? (mov.watched ? "✓ obejrzane" : "wybrany")
                        : `${cands.length} propozycj${cands.length===1?"a":"e"}`}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:"#252525" }}>brak propozycji</div>
                )}
              </div>
              <div style={{ fontSize:18, color:"#1e1e1e" }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LoginScreen ─────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const handleKey = (k) => {
    if (k === "⌫") { setPin(p => p.slice(0,-1)); setErr(""); return; }
    if (k === "" || pin.length >= 4) return;
    const np = pin + k;
    setPin(np);
    setErr("");
    if (np.length === 4) {
      const role = login(np);
      if (role) { onLogin(role); }
      else {
        setShake(true);
        setTimeout(() => { setErr("Nieprawidłowy PIN"); setPin(""); setShake(false); }, 400);
      }
    }
  };

  return (
    <div style={{ height:"100dvh", background:"var(--bg)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"'DM Sans',sans-serif",
      backgroundImage:"radial-gradient(ellipse at 50% 0%, rgba(201,169,110,0.06) 0%, transparent 60%)" }}>
      <GlobalStyles/>
      <div style={{ width:"100%", maxWidth:300, textAlign:"center",
        animation:"fadeUp 0.6s ease both" }}>

        {/* Logo */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          <CinemaLogo size={72} glow/>
        </div>

        <h1 style={{ fontFamily:"'Playfair Display',serif", color:"var(--gold)",
          fontSize:22, fontWeight:700, letterSpacing:"0.04em",
          marginBottom:6, animation:"fadeUp 0.6s 0.1s ease both", opacity:0 }}>
          Filmowy Kalendarz
        </h1>
        <p style={{ color:"#2e2e2e", fontSize:13, marginBottom:36,
          animation:"fadeUp 0.6s 0.2s ease both", opacity:0 }}>
          Podaj PIN żeby wejść
        </p>

        {/* PIN dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:36,
          animation:"fadeUp 0.6s 0.25s ease both", opacity:0 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:12, height:12, borderRadius:"50%",
              background: pin.length > i ? "var(--gold)" : "#141414",
              border:`1.5px solid ${pin.length > i ? "var(--gold)" : "#252525"}`,
              animation: pin.length > i ? "dotPop 0.2s ease both" : "none",
              transition:"border-color 0.2s",
              boxShadow: pin.length > i ? "0 0 10px rgba(201,169,110,0.4)" : "none"
            }}/>
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10,
          animation:"fadeUp 0.6s 0.3s ease both", opacity:0,
          transform: shake ? "translateX(0)" : undefined }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            <button key={i} className="numpad-btn" onClick={() => handleKey(String(k === "" ? "" : k))}
              style={{
                background: k===""?"transparent":"#0d0d0d",
                border: k===""?"none":`1px solid #1a1a1a`,
                borderRadius:14, padding:"17px 0",
                color: k==="⌫"?"#444":"#c8c0b0",
                fontSize: k==="⌫"?16:19,
                fontWeight:400, cursor: k===""?"default":"pointer",
                fontFamily:"'DM Sans',sans-serif",
              }}>
              {k}
            </button>
          ))}
        </div>

        {err && (
          <p style={{ color:"#e07a5f", fontSize:12, marginTop:16,
            animation:"fadeIn 0.2s ease", letterSpacing:"0.04em" }}>{err}</p>
        )}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [dayConfigs, setDayConfigs] = useState({});
  const [dayMovies,  setDayMovies]  = useState({});
  const [selDay,     setSelDay]     = useState(todayKey());
  const [modal,      setModal]      = useState(null);
  const [ready,      setReady]      = useState(false);
  const [role,       setRole]       = useState(() => getRole());

  const isAdmin = role === "admin";

  // fonts loaded via GlobalStyles CSS injection

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.storage.get("cinema-cfg").catch(()=>null);
        if (cfg?.value) setDayConfigs(JSON.parse(cfg.value));
        const mov = await window.storage.get("cinema-mov").catch(()=>null);
        if (mov?.value) setDayMovies(JSON.parse(mov.value));
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (!ready) return; window.storage.set("cinema-cfg", JSON.stringify(dayConfigs)).catch(()=>{}); }, [dayConfigs, ready]);
  useEffect(() => { if (!ready) return; window.storage.set("cinema-mov",  JSON.stringify(dayMovies)).catch(()=>{}); }, [dayMovies,  ready]);

  // movie handlers
  const candidates = k => dayMovies[k]?.candidates || [];

  const saveFilm = (k, movie) => setDayMovies(p => {
    const list = p[k]?.candidates || [];
    if (list.length >= 2 && !movie.id) return p; // max 2
    if (movie.id) {
      return { ...p, [k]: { ...(p[k]||{}), candidates: list.map(m => m.id===movie.id?{...m,...movie}:m) } };
    }
    return { ...p, [k]: { ...(p[k]||{}), candidates: [...list, { ...movie, id:Date.now() }] } };
  });

  const chooseMovie  = (k, id) => setDayMovies(p => ({ ...p, [k]: { ...(p[k]||{}), chosenId:id, watched:false } }));
  const resetChoice  = (k)     => setDayMovies(p => ({ ...p, [k]: { ...(p[k]||{}), chosenId:null, watched:false } }));
  const markWatched  = (k)     => setDayMovies(p => ({ ...p, [k]: { ...(p[k]||{}), watched:true } }));

  const importFilms = (k, films, replace) => setDayMovies(p => {
    const existing = replace ? [] : (p[k]?.candidates || []);
    const slots    = 2 - existing.length;
    const toAdd    = films.slice(0, slots).map(f => ({ ...f, id: Date.now() + Math.random() }));
    return { ...p, [k]: { ...(p[k]||{}), candidates: [...existing, ...toAdd] } };
  });

  const saveTheme = (k, name, icon, color, tempUntil, reset) => setDayConfigs(p => {
    const ex = p[k] || {};
    if (reset) { const {override,...r}=ex; return {...p,[k]:{...r,name:undefined,icon:undefined,color:undefined}}; }
    if (tempUntil) return { ...p, [k]: { ...ex, override:{ name, icon, color, until:tempUntil } } };
    const {override,...r}=ex; return { ...p, [k]: { ...r, name, icon, color } };
  });

  if (!ready) return (
    <div style={{ height:"100dvh", background:"#050505", display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <GlobalStyles/>
      <div style={{ width:40, height:40, borderRadius:"50%",
        border:"2px solid #1a1a1a", borderTopColor:"#c9a96e",
        animation:"spinnerRing 0.8s linear infinite" }}/>
    </div>
  );
  if (!role) return <LoginScreen onLogin={r => setRole(r)} />;

  const day    = resolveDay(selDay, dayConfigs);
  const mov    = dayMovies[selDay] || {};
  const cands  = candidates(selDay);
  const today  = todayKey();

  return (
    <div style={{ height:"100dvh", background:"var(--bg)", color:"#e0d8cc",
      fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column",
      maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <GlobalStyles/>

      {/* ── Header ── */}
      <div style={{ padding:"14px 16px 10px", flexShrink:0,
        background:"linear-gradient(to bottom, rgba(5,5,5,0.98), rgba(5,5,5,0))" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:26, filter:`drop-shadow(0 0 14px ${day.color}77)`,
              transition:"filter 0.3s" }}>{day.icon}</span>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
                fontSize:16, color:day.color, lineHeight:1.2,
                letterSpacing:"0.01em", transition:"color 0.3s" }}>{day.name}</div>
              {day.isTemp && (
                <div style={{ fontSize:9, color:"#2e2e2e", letterSpacing:"0.08em",
                  fontFamily:"'DM Sans',sans-serif" }}>
                  ⏳ tymczasowy · do {day.tempUntil}
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
            {isAdmin && (
              <button className="action-btn" onClick={() => setModal({type:"theme"})}
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1a1a1a",
                  borderRadius:10, padding:"7px 11px", color:"#2e2e2e",
                  cursor:"pointer", fontSize:13 }}>
                ✏️
              </button>
            )}
            <button className="action-btn" onClick={() => setModal({type:"week"})}
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1a1a1a",
                borderRadius:10, padding:"7px 11px", color:"#2e2e2e",
                cursor:"pointer", fontSize:13 }}>
              📅
            </button>
            <button className="action-btn" onClick={() => { logout(); setRole(null); }}
              title="Wyloguj"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1a1a1a",
                borderRadius:10, padding:"7px 11px", color:"#1e1e1e",
                cursor:"pointer", fontSize:13 }}>
              ⎋
            </button>
          </div>
        </div>

        {/* Status + add buttons */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginTop:9 }}>
          <div style={{ fontSize:11, color:"#222", letterSpacing:"0.04em",
            fontFamily:"'DM Sans',sans-serif" }}>
            {cands.length === 0 && "Brak propozycji"}
            {cands.length === 1 && "1 propozycja · dodaj drugą"}
            {cands.length === 2 && "Gotowe do losowania"}
          </div>
          {isAdmin && cands.length < 2 && !mov.chosenId && (
            <div style={{ display:"flex", gap:5 }}>
              <button className="action-btn" onClick={() => setModal({type:"film"})}
                style={{ background:`${day.color}15`, border:`1px solid ${day.color}30`,
                  borderRadius:8, padding:"5px 13px", color:day.color,
                  cursor:"pointer", fontSize:11, fontWeight:600,
                  fontFamily:"'DM Sans',sans-serif" }}>
                + Film
              </button>
              <button className="action-btn" onClick={() => setModal({type:"import"})}
                style={{ background:"transparent", border:"1px solid #1a1a1a",
                  borderRadius:8, padding:"5px 11px", color:"#333",
                  cursor:"pointer", fontSize:11,
                  fontFamily:"'DM Sans',sans-serif" }}>
                JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thin color line */}
      <div style={{ height:1, background:`linear-gradient(90deg, ${day.color}88, transparent)`,
        flexShrink:0 }}/>

      {/* ── Main split area ── */}
      <SplitHero
        day={day}
        movies={cands}
        chosenId={mov.chosenId}
        watched={mov.watched}
        isAdmin={isAdmin}
        onChoose={id => chooseMovie(selDay, id)}
        onReset={() => resetChoice(selDay)}
        onWatched={() => markWatched(selDay)}
        onEditFilm={movie => isAdmin && setModal({type:"film", movie})}
        onAddFilm={() => isAdmin && setModal({type:"film"})}
      />

      {/* ── Bottom day strip ── */}
      <div style={{ flexShrink:0,
        background:"linear-gradient(to top, rgba(5,5,5,1) 70%, rgba(5,5,5,0))",
        borderTop:"1px solid #111",
        padding:"10px 8px 14px", display:"flex", gap:3 }}>
        {BASE_DAYS.map(base => {
          const d        = resolveDay(base.key, dayConfigs);
          const isActive = selDay === base.key;
          const isToday  = base.key === today;
          const hasMov   = (dayMovies[base.key]?.candidates||[]).length > 0;
          const isDone   = dayMovies[base.key]?.watched;
          return (
            <button key={base.key} className="day-btn" onClick={() => setSelDay(base.key)}
              style={{ flex:1, minWidth:0,
                background: isActive ? `${d.color}0e` : "transparent",
                border:`1px solid ${isActive ? d.color+"44" : "#111"}`,
                borderRadius:12, padding:"8px 3px",
                cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:isActive?20:17, lineHeight:1,
                transition:"font-size 0.15s",
                filter: isActive ? `drop-shadow(0 0 8px ${d.color}88)` : "none" }}>
                {d.icon}
              </span>
              <span style={{ fontSize:8, fontFamily:"'DM Sans',sans-serif", fontWeight:600,
                letterSpacing:"0.05em", textTransform:"uppercase",
                color: isActive ? d.color : "#2e2e2e",
                transition:"color 0.15s" }}>{d.short}</span>
              <div style={{ width:isActive?14:4, height:2, borderRadius:1,
                background: isDone ? "#3a6e4a" : (isActive ? d.color : (isToday ? d.color+"55" : (hasMov ? "#1e1e1e" : "transparent"))),
                transition:"all 0.2s ease" }}/>
            </button>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "film" && (
        <FilmModal
          existing={modal.movie}
          color={day.color}
          onSave={m => { saveFilm(selDay, m); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "import" && (
        <ImportModal
          color={day.color}
          existingCount={cands.length}
          onImport={(films, replace) => { importFilms(selDay, films, replace); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "theme" && (
        <ThemeModal
          dayKey={selDay}
          configs={dayConfigs}
          onSave={saveTheme}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "week" && (
        <WeekView
          dayConfigs={dayConfigs}
          dayMovies={dayMovies}
          currentKey={today}
          onSelectDay={setSelDay}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}