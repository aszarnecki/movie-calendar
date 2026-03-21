import { useState, useEffect, useRef } from "react";
import { login, getRole, logout } from "./auth.js";

// ─── Past day detection ──────────────────────────────────────────
const PL_WEEK = ["mon","tue","wed","thu","fri","sat","sun"];
function isPastDay(key) {
  return PL_WEEK.indexOf(key) < PL_WEEK.indexOf(todayKey());
}
function todayDateStr() {
  return new Date().toISOString().slice(0,10);
}

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
  @keyframes slideInRight {
    from { transform:translateX(100%); opacity:0; }
    to   { transform:translateX(0);    opacity:1; }
  }
  @keyframes slideInLeft {
    from { transform:translateX(-100%); opacity:0; }
    to   { transform:translateX(0);     opacity:1; }
  }
  @keyframes chosenEnter {
    from { opacity:0; transform:scale(0.93); filter:blur(6px); }
    to   { opacity:1; transform:scale(1);    filter:blur(0);   }
  }
  @keyframes chosenExit {
    from { opacity:1; transform:scale(1);    filter:blur(0);   }
    to   { opacity:0; transform:scale(0.93); filter:blur(6px); }
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

  ::-webkit-scrollbar { width: 3px; height: 0; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
`;

const BASE_DAYS = [
  { key:"mon", short:"Pon", jsDay:1 },
  { key:"tue", short:"Wt",  jsDay:2 },
  { key:"wed", short:"Śr",  jsDay:3 },
  { key:"thu", short:"Czw", jsDay:4 },
  { key:"fri", short:"Pt",  jsDay:5 },
  { key:"sat", short:"Sob", jsDay:6 },
  { key:"sun", short:"Nd",  jsDay:0 },
];

const DAY_GENDER = { mon:"m", tue:"m", wed:"f", thu:"m", fri:"m", sat:"f", sun:"f" };
const DAY_LABEL  = { mon:"Poniedziałek", tue:"Wtorek", wed:"Środa", thu:"Czwartek", fri:"Piątek", sat:"Sobota", sun:"Niedziela" };

const THEME_PRESETS = [
  // Gatunki filmowe
  { label:"Komediowy",        m:"Komediowy",        f:"Komediowa",        icon:"😂", color:"#81b29a" },
  { label:"Dramatyczny",      m:"Dramatyczny",      f:"Dramatyczna",      icon:"💔", color:"#b5838d" },
  { label:"Horrorowy",        m:"Horrorowy",        f:"Horrorowa",        icon:"🔪", color:"#e63946" },
  { label:"Akcyjny",          m:"Akcyjny",          f:"Akcyjna",          icon:"💥", color:"#f77f00" },
  { label:"Romansowy",        m:"Romansowy",        f:"Romansowa",        icon:"❤️",  color:"#e07a9a" },
  { label:"Kryminalny",       m:"Kryminalny",       f:"Kryminalna",       icon:"🕵️", color:"#6c757d" },
  { label:"Sci-Fi",           m:"Sci-Fi",           f:"Sci-Fi",           icon:"🚀", color:"#48cae4" },
  { label:"Fantasy",          m:"Fantasy",          f:"Fantasy",          icon:"✨", color:"#c77dff" },
  { label:"Thriller",         m:"Thriller",         f:"Thriller",         icon:"😰", color:"#555555" },
  { label:"Animowany",        m:"Animowany",        f:"Animowana",        icon:"🎨", color:"#f4a261" },
  { label:"Dokumentalny",     m:"Dokumentalny",     f:"Dokumentalna",     icon:"📷", color:"#a8dadc" },
  { label:"Wojenny",          m:"Wojenny",          f:"Wojenna",          icon:"⚔️",  color:"#8d0801" },
  { label:"Muzyczny",         m:"Muzyczny",         f:"Muzyczna",         icon:"🎵", color:"#e9c46a" },
  { label:"Western",          m:"Western",          f:"Western",          icon:"🤠", color:"#bc6c25" },
  { label:"Biograficzny",     m:"Biograficzny",     f:"Biograficzna",     icon:"📜", color:"#606c38" },
  { label:"Familijny",        m:"Familijny",        f:"Familijna",        icon:"👨‍👩‍👧‍👦", color:"#5390d9" },
  { label:"Przygodowy",       m:"Przygodowy",       f:"Przygodowa",       icon:"🌄", color:"#06d6a0" },
  { label:"Zombie",           m:"Zombie",           f:"Zombie",           icon:"🧟", color:"#38b000" },
  // Klimat / styl
  { label:"Mroczny",          m:"Mroczny",          f:"Mroczna",          icon:"🌑", color:"#333333" },
  { label:"Noir",             m:"Noir",             f:"Noir",             icon:"🕶️", color:"#4a4a4a" },
  { label:"Kultowy",          m:"Kultowy",          f:"Kultowa",          icon:"🔮", color:"#7209b7" },
  { label:"Retro",            m:"Retro",            f:"Retro",            icon:"🎞️", color:"#a68a64" },
  { label:"Eksperymentalny",  m:"Eksperymentalny",  f:"Eksperymentalna",  icon:"🧪", color:"#06d6a0" },
  { label:"Festiwalowy",      m:"Festiwalowy",      f:"Festiwalowa",      icon:"🎥", color:"#c9a96e" },
  { label:"Blockbusterowy",   m:"Blockbusterowy",   f:"Blockbusterowa",   icon:"🍿", color:"#f4a261" },
  { label:"Książkowy",        m:"Książkowy",        f:"Książkowa",        icon:"📚", color:"#606c38" },
  // Kino regionalne
  { label:"Polski",           m:"Polski",           f:"Polska",           icon:"🦅", color:"#e63946" },
  { label:"Orientalny",       m:"Orientalny",       f:"Orientalna",       icon:"🍜", color:"#e07a5f" },
  { label:"Skandynawski",     m:"Skandynawski",     f:"Skandynawska",     icon:"❄️",  color:"#a8dadc" },
  { label:"Europejski",       m:"Europejski",       f:"Europejska",       icon:"🏰", color:"#f2cc8f" },
  // Guilty pleasures
  { label:"Trashowy",         m:"Trashowy",         f:"Trashowa",         icon:"🗑️", color:"#8d6e63" },
];

function dateThemeIndex(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  return (h >>> 0) % THEME_PRESETS.length;
}

function todayKey() {
  const d = new Date().getDay(); // 0=Sun
  return BASE_DAYS.find(x => x.jsDay === d)?.key || "mon";
}

function resolveDay(key, configs, dateStr) {
  const base = BASE_DAYS.find(d => d.key === key);
  if (!base) return { key, name:"?", icon:"🎬", color:"#c9a96e", short:"?", jsDay:0 };

  const ds = dateStr || new Date().toISOString().slice(0,10);
  const theme = THEME_PRESETS[dateThemeIndex(ds)];
  const gender = DAY_GENDER[key] || "m";
  const dayLabel = DAY_LABEL[key] || "";
  const name  = (gender === "f" ? theme.f : theme.m) + " " + dayLabel;

  const cfg = (dateStr && configs?.[dateStr]) || {};
  return { ...base, name: cfg.name || name, icon: cfg.icon || theme.icon, color: cfg.color || theme.color };
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
  const [f, setF] = useState(existing || { title:"", year:"", duration:"", poster:"", desc:"", filmweb:"" });
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
      "duration":   "132",              // opcjonalne (minuty)
      "poster":     "https://…jpg",      // opcjonalne
      "desc":       "Opis filmu",        // opcjonalne
      "filmweb":    "https://filmweb…",  // opcjonalne
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
          duration:   String(f.duration || "").trim(),
          poster:     String(f.poster || "").trim(),
          desc:       String(f.desc  || f.description || "").trim(),
          filmweb:    String(f.filmweb    || "").trim(),
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
    "duration":   "132",
    "poster":     "https://…jpg",
    "desc":       "Opis",
    "filmweb":    "https://filmweb.pl/…"
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
                      {[m.year, m.filmweb&&"Filmweb ✓"]
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
function presetName(preset, dayKey) {
  const gender = DAY_GENDER[dayKey] || "m";
  const adj = gender === "f" ? preset.f : preset.m;
  const dayLabel = DAY_LABEL[dayKey] || "";
  // For multi-word presets (Dziki Wybór, Losowy Kraj, etc.) don't append day name
  if (adj === preset.f && adj === preset.m && !adj.endsWith("o")) return `${adj} ${dayLabel}`;
  return `${adj} ${dayLabel}`;
}

function ThemeModal({ dayKey, dateStr, configs, onSave, onClose }) {
  const cur  = resolveDay(dayKey, configs, dateStr);
  const base = BASE_DAYS.find(d => d.key === dayKey);
  const [name,setName]     = useState(cur.name);
  const [icon,setIcon]     = useState(cur.icon);
  const [color,setColor]   = useState(cur.color);

  const applyPreset = (p) => { setName(presetName(p, dayKey)); setIcon(p.icon); setColor(p.color); };

  const save = () => {
    onSave(dateStr, name, icon, color);
    onClose();
  };
  const reset = () => { onSave(dateStr, null, null, null, true); onClose(); };

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
          {/* Presets */}
          <div>
            <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
              textTransform:"uppercase", display:"block", marginBottom:6 }}>Szybki wybór</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {THEME_PRESETS.map(p => {
                const pName = presetName(p, dayKey);
                const active = name === pName;
                return (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    style={{ background: active ? `${p.color}22` : "#0a0a0a",
                      border:`1px solid ${active ? p.color+"66" : "#1a1a1a"}`,
                      borderRadius:8, padding:"5px 9px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:4,
                      transition:"all 0.12s" }}>
                    <span style={{ fontSize:13, lineHeight:1 }}>{p.icon}</span>
                    <span style={{ fontSize:10, color: active ? p.color : "#555",
                      fontFamily:"'DM Sans',sans-serif", fontWeight: active ? 600 : 400 }}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
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
          <div style={{ background:"#0a0a0a", border:`1px solid ${color}33`, borderRadius:10,
            padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:28 }}>{icon}</span>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", color, fontSize:14 }}>{name}</div>
              <div style={{ fontSize:10, color:"#3a3a3a" }}>{dateStr}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save}
              style={{ flex:1, background:color, border:"none",
                borderRadius:8, padding:"13px 0", color:"#060606",
                fontWeight:700, cursor:"pointer", fontSize:14 }}>
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
function SplitHero({ day, movies, chosenId, watched, isAdmin, locked, canAdd, onChoose, onReset, onWatched, onEditFilm, onAddFilm }) {
  const [spinning,  setSpinning]  = useState(false);
  const [hlit,      setHlit]      = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const justChoseRef = useRef(false); // set to true only when user actively clicks a card
  const timerRef     = useRef(null);
  const [a, b]   = movies;
  const activeId = locked ? previewId : chosenId;
  const chosen   = movies.find(m => m.id === activeId);

  useEffect(() => { setPreviewId(null); }, [day]);
  useEffect(() => {
    if (!activeId) { setHlit(null); setIsExiting(false); justChoseRef.current = false; }
  }, [activeId]);

  const handleChoose = (id) => {
    justChoseRef.current = true;
    onChoose(id);
  };

  const handleReset = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (locked) { setPreviewId(null); } else { onReset(); }
      setIsExiting(false); justChoseRef.current = false;
    }, 400);
  };

  const playTick = (pitch = 800, dur = 0.04) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = pitch;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  };
  const playFanfare = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.12, 0.24, 0.42].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 3 ? "triangle" : "sine";
        osc.frequency.value = [523, 659, 784, 1047][i];
        gain.gain.setValueAtTime(0.1, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + (i < 3 ? 0.12 : 0.35));
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.4);
      });
    } catch {}
  };

  const doSpin = () => {
    if (spinning || movies.length < 2 || locked) return;
    setSpinning(true);
    const winner = movies[Math.floor(Math.random()*2)];
    let count=0; const total=18+Math.floor(Math.random()*8);
    const ids=[a?.id,b?.id].filter(Boolean);
    const tick=()=>{
      setHlit(ids[count%2]); count++;
      const pitch = 600 + (count / total) * 600;
      playTick(pitch, 0.04);
      const delay=count<total-5?80:80+(count-(total-5))*130;
      if(count<total){timerRef.current=setTimeout(tick,delay);}
      else{setHlit(winner.id);setSpinning(false);handleChoose(winner.id);playFanfare();}
    };
    tick();
  };
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);

  // ── CardHalf ──
  const noFilms = movies.length === 0;
  const oneFilm = movies.length === 1;

  const CardHalf = ({ movie, side, lit }) => {
    const bg = movie?.poster;
    const isLeft = side === "left";
    return (
      <div className="film-card"
        style={{ flex:1, position:"relative", overflow:"hidden",
          cursor: movie||isAdmin?"pointer":"default",
          borderRadius: isLeft?"14px 0 0 14px":"0 14px 14px 0",
          transform: lit ? "scale(1.03)" : "scale(1)",
          boxShadow: lit ? `0 0 40px ${day.color}55` : "none",
          transition:"transform 0.15s ease, box-shadow 0.15s ease" }}
        onClick={e => { if(e.target.closest('[data-edit]')) return; if(!spinning && movie) { locked ? setPreviewId(movie.id) : handleChoose(movie.id); } }}>
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
          {bg && <img src={bg} alt={movie?.title}
            style={{ width:82, height:116, objectFit:"cover", borderRadius:12,
              boxShadow:`0 8px 32px rgba(0,0,0,0.9), 0 0 40px ${day.color}11`,
              filter: lit ? "none" : "brightness(0.6) saturate(0.7)",
              transition:"filter 0.2s", border:"1px solid rgba(255,255,255,0.07)" }}/>}
          {!bg && movie && <div style={{ width:82, height:116, borderRadius:12, background:"#111",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24, color:"#1e1e1e", border:"1px solid #1a1a1a" }}>🎞</div>}
          {movie ? (
            <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
                fontSize:13, lineHeight:1.35, maxWidth:110,
                color: lit ? "#f0e8d8" : "#555",
                transition:"color 0.15s", textShadow:"0 2px 12px rgba(0,0,0,0.95)" }}>
                {movie.title}
              </div>
              {movie.year && <div style={{ fontSize:10, color: lit ? "#666" : "#2a2a2a",
                fontFamily:"'DM Sans',sans-serif", transition:"color 0.15s" }}>{movie.year}</div>}
              {parseDuration(movie.duration) && (() => {
                const dl = durationLabel(parseDuration(movie.duration));
                return <span style={{ fontSize:9, padding:"1px 6px",
                  background: lit ? `${dl.color}25` : `${dl.color}0e`,
                  border:`1px solid ${lit ? dl.color+"55" : dl.color+"22"}`,
                  borderRadius:20, color: lit ? dl.color : dl.color+"77",
                  fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.15s" }}>
                  {formatDuration(parseDuration(movie.duration))}
                </span>;
              })()}
              {isAdmin && <button data-edit="true"
                onClick={e=>{e.stopPropagation();onEditFilm(movie);}}
                style={{ position:"absolute", top:10, right:10,
                  background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)",
                  border:"1px solid #252525", borderRadius:8, padding:"4px 9px",
                  color:"#3a3a3a", cursor:"pointer", fontSize:10 }}>✏️</button>}
            </>
          ) : canAdd ? (
            <button onClick={e=>{e.stopPropagation();onAddFilm();}}
              style={{ background:`${day.color}18`, border:`1px dashed ${day.color}44`,
                borderRadius:10, padding:"8px 16px", color:day.color,
                cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
              + Dodaj
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative" }}>

      {/* ── Chosen overlay — always rendered synchronously when film is chosen ── */}
      {chosen && !spinning && (
        <div style={{
          position:"absolute", inset:0, zIndex:10, overflow:"hidden",
          animation: isExiting
            ? "chosenExit 0.38s cubic-bezier(0.4,0,0.6,1) both"
            : justChoseRef.current
              ? "chosenEnter 0.44s cubic-bezier(0.22,1,0.36,1) both"
              : "none",
        }}>
          {/* Blurred bg */}
          {chosen.poster && <>
            <div style={{ position:"absolute", inset:0,
              backgroundImage:`url(${chosen.poster})`, backgroundSize:"cover",
              backgroundPosition:"center",
              filter:"blur(30px) brightness(0.18) saturate(1.5)", transform:"scale(1.08)" }}/>
            <div style={{ position:"absolute", inset:0,
              background:"linear-gradient(to bottom, rgba(5,5,5,0.15) 0%, transparent 35%, rgba(5,5,5,0.75) 100%)" }}/>
            <div style={{ position:"absolute", inset:0,
              background:`radial-gradient(ellipse at 50% 35%, ${day.color}12 0%, transparent 65%)`,
              pointerEvents:"none" }}/>
          </>}
          {!chosen.poster && <div style={{ position:"absolute", inset:0, background:"#050505" }}/>}

          {/* Content */}
          <div style={{ position:"relative", height:"100%", display:"flex", flexDirection:"column" }}>
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
                        boxShadow:`0 20px 80px ${day.color}44, 0 0 120px ${day.color}18, 0 4px 24px rgba(0,0,0,0.9)`,
                        display:"block", border:`1px solid ${day.color}22` }}/>
                  : <div style={{ width:140, height:200, borderRadius:14, background:"#141414",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🎞</div>
                }
                {watched && <div style={{ position:"absolute", inset:0, borderRadius:14,
                  background:"rgba(0,0,0,0.62)", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:48 }}>✅</div>}
              </div>
              {(() => {
                const dur = parseDuration(chosen.duration);
                const dl  = durationLabel(dur);
                return (
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:"#f0e8d8",
                      lineHeight:1.35, fontWeight:700, marginBottom:4, maxWidth:250 }}>
                      {chosen.title}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                      gap:8, flexWrap:"wrap" }}>
                      {chosen.year && <span style={{ fontSize:12, color:"#444",
                        fontFamily:"'DM Sans',sans-serif" }}>{chosen.year}</span>}
                      {dur && dl && <>
                        <span style={{ color:"#222", fontSize:10 }}>·</span>
                        <span style={{ fontSize:11, color:"#555",
                          fontFamily:"'DM Sans',sans-serif" }}>{formatDuration(dur)}</span>
                        <span style={{ fontSize:10, padding:"2px 8px",
                          background:`${dl.color}18`, border:`1px solid ${dl.color}33`,
                          borderRadius:20, color:dl.color,
                          fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                          {dl.label}
                        </span>
                      </>}
                    </div>
                    {chosen.desc && <div style={{ fontSize:12, color:"#3a3a3a", lineHeight:1.65,
                      marginTop:8, fontStyle:"italic", maxWidth:240, maxHeight:80,
                      overflowY:"auto", scrollbarWidth:"none", msOverflowStyle:"none",
                      fontFamily:"'Playfair Display',serif" }}>{chosen.desc}</div>}
                  </div>
                );
              })()}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                <Lnk href={chosen.filmweb}    label="Filmweb"    bgColor="rgba(255,102,0,0.1)"  bdrColor="rgba(255,102,0,0.3)"  txtColor="#ff8833"/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, padding:"10px 20px 20px" }}>
              {!watched && !locked
                ? <button className="action-btn" onClick={onWatched}
                    style={{ flex:1, background:`linear-gradient(135deg, ${day.color}ee, ${day.color}99)`,
                      border:"none", borderRadius:14, padding:"14px 0", color:"#050505",
                      cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                      boxShadow:`0 4px 24px ${day.color}44` }}>Wybieram</button>
                : !watched && locked
                  ? <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, color:"#2e2e2e", fontFamily:"'DM Sans',sans-serif",
                      fontStyle:"italic" }}>📅 Podgląd</div>
                  : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:13, color:"#2e2e2e", fontFamily:"'DM Sans',sans-serif" }}>Dobry wybór 🎉</div>
              }
              <button className="action-btn" onClick={handleReset}
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e1e1e",
                  borderRadius:14, padding:"14px 18px", color:"#444",
                  cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                  whiteSpace:"nowrap" }}>Wróć</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split cards — always in DOM, visible behind overlay ── */}
      {noFilms ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:16, padding:32,
          background:`radial-gradient(ellipse at 50% 45%, ${day.color}06 0%, transparent 60%)` }}>
          <div style={{ fontSize:60, opacity:0.2,
            filter:`drop-shadow(0 0 24px ${day.color}22)` }}>🎭</div>
          <p style={{ fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:"0.1em",
            color:"#2e2e2e", textAlign:"center" }}>Brak propozycji na ten dzień</p>
          {canAdd && (
            <button onClick={onAddFilm}
              style={{ background:`${day.color}18`, border:`1px dashed ${day.color}44`,
                borderRadius:10, padding:"12px 24px", color:day.color,
                cursor:"pointer", fontSize:13 }}>➕ Dodaj film</button>
          )}
        </div>
      ) : (
        <>
          <div style={{ flex:1, display:"flex", gap:4, minHeight:0, padding:"12px 12px 0" }}>
            <CardHalf movie={a} side="left"  lit={hlit===a?.id}/>
            <CardHalf movie={oneFilm?null:b} side="right" lit={hlit===b?.id}/>
          </div>
          {movies.length === 2 && !spinning && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              gap:10, marginTop:8 }}>
              <div style={{ width:28, height:1,
                background:"linear-gradient(90deg, transparent, #222)" }}/>
              <span style={{ fontSize:9, color:"#2a2a2a", letterSpacing:"0.22em",
                fontFamily:"'Cinzel',serif", textTransform:"uppercase" }}>vs</span>
              <div style={{ width:28, height:1,
                background:"linear-gradient(90deg, #222, transparent)" }}/>
            </div>
          )}
          <div style={{ padding:"10px 16px 16px", textAlign:"center" }}>
            {movies.length >= 2
              ? locked
                ? <p style={{ color:"#1e1e1e", fontSize:11, fontFamily:"'DM Sans',sans-serif",
                    letterSpacing:"0.04em" }}>Propozycje na ten dzień</p>
                : <button className="action-btn" onClick={doSpin} disabled={spinning}
                    style={{
                      background: spinning ? "#0d0d0d" : `linear-gradient(135deg, ${day.color}ee, ${day.color}aa)`,
                      border: `1.5px solid ${spinning ? "#1a1a1a" : day.color+"88"}`,
                      borderRadius:16, padding:"15px 0", width:"100%",
                      fontWeight:700, fontSize:16, cursor:spinning?"default":"pointer",
                      color:spinning?"#333":"#050505",
                      fontFamily:"'Playfair Display',serif", fontStyle:"italic",
                      letterSpacing:"0.04em",
                      boxShadow: spinning ? "none" : `0 6px 36px ${day.color}44, 0 2px 8px rgba(0,0,0,0.5)`,
                      transition:"all 0.25s ease" }}>
                    {spinning ? "Losowanie…" : "🎲 Losuj film"}
                  </button>
              : <p style={{ color:"#1e1e1e", fontSize:11, fontFamily:"'DM Sans',sans-serif",
                  letterSpacing:"0.04em" }}>
                  {locked ? "Podgląd propozycji" : "Kliknij plakat · dodaj 2 filmy do losowania"}
                </p>
            }
          </div>
        </>
      )}
    </div>
  );
}

// ─── Week Overview ────────────────────────────────────────────────


// ─── DayCarousel ─────────────────────────────────────────────────
function DayCarousel({ selDate, todayStr, dayConfigs, dayMovies, history, onSelect }) {
  const scrollRef = useRef(null);
  const dragRef = useRef({ active:false, startX:0, scrollLeft:0, moved:false });

  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { active:true, startX:e.clientX, scrollLeft:el.scrollLeft, moved:false };
    el.style.cursor = "grabbing";
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 3) d.moved = true;
    scrollRef.current.scrollLeft = d.scrollLeft - dx;
  };
  const onPointerUp = (e) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const el = scrollRef.current;
    if (el) el.style.cursor = "grab";
  };

  // Generate dates for current month only
  const dates = [];
  const base = new Date(todayStr + "T12:00:00");
  const lastDayNum = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= lastDayNum; d++) {
    const dt = new Date(base.getFullYear(), base.getMonth(), d);
    dates.push(dt.toISOString().slice(0,10));
  }

  // Scroll to selected date on mount/change
  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = dates.indexOf(selDate);
    if (idx < 0) return;
    const container = scrollRef.current;
    const item = container.children[idx];
    if (!item) return;
    const offset = item.offsetLeft - container.offsetWidth / 2 + item.offsetWidth / 2;
    container.scrollTo({ left: offset, behavior:"smooth" });
  }, [selDate]);

  return (
    <div style={{ flexShrink:0, background:"rgba(5,5,5,0.98)",
      borderTop:"1px solid #141414", paddingBottom:14 }}>
      <div style={{ padding:"8px 16px 0", fontSize:9, color:"#252525", letterSpacing:"0.12em",
        textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
        {new Date(todayStr + "T12:00:00").toLocaleDateString("pl-PL", { month:"long", year:"numeric" })}
      </div>
      <div ref={scrollRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        style={{ display:"flex", gap:4, overflowX:"auto", padding:"8px 12px 0",
          scrollbarWidth:"none", msOverflowStyle:"none", cursor:"grab" }}>
        {dates.map(ds => {
          const jsDay = new Date(ds + "T12:00:00").getDay();
          const dayKey = (() => { const b = [{key:"sun",jsDay:0},{key:"mon",jsDay:1},{key:"tue",jsDay:2},{key:"wed",jsDay:3},{key:"thu",jsDay:4},{key:"fri",jsDay:5},{key:"sat",jsDay:6}]; return b.find(x=>x.jsDay===jsDay)?.key||"mon"; })();
          const d = resolveDay(dayKey, dayConfigs, ds);
          const isActive  = ds === selDate;
          const isToday   = ds === todayStr;
          const isPast    = ds < todayStr;
          const mov       = dayMovies[ds] || {};
          const hist      = history[ds];
          const watched   = isPast ? !!hist : mov.watched;
          const hasChoice = isPast ? !!hist : !!mov.chosenId;
          const dayNum = new Date(ds + "T12:00:00").getDate();
          const monthShort = new Date(ds + "T12:00:00").toLocaleDateString("pl-PL",{month:"short"}).replace(".","");

          return (
            <button key={ds} onClick={() => { if (dragRef.current.moved) return; onSelect(ds); }}
              style={{ flexShrink:0, width:52,
                background: isActive ? `${d.color}12` : isToday ? `${d.color}06` : "transparent",
                border:`1px solid ${isActive ? d.color+"55" : isToday ? d.color+"22" : "#151515"}`,
                borderRadius:12, padding:"6px 4px 8px",
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:3,
                transition:"all 0.2s ease",
                opacity: isPast ? 0.55 : ds > todayStr ? 0.5 : 1,
                boxShadow: isToday && !isActive ? `0 0 0 1px ${d.color}22` : "none" }}>
              {/* Icon */}
              <span style={{ fontSize: isActive ? 18 : 15, lineHeight:1,
                filter: isActive ? `drop-shadow(0 0 6px ${d.color}88)` : "none",
                transition:"font-size 0.15s" }}>{d.icon}</span>
              {/* Day number */}
              <span style={{ fontSize:13, fontWeight:700, lineHeight:1,
                color: isToday ? d.color : isActive ? "#e8e0d0" : "#444",
                fontFamily:"'DM Sans',sans-serif" }}>{dayNum}</span>
              {/* Month (shown on 1st or first visible) */}
              <span style={{ fontSize:8, color:"#333", fontFamily:"'DM Sans',sans-serif",
                letterSpacing:"0.04em", textTransform:"uppercase", lineHeight:1 }}>
                {monthShort}
              </span>
              {/* Bottom bar */}
              <div style={{ width: isActive ? 20 : watched ? 10 : 6, height:2, borderRadius:1,
                background: watched ? "#3a6e4a" : (isActive ? d.color : (isToday ? d.color+"44" : (isPast ? "#1a1a1a" : "transparent"))),
                transition:"all 0.2s" }}/>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WatchedList ─────────────────────────────────────────────────
function WatchedList({ history, dayConfigs, isAdmin, onClear, onClose }) {
  const entries = Object.entries(history)
    .sort(([a],[b]) => b.localeCompare(a)); // newest first

  const formatDate = (str) => {
    const d = new Date(str + "T12:00:00");
    return d.toLocaleDateString("pl-PL", { day:"numeric", month:"long", year:"numeric" });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)",
      zIndex:100, display:"flex", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:480, display:"flex", flexDirection:"column",
        background:"#0a0a0a", borderLeft:"1px solid #141414", borderRight:"1px solid #141414" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 20px", borderBottom:"1px solid #161616", flexShrink:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", color:"#c9a96e", fontSize:15,
            fontStyle:"italic" }}>
            Obejrzane filmy
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:10, color:"#2a2a2a", letterSpacing:"0.08em",
              textTransform:"uppercase" }}>{entries.length} filmów</span>
            {isAdmin && entries.length > 0 && (
              <button onClick={() => { if (confirm("Wyczyścić całą historię?")) onClear(); }}
                style={{ background:"rgba(180,60,60,0.1)", border:"1px solid rgba(180,60,60,0.25)",
                  borderRadius:8, padding:"4px 10px", color:"#b43c3c",
                  cursor:"pointer", fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>
                Wyczyść
              </button>
            )}
            <button onClick={onClose}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e1e1e",
                borderRadius:8, width:30, height:30, display:"flex", alignItems:"center",
                justifyContent:"center", color:"#444", fontSize:16, cursor:"pointer" }}>×</button>
          </div>
        </div>
        {/* List */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#252525" }}>
              <div style={{ fontSize:48, marginBottom:14, opacity:0.3 }}>🎬</div>
              <p style={{ fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:"0.12em",
                color:"#1e1e1e" }}>
                Brak obejrzanych filmów
              </p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {entries.map(([dateStr, entry]) => {
                const dayDef = resolveDay(entry.dayKey, dayConfigs, dateStr);
                const m = entry.movie;
                const dur = parseDuration(m.duration);
                const dl  = durationLabel(dur);
                return (
                  <div key={dateStr} style={{ display:"flex", gap:12, background:"#0d0d0d",
                    borderRadius:14, padding:"12px 14px", border:"1px solid #161616",
                    alignItems:"center", transition:"border-color 0.2s" }}>
                    {m.poster
                      ? <img src={m.poster} alt={m.title}
                          style={{ width:48, height:68, objectFit:"cover", borderRadius:8,
                            flexShrink:0, border:`1px solid ${dayDef.color}18`,
                            boxShadow:`0 4px 16px rgba(0,0,0,0.6)` }}/>
                      : <div style={{ width:48, height:68, borderRadius:8, background:"#141414",
                          flexShrink:0, display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:20, color:"#1e1e1e",
                          border:"1px solid #1a1a1a" }}>🎞</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
                        fontSize:14, color:"#e8e0d0", marginBottom:3, lineHeight:1.3,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m.title}
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center",
                        marginBottom:4 }}>
                        {m.year && (
                          <span style={{ fontSize:11, color:"#444" }}>{m.year}</span>
                        )}
                        {dur && dl && (
                          <span style={{ fontSize:9, padding:"2px 8px",
                            background:`${dl.color}12`, border:`1px solid ${dl.color}25`,
                            borderRadius:20, color:`${dl.color}cc`,
                            fontWeight:600 }}>{formatDuration(dur)}</span>
                        )}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:11 }}>{dayDef.icon}</span>
                        <span style={{ fontSize:10, color:`${dayDef.color}77`,
                          letterSpacing:"0.02em" }}>{dayDef.name}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", display:"flex",
                      flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                      <div style={{ fontSize:10, color:"#282828", lineHeight:1.4 }}>
                        {formatDate(dateStr)}
                      </div>
                      {m.filmweb && <Lnk href={m.filmweb} label="Filmweb"
                        bgColor="rgba(255,102,0,0.08)" bdrColor="rgba(255,102,0,0.25)" txtColor="#ff8833"/>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
  const [history,    setHistory]    = useState({}); // { "YYYY-MM-DD": { dayKey, movie } }
  const [selDate,    setSelDate]    = useState(() => new Date().toISOString().slice(0,10));
  const [slideDir,   setSlideDir]   = useState(null); // "left" | "right" | null
  const [modal,      setModal]      = useState(null);
  const [ready,      setReady]      = useState(false);
  const [role,       setRole]       = useState(() => getRole());

  // Derive dayKey from a date string
  const dateToKey = (ds) => {
    const jsDay = new Date(ds + "T12:00:00").getDay(); // 0=Sun
    return BASE_DAYS.find(d => d.jsDay === jsDay)?.key || "mon";
  };
  const selDay = dateToKey(selDate);

  // Is selDate in the current calendar week (Mon–Sun)?
  const todayStr = new Date().toISOString().slice(0,10);
  const isPast   = selDate < todayStr;
  const isToday  = selDate === todayStr;
  const isFuture = selDate > todayStr;

  const goToDate = (ds) => {
    if (ds === selDate) return;
    setSlideDir(ds > selDate ? "left" : "right");
    setSelDate(ds);
  };

  // Swipe between days
  const swipeRef = useRef({ startX:0, startY:0 });
  const onTouchStart = (e) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    const d = new Date(selDate + "T12:00:00");
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    const next = d.toISOString().slice(0,10);
    // Stay within current month
    if (new Date(next + "T12:00:00").getMonth() !== new Date(todayStr + "T12:00:00").getMonth()) return;
    goToDate(next);
  };
  const isAdmin = role === "admin";

  // fonts loaded via GlobalStyles CSS injection

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.storage.get("cinema-cfg").catch(()=>null);
        if (cfg?.value) setDayConfigs(JSON.parse(cfg.value));
        const mov = await window.storage.get("cinema-mov").catch(()=>null);
        if (mov?.value) setDayMovies(JSON.parse(mov.value));
        const hist = await window.storage.get("cinema-hist").catch(()=>null);
        if (hist?.value) {
          const raw = JSON.parse(hist.value);
          // Clean stale fields from history entries
          const cleaned = {};
          for (const [k, v] of Object.entries(raw)) {
            if (!v?.movie) continue;
            const { letterboxd, ...movie } = v.movie;
            cleaned[k] = { ...v, movie };
          }
          setHistory(cleaned);
        }

      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (!ready) return; window.storage.set("cinema-cfg", JSON.stringify(dayConfigs)).catch(()=>{}); }, [dayConfigs, ready]);
  useEffect(() => { if (!ready) return; window.storage.set("cinema-mov",  JSON.stringify(dayMovies)).catch(()=>{}); }, [dayMovies,  ready]);
  useEffect(() => { if (!ready) return; window.storage.set("cinema-hist", JSON.stringify(history)).catch(()=>{}); }, [history, ready]);

  // Cleanup: remove dayMovies for past dates (only history is kept)
  useEffect(() => {
    if (!ready) return;
    setDayMovies(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k >= todayStr) next[k] = v;
      }
      return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
    });
  }, [ready]);

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
  const resetChoice  = (k)     => {
    setDayMovies(p => ({ ...p, [k]: { ...(p[k]||{}), chosenId:null, watched:false } }));
    setHistory(h => { const n = {...h}; delete n[k]; return n; });
  };
  const clearDay     = (k)     => setDayMovies(p => { const n = {...p}; delete n[k]; return n; });
  const markWatched  = (k) => {
    setDayMovies(p => {
      const updated = { ...p, [k]: { ...(p[k]||{}), watched:true } };
      // record to history
      const chosen = (p[k]?.candidates||[]).find(m => m.id === p[k]?.chosenId);
      if (chosen) {
        const dayKey = dateToKey(k);
        setHistory(h => ({ ...h, [k]: { dayKey, movie:chosen } }));
      }
      return updated;
    });
  };

  const importFilms = (k, films, replace) => setDayMovies(p => {
    const existing = replace ? [] : (p[k]?.candidates || []);
    const slots    = 2 - existing.length;
    const toAdd    = films.slice(0, slots).map(f => ({ ...f, id: Date.now() + Math.random() }));
    return { ...p, [k]: { ...(p[k]||{}), candidates: [...existing, ...toAdd] } };
  });

  const saveTheme = (dateStr, name, icon, color, reset) => setDayConfigs(p => {
    if (reset) { const {[dateStr]:_, ...rest} = p; return rest; }
    return { ...p, [dateStr]: { name, icon, color } };
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

  const day    = resolveDay(selDay, dayConfigs, selDate);
  const mov    = dayMovies[selDate] || {};
  const cands  = candidates(selDate);
  const today = todayStr;

  return (
    <div style={{ height:"100dvh", background:"var(--bg)", color:"#e0d8cc",
      fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column",
      maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <GlobalStyles/>

      {/* ── Header ── */}
      <div style={{ padding:"14px 16px 10px", flexShrink:0,
        background:`linear-gradient(to bottom, rgba(5,5,5,0.98), rgba(5,5,5,0)), radial-gradient(ellipse at 30% 0%, ${day.color}0a 0%, transparent 70%)` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:26, filter:`drop-shadow(0 0 14px ${day.color}77)`,
              transition:"filter 0.3s" }}>{day.icon}</span>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
                fontSize:18, color:day.color, lineHeight:1.2,
                letterSpacing:"0.01em", transition:"color 0.3s",
                textShadow:`0 0 24px ${day.color}33` }}>{day.name}</div>
              <div style={{ fontSize:10, color:"#333", fontFamily:"'DM Sans',sans-serif",
                letterSpacing:"0.08em", marginTop:2 }}>
                {new Date(selDate + "T12:00:00").toLocaleDateString("pl-PL", { day:"numeric", month:"long" })}
              </div>
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
            <button className="action-btn" onClick={() => setModal({type:"watched"})}
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1a1a1a",
                borderRadius:10, padding:"7px 11px", color:"#2e2e2e",
                cursor:"pointer", fontSize:13 }}>
              🎞
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
            {isPast
              ? (history[selDate] ? "Obejrzane" : "Nie obejrzano filmu")
              : <>
                  {cands.length === 0 && "Brak propozycji"}
                  {cands.length === 1 && (isToday ? "1 propozycja · dodaj drugą" : "1 propozycja")}
                  {cands.length === 2 && (isToday ? "Gotowe do losowania" : "2 propozycje")}
                </>
            }
          </div>
          {isAdmin && !isPast && (
            <div style={{ display:"flex", gap:5 }}>
              {cands.length < 2 && !mov.chosenId && (
                <>
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
                </>
              )}
              {cands.length > 0 && (
                <button className="action-btn"
                  onClick={() => { if (confirm("Wyczyścić filmy z tego dnia?")) clearDay(selDate); }}
                  style={{ background:"rgba(180,60,60,0.08)", border:"1px solid rgba(180,60,60,0.2)",
                    borderRadius:8, padding:"5px 11px", color:"#b43c3c",
                    cursor:"pointer", fontSize:11,
                    fontFamily:"'DM Sans',sans-serif" }}>
                  Wyczyść
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thin color line */}
      <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${day.color}66, transparent)`,
        flexShrink:0 }}/>

      {/* ── Main split area ── */}
      <div key={selDate} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column",
        overflow:"hidden", position:"relative",
        animation: slideDir === "left"
          ? "slideInRight 0.32s cubic-bezier(0.22,1,0.36,1) both"
          : slideDir === "right"
            ? "slideInLeft 0.32s cubic-bezier(0.22,1,0.36,1) both"
            : "none" }}>
        {isPast ? (
          /* Past week — show history entry or "nie obejrzano" */
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            position:"relative", overflow:"hidden", gap:14, padding:"24px 20px",
            textAlign:"center",
            background:`radial-gradient(ellipse at 50% 40%, ${day.color}06 0%, transparent 55%)` }}>
            {(() => {
              const entry = history[selDate];
              if (!entry) return (
                <>
                  <div style={{ fontSize:56, opacity:0.2,
                    filter:`drop-shadow(0 0 20px ${day.color}15)` }}>🎭</div>
                  <p style={{ fontFamily:"'Cinzel',serif", fontSize:12,
                    letterSpacing:"0.1em", color:"#2e2e2e" }}>
                    Nie obejrzano żadnego filmu
                  </p>
                  {isAdmin && (
                    <p style={{ fontSize:11, color:"#1e1e1e",
                      fontFamily:"'DM Sans',sans-serif" }}>
                      Możesz uzupełnić historię dodając film ręcznie
                    </p>
                  )}
                </>
              );
              // Show watched entry from history
              const m = entry.movie;
              const dayD = resolveDay(entry.dayKey, dayConfigs, selDate);
              const dur = parseDuration(m.duration);
              const dl  = durationLabel(dur);
              return (
                <>
                  {m.poster && <div style={{ position:"absolute", inset:0,
                    backgroundImage:`url(${m.poster})`, backgroundSize:"cover",
                    backgroundPosition:"center",
                    filter:"blur(28px) brightness(0.15) saturate(1.3)",
                    transform:"scale(1.08)" }}/>}
                  <div style={{ position:"relative", display:"flex", flexDirection:"column",
                    alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:10, color:`${dayD.color}99`,
                      letterSpacing:"0.2em", textTransform:"uppercase",
                      fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                      ✓ Obejrzane
                    </div>
                    <div style={{ position:"relative" }}>
                      {m.poster
                        ? <img src={m.poster} alt={m.title}
                            style={{ width:130, height:186, borderRadius:14, objectFit:"cover",
                              boxShadow:`0 12px 60px ${dayD.color}44`,
                              border:`1px solid ${dayD.color}22`,
                              filter:"grayscale(30%) brightness(0.8)" }}/>
                        : <div style={{ width:130, height:186, borderRadius:14,
                            background:"#141414", display:"flex", alignItems:"center",
                            justifyContent:"center", fontSize:40 }}>🎞</div>
                      }
                      <div style={{ position:"absolute", inset:0, borderRadius:14,
                        background:"rgba(0,0,0,0.35)", display:"flex",
                        alignItems:"center", justifyContent:"center", fontSize:44 }}>✅</div>
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
                        color:"#e8e0d0", fontWeight:700, marginBottom:4, maxWidth:240 }}>
                        {m.title}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                        gap:8, flexWrap:"wrap" }}>
                        {m.year && <span style={{ fontSize:12, color:"#555",
                          fontFamily:"'DM Sans',sans-serif" }}>{m.year}</span>}
                        {dur && dl && <>
                          <span style={{ color:"#222", fontSize:10 }}>·</span>
                          <span style={{ fontSize:11, color:"#555",
                            fontFamily:"'DM Sans',sans-serif" }}>{formatDuration(dur)}</span>
                          <span style={{ fontSize:10, padding:"2px 8px",
                            background:`${dl.color}18`, border:`1px solid ${dl.color}33`,
                            borderRadius:20, color:dl.color,
                            fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                            {dl.label}
                          </span>
                        </>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap",
                      justifyContent:"center" }}>
                      <Lnk href={m.filmweb}    label="Filmweb"    bgColor="rgba(255,102,0,0.1)"  bdrColor="rgba(255,102,0,0.3)"  txtColor="#ff8833"/>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <SplitHero
            day={day}
            movies={cands}
            chosenId={mov.chosenId}
            watched={mov.watched}
            isAdmin={isAdmin}
            locked={isFuture}
            canAdd={isAdmin}
            onChoose={id => chooseMovie(selDate, id)}
            onReset={() => resetChoice(selDate)}
            onWatched={() => markWatched(selDate)}
            onEditFilm={movie => isAdmin && setModal({type:"film", movie})}
            onAddFilm={() => isAdmin && setModal({type:"film"})}
          />
        )}
      </div>

      {/* ── Day carousel ── */}
      <DayCarousel
        selDate={selDate}
        todayStr={todayStr}
        dayConfigs={dayConfigs}
        dayMovies={dayMovies}
        history={history}
        onSelect={goToDate}
      />

      {/* ── Modals ── */}
      {modal?.type === "film" && (
        <FilmModal
          existing={modal.movie}
          color={day.color}
          onSave={m => { saveFilm(selDate, m); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "import" && (
        <ImportModal
          color={day.color}
          existingCount={cands.length}
          onImport={(films, replace) => { importFilms(selDate, films, replace); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "theme" && (
        <ThemeModal
          dayKey={selDay}
          dateStr={selDate}
          configs={dayConfigs}
          onSave={saveTheme}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "watched" && (
        <WatchedList
          history={history}
          dayConfigs={dayConfigs}
          isAdmin={isAdmin}
          onClear={() => setHistory({})}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}