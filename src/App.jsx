import { useState, useEffect } from "react";

const FAMILY_MEMBERS = ["صاهود", "مضحي", "ممدوح", "محمد", "عبدالله", "ماجد", "مدعث"];
const ADMIN = "ممدوح";
const ONESIGNAL_APP_ID = "c3e90e30-9e96-414c-88c0-559a2b9ecd3e";
const ONESIGNAL_API_KEY = "os_v2_app_ypuq4me6szauzcgakwncxhwnh2ksna5mjnzu3wegarpr6nyla5ge2nuxqmdrgcnzinwo53mrrtbjzd5pugficqtzipuktkfmb7sttby";

// Request notification permission
const requestNotifPermission = async () => {
  try {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        await OneSignal.Notifications.requestPermission();
      });
    }
  } catch (e) { console.log("OneSignal error:", e); }
};

// Send immediate notification to all subscribers
const sendNotifToAll = async (title, message) => {
  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { ar: title, en: title },
        contents: { ar: message, en: message },
        url: window.location.origin,
      })
    });
  } catch (e) { console.log("Notif error:", e); }
};

// Schedule daily notifications for all schedule items
const scheduleAllNotifications = async (schedule) => {
  try {
    for (const item of schedule) {
      const [h, m] = item.time.split(":").map(Number);
      const ampm = h >= 12 ? "م" : "ص";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const timeStr = `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
      const icon = item.type === "medication" ? "💊" : "🍽️";
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          included_segments: ["All"],
          headings: { ar: `${icon} بارّ — تذكير`, en: `${icon} بارّ` },
          contents: { ar: `حان وقت ${item.name} للوالد — ${timeStr}`, en: `Time for ${item.name}` },
          url: window.location.origin,
          delayed_option: "timezone",
          delivery_time_of_day: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} GMT+0300`,
          recurring: "daily",
        })
      });
    }
  } catch (e) { console.log("Schedule notif error:", e); }
};



const DEFAULT_MEDICATIONS = [
  // الفطور
  { id: "m1",  name: "GLUCOPHAGE 500MG",     dose: "حبة بعد الأكل — منظم السكر",           time: "08:00", type: "medication", icon: "💊", meal: "الفطور" },
  { id: "m2",  name: "MOVICOL SACHETS",       dose: "٢ كيس — ملين",                         time: "08:00", type: "medication", icon: "🧪", meal: "الفطور" },
  { id: "m3",  name: "hyFRESH قطرة للعين",    dose: "قطرة مرطبة للعين",                     time: "08:00", type: "medication", icon: "👁️", meal: "الفطور" },
  { id: "m4",  name: "PANTOZOL 40MG",         dose: "حبة قبل الأكل ٣٠ دقيقة — لعصارة المعدة", time: "07:30", type: "medication", icon: "💊", meal: "الفطور" },
  { id: "m5",  name: "Gastrofait 500MG",      dose: "حبة — للمعدة",                         time: "08:00", type: "medication", icon: "💊", meal: "الفطور" },
  { id: "m6",  name: "Avoban قطرة للأنف",     dose: "قطرتين للأنف",                         time: "08:00", type: "medication", icon: "👃", meal: "الفطور" },
  { id: "m7",  name: "Javino مرطب",           dose: "مرطب للوجه والجسم",                    time: "08:00", type: "medication", icon: "🧴", meal: "الفطور" },
  // الغداء
  { id: "m8",  name: "Aspirin 100MG",         dose: "حبة واحدة — اسبرين",                   time: "13:00", type: "medication", icon: "💊", meal: "الغداء" },
  { id: "m9",  name: "Gastrofait 500MG",      dose: "حبة واحدة — للمعدة",                   time: "13:00", type: "medication", icon: "💊", meal: "الغداء" },
  { id: "m10", name: "CuraSept غسول الفم",    dose: "مرة باليوم — غسول للفم",               time: "13:00", type: "medication", icon: "🦷", meal: "الغداء" },
  // العشاء
  { id: "m11", name: "PANTOZOL 40MG",         dose: "حبة قبل الأكل ٣٠ دقيقة — لعصارة المعدة", time: "19:30", type: "medication", icon: "💊", meal: "العشاء" },
  { id: "m12", name: "Gastrofait 500MG",      dose: "حبة واحدة — للمعدة",                   time: "20:00", type: "medication", icon: "💊", meal: "العشاء" },
  { id: "m13", name: "GLUCOPHAGE 500MG",      dose: "حبة بعد الأكل — منظم السكر",           time: "20:00", type: "medication", icon: "💊", meal: "العشاء" },
  { id: "m14", name: "MOVICOL SACHETS",       dose: "كيس مرتين — ملين",                     time: "20:00", type: "medication", icon: "🧪", meal: "العشاء" },
  { id: "m15", name: "Avoban قطرة للأنف",     dose: "قطرتين للأنف",                         time: "20:00", type: "medication", icon: "👃", meal: "العشاء" },
  { id: "m16", name: "hyFRESH قطرة للعين",    dose: "قطرة مرطبة للعين",                     time: "20:00", type: "medication", icon: "👁️", meal: "العشاء" },
  { id: "m17", name: "Javino مرطب",           dose: "مرطب للوجه والجسم",                    time: "20:00", type: "medication", icon: "🧴", meal: "العشاء" },
];
const DEFAULT_MEALS = [
  { id: "f1", name: "الفطور",  desc: "وجبة الصباح",  time: "08:00", type: "meal", icon: "🍳" },
  { id: "f2", name: "الغداء",  desc: "وجبة رئيسية",  time: "13:00", type: "meal", icon: "🍽️" },
  { id: "f3", name: "العشاء",  desc: "وجبة المساء",  time: "20:00", type: "meal", icon: "🥗" },
];

const getToday = () => new Date().toISOString().split("T")[0];
const getTime = () => new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
const formatDate = () => new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const formatTime12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "م" : "ص";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f172a; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  .slide-up { animation: slideUp 0.35s ease; }
  .fade-in { animation: fadeIn 0.2s ease; }
  .shake { animation: shake 0.4s ease; }
  .btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .btn { transition: all 0.2s ease; }
  .card:hover { transform: translateX(-3px); }
  .card { transition: transform 0.2s; }
`;

// ─── PIN SCREEN ──────────────────────────────────────────────────────────────
function PinScreen({ name, onSuccess, onBack, pins }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleKey = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (pins[name] && pins[name] === next) {
          onSuccess(name);
        } else {
          setError(true);
          setShakeKey(s => s + 1);
          setTimeout(() => { setPin(""); setError(false); }, 800);
        }
      }, 200);
    }
  };

  return (
    <div style={S.pinRoot} dir="rtl">
      <button onClick={onBack} style={S.backBtn}>← رجوع</button>
      <div style={S.pinAvatar}>👤</div>
      <div style={S.pinName}>{name}</div>
      <div style={S.pinLabel}>أدخل الرقم السري</div>

      <div key={shakeKey} className={error ? "shake" : ""} style={S.dots}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ ...S.dot, background: i < pin.length ? (error ? "#ef4444" : "#38bdf8") : "#1e293b", border: `2px solid ${i < pin.length ? (error ? "#ef4444" : "#38bdf8") : "#334155"}` }} />
        ))}
      </div>
      {error && <div style={S.pinError}>رقم سري خاطئ، حاول مجدداً</div>}

      <div style={S.keypad}>
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
          k === "" ? <div key={i} /> :
          <button key={i} className="btn" onClick={() => handleKey(k)}
            style={{ ...S.key, ...(k === "del" ? S.keyDel : {}) }}>
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SELECT USER SCREEN ───────────────────────────────────────────────────────
function SelectUser({ onSelect }) {
  return (
    <div style={S.selectRoot} dir="rtl" className="slide-up">
      <div style={S.selectHeader}>
        <div style={{ fontSize: 40 }}>🤍</div>
        <div style={S.selectTitle}>بارّ</div>
        <div style={S.selectSub}>اختر اسمك للدخول</div>
      </div>
      <div style={S.memberList}>
        {FAMILY_MEMBERS.map(name => (
          <button key={name} className="btn" onClick={() => onSelect(name)} style={S.memberItem}>
            <span style={S.memberAvatar}>👤</span>
            <span style={S.memberName}>{name}</span>
            <span style={{ color: "#475569", fontSize: 16 }}>←</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN PIN SETUP ──────────────────────────────────────────────────────────
function PinSetup({ pins, onSave }) {
  const [localPins, setLocalPins] = useState({ ...pins });
  const [editing, setEditing] = useState(null);
  const [newPin, setNewPin] = useState("");

  const handleDigit = (k) => {
    if (k === "del") { setNewPin(p => p.slice(0, -1)); return; }
    if (newPin.length >= 4) return;
    setNewPin(p => p + k);
  };

  const savePin = () => {
    if (newPin.length !== 4) return;
    const updated = { ...localPins, [editing]: newPin };
    setLocalPins(updated);
    onSave(updated);
    setEditing(null);
    setNewPin("");
  };

  return (
    <div dir="rtl" className="slide-up">
      <div style={S.sectionTitle}>🔐 إدارة الأرقام السرية</div>
      <div style={{ background: "#1e3a5f", borderRadius: 12, padding: "12px 14px", marginBottom: 16, border: "1px solid #0ea5e9" }}>
        <div style={{ fontSize: 12, color: "#7dd3fc" }}>أنت المسؤول عن تعيين رقم سري لكل شخص وإرساله له بشكل خاص</div>
      </div>
      {FAMILY_MEMBERS.map(name => (
        <div key={name} style={{ background: "#1e293b", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{localPins[name] ? "●●●●" : "لم يُعيَّن بعد"}</div>
            </div>
          </div>
          <button className="btn" onClick={() => { setEditing(name); setNewPin(""); }}
            style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontFamily: "'Tajawal',sans-serif", fontWeight: 700, cursor: "pointer" }}>
            {localPins[name] ? "تغيير" : "تعيين"}
          </button>
        </div>
      ))}

      {editing && (
        <div style={S.overlay} className="fade-in">
          <div style={{ ...S.modal, paddingBottom: 24 }} className="slide-up" onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>رقم سري لـ {editing}</div>
            <div style={S.dots}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ ...S.dot, background: i < newPin.length ? "#38bdf8" : "#0f172a", border: `2px solid ${i < newPin.length ? "#38bdf8" : "#334155"}` }} />
              ))}
            </div>
            <div style={S.keypad}>
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
                k === "" ? <div key={i} /> :
                <button key={i} className="btn" onClick={() => handleDigit(k)}
                  style={{ ...S.key, ...(k === "del" ? S.keyDel : {}) }}>
                  {k === "del" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, padding: "0 8px" }}>
              <button className="btn" onClick={savePin} disabled={newPin.length !== 4}
                style={{ flex: 1, background: newPin.length === 4 ? "#0ea5e9" : "#334155", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontFamily: "'Tajawal',sans-serif", fontWeight: 700, cursor: "pointer" }}>
                حفظ
              </button>
              <button onClick={() => { setEditing(null); setNewPin(""); }}
                style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontFamily: "'Tajawal',sans-serif", cursor: "pointer" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function FatherCare() {
  const [screen, setScreen] = useState("select"); // select | pin | app
  const [activeUser, setActiveUser] = useState(null);
  const [pins, setPins] = useState({});
  const [tab, setTab] = useState("today");
  const [schedule, setSchedule] = useState([...DEFAULT_MEDICATIONS, ...DEFAULT_MEALS]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDoneModal, setShowDoneModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", dose: "", time: "08:00", type: "medication", icon: "💊" });
  const [savingId, setSavingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notes, setNotes] = useState([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const today = getToday();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [schedRes, logsRes, pinsRes, notesRes] = await Promise.all([
        window.storage.get("schedule", true).catch(() => null),
        window.storage.get(`logs_${today}`, true).catch(() => null),
        window.storage.get(`notes_${today}`, true).catch(() => null),
        window.storage.get("pins", true).catch(() => null),
      ]);
      if (schedRes?.value) setSchedule(JSON.parse(schedRes.value));
      if (logsRes?.value) setLogs(JSON.parse(logsRes.value));
      if (pinsRes?.value) setPins(JSON.parse(pinsRes.value));
      if (notesRes?.value) setNotes(JSON.parse(notesRes.value));
    } catch (e) {}
    setLoading(false);
  };

  const savePins = async (newPins) => {
    setPins(newPins);
    try { await window.storage.set("pins", JSON.stringify(newPins), true); } catch (e) {}
    showNotif("✅ تم حفظ الرقم السري");
  };

  const saveSchedule = async (newSched) => {
    setSchedule(newSched);
    try { await window.storage.set("schedule", JSON.stringify(newSched), true); } catch (e) {}
  };

  const markDone = async (item) => {
    setSavingId(item.id);
    const newLogs = { ...logs, [item.id]: { doneBy: activeUser, doneAt: getTime(), doneDate: today } };
    setLogs(newLogs);
    try { await window.storage.set(`logs_${today}`, JSON.stringify(newLogs), true); } catch (e) {}
    setSavingId(null);
    setShowDoneModal(null);
    showNotif(`✅ تم تسجيل ${item.name}`);
    sendNotifToAll(`✅ بارّ — ${item.name}`, `قام ${activeUser} بإعطاء ${item.name} للوالد`);
  };

  const undoMark = async (itemId) => {
    const newLogs = { ...logs };
    delete newLogs[itemId];
    setLogs(newLogs);
    try { await window.storage.set(`logs_${today}`, JSON.stringify(newLogs), true); } catch (e) {}
    showNotif("↩️ تم التراجع");
  };

  const addItem = async () => {
    if (!addForm.name || !addForm.time) return;
    const newSched = [...schedule, { ...addForm, id: `c_${Date.now()}`, addedBy: activeUser, addedAt: getTime() }];
    await saveSchedule(newSched);
    setAddForm({ name: "", dose: "", time: "08:00", type: "medication", icon: "💊" });
    setShowAddModal(false);
    showNotif("✅ تم الإضافة");
  };

  const deleteItem = async (id) => {
    await saveSchedule(schedule.filter(i => i.id !== id));
    showNotif("🗑️ تم الحذف");
  };

  const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 2500); };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const newNote = { id: Date.now(), text: noteText.trim(), by: activeUser, at: getTime(), date: today };
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    try { await window.storage.set(`notes_${today}`, JSON.stringify(newNotes), true); } catch (e) {}
    setNoteText("");
    setShowNotesModal(false);
    showNotif("📝 تمت إضافة الملاحظة");
  };

  const deleteNote = async (id) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    try { await window.storage.set(`notes_${today}`, JSON.stringify(newNotes), true); } catch (e) {}
    showNotif("🗑️ تم حذف الملاحظة");
  };

  const handleSelectUser = (name) => {
    if (!pins[name]) {
      // No PIN set yet — only admin can enter without PIN or set PINs first
      if (name === ADMIN) { setActiveUser(name); setScreen("app"); requestNotifPermission(); }
      else { showNotif("⚠️ لم يُعيَّن رقم سري لهذا الشخص بعد"); }
      return;
    }
    setActiveUser(name);
    setScreen("pin");
  };

  const todayItems = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
  const doneCount = todayItems.filter(i => logs[i.id]).length;

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0f172a", fontFamily:"Tajawal", color:"#94a3b8", gap:12 }}>
      <div style={{ fontSize: 40 }}>⏳</div><p>جاري التحميل...</p>
    </div>
  );

  // ── SELECT SCREEN
  if (screen === "select") return (
    <div style={S.root}><style>{CSS}</style>
      <SelectUser onSelect={handleSelectUser} />
      {/* Notes Modal */}
      {showNotesModal && (
        <div style={S.overlay} className="fade-in" onClick={() => setShowNotesModal(false)}>
          <div style={S.modal} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={S.modalTitle}>📝 إضافة ملاحظة</div>
            <div style={{marginBottom:14,marginTop:8}}>
              <textarea
                style={{...S.input, height:120, resize:"none", lineHeight:1.7}}
                dir="rtl"
                placeholder="اكتب ملاحظتك هنا..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
            </div>
            <div style={S.modalBtns}>
              <button className="btn" style={S.btnConfirm} onClick={addNote}>✅ حفظ</button>
              <button style={S.btnCancel} onClick={() => setShowNotesModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {notification && <div style={S.notif} className="slide-up">{notification}</div>}
    </div>
  );

  // ── PIN SCREEN
  if (screen === "pin") return (
    <div style={S.root}><style>{CSS}</style>
      <PinScreen name={activeUser} pins={pins}
        onSuccess={(name) => { setActiveUser(name); setScreen("app"); }}
        onBack={() => { setScreen("select"); setActiveUser(null); }} />
    </div>
  );

  // ── MAIN APP SCREEN
  return (
    <div style={S.root} dir="rtl">
      <style>{CSS}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.headerTitle}>بارّ 🤍</div>
            <div style={S.headerSub}>{formatDate()}</div>
          </div>
          <div style={S.progressCircle}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#1e3a5f" strokeWidth="5"/>
              <circle cx="28" cy="28" r="22" fill="none" stroke="#38bdf8" strokeWidth="5"
                strokeDasharray={`${2*Math.PI*22}`}
                strokeDashoffset={`${2*Math.PI*22*(1-doneCount/Math.max(todayItems.length,1))}`}
                strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
            </svg>
            <div style={S.progressText}>{doneCount}/{todayItems.length}</div>
          </div>
        </div>
        <div style={S.memberBar}>
          <span style={{ fontSize:12, opacity:0.7 }}>أنت:</span>
          <div style={S.memberBadge}>
            <span>👤</span><span>{activeUser}</span><span style={{ fontSize:10, color:"#4ade80" }}>🔒</span>
          </div>
          <button onClick={() => { setScreen("select"); setActiveUser(null); setTab("today"); }}
            style={{ marginRight:"auto", background:"none", border:"1px solid #334155", borderRadius:8, padding:"3px 10px", fontSize:11, color:"#64748b", cursor:"pointer", fontFamily:"Tajawal" }}>
            خروج
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[["today","اليوم"],["history","السجل"],["schedule","الجدول"],["notes","ملاحظات"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ ...S.tabBtn, ...(tab===k ? S.tabActive : {}) }}>{l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={S.content}>

        {/* TODAY */}
        {tab === "today" && <div className="slide-up">
          {todayItems.length === 0 && (
            <div style={S.empty}><div style={{fontSize:48}}>📋</div><p>لا يوجد جدول</p></div>
          )}
          {todayItems.map(item => {
            const done = logs[item.id];
            return (
              <div key={item.id} className="card" style={{ ...S.card, ...(done ? S.cardDone : {}) }}>
                <div style={S.cardLeft}>
                  <div style={{ ...S.iconBadge, background: item.type==="medication" ? "#1e3a5f" : "#14532d" }}>{item.icon}</div>
                  <div>
                    <div style={S.itemName}>{item.name}</div>
                    <div style={S.itemSub}>{item.dose || item.desc} • {formatTime12(item.time)}</div>
                    {done && <div style={S.doneTag}>✅ {done.doneBy} — {done.doneAt}</div>}
                  </div>
                </div>
                <div style={{ flexShrink:0, marginRight:8 }}>
                  {!done
                    ? <button className="btn" style={S.btnDone} onClick={() => setShowDoneModal(item)} disabled={savingId===item.id}>{savingId===item.id?"⏳":"تم"}</button>
                    : <button className="btn" style={S.btnUndo} onClick={() => undoMark(item.id)}>تراجع</button>
                  }
                </div>
              </div>
            );
          })}
          {doneCount === todayItems.length && todayItems.length > 0 && (
            <div style={S.allDone} className="slide-up">
              <div style={{fontSize:40}}>🎉</div>
              <div style={{fontWeight:700,fontSize:16}}>اكتمل جدول اليوم!</div>
              <div style={{opacity:0.7,fontSize:13}}>جزاكم الله خيراً على بارّ</div>
            </div>
          )}
        </div>}

        {/* HISTORY */}
        {tab === "history" && <div className="slide-up">
          <div style={S.sectionTitle}>سجل اليوم</div>
          {Object.keys(logs).length === 0 && <div style={S.empty}><div style={{fontSize:40}}>📭</div><p>لا يوجد سجل بعد</p></div>}
          {schedule.filter(i => logs[i.id]).map(item => {
            const log = logs[item.id];
            return (
              <div key={item.id} style={S.logCard}>
                <div style={{fontSize:22,width:36,textAlign:"center"}}>{item.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700}}>{item.name}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>قام بها: <span style={{color:"#38bdf8"}}>{log.doneBy}</span></div>
                </div>
                <div style={{fontSize:12,color:"#38bdf8",fontWeight:700}}>{log.doneAt}</div>
              </div>
            );
          })}
        </div>}

        {/* SCHEDULE */}
        {tab === "schedule" && <div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={S.sectionTitle}>إدارة الجدول</div>
            {activeUser === ADMIN && <button className="btn" style={S.btnAdd} onClick={() => setShowAddModal(true)}>+ إضافة</button>}
            {activeUser === ADMIN && <button className="btn" style={{...S.btnAdd, background:"#7c3aed"}} onClick={() => { scheduleAllNotifications(schedule); showNotif("🔔 تم جدولة الإشعارات"); }}>🔔 جدولة</button>}
          </div>

          {["medication","meal"].map(type => (
            <div key={type}>
              <div style={{...S.sectionTitle,marginTop:type==="meal"?20:0}}>{type==="medication"?"💊 الأدوية":"🍽️ الوجبات"}</div>
              {schedule.filter(i=>i.type===type).map(item => (
                <div key={item.id} style={S.schedCard}>
                  <span style={{fontSize:20}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{item.name}</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{item.dose||item.desc} • {formatTime12(item.time)}</div>
                  </div>
                  {activeUser===ADMIN && item.id.startsWith("c_") && (
                    <button onClick={() => deleteItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* PIN Management - admin only */}
          {activeUser === ADMIN && (
            <div style={{marginTop:24}}>
              <PinSetup pins={pins} onSave={savePins} />
            </div>
          )}
        </div>}
      </div>

      {/* Done Modal */}
      {showDoneModal && (
        <div style={S.overlay} className="fade-in" onClick={() => setShowDoneModal(null)}>
          <div style={S.modal} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,textAlign:"center"}}>{showDoneModal.icon}</div>
            <div style={S.modalTitle}>تأكيد التسجيل</div>
            <div style={S.modalSub}>هل قمت بإعطاء <span style={{color:"#38bdf8",fontWeight:700}}>{showDoneModal.name}</span>؟</div>
            <div style={S.modalMeta}>الوقت: {getTime()} • بواسطة: {activeUser}</div>
            <div style={S.modalBtns}>
              <button className="btn" style={S.btnConfirm} onClick={() => markDone(showDoneModal)}>✅ نعم، تم</button>
              <button style={S.btnCancel} onClick={() => setShowDoneModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={S.overlay} className="fade-in" onClick={() => setShowAddModal(false)}>
          <div style={S.modal} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={S.modalTitle}>إضافة دواء أو وجبة</div>
            <div style={{marginBottom:14}}>
              <label style={S.label}>النوع</label>
              <div style={{display:"flex",gap:8}}>
                {["medication","meal"].map(t => (
                  <button key={t} onClick={() => setAddForm({...addForm,type:t,icon:t==="medication"?"💊":"🍽️"})}
                    style={{flex:1,background:addForm.type===t?"#1e3a5f":"#0f172a",border:`1px solid ${addForm.type===t?"#0ea5e9":"#334155"}`,borderRadius:10,padding:"8px 0",color:addForm.type===t?"#38bdf8":"#64748b",fontSize:13,fontFamily:"Tajawal",cursor:"pointer",fontWeight:addForm.type===t?700:400}}>
                    {t==="medication"?"💊 دواء":"🍽️ وجبة"}
                  </button>
                ))}
              </div>
            </div>
            {[["name",addForm.type==="medication"?"اسم الدواء":"اسم الوجبة","مثال: دواء الضغط"],["dose",addForm.type==="medication"?"الجرعة":"الوصف","مثال: حبة واحدة"]].map(([field,label,ph]) => (
              <div key={field} style={{marginBottom:14}}>
                <label style={S.label}>{label}</label>
                <input style={S.input} dir="rtl" placeholder={ph} value={addForm[field]}
                  onChange={e => setAddForm({...addForm,[field]:e.target.value})} />
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={S.label}>الوقت</label>
              <input style={S.input} type="time" value={addForm.time} onChange={e => setAddForm({...addForm,time:e.target.value})} />
            </div>
            <div style={S.modalBtns}>
              <button className="btn" style={S.btnConfirm} onClick={addItem}>✅ إضافة</button>
              <button style={S.btnCancel} onClick={() => setShowAddModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div style={S.overlay} className="fade-in" onClick={() => setShowNotesModal(false)}>
          <div style={S.modal} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={S.modalTitle}>📝 إضافة ملاحظة</div>
            <div style={{marginBottom:14,marginTop:8}}>
              <textarea
                style={{...S.input, height:120, resize:"none", lineHeight:1.7}}
                dir="rtl"
                placeholder="اكتب ملاحظتك هنا..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
            </div>
            <div style={S.modalBtns}>
              <button className="btn" style={S.btnConfirm} onClick={addNote}>✅ حفظ</button>
              <button style={S.btnCancel} onClick={() => setShowNotesModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {notification && <div style={S.notif} className="slide-up">{notification}</div>}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root: { fontFamily:"'Tajawal',sans-serif", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9", maxWidth:480, margin:"0 auto", position:"relative" },

  // Select screen
  selectRoot: { minHeight:"100vh", background:"#0f172a", padding:"0 0 40px" },
  selectHeader: { background:"linear-gradient(135deg,#1e3a5f,#0f2744)", padding:"40px 20px 30px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  selectTitle: { fontSize:24, fontWeight:900 },
  selectSub: { fontSize:13, opacity:0.7 },
  memberList: { padding:"16px" },
  memberItem: { width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:"16px", marginBottom:10, display:"flex", alignItems:"center", gap:12, cursor:"pointer", color:"#f1f5f9", fontFamily:"Tajawal" },
  memberAvatar: { fontSize:22, width:40, height:40, background:"#0f172a", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" },
  memberName: { flex:1, fontSize:16, fontWeight:700, textAlign:"right" },

  // PIN screen
  pinRoot: { minHeight:"100vh", background:"#0f172a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative" },
  backBtn: { position:"absolute", top:20, right:20, background:"none", border:"none", color:"#64748b", fontSize:14, cursor:"pointer", fontFamily:"Tajawal" },
  pinAvatar: { fontSize:50, marginBottom:8 },
  pinName: { fontSize:22, fontWeight:800, marginBottom:4 },
  pinLabel: { fontSize:13, color:"#64748b", marginBottom:24 },
  dots: { display:"flex", gap:16, marginBottom:8 },
  dot: { width:16, height:16, borderRadius:"50%", transition:"all 0.2s" },
  pinError: { fontSize:12, color:"#ef4444", marginBottom:16, height:20 },
  keypad: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:"100%", maxWidth:280, marginTop:16 },
  key: { background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:"18px 0", fontSize:22, fontWeight:700, color:"#f1f5f9", cursor:"pointer", fontFamily:"Tajawal" },
  keyDel: { background:"#0f172a", color:"#64748b", fontSize:18 },

  // App
  header: { background:"linear-gradient(135deg,#1e3a5f,#0f2744)", padding:"24px 20px 16px" },
  headerTop: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  headerTitle: { fontSize:20, fontWeight:900 },
  headerSub: { fontSize:11, opacity:0.7, marginTop:2 },
  progressCircle: { position:"relative", display:"flex", alignItems:"center", justifyContent:"center" },
  progressText: { position:"absolute", fontSize:11, fontWeight:700, color:"#38bdf8" },
  memberBar: { display:"flex", alignItems:"center", gap:8 },
  memberBadge: { display:"flex", alignItems:"center", gap:6, background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.3)", borderRadius:20, padding:"4px 12px", fontSize:13, color:"#7dd3fc" },
  tabs: { display:"flex", background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"0 16px" },
  tabBtn: { flex:1, padding:"12px 0", background:"none", border:"none", color:"#64748b", fontSize:14, fontFamily:"'Tajawal',sans-serif", cursor:"pointer", fontWeight:500 },
  tabActive: { color:"#38bdf8", borderBottom:"2px solid #38bdf8", fontWeight:700 },
  content: { padding:16, overflowY:"auto", maxHeight:"calc(100vh - 180px)" },
  sectionTitle: { fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:0.5, marginBottom:10, textTransform:"uppercase" },
  card: { background:"#1e293b", borderRadius:16, padding:"14px 16px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #334155" },
  cardDone: { background:"#0f2744", border:"1px solid #1e3a5f", opacity:0.85 },
  cardLeft: { display:"flex", alignItems:"flex-start", gap:12, flex:1 },
  iconBadge: { width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
  itemName: { fontSize:15, fontWeight:700, marginBottom:2 },
  itemSub: { fontSize:12, color:"#64748b" },
  doneTag: { fontSize:11, color:"#4ade80", marginTop:4, fontWeight:500 },
  btnDone: { background:"#0ea5e9", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontFamily:"'Tajawal',sans-serif", fontWeight:700, cursor:"pointer" },
  btnUndo: { background:"#334155", color:"#94a3b8", border:"none", borderRadius:10, padding:"8px 12px", fontSize:12, fontFamily:"'Tajawal',sans-serif", cursor:"pointer" },
  empty: { textAlign:"center", padding:"50px 20px", color:"#475569", display:"flex", flexDirection:"column", alignItems:"center", gap:12 },
  allDone: { background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:16, padding:20, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, border:"1px solid #16a34a" },
  logCard: { background:"#1e293b", borderRadius:14, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:12, border:"1px solid #334155" },
  schedCard: { background:"#1e293b", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10, border:"1px solid #334155" },
  btnAdd: { background:"#0ea5e9", color:"#fff", border:"none", borderRadius:10, padding:"6px 14px", fontSize:13, fontFamily:"'Tajawal',sans-serif", fontWeight:700, cursor:"pointer" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 },
  modal: { background:"#1e293b", borderRadius:"20px 20px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:480, border:"1px solid #334155", borderBottom:"none", maxHeight:"90vh", overflowY:"auto" },
  modalTitle: { fontSize:18, fontWeight:800, textAlign:"center", marginBottom:6, marginTop:8 },
  modalSub: { fontSize:14, color:"#94a3b8", textAlign:"center", marginBottom:4 },
  modalMeta: { fontSize:12, color:"#475569", textAlign:"center", marginBottom:20 },
  modalBtns: { display:"flex", gap:10, marginTop:8 },
  btnConfirm: { flex:1, background:"#0ea5e9", color:"#fff", border:"none", borderRadius:12, padding:"12px 0", fontSize:15, fontFamily:"'Tajawal',sans-serif", fontWeight:700, cursor:"pointer" },
  btnCancel: { flex:1, background:"#334155", color:"#94a3b8", border:"none", borderRadius:12, padding:"12px 0", fontSize:15, fontFamily:"'Tajawal',sans-serif", cursor:"pointer" },
  label: { display:"block", fontSize:12, color:"#94a3b8", marginBottom:6, fontWeight:600 },
  input: { width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:"10px 14px", color:"#f1f5f9", fontSize:14, fontFamily:"'Tajawal',sans-serif", outline:"none" },
  notif: { position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1e293b", border:"1px solid #334155", borderRadius:20, padding:"10px 24px", fontSize:14, fontWeight:600, color:"#f1f5f9", zIndex:300, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", whiteSpace:"nowrap" },
};
