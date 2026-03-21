import { useState, useEffect, useRef } from "react";

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

// ─── utils ───────────────────────────────────────────────────────
function Lnk({ href, label, bgColor, bdrColor, txtColor }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer"
    style={{ fontSize:11, padding:"4px 10px", background:bgColor, border:`1px solid ${bdrColor}`,
      borderRadius:5, color:txtColor, textDecoration:"none", fontWeight:700 }}>{label} ↗</a>;
}

function Field({ label, value, onChange, placeholder, mono, hint }) {
  return (
    <div>
      <label style={{ fontSize:10, color:"#3a3a3a", letterSpacing:"0.1em",
        textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", boxSizing:"border-box", background:"#111", border:"1px solid #1e1e1e",
          borderRadius:8, padding:"10px 12px", color:"#e8e0d0", fontSize:mono?12:14,
          outline:"none", fontFamily:mono?"monospace":"'Lato',sans-serif" }}/>
      {hint && <div style={{ fontSize:10, color:"#2e2e2e", marginTop:4 }}>{hint}</div>}
    </div>
  );
}

// ─── Film Add/Edit Modal ─────────────────────────────────────────
function FilmModal({ existing, color, onSave, onClose }) {
  const [f, setF] = useState(existing || { title:"", year:"", poster:"", desc:"", filmweb:"", letterboxd:"" });
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

// ─── Split Hero — 2 filmy obok siebie ────────────────────────────
function SplitHero({ day, movies, chosenId, watched, onChoose, onReset, onWatched, onEditFilm, onAddFilm, onOpenTheme }) {
  const [spinning, setSpinning] = useState(false);
  const [hlit,     setHlit]     = useState(null);
  const timerRef = useRef(null);
  const [a, b]   = movies;
  const chosen   = movies.find(m => m.id === chosenId);

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
      else{setHlit(winner.id);setSpinning(false);onChoose(winner.id);}
    };
    tick();
  };
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);

  // ── Chosen state ──
  if (chosen && !spinning) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      {/* Blurred bg */}
      {chosen.poster && (
        <div style={{ position:"absolute", inset:0,
          backgroundImage:`url(${chosen.poster})`,
          backgroundSize:"cover", backgroundPosition:"center",
          filter:"blur(22px) brightness(0.25)", transform:"scale(1.1)" }}/>
      )}
      <div style={{ position:"relative", flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"24px 20px", gap:16, textAlign:"center" }}>
        <div style={{ fontSize:11, color:`${day.color}aa`, letterSpacing:"0.14em",
          textTransform:"uppercase" }}>{watched?"✓ Obejrzane":"Film na ten wieczór"}</div>
        <div style={{ position:"relative" }}>
          {chosen.poster
            ? <img src={chosen.poster} alt={chosen.title}
                style={{ width:130, height:186, borderRadius:12, objectFit:"cover",
                  filter:watched?"grayscale(55%) brightness(0.5)":"none",
                  boxShadow:`0 8px 60px ${day.color}55` }}/>
            : <div style={{ width:130, height:186, borderRadius:12, background:"#181818",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>🎞</div>
          }
          {watched && (
            <div style={{ position:"absolute", inset:0, borderRadius:12,
              background:"rgba(0,0,0,0.6)", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:52 }}>✅</div>
          )}
        </div>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:"#f0e8d8",
            lineHeight:1.4, marginBottom:4 }}>{chosen.title}</div>
          {chosen.year && <div style={{ fontSize:12, color:"#666" }}>{chosen.year}</div>}
          {chosen.desc && <div style={{ fontSize:12, color:"#444", lineHeight:1.6,
            marginTop:6, fontStyle:"italic", maxWidth:260 }}>{chosen.desc}</div>}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
          <Lnk href={chosen.filmweb}    label="Filmweb"    bgColor="rgba(255,102,0,0.12)" bdrColor="rgba(255,102,0,0.4)"  txtColor="#ff8833"/>
          <Lnk href={chosen.letterboxd} label="Letterboxd" bgColor="rgba(0,230,130,0.08)" bdrColor="rgba(0,230,130,0.35)" txtColor="#00c27a"/>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginTop:4 }}>
          {!watched && (
            <button onClick={onWatched}
              style={{ background:`${day.color}22`, border:`1px solid ${day.color}66`,
                borderRadius:10, padding:"12px 28px", color:day.color, cursor:"pointer",
                fontSize:14, fontWeight:700 }}>✓ Obejrzane</button>
          )}
          <button onClick={onReset}
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #222",
              borderRadius:10, padding:"12px 20px", color:"#555", cursor:"pointer", fontSize:13 }}>
            Zmień wybór
          </button>
        </div>
      </div>
    </div>
  );

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

  const CardHalf = ({ movie, side, lit }) => {
    const bg = movie?.poster;
    const isLeft = side === "left";
    return (
      <div style={{ flex:1, position:"relative", overflow:"hidden",
        cursor:"pointer", borderRadius: isLeft?"12px 0 0 12px":"0 12px 12px 0" }}
        onClick={() => !spinning && movie && onChoose(movie.id)}>
        {/* Poster bg */}
        {bg && <div style={{ position:"absolute", inset:0,
          backgroundImage:`url(${bg})`, backgroundSize:"cover", backgroundPosition:"center",
          filter:`blur(2px) brightness(${lit?"0.55":"0.28"})`,
          transform:"scale(1.05)", transition:"filter 0.15s" }}/>}
        {!bg && <div style={{ position:"absolute", inset:0, background:"#0d0d0d" }}/>}

        {/* Glow overlay when highlighted */}
        {lit && <div style={{ position:"absolute", inset:0,
          background:`radial-gradient(ellipse at center, ${day.color}22 0%, transparent 70%)`,
          borderRadius:"inherit" }}/>}

        {/* Border highlight */}
        <div style={{ position:"absolute", inset:0, borderRadius:"inherit",
          border:`2px solid ${lit?day.color:"transparent"}`,
          boxShadow:lit?`inset 0 0 30px ${day.color}22`:"none",
          transition:"all 0.1s", pointerEvents:"none" }}/>

        {/* Content */}
        <div style={{ position:"relative", height:"100%", display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"flex-end",
          padding:"0 10px 22px", gap:8, textAlign:"center" }}>
          {bg
            ? <img src={bg} alt={movie?.title}
                style={{ width:72, height:102, objectFit:"cover", borderRadius:8,
                  boxShadow:`0 4px 24px rgba(0,0,0,0.7)`,
                  filter: lit?"none":"brightness(0.75)",
                  transition:"filter 0.15s" }}/>
            : <div style={{ width:72, height:102, borderRadius:8, background:"#181818",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
                color:"#2a2a2a" }}>🎞</div>
          }
          {movie ? (
            <>
              <div style={{ fontWeight:700, fontSize:13, lineHeight:1.35,
                color:lit?"#f0e8d8":"#888", transition:"color 0.15s",
                textShadow:"0 1px 8px rgba(0,0,0,0.9)" }}>
                {movie.title}
              </div>
              {movie.year && <div style={{ fontSize:11, color:"#555" }}>{movie.year}</div>}
              <button
                onClick={e=>{e.stopPropagation();onEditFilm(movie);}}
                style={{ position:"absolute", top:10, right:10,
                  background:"rgba(0,0,0,0.5)", border:"1px solid #333",
                  borderRadius:6, padding:"3px 8px", color:"#444",
                  cursor:"pointer", fontSize:10 }}>✏️</button>
            </>
          ) : (
            <button onClick={e=>{e.stopPropagation();onAddFilm();}}
              style={{ background:`${day.color}22`, border:`1px dashed ${day.color}55`,
                borderRadius:8, padding:"8px 14px", color:day.color,
                cursor:"pointer", fontSize:12 }}>+ Dodaj</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      {/* Split cards */}
      <div style={{ flex:1, display:"flex", gap:2, minHeight:0, padding:"12px 12px 0" }}>
        <CardHalf movie={a} side="left"  lit={hlit===a?.id}/>
        <CardHalf movie={oneFilm?null:b} side="right" lit={hlit===b?.id}/>
      </div>

      {/* RNG button */}
      <div style={{ padding:"16px 12px 12px", textAlign:"center" }}>
        {movies.length >= 2 ? (
          <button onClick={doSpin} disabled={spinning}
            style={{ background:spinning?"#111":day.color,
              border:`2px solid ${spinning?"#1e1e1e":day.color}`,
              borderRadius:14, padding:"14px 0", width:"100%", maxWidth:320,
              fontWeight:900, fontSize:18, cursor:spinning?"default":"pointer",
              color:spinning?"#444":"#060606", fontFamily:"'Cinzel',serif",
              letterSpacing:"0.08em",
              boxShadow:spinning?"none":`0 0 40px ${day.color}44`,
              transition:"all 0.2s" }}>
            {spinning?"🎲 Losuję…":"🎲 Losuj!"}
          </button>
        ) : (
          <p style={{ color:"#2a2a2a", fontSize:12 }}>
            Kliknij plakat żeby wybrać · dodaj 2 filmy do losowania
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

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [dayConfigs, setDayConfigs] = useState({});
  const [dayMovies,  setDayMovies]  = useState({});
  const [selDay,     setSelDay]     = useState(todayKey());
  const [modal,      setModal]      = useState(null); // null | {type:"film",movie?} | {type:"theme"} | {type:"week"}
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400&family=Cinzel:wght@400;600&family=Lato:wght@300;400;700&display=swap";
    l.rel = "stylesheet"; document.head.appendChild(l);
  }, []);

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

  const saveTheme = (k, name, icon, color, tempUntil, reset) => setDayConfigs(p => {
    const ex = p[k] || {};
    if (reset) { const {override,...r}=ex; return {...p,[k]:{...r,name:undefined,icon:undefined,color:undefined}}; }
    if (tempUntil) return { ...p, [k]: { ...ex, override:{ name, icon, color, until:tempUntil } } };
    const {override,...r}=ex; return { ...p, [k]: { ...r, name, icon, color } };
  });

  if (!ready) return <div style={{ background:"#060606", minHeight:"100vh" }}/>;

  const day    = resolveDay(selDay, dayConfigs);
  const mov    = dayMovies[selDay] || {};
  const cands  = candidates(selDay);
  const today  = todayKey();

  return (
    <div style={{ height:"100dvh", background:"#060606", color:"#e8e0d0",
      fontFamily:"'Lato',sans-serif", display:"flex", flexDirection:"column",
      maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding:"14px 16px 10px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:28, filter:`drop-shadow(0 0 12px ${day.color}66)` }}>{day.icon}</span>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:day.color,
                letterSpacing:"0.06em", lineHeight:1.2 }}>{day.name}</div>
              {day.isTemp && (
                <div style={{ fontSize:9, color:"#3a3a3a", letterSpacing:"0.08em" }}>
                  ⏳ tymczasowy · do {day.tempUntil}
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => setModal({type:"theme"})}
              style={{ background:"transparent", border:"1px solid #1e1e1e", borderRadius:8,
                padding:"6px 10px", color:"#3a3a3a", cursor:"pointer", fontSize:12 }}>
              ✏️
            </button>
            <button onClick={() => setModal({type:"week"})}
              style={{ background:"transparent", border:"1px solid #1e1e1e", borderRadius:8,
                padding:"6px 10px", color:"#3a3a3a", cursor:"pointer", fontSize:12 }}>
              📅
            </button>
          </div>
        </div>

        {/* Film count / add button */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginTop:10 }}>
          <div style={{ fontSize:11, color:"#2e2e2e", letterSpacing:"0.06em" }}>
            {cands.length === 0 && "Brak propozycji"}
            {cands.length === 1 && "1 propozycja · dodaj drugą"}
            {cands.length === 2 && "2 propozycje · gotowe do losowania"}
          </div>
          {cands.length < 2 && !mov.chosenId && (
            <button onClick={() => setModal({type:"film"})}
              style={{ background:`${day.color}18`, border:`1px solid ${day.color}33`,
                borderRadius:7, padding:"5px 12px", color:day.color,
                cursor:"pointer", fontSize:11, fontWeight:700 }}>
              ➕ Film
            </button>
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
        onChoose={id => chooseMovie(selDay, id)}
        onReset={() => resetChoice(selDay)}
        onWatched={() => markWatched(selDay)}
        onEditFilm={movie => setModal({type:"film", movie})}
        onAddFilm={() => setModal({type:"film"})}
      />

      {/* ── Bottom day strip ── */}
      <div style={{ flexShrink:0, background:"#080808", borderTop:"1px solid #141414",
        padding:"10px 8px 12px", display:"flex", gap:4, overflowX:"auto" }}>
        {BASE_DAYS.map(base => {
          const d      = resolveDay(base.key, dayConfigs);
          const isActive = selDay === base.key;
          const isToday  = base.key === today;
          const hasMov   = (dayMovies[base.key]?.candidates||[]).length > 0;
          return (
            <button key={base.key} onClick={() => setSelDay(base.key)}
              style={{ flex:1, minWidth:40, background: isActive?"#151515":"transparent",
                border:`1px solid ${isActive?d.color+"66":"#141414"}`,
                borderRadius:10, padding:"8px 4px",
                cursor:"pointer", transition:"all 0.15s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:18, lineHeight:1 }}>{d.icon}</span>
              <span style={{ fontSize:9, color: isActive?d.color:"#444",
                fontFamily:"'Cinzel',serif", letterSpacing:"0.04em" }}>{d.short}</span>
              {/* dot: today or has movies */}
              <div style={{ width:4, height:4, borderRadius:"50%",
                background: isToday?d.color:(hasMov?"#2e2e2e":"transparent"),
                transition:"background 0.2s" }}/>
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
