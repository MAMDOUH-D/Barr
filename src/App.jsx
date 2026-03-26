import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const firebaseConfig = {
  apiKey: "AIzaSyAivsLIktDqF2OCd8clRsIi3NNvrAh80b0",
  authDomain: "barr-73df3.firebaseapp.com",
  projectId: "barr-73df3",
  storageBucket: "barr-73df3.firebasestorage.app",
  messagingSenderId: "270156585080",
  appId: "1:270156585080:web:1260bbe5e0fad35ed4f58d"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const fbGet = async (key) => {
  try { const s = await getDoc(doc(db,"barr",key)); return s.exists()?s.data().value:null; }
  catch(e){return null;}
};
const fbSet = async (key,value) => {
  try { await setDoc(doc(db,"barr",key),{value}); } catch(e){}
};

// ── Constants ─────────────────────────────────────────────────────────────
const FAMILY_MEMBERS = ["صاهود","مضحي","ممدوح","محمد","عبدالله","ماجد","مدعث"];
const ADMIN = "ممدوح";
const ADMIN_EMAIL = "mamdooh.f16@gmail.com";
const ONESIGNAL_APP_ID = "c3e90e30-9e96-414c-88c0-559a2b9ecd3e";
const ONESIGNAL_API_KEY = "os_v2_app_ypuq4me6szauzcgakwncxhwnh2ksna5mjnzu3wegarpr6nyla5ge2nuxqmdrgcnzinwo53mrrtbjzd5pugficqtzipuktkfmb7sttby";

// ── Helpers ───────────────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];
const getHour  = () => new Date().getHours();
const getTime  = () => new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit",hour12:true});
const formatDate = () => new Date().toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const formatDateAr = (iso) => new Date(iso).toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const formatTime12 = (t) => {
  const [h,m] = t.split(":").map(Number);
  return `${h%12===0?12:h%12}:${String(m).padStart(2,"0")} ${h>=12?"م":"ص"}`;
};
const isNightMode = () => { const h=getHour(); return h>=18||h<6; };

// ── Default Schedule ──────────────────────────────────────────────────────
const DEFAULT_SCHEDULE = [
  {id:"m1", name:"GLUCOPHAGE 500MG",    dose:"حبة بعد الأكل — منظم السكر",         time:"08:00",type:"medication",icon:"💊",meal:"الفطور"},
  {id:"m2", name:"MOVICOL SACHETS",     dose:"٢ كيس — ملين",                       time:"08:00",type:"medication",icon:"🧪",meal:"الفطور"},
  {id:"m3", name:"hyFRESH قطرة للعين",  dose:"قطرة مرطبة للعين",                   time:"08:00",type:"medication",icon:"👁️",meal:"الفطور"},
  {id:"m4", name:"PANTOZOL 40MG",       dose:"حبة قبل الأكل ٣٠ دقيقة",             time:"07:30",type:"medication",icon:"💊",meal:"الفطور"},
  {id:"m5", name:"Gastrofait 500MG",    dose:"حبة — للمعدة",                       time:"08:00",type:"medication",icon:"💊",meal:"الفطور"},
  {id:"m6", name:"Avoban قطرة للأنف",   dose:"قطرتين للأنف",                       time:"08:00",type:"medication",icon:"👃",meal:"الفطور"},
  {id:"m7", name:"Javino مرطب",         dose:"مرطب للوجه والجسم",                  time:"08:00",type:"medication",icon:"🧴",meal:"الفطور"},
  {id:"f1", name:"وجبة الفطور",         desc:"الفطور",                             time:"08:30",type:"meal",icon:"🍳",meal:"الفطور"},
  {id:"m8", name:"Aspirin 100MG",       dose:"حبة واحدة — اسبرين",                 time:"13:00",type:"medication",icon:"💊",meal:"الغداء"},
  {id:"m9", name:"Gastrofait 500MG",    dose:"حبة واحدة — للمعدة",                 time:"13:00",type:"medication",icon:"💊",meal:"الغداء"},
  {id:"m10",name:"CuraSept غسول الفم",  dose:"مرة باليوم — غسول للفم",             time:"13:00",type:"medication",icon:"🦷",meal:"الغداء"},
  {id:"f2", name:"وجبة الغداء",         desc:"الغداء",                             time:"13:30",type:"meal",icon:"🍽️",meal:"الغداء"},
  {id:"m11",name:"PANTOZOL 40MG",       dose:"حبة قبل الأكل ٣٠ دقيقة",             time:"19:30",type:"medication",icon:"💊",meal:"العشاء"},
  {id:"m12",name:"Gastrofait 500MG",    dose:"حبة واحدة — للمعدة",                 time:"20:00",type:"medication",icon:"💊",meal:"العشاء"},
  {id:"m13",name:"GLUCOPHAGE 500MG",    dose:"حبة بعد الأكل — منظم السكر",         time:"20:00",type:"medication",icon:"💊",meal:"العشاء"},
  {id:"m14",name:"MOVICOL SACHETS",     dose:"كيس مرتين — ملين",                   time:"20:00",type:"medication",icon:"🧪",meal:"العشاء"},
  {id:"m15",name:"Avoban قطرة للأنف",   dose:"قطرتين للأنف",                       time:"20:00",type:"medication",icon:"👃",meal:"العشاء"},
  {id:"m16",name:"hyFRESH قطرة للعين",  dose:"قطرة مرطبة للعين",                   time:"20:00",type:"medication",icon:"👁️",meal:"العشاء"},
  {id:"m17",name:"Javino مرطب",         dose:"مرطب للوجه والجسم",                  time:"20:00",type:"medication",icon:"🧴",meal:"العشاء"},
  {id:"f3", name:"وجبة العشاء",         desc:"العشاء",                             time:"20:30",type:"meal",icon:"🥗",meal:"العشاء"},
];

// ── OneSignal ─────────────────────────────────────────────────────────────
const requestNotifPermission = async () => {
  try { if(window.OneSignalDeferred) window.OneSignalDeferred.push(async(OS)=>await OS.Notifications.requestPermission()); } catch(e){}
};
const sendNotifToAll = async (title,message) => {
  try {
    await fetch("https://onesignal.com/api/v1/notifications",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Key ${ONESIGNAL_API_KEY}`},
      body:JSON.stringify({app_id:ONESIGNAL_APP_ID,included_segments:["All"],headings:{ar:title},contents:{ar:message},url:window.location.origin})
    });
  } catch(e){}
};

// ── PDF Report Generator ──────────────────────────────────────────────────
const generateWeeklyPDF = async (schedule, weekDays) => {
  const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  // Header
  pdf.setFillColor(30, 58, 95);
  pdf.rect(0, 0, 210, 30, "F");
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(18);
  pdf.text("Bar - Weekly Care Report", 105, 12, {align:"center"});
  pdf.setFontSize(10);
  pdf.text(`From: ${weekDays[weekDays.length-1]}  To: ${weekDays[0]}`, 105, 22, {align:"center"});

  let y = 38;

  for (const date of [...weekDays].reverse()) {
    const logsData = await fbGet(`logs_${date}`);
    const logs = logsData ? JSON.parse(logsData) : {};
    const notesData = await fbGet(`notes_${date}`);
    const notes = notesData ? JSON.parse(notesData) : [];
    const vitalsData = await fbGet(`vitals_${date}`);
    const vitals = vitalsData ? JSON.parse(vitalsData) : {};

    const d = new Date(date);
    const dateStr = d.toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"short",day:"numeric"});

    if(y > 240){ pdf.addPage(); y = 20; }

    // Date header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(10, y, 190, 8, "F");
    pdf.setTextColor(30, 58, 95);
    pdf.setFontSize(11);
    pdf.setFont(undefined,"bold");
    pdf.text(dateStr, 15, y+5.5);
    y += 12;

    // Medications table
    const doneItems = schedule.filter(i => logs[i.id]);
    const missedItems = schedule.filter(i => !logs[i.id]);

    if(doneItems.length > 0 || missedItems.length > 0){
      const rows = schedule.map(item => [
        item.name,
        item.dose || item.desc || "",
        item.meal || "",
        logs[item.id] ? `✓ ${logs[item.id].doneBy} ${logs[item.id].doneAt}` : "✗ Not done"
      ]);

      autoTable(pdf, {
        startY: y,
        head: [["Medication/Meal","Dose","Period","Status"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor:[30,58,95], textColor:255, fontSize:9 },
        bodyStyles: { fontSize:8, textColor:[30,30,30] },
        columnStyles: { 3: { cellWidth: 50 } },
        didParseCell: (data) => {
          if(data.section==="body" && data.column.index===3){
            if(data.cell.raw.includes("✓")) data.cell.styles.textColor = [21,128,61];
            else data.cell.styles.textColor = [220,38,38];
          }
        },
        margin:{left:10,right:10},
      });
      y = pdf.lastAutoTable.finalY + 4;
    }

    // Vitals
    const vitalEntries = Object.values(vitals);
    if(vitalEntries.length > 0){
      vitalEntries.forEach(v => {
        pdf.setFontSize(8);
        pdf.setTextColor(100,100,100);
        pdf.setFont(undefined,"normal");
        let vStr = `📊 ${v.period}: `;
        if(v.bp_sys && v.bp_dia) vStr += `BP: ${v.bp_sys}/${v.bp_dia} mmHg  `;
        if(v.sugar) vStr += `Sugar: ${v.sugar} mg/dL  `;
        vStr += `(by ${v.by})`;
        pdf.text(vStr, 12, y);
        y += 5;
      });
    }

    // Notes
    if(notes.length > 0){
      notes.forEach(n => {
        if(y > 270){ pdf.addPage(); y = 20; }
        pdf.setFontSize(8);
        pdf.setTextColor(80,80,80);
        pdf.text(`📝 ${n.by} (${n.at}): ${n.text.substring(0,80)}`, 12, y);
        y += 5;
      });
    }

    // Compliance rate
    const total = schedule.length;
    const done = doneItems.length;
    const pct = total > 0 ? Math.round((done/total)*100) : 0;
    pdf.setFontSize(9);
    pdf.setTextColor(30,58,95);
    pdf.setFont(undefined,"bold");
    pdf.text(`Compliance: ${done}/${total} (${pct}%)`, 150, y);
    y += 8;

    if(y > 260){ pdf.addPage(); y = 20; }
  }

  // Footer
  const pageCount = pdf.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150,150,150);
    pdf.setFont(undefined,"normal");
    pdf.text(`Bar App | Generated: ${new Date().toLocaleDateString("en-GB")} | Page ${i}/${pageCount}`, 105, 290, {align:"center"});
  }

  return pdf;
};

// ── CSS ───────────────────────────────────────────────────────────────────
const getCSS = (night) => `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${night?"#0f172a":"#f1f5f9"};}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px;}
  @keyframes slideUp{from{transform:translateY(30px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  .slide-up{animation:slideUp 0.35s ease;}
  .fade-in{animation:fadeIn 0.2s ease;}
  .shake{animation:shake 0.4s ease;}
  .btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
  .btn{transition:all 0.2s ease;}
  .card:hover{transform:translateX(-3px);}
  .card{transition:transform 0.2s;}
`;

// ── Theme ─────────────────────────────────────────────────────────────────
const getTheme=(night)=>night?{
  bg:"#0f172a",card:"#1e293b",card2:"#0f172a",header:"linear-gradient(135deg,#1e3a5f,#0f2744)",
  text:"#f1f5f9",muted:"#64748b",border:"#334155",subtext:"#94a3b8",
  tabBg:"#0f172a",tabBorder:"#1e293b",doneBg:"#0f2744",doneBorder:"#1e3a5f",
}:{
  bg:"#f1f5f9",card:"#ffffff",card2:"#f8fafc",header:"linear-gradient(135deg,#1e40af,#1e3a8a)",
  text:"#1e293b",muted:"#94a3b8",border:"#e2e8f0",subtext:"#64748b",
  tabBg:"#ffffff",tabBorder:"#e2e8f0",doneBg:"#f0fdf4",doneBorder:"#bbf7d0",
};

// ── PIN Screen ────────────────────────────────────────────────────────────
function PinScreen({name,onSuccess,onBack,pins,night}){
  const [pin,setPin]=useState("");
  const [error,setError]=useState(false);
  const [shakeKey,setShakeKey]=useState(0);
  const S=getTheme(night);
  const handleKey=(k)=>{
    if(k==="del"){setPin(p=>p.slice(0,-1));return;}
    if(pin.length>=4)return;
    const next=pin+k;
    setPin(next);
    if(next.length===4){
      setTimeout(()=>{
        if(pins[name]&&pins[name]===next){onSuccess(name);}
        else{setError(true);setShakeKey(s=>s+1);setTimeout(()=>{setPin("");setError(false);},800);}
      },200);
    }
  };
  return(
    <div style={{minHeight:"100vh",background:S.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",fontFamily:"'Tajawal',sans-serif"}}>
      <button onClick={onBack} style={{position:"absolute",top:20,right:20,background:"none",border:"none",color:S.muted,fontSize:14,cursor:"pointer",fontFamily:"Tajawal"}}>← رجوع</button>
      <div style={{fontSize:50,marginBottom:8}}>👤</div>
      <div style={{fontSize:22,fontWeight:800,color:S.text,marginBottom:4}}>{name}</div>
      <div style={{fontSize:13,color:S.muted,marginBottom:24}}>أدخل الرقم السري</div>
      <div key={shakeKey} className={error?"shake":""} style={{display:"flex",gap:16,marginBottom:8}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:16,height:16,borderRadius:"50%",transition:"all 0.2s",
            background:i<pin.length?(error?"#ef4444":"#38bdf8"):S.card,
            border:`2px solid ${i<pin.length?(error?"#ef4444":"#38bdf8"):S.border}`}}/>
        ))}
      </div>
      {error?<div style={{fontSize:12,color:"#ef4444",marginBottom:16,height:20}}>رقم سري خاطئ</div>:<div style={{height:28}}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:280,marginTop:8}}>
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=>(
          k===""?<div key={i}/>:
          <button key={i} className="btn" onClick={()=>handleKey(k)}
            style={{background:k==="del"?S.bg:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:"18px 0",fontSize:k==="del"?18:22,fontWeight:700,color:k==="del"?S.muted:S.text,cursor:"pointer",fontFamily:"Tajawal"}}>
            {k==="del"?"⌫":k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Select User ───────────────────────────────────────────────────────────
function SelectUser({onSelect,night}){
  const S=getTheme(night);
  return(
    <div style={{minHeight:"100vh",background:S.bg,fontFamily:"'Tajawal',sans-serif"}} className="slide-up" dir="rtl">
      <div style={{background:S.header,padding:"40px 20px 30px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div style={{fontSize:40}}>🤍</div>
        <div style={{fontSize:24,fontWeight:900,color:"#fff"}}>بار</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>اختر اسمك للدخول</div>
      </div>
      <div style={{padding:16}}>
        {FAMILY_MEMBERS.map(name=>(
          <button key={name} className="btn" onClick={()=>onSelect(name)}
            style={{width:"100%",background:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:16,marginBottom:10,display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:S.text,fontFamily:"Tajawal"}}>
            <span style={{fontSize:22,width:40,height:40,background:S.bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>👤</span>
            <span style={{flex:1,fontSize:16,fontWeight:700,textAlign:"right"}}>{name}</span>
            <span style={{color:S.muted,fontSize:16}}>←</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PIN Setup ─────────────────────────────────────────────────────────────
function PinSetup({pins,onSave,night}){
  const [editing,setEditing]=useState(null);
  const [newPin,setNewPin]=useState("");
  const S=getTheme(night);
  const handleDigit=(k)=>{
    if(k==="del"){setNewPin(p=>p.slice(0,-1));return;}
    if(newPin.length>=4)return;
    setNewPin(p=>p+k);
  };
  const savePin=()=>{
    if(newPin.length!==4)return;
    onSave({...pins,[editing]:newPin});
    setEditing(null);setNewPin("");
  };
  return(
    <div dir="rtl">
      <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:10,letterSpacing:0.5}}>🔐 إدارة الأرقام السرية</div>
      <div style={{background:"#1e3a5f",borderRadius:12,padding:"12px 14px",marginBottom:16,border:"1px solid #0ea5e9"}}>
        <div style={{fontSize:12,color:"#7dd3fc"}}>أنت المسؤول عن تعيين رقم سري لكل شخص وإرساله له</div>
      </div>
      {FAMILY_MEMBERS.map(name=>(
        <div key={name} style={{background:S.card,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${S.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>👤</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:S.text}}>{name}</div>
              <div style={{fontSize:11,color:S.muted,marginTop:2}}>{pins[name]?"●●●●":"لم يُعيَّن بعد"}</div>
            </div>
          </div>
          <button className="btn" onClick={()=>{setEditing(name);setNewPin("");}}
            style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}}>
            {pins[name]?"تغيير":"تعيين"}
          </button>
        </div>
      ))}
      {editing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} className="fade-in">
          <div style={{background:S.card,borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480,border:`1px solid ${S.border}`,borderBottom:"none"}} className="slide-up">
            <div style={{fontSize:18,fontWeight:800,textAlign:"center",marginBottom:16,color:S.text}}>رقم سري لـ {editing}</div>
            <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:16}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:16,height:16,borderRadius:"50%",transition:"all 0.2s",background:i<newPin.length?"#38bdf8":S.bg,border:`2px solid ${i<newPin.length?"#38bdf8":S.border}`}}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:280,margin:"0 auto"}}>
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=>(
                k===""?<div key={i}/>:
                <button key={i} className="btn" onClick={()=>handleDigit(k)}
                  style={{background:k==="del"?S.bg:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:"16px 0",fontSize:k==="del"?16:20,fontWeight:700,color:k==="del"?S.muted:S.text,cursor:"pointer",fontFamily:"Tajawal"}}>
                  {k==="del"?"⌫":k}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button className="btn" onClick={savePin} disabled={newPin.length!==4}
                style={{flex:1,background:newPin.length===4?"#0ea5e9":"#334155",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}}>حفظ</button>
              <button onClick={()=>{setEditing(null);setNewPin("");}}
                style={{flex:1,background:"#334155",color:S.muted,border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"Tajawal",cursor:"pointer"}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function FatherCare(){
  const [screen,setScreen]=useState("select");
  const [activeUser,setActiveUser]=useState(null);
  const [pins,setPins]=useState({});
  const [tab,setTab]=useState("today");
  const [schedule,setSchedule]=useState([...DEFAULT_SCHEDULE]);
  const [logs,setLogs]=useState({});
  const [notes,setNotes]=useState([]);
  const [vitals,setVitals]=useState({});
  const [loading,setLoading]=useState(true);
  const [showDoneModal,setShowDoneModal]=useState(null);
  const [showAddModal,setShowAddModal]=useState(false);
  const [showNotesModal,setShowNotesModal]=useState(false);
  const [showVitalsModal,setShowVitalsModal]=useState(false);
  const [showHistoryModal,setShowHistoryModal]=useState(false);
  const [historyDate,setHistoryDate]=useState("");
  const [historyLogs,setHistoryLogs]=useState(null);
  const [historyNotes,setHistoryNotes]=useState(null);
  const [historyVitals,setHistoryVitals]=useState(null);
  const [addForm,setAddForm]=useState({name:"",dose:"",time:"08:00",type:"medication",icon:"💊",meal:"الفطور"});
  const [noteText,setNoteText]=useState("");
  const [vitalForm,setVitalForm]=useState({bp_sys:"",bp_dia:"",sugar:"",period:"صباح"});
  const [savingId,setSavingId]=useState(null);
  const [notification,setNotification]=useState(null);
  const [pdfLoading,setPdfLoading]=useState(false);
  const [night,setNight]=useState(isNightMode());
  const today=getToday();
  const S=getTheme(night);
  const lateCheckRef=useRef(null);

  useEffect(()=>{
    const t=setInterval(()=>setNight(isNightMode()),60000);
    return()=>clearInterval(t);
  },[]);

  // Restore session
  useEffect(()=>{
    const saved=localStorage.getItem("barr_session");
    if(saved){
      try{
        const {user}=JSON.parse(saved);
        if(FAMILY_MEMBERS.includes(user)){setActiveUser(user);setScreen("app");}
      }catch(e){}
    }
  },[]);

  useEffect(()=>{loadData();},[]);

  const loadData=async()=>{
    try{
      const [sched,logs_,notes_,pins_,vitals_]=await Promise.all([
        fbGet("schedule"),fbGet(`logs_${today}`),fbGet(`notes_${today}`),fbGet("pins"),fbGet(`vitals_${today}`)
      ]);
      if(sched)setSchedule(JSON.parse(sched));
      if(logs_)setLogs(JSON.parse(logs_));
      if(notes_)setNotes(JSON.parse(notes_));
      if(pins_)setPins(JSON.parse(pins_));
      if(vitals_)setVitals(JSON.parse(vitals_));
    }catch(e){}
    setLoading(false);
  };

  useEffect(()=>{
    if(loading)return;
    const u1=onSnapshot(doc(db,"barr",`logs_${today}`),(s)=>{if(s.exists())setLogs(JSON.parse(s.data().value));});
    const u2=onSnapshot(doc(db,"barr",`notes_${today}`),(s)=>{if(s.exists())setNotes(JSON.parse(s.data().value));});
    const u3=onSnapshot(doc(db,"barr",`vitals_${today}`),(s)=>{if(s.exists())setVitals(JSON.parse(s.data().value));});
    return()=>{u1();u2();u3();};
  },[loading]);

  // Late medication check
  useEffect(()=>{
    if(!activeUser)return;
    lateCheckRef.current=setInterval(()=>{
      const now=new Date();
      const nowMins=now.getHours()*60+now.getMinutes();
      schedule.forEach(item=>{
        if(logs[item.id])return;
        const [h,m]=item.time.split(":").map(Number);
        const itemMins=h*60+m;
        if(nowMins-itemMins>=60&&nowMins-itemMins<70){
          sendNotifToAll(`⚠️ بار — تأخر`,`لم يُعطَ ${item.name} للوالد منذ أكثر من ساعة`);
        }
      });
    },600000);
    return()=>clearInterval(lateCheckRef.current);
  },[activeUser,schedule,logs]);

  const savePins=async(p)=>{setPins(p);await fbSet("pins",JSON.stringify(p));showNotif("✅ تم حفظ الرقم السري");};
  const saveSchedule=async(s)=>{setSchedule(s);await fbSet("schedule",JSON.stringify(s));};

  const markDone=async(item)=>{
    setSavingId(item.id);
    const newLogs={...logs,[item.id]:{doneBy:activeUser,doneAt:getTime(),doneDate:today}};
    setLogs(newLogs);await fbSet(`logs_${today}`,JSON.stringify(newLogs));
    setSavingId(null);setShowDoneModal(null);
    showNotif(`✅ تم تسجيل ${item.name}`);
    sendNotifToAll(`✅ بار`,`قام ${activeUser} بإعطاء ${item.name} للوالد`);
  };

  const undoMark=async(itemId)=>{
    const newLogs={...logs};delete newLogs[itemId];
    setLogs(newLogs);await fbSet(`logs_${today}`,JSON.stringify(newLogs));
    showNotif("↩️ تم التراجع");
  };

  const addItem=async()=>{
    if(!addForm.name||!addForm.time)return;
    const s=[...schedule,{...addForm,id:`c_${Date.now()}`}];
    await saveSchedule(s);
    setAddForm({name:"",dose:"",time:"08:00",type:"medication",icon:"💊",meal:"الفطور"});
    setShowAddModal(false);showNotif("✅ تم الإضافة");
  };

  const deleteItem=async(id)=>{await saveSchedule(schedule.filter(i=>i.id!==id));showNotif("🗑️ تم الحذف");};

  const addNote=async()=>{
    if(!noteText.trim())return;
    const n={id:Date.now(),text:noteText.trim(),by:activeUser,at:getTime(),date:today};
    const newNotes=[...notes,n];
    setNotes(newNotes);await fbSet(`notes_${today}`,JSON.stringify(newNotes));
    setNoteText("");setShowNotesModal(false);showNotif("📝 تمت إضافة الملاحظة");
  };

  const deleteNote=async(id)=>{
    const n=notes.filter(x=>x.id!==id);
    setNotes(n);await fbSet(`notes_${today}`,JSON.stringify(n));
    showNotif("🗑️ تم الحذف");
  };

  const saveVitals=async()=>{
    const key=`${vitalForm.period}_${Date.now()}`;
    const newVitals={...vitals,[key]:{...vitalForm,by:activeUser,at:getTime()}};
    setVitals(newVitals);await fbSet(`vitals_${today}`,JSON.stringify(newVitals));
    setVitalForm({bp_sys:"",bp_dia:"",sugar:"",period:"صباح"});
    setShowVitalsModal(false);showNotif("💉 تم حفظ القياسات");
  };

  // Load history for specific date
  const loadHistoryDate=async(date)=>{
    if(!date)return;
    setHistoryLogs(null);setHistoryNotes(null);setHistoryVitals(null);
    setShowHistoryModal(true);
    const [l,n,v]=await Promise.all([fbGet(`logs_${date}`),fbGet(`notes_${date}`),fbGet(`vitals_${date}`)]);
    setHistoryLogs(l?JSON.parse(l):{});
    setHistoryNotes(n?JSON.parse(n):[]);
    setHistoryVitals(v?JSON.parse(v):{});
  };

  // Generate & download weekly PDF
  const downloadWeeklyPDF=async()=>{
    setPdfLoading(true);
    showNotif("⏳ جاري إنشاء التقرير...");
    try{
      const weekDays=Array.from({length:7},(_,i)=>{
        const d=new Date();d.setDate(d.getDate()-i);
        return d.toISOString().split("T")[0];
      });
      const pdf=await generateWeeklyPDF(schedule,weekDays);
      const dateStr=new Date().toLocaleDateString("en-GB").replace(/\//g,"-");
      pdf.save(`bar-report-${dateStr}.pdf`);
      showNotif("✅ تم تحميل التقرير");
    }catch(e){showNotif("❌ حدث خطأ في إنشاء التقرير");}
    setPdfLoading(false);
  };

  const showNotif=(msg)=>{setNotification(msg);setTimeout(()=>setNotification(null),3000);};

  const handleSelectUser=(name)=>{
    if(!pins[name]){
      if(name===ADMIN){setActiveUser(name);setScreen("app");localStorage.setItem("barr_session",JSON.stringify({user:name}));requestNotifPermission();}
      else showNotif("⚠️ لم يُعيَّن رقم سري لهذا الشخص بعد");
      return;
    }
    setActiveUser(name);setScreen("pin");
  };

  const handlePinSuccess=(name)=>{
    setActiveUser(name);setScreen("app");
    localStorage.setItem("barr_session",JSON.stringify({user:name}));
    requestNotifPermission();
  };

  const logout=()=>{setScreen("select");setActiveUser(null);setTab("today");localStorage.removeItem("barr_session");};

  const todayItems=[...schedule].sort((a,b)=>a.time.localeCompare(b.time));
  const doneCount=todayItems.filter(i=>logs[i.id]).length;
  const meals=["الفطور","الغداء","العشاء"];
  const pastDays=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-i-1);
    return d.toISOString().split("T")[0];
  });

  if(loading)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:S.bg,fontFamily:"Tajawal",color:S.muted,gap:12}}><div style={{fontSize:40}}>⏳</div><p>جاري التحميل...</p></div>);
  if(screen==="select")return(<div style={{background:S.bg}}><style>{getCSS(night)}</style><SelectUser onSelect={handleSelectUser} night={night}/>{notification&&<div style={NS.notif} className="slide-up">{notification}</div>}</div>);
  if(screen==="pin")return(<div style={{background:S.bg}}><style>{getCSS(night)}</style><PinScreen name={activeUser} pins={pins} onSuccess={handlePinSuccess} onBack={()=>{setScreen("select");setActiveUser(null);}} night={night}/></div>);

  return(
    <div style={{fontFamily:"'Tajawal',sans-serif",background:S.bg,minHeight:"100vh",color:S.text,maxWidth:480,margin:"0 auto",position:"relative"}} dir="rtl">
      <style>{getCSS(night)}</style>

      {/* Header */}
      <div style={{background:S.header,padding:"20px 20px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>بار 🤍</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>{formatDate()}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="btn" onClick={()=>{setLoading(true);loadData();}} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,width:36,height:36,fontSize:16,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>🔄</button>
            <button className="btn" onClick={()=>setNight(n=>!n)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,width:36,height:36,fontSize:16,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{night?"☀️":"🌙"}</button>
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="50" height="50" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="#38bdf8" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*22}`}
                  strokeDashoffset={`${2*Math.PI*22*(1-doneCount/Math.max(todayItems.length,1))}`}
                  strokeLinecap="round" transform="rotate(-90 28 28)" style={{transition:"stroke-dashoffset 0.5s ease"}}/>
              </svg>
              <div style={{position:"absolute",fontSize:11,fontWeight:700,color:"#38bdf8"}}>{doneCount}/{todayItems.length}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(56,189,248,0.2)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:20,padding:"4px 12px",fontSize:13,color:"#7dd3fc"}}>
            <span>👤</span><span>{activeUser}</span><span style={{fontSize:10,color:"#4ade80"}}>🔒</span>
          </div>
          <button onClick={logout} style={{marginRight:"auto",background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"3px 10px",fontSize:11,color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"Tajawal"}}>خروج</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:S.tabBg,borderBottom:`1px solid ${S.tabBorder}`,padding:"0 4px",overflowX:"auto"}}>
        {[["today","اليوم"],["vitals","قياسات"],["history","السجل"],["notes","ملاحظات"],["schedule","الجدول"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",color:tab===k?"#38bdf8":S.muted,fontSize:13,fontFamily:"Tajawal",cursor:"pointer",fontWeight:tab===k?700:500,borderBottom:tab===k?"2px solid #38bdf8":"2px solid transparent",whiteSpace:"nowrap",minWidth:60}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:16,overflowY:"auto",maxHeight:"calc(100vh - 180px)"}}>

        {/* TODAY */}
        {tab==="today"&&<div className="slide-up">
          {meals.map(meal=>{
            const items=todayItems.filter(i=>i.meal===meal);
            if(items.length===0)return null;
            const doneMeal=items.filter(i=>logs[i.id]).length;
            const mealIcon=meal==="الفطور"?"🍳":meal==="الغداء"?"🍽️":"🥗";
            return(
              <div key={meal} style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:14,fontWeight:800,color:S.text}}>{mealIcon} {meal}</div>
                  <div style={{fontSize:11,color:doneMeal===items.length?"#4ade80":S.muted,fontWeight:600}}>{doneMeal}/{items.length}</div>
                </div>
                {items.map(item=>{
                  const done=logs[item.id];
                  const isLate=()=>{
                    if(done)return false;
                    const now=new Date();
                    const nowMins=now.getHours()*60+now.getMinutes();
                    const [h,m]=item.time.split(":").map(Number);
                    return nowMins-(h*60+m)>=60;
                  };
                  const late=isLate();
                  return(
                    <div key={item.id} className="card" style={{background:done?S.doneBg:S.card,borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${late?"#ef4444":done?S.doneBorder:S.border}`}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10,flex:1}}>
                        <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,background:item.type==="medication"?"#1e3a5f":"#14532d"}}>{item.icon}</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:S.text}}>{item.name}</div>
                          <div style={{fontSize:11,color:S.muted,marginTop:1}}>{item.dose||item.desc} • {formatTime12(item.time)}</div>
                          {done&&<div style={{fontSize:11,color:"#4ade80",marginTop:3,fontWeight:500}}>✅ {done.doneBy} — {done.doneAt}</div>}
                          {late&&!done&&<div style={{fontSize:11,color:"#ef4444",marginTop:3,fontWeight:600}}>⚠️ تأخر أكثر من ساعة</div>}
                        </div>
                      </div>
                      <div style={{flexShrink:0,marginRight:6}}>
                        {!done
                          ?<button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontSize:13,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowDoneModal(item)} disabled={savingId===item.id}>{savingId===item.id?"⏳":"تم"}</button>
                          :<button className="btn" style={{background:S.card2,color:S.muted,border:`1px solid ${S.border}`,borderRadius:10,padding:"7px 10px",fontSize:12,fontFamily:"Tajawal",cursor:"pointer"}} onClick={()=>undoMark(item.id)}>تراجع</button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {doneCount===todayItems.length&&todayItems.length>0&&(
            <div style={{background:"linear-gradient(135deg,#14532d,#166534)",borderRadius:16,padding:20,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6,border:"1px solid #16a34a"}} className="slide-up">
              <div style={{fontSize:40}}>🎉</div>
              <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>اكتمل جدول اليوم!</div>
              <div style={{opacity:0.8,fontSize:13,color:"#fff"}}>جزاكم الله خيراً على رعاية الوالد</div>
            </div>
          )}
        </div>}

        {/* VITALS */}
        {tab==="vitals"&&<div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:0.5}}>قياسات اليوم</div>
            <button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowVitalsModal(true)}>+ تسجيل</button>
          </div>
          {Object.keys(vitals).length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:S.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><div style={{fontSize:40}}>💉</div><p>لا توجد قياسات بعد</p></div>}
          {Object.entries(vitals).sort(([,a],[,b])=>(a.at||"").localeCompare(b.at||"")).map(([key,v])=>(
            <div key={key} style={{background:S.card,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${S.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:S.text}}>🕐 {v.period} — {v.at}</div>
                <div style={{fontSize:11,color:"#38bdf8"}}>{v.by}</div>
              </div>
              <div style={{display:"flex",gap:12}}>
                {v.bp_sys&&v.bp_dia&&(
                  <div style={{background:S.bg,borderRadius:10,padding:"8px 14px",flex:1,textAlign:"center"}}>
                    <div style={{fontSize:11,color:S.muted,marginBottom:4}}>الضغط</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#f87171"}}>{v.bp_sys}/{v.bp_dia}</div>
                    <div style={{fontSize:10,color:S.muted}}>mmHg</div>
                  </div>
                )}
                {v.sugar&&(
                  <div style={{background:S.bg,borderRadius:10,padding:"8px 14px",flex:1,textAlign:"center"}}>
                    <div style={{fontSize:11,color:S.muted,marginBottom:4}}>السكر</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#fbbf24"}}>{v.sugar}</div>
                    <div style={{fontSize:10,color:S.muted}}>mg/dL</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>}

        {/* HISTORY */}
        {tab==="history"&&<div className="slide-up">

          {/* Today's log */}
          <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:10,letterSpacing:0.5}}>سجل اليوم</div>
          {Object.keys(logs).length===0&&<div style={{textAlign:"center",padding:"24px 20px",color:S.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:16}}><div style={{fontSize:36}}>📭</div><p>لا يوجد سجل لهذا اليوم بعد</p></div>}
          {schedule.filter(i=>logs[i.id]).map(item=>{
            const log=logs[item.id];
            return(
              <div key={item.id} style={{background:S.card,borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:`1px solid ${S.border}`}}>
                <span style={{fontSize:22,width:36,textAlign:"center"}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:S.text}}>{item.name}</div>
                  <div style={{fontSize:11,color:S.muted,marginTop:2}}>قام بها: <span style={{color:"#38bdf8"}}>{log.doneBy}</span></div>
                </div>
                <div style={{fontSize:12,color:"#38bdf8",fontWeight:700}}>{log.doneAt}</div>
              </div>
            );
          })}

          {/* Divider */}
          <div style={{height:1,background:S.border,margin:"16px 0"}}/>

          {/* Search by date */}
          <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:10,letterSpacing:0.5}}>🔍 سجل يوم سابق</div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input type="date" value={historyDate} onChange={e=>setHistoryDate(e.target.value)} max={today}
              style={{flex:1,background:S.card,border:`1px solid ${S.border}`,borderRadius:10,padding:"8px 12px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none"}}/>
            <button className="btn" onClick={()=>loadHistoryDate(historyDate)} disabled={!historyDate}
              style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:13,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}}>عرض</button>
          </div>

          {/* Weekly PDF */}
          <button className="btn" onClick={downloadWeeklyPDF} disabled={pdfLoading}
              style={{width:"100%",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",borderRadius:14,padding:"12px 16px",fontSize:14,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {pdfLoading?"⏳ جاري الإنشاء...":"📄 تحميل التقرير الأسبوعي PDF"}
            </button>
        </div>}

        {/* NOTES */}
        {tab==="notes"&&<div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:0.5}}>ملاحظات اليوم</div>
            <button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowNotesModal(true)}>+ إضافة</button>
          </div>
          {notes.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:S.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><div style={{fontSize:40}}>📝</div><p>لا توجد ملاحظات بعد</p></div>}
          {notes.map(note=>(
            <div key={note.id} style={{background:S.card,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${S.border}`}}>
              <div style={{fontSize:14,lineHeight:1.7,color:S.text,marginBottom:8}}>{note.text}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:11,color:"#38bdf8",fontWeight:600}}>✍️ {note.by} — {note.at}</div>
                {(activeUser===note.by||activeUser===ADMIN)&&(
                  <button onClick={()=>deleteNote(note.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:S.muted}}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>}

        {/* SCHEDULE */}
        {tab==="schedule"&&<div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:0.5}}>إدارة الجدول</div>
            {activeUser===ADMIN&&<button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Tajawal",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowAddModal(true)}>+ إضافة</button>}
          </div>
          {meals.map(meal=>(
            <div key={meal} style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:8}}>{meal==="الفطور"?"🍳":meal==="الغداء"?"🍽️":"🥗"} {meal}</div>
              {schedule.filter(i=>i.meal===meal).map(item=>(
                <div key={item.id} style={{background:S.card,borderRadius:12,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,border:`1px solid ${S.border}`}}>
                  <span style={{fontSize:18}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:S.text}}>{item.name}</div>
                    <div style={{fontSize:11,color:S.muted,marginTop:1}}>{item.dose||item.desc} • {formatTime12(item.time)}</div>
                  </div>
                  {activeUser===ADMIN&&item.id.startsWith("c_")&&(
                    <button onClick={()=>deleteItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {activeUser===ADMIN&&<div style={{marginTop:16}}><PinSetup pins={pins} onSave={savePins} night={night}/></div>}
        </div>}
      </div>

      {/* History Modal */}
      {showHistoryModal&&(
        <div style={NS.overlay} className="fade-in" onClick={()=>setShowHistoryModal(false)}>
          <div style={{...NS.modal,background:S.card,border:`1px solid ${S.border}`}} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:800,textAlign:"center",marginBottom:16,color:S.text}}>{formatDateAr(historyDate)}</div>
            {historyLogs===null&&<div style={{textAlign:"center",color:S.muted,padding:20}}>⏳ جاري التحميل...</div>}
            {historyLogs&&Object.keys(historyLogs).length===0&&<div style={{textAlign:"center",color:S.muted,padding:20}}>لا يوجد سجل لهذا اليوم</div>}
            {historyLogs&&schedule.filter(i=>historyLogs[i.id]).map(item=>{
              const log=historyLogs[item.id];
              return(
                <div key={item.id} style={{background:S.bg,borderRadius:12,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:S.text}}>{item.name}</div>
                    <div style={{fontSize:11,color:S.muted}}>قام بها: <span style={{color:"#38bdf8"}}>{log.doneBy}</span></div>
                  </div>
                  <div style={{fontSize:12,color:"#38bdf8",fontWeight:700}}>{log.doneAt}</div>
                </div>
              );
            })}
            {historyVitals&&Object.keys(historyVitals).length>0&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:8}}>💉 القياسات</div>
                {Object.values(historyVitals).map((v,i)=>(
                  <div key={i} style={{background:S.bg,borderRadius:10,padding:"8px 12px",marginBottom:6,fontSize:12,color:S.text}}>
                    {v.period}: {v.bp_sys&&v.bp_dia?`ضغط ${v.bp_sys}/${v.bp_dia}`:""} {v.sugar?`سكر ${v.sugar}`:""} — {v.by}
                  </div>
                ))}
              </div>
            )}
            {historyNotes&&historyNotes.length>0&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,fontWeight:700,color:S.muted,marginBottom:8}}>📝 الملاحظات</div>
                {historyNotes.map((n,i)=>(
                  <div key={i} style={{background:S.bg,borderRadius:10,padding:"8px 12px",marginBottom:6,fontSize:12,color:S.text}}>{n.text} — <span style={{color:"#38bdf8"}}>{n.by}</span></div>
                ))}
              </div>
            )}
            <button onClick={()=>setShowHistoryModal(false)} style={{width:"100%",background:"#334155",color:S.muted,border:"none",borderRadius:12,padding:"12px 0",fontSize:14,fontFamily:"Tajawal",cursor:"pointer",marginTop:12}}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Done Modal */}
      {showDoneModal&&(
        <div style={NS.overlay} className="fade-in" onClick={()=>setShowDoneModal(null)}>
          <div style={{...NS.modal,background:S.card,border:`1px solid ${S.border}`}} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,textAlign:"center"}}>{showDoneModal.icon}</div>
            <div style={{fontSize:18,fontWeight:800,textAlign:"center",marginBottom:6,marginTop:8,color:S.text}}>تأكيد التسجيل</div>
            <div style={{fontSize:14,color:S.muted,textAlign:"center",marginBottom:4}}>هل قمت بإعطاء <span style={{color:"#38bdf8",fontWeight:700}}>{showDoneModal.name}</span>؟</div>
            <div style={{fontSize:12,color:S.subtext,textAlign:"center",marginBottom:20}}>الوقت: {getTime()} • بواسطة: {activeUser}</div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn" style={NS.btnConfirm} onClick={()=>markDone(showDoneModal)}>✅ نعم، تم</button>
              <button style={{...NS.btnCancel,background:S.card2,color:S.muted}} onClick={()=>setShowDoneModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal&&(
        <div style={NS.overlay} className="fade-in" onClick={()=>setShowAddModal(false)}>
          <div style={{...NS.modal,background:S.card,border:`1px solid ${S.border}`}} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,textAlign:"center",marginBottom:16,color:S.text}}>إضافة دواء أو وجبة</div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>النوع</label>
              <div style={{display:"flex",gap:8}}>
                {["medication","meal"].map(t=>(
                  <button key={t} onClick={()=>setAddForm({...addForm,type:t,icon:t==="medication"?"💊":"🍽️"})}
                    style={{flex:1,background:addForm.type===t?"#1e3a5f":S.bg,border:`1px solid ${addForm.type===t?"#0ea5e9":S.border}`,borderRadius:10,padding:"8px 0",color:addForm.type===t?"#38bdf8":S.muted,fontSize:13,fontFamily:"Tajawal",cursor:"pointer",fontWeight:addForm.type===t?700:400}}>
                    {t==="medication"?"💊 دواء":"🍽️ وجبة"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الوجبة</label>
              <div style={{display:"flex",gap:6}}>
                {meals.map(m=>(
                  <button key={m} onClick={()=>setAddForm({...addForm,meal:m})}
                    style={{flex:1,background:addForm.meal===m?"#1e3a5f":S.bg,border:`1px solid ${addForm.meal===m?"#0ea5e9":S.border}`,borderRadius:10,padding:"7px 0",color:addForm.meal===m?"#38bdf8":S.muted,fontSize:12,fontFamily:"Tajawal",cursor:"pointer"}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {[["name",addForm.type==="medication"?"اسم الدواء":"اسم الوجبة","مثال: دواء الضغط"],["dose",addForm.type==="medication"?"الجرعة":"الوصف","مثال: حبة واحدة"]].map(([f,l,p])=>(
              <div key={f} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>{l}</label>
                <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none"}} dir="rtl" placeholder={p} value={addForm[f]} onChange={e=>setAddForm({...addForm,[f]:e.target.value})}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الوقت</label>
              <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none"}} type="time" value={addForm.time} onChange={e=>setAddForm({...addForm,time:e.target.value})}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn" style={NS.btnConfirm} onClick={addItem}>✅ إضافة</button>
              <button style={{...NS.btnCancel,background:S.card2,color:S.muted}} onClick={()=>setShowAddModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal&&(
        <div style={NS.overlay} className="fade-in" onClick={()=>setShowNotesModal(false)}>
          <div style={{...NS.modal,background:S.card,border:`1px solid ${S.border}`}} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,textAlign:"center",marginBottom:16,color:S.text}}>📝 إضافة ملاحظة</div>
            <textarea style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none",height:120,resize:"none",lineHeight:1.7,marginBottom:14}} dir="rtl" placeholder="اكتب ملاحظتك هنا..." value={noteText} onChange={e=>setNoteText(e.target.value)}/>
            <div style={{display:"flex",gap:10}}>
              <button className="btn" style={NS.btnConfirm} onClick={addNote}>✅ حفظ</button>
              <button style={{...NS.btnCancel,background:S.card2,color:S.muted}} onClick={()=>setShowNotesModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {showVitalsModal&&(
        <div style={NS.overlay} className="fade-in" onClick={()=>setShowVitalsModal(false)}>
          <div style={{...NS.modal,background:S.card,border:`1px solid ${S.border}`}} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,textAlign:"center",marginBottom:16,color:S.text}}>💉 تسجيل القياسات</div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الفترة</label>
              <div style={{display:"flex",gap:8}}>
                {["صباح","مساء"].map(p=>(
                  <button key={p} onClick={()=>setVitalForm({...vitalForm,period:p})}
                    style={{flex:1,background:vitalForm.period===p?"#1e3a5f":S.bg,border:`1px solid ${vitalForm.period===p?"#0ea5e9":S.border}`,borderRadius:10,padding:"8px 0",color:vitalForm.period===p?"#38bdf8":S.muted,fontSize:14,fontFamily:"Tajawal",cursor:"pointer",fontWeight:vitalForm.period===p?700:400}}>
                    {p==="صباح"?"🌅 صباح":"🌙 مساء"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الضغط (mmHg)</label>
              <div style={{display:"flex",gap:8}}>
                <input style={{flex:1,background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 12px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none",textAlign:"center"}} placeholder="الانقباضي" type="number" value={vitalForm.bp_sys} onChange={e=>setVitalForm({...vitalForm,bp_sys:e.target.value})}/>
                <span style={{color:S.muted,display:"flex",alignItems:"center",fontWeight:700}}>/</span>
                <input style={{flex:1,background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 12px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none",textAlign:"center"}} placeholder="الانبساطي" type="number" value={vitalForm.bp_dia} onChange={e=>setVitalForm({...vitalForm,bp_dia:e.target.value})}/>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>السكر (mg/dL)</label>
              <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Tajawal",outline:"none",textAlign:"center"}} placeholder="مثال: 120" type="number" value={vitalForm.sugar} onChange={e=>setVitalForm({...vitalForm,sugar:e.target.value})}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn" style={NS.btnConfirm} onClick={saveVitals}>✅ حفظ</button>
              <button style={{...NS.btnCancel,background:S.card2,color:S.muted}} onClick={()=>setShowVitalsModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {notification&&<div style={NS.notif} className="slide-up">{notification}</div>}
    </div>
  );
}

const NS={
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200},
  modal:{borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480,borderBottom:"none",maxHeight:"90vh",overflowY:"auto"},
  btnConfirm:{flex:1,background:"#0ea5e9",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"'Tajawal',sans-serif",fontWeight:700,cursor:"pointer"},
  btnCancel:{flex:1,border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"'Tajawal',sans-serif",cursor:"pointer"},
  notif:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:"10px 24px",fontSize:14,fontWeight:600,color:"#f1f5f9",zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",whiteSpace:"nowrap"},
};
