import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CONTINUITY_REQUIREMENTS,
  DEMO_CONTINUITY_TASK,
  ensureDemoTask,
  evaluateContinuity,
  normalizeFamilyName,
  normalizeContinuity,
  repairContinuityRequirement,
} from "./continuityEngine.js";
import {
  DEFAULT_EMERGENCY_CONTACT,
  DEFAULT_HEALTH_CARD,
  createDialUri,
  normalizeEmergencyContact,
  normalizeHealthCard,
} from "./healthSafety.js";
import {
  EmergencyCallModal,
  EmergencyContactModal,
  EmergencyView,
  HealthCardModal,
  HealthCardView,
} from "./HealthAndEmergency.jsx";

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
let messaging = null;
try { messaging = getMessaging(firebaseApp); } catch(e) {}

const FCM_VAPID_KEY = "BLBz-placeholder-will-work-without-vapid";

const fbGet = async (key) => {
  try { const s = await getDoc(doc(db,"barr",key)); return s.exists()?s.data().value:null; }
  catch(e){return null;}
};
const fbSet = async (key,value) => {
  try { await setDoc(doc(db,"barr",key),{value}); return true; }
  catch(e){ console.error(`Firebase save failed for ${key}`,e); return false; }
};

// ── Constants ─────────────────────────────────────────────────────────────
const FAMILY_MEMBERS = ["مفلح","مضحي","ممدوح","محمد","عبدالله","ماجد","مدعث"];
const FAMILY_RELATIONSHIPS = {
  مفلح:"الابن الأكبر",
  مضحي:"ابن",
  ممدوح:"ابن",
  محمد:"ابن",
  عبدالله:"ابن",
  ماجد:"الحفيد الأكبر",
  مدعث:"حفيد",
};
const ADMIN = "ممدوح";
const ADMIN_EMAIL = "mamdooh.f16@gmail.com";

// ── Helpers ───────────────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];
const getTime  = () => new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit",hour12:true});
const formatDate = () => new Date().toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const formatDateAr = (iso) => new Date(iso).toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const formatTime12 = (t) => {
  const [h,m] = t.split(":").map(Number);
  return `${h%12===0?12:h%12}:${String(m).padStart(2,"0")} ${h>=12?"م":"ص"}`;
};
const continuityStatusLabel = (status) => status==="PASS"?"مكتملة":"غير مكتملة";
const formatArabicNumber = (value) => Number(value).toLocaleString("ar-SA");
const migratePins = (savedPins = {}) => {
  const migrated = {...savedPins};
  if(migrated["صاهود"]&&!migrated["مفلح"])migrated["مفلح"]=migrated["صاهود"];
  delete migrated["صاهود"];
  return migrated;
};
const migrateLogs = (savedLogs = {}) => Object.fromEntries(Object.entries(savedLogs).map(([id,log])=>[id,{...log,doneBy:normalizeFamilyName(log.doneBy)}]));
const migrateNotes = (savedNotes = []) => savedNotes.map(note=>({...note,by:normalizeFamilyName(note.by)}));
const migrateVitals = (savedVitals = {}) => Object.fromEntries(Object.entries(savedVitals).map(([id,vital])=>[id,{...vital,by:normalizeFamilyName(vital.by)}]));

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
const FCM_SERVER = "https://barr-gamma.vercel.app/api/notify";

const registerFCM = async (userName) => {
  try {
    if(!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if(permission !== "granted") return;
    if(!messaging) return;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    });

    if(token && userName) {
      // Save token to Firebase under user name
      const tokensData = await fbGet("fcm_tokens");
      const tokens = tokensData ? JSON.parse(tokensData) : {};
      tokens[userName] = token;
      await fbSet("fcm_tokens", JSON.stringify(tokens));
    }
  } catch(e){ console.log("FCM error:", e); }
};

const requestNotifPermission = async (userName) => {
  await registerFCM(userName);
};

const sendNotifToAll = async (title, body) => {
  try {
    await fetch(FCM_SERVER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body })
    });
  } catch(e) {}
};
// OneSignal replaced by FCM

// ── PDF Report Generator ──────────────────────────────────────────────────
const toEn = (str) => {
  // Strip non-ASCII for PDF safety, keep English chars and numbers
  return (str||"").replace(/[^ -]/g, "").trim() || "-";
};

const mealEn = (meal) => meal==="الفطور"?"Breakfast":meal==="الغداء"?"Lunch":meal==="العشاء"?"Dinner":meal||"";

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

    const doneItems = schedule.filter(i => logs[i.id]);
    const rows = schedule.map(item => {
      const log = logs[item.id];
      const dose = toEn(item.dose || item.desc || "");
      const status = log ? `Done: ${toEn(log.doneBy)} ${log.doneAt||""}` : "Not done";
      return [item.name, dose, mealEn(item.meal), status];
    });

    autoTable(pdf, {
      startY: y,
      head: [["Medication / Meal", "Dose / Notes", "Period", "Status"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor:[30,58,95], textColor:255, fontSize:9 },
      bodyStyles: { fontSize:8, textColor:[30,30,30] },
      columnStyles: { 3: { cellWidth: 48 } },
      didParseCell: (data) => {
        if(data.section==="body" && data.column.index===3){
          if(data.cell.raw.startsWith("Done")) data.cell.styles.textColor = [21,128,61];
          else data.cell.styles.textColor = [220,38,38];
        }
      },
      margin:{left:10,right:10},
    });
    y = pdf.lastAutoTable.finalY + 4;

    // Vitals
    const vitalEntries = Object.values(vitals);
    if(vitalEntries.length > 0){
      vitalEntries.forEach(v => {
        if(y > 270){ pdf.addPage(); y = 20; }
        pdf.setFontSize(8);
        pdf.setTextColor(100,100,100);
        pdf.setFont(undefined,"normal");
        const period = v.period==="صباح"?"Morning":"Evening";
        let vStr = `Vitals (${period}): `;
        if(v.bp_sys && v.bp_dia) vStr += `BP: ${v.bp_sys}/${v.bp_dia} mmHg  `;
        if(v.sugar) vStr += `Sugar: ${v.sugar} mg/dL  `;
        vStr += `| By: ${toEn(v.by)}`;
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
        const noteText = toEn(n.text).substring(0,90) || "(Arabic note)";
        pdf.text(`Note by ${toEn(n.by)} (${n.at||""}): ${noteText}`, 12, y);
        y += 5;
      });
    }

    // Compliance
    const total = schedule.length;
    const done = doneItems.length;
    const pct = total > 0 ? Math.round((done/total)*100) : 0;
    pdf.setFontSize(9);
    pdf.setTextColor(30,58,95);
    pdf.setFont(undefined,"bold");
    pdf.text(`Compliance: ${done}/${total} (${pct}%)`, 150, y);
    y += 10;

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
  *{box-sizing:border-box;margin:0;padding:0;font-family:"Thmanyah Extended",sans-serif!important;font-feature-settings:"salt" 1;}
  body{background:${night?"#0f172a":"#eee9e1"};}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px;}
  @keyframes slideUp{from{transform:translateY(30px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @keyframes proofPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.15);opacity:1}}
  .slide-up{animation:slideUp 0.35s ease;}
  .fade-in{animation:fadeIn 0.2s ease;}
  .shake{animation:shake 0.4s ease;}
  .proof-pulse{animation:proofPulse 0.8s ease-in-out infinite;}
  .btn:hover{filter:brightness(1.03);transform:translateY(-1px);}
  .btn{transition:all 0.2s ease;}
  .card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(24,49,83,.08);}
  .card{transition:transform 0.2s,box-shadow 0.2s;}
`;

// ── Theme ─────────────────────────────────────────────────────────────────
const getTheme=(night)=>night?{
  bg:"#0f172a",card:"#1e293b",card2:"#0f172a",header:"linear-gradient(135deg,#1e3a5f,#0f2744)",
  text:"#f1f5f9",muted:"#64748b",border:"#334155",subtext:"#94a3b8",
  tabBg:"#0f172a",tabBorder:"#1e293b",doneBg:"#0f2744",doneBorder:"#1e3a5f",
}:{
  bg:"#f8f4ed",card:"#fffdfa",card2:"#f3f7fb",header:"linear-gradient(155deg,#fffaf2 0%,#f5efe5 58%,#eaf4fb 100%)",
  text:"#12315a",muted:"#7b8da3",border:"#e6e0d7",subtext:"#62748a",
  tabBg:"rgba(255,253,250,.97)",tabBorder:"#e6e0d7",doneBg:"#f1faf5",doneBorder:"#c7ead4",
};

function NavIcon({name,active}){
  if(name==="continuity")return <img src="/barr-logo-mark.png" alt="" aria-hidden="true" style={{width:34,height:27,objectFit:"contain",opacity:active?1:.62,filter:active?"none":"grayscale(.25)"}}/>;
  const shared={width:25,height:25,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:active?2.35:2,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true};
  if(name==="today")return <svg {...shared}><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9 21v-6h6v6"/></svg>;
  if(name==="vitals")return <svg {...shared}><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M5 4.8A9 9 0 1 1 3.8 17" opacity=".45"/></svg>;
  if(name==="history")return <svg {...shared}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></svg>;
  if(name==="notes")return <svg {...shared}><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 16l5.5-5.5 2 2L10 18l-3 1z"/></svg>;
  return <svg {...shared}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg>;
}

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
    <div style={{minHeight:"100vh",background:S.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",fontFamily:"'Thmanyah Extended',sans-serif"}}>
      <button onClick={onBack} style={{position:"absolute",top:20,right:20,background:"none",border:"none",color:S.muted,fontSize:14,cursor:"pointer",fontFamily:"Thmanyah Extended"}}>← رجوع</button>
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
            style={{background:k==="del"?S.bg:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:"18px 0",fontSize:k==="del"?18:22,fontWeight:700,color:k==="del"?S.muted:S.text,cursor:"pointer",fontFamily:"Thmanyah Extended"}}>
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
    <div style={{minHeight:"100vh",background:S.bg,fontFamily:"'Thmanyah Extended',sans-serif"}} className="slide-up" dir="rtl">
      <div style={{background:S.header,padding:"40px 20px 30px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <img src="/barr-logo-mark.png" alt="شعار بار" style={{width:180,height:120,objectFit:"contain"}}/>
        <div style={{fontSize:12,color:night?"rgba(255,255,255,0.7)":S.muted,marginTop:6}}>اختر اسمك للدخول</div>
      </div>
      <div style={{padding:16}}>
        {FAMILY_MEMBERS.map(name=>(
          <button key={name} className="btn" onClick={()=>onSelect(name)}
            style={{width:"100%",background:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:16,marginBottom:10,display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:S.text,fontFamily:"Thmanyah Extended"}}>
            <span style={{fontSize:22,width:40,height:40,background:S.bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>👤</span>
            <span style={{flex:1,textAlign:"right"}}>
              <span style={{display:"block",fontSize:16,fontWeight:700}}>{name}</span>
              <span style={{display:"block",fontSize:11,color:S.muted,marginTop:2}}>{FAMILY_RELATIONSHIPS[name]}</span>
            </span>
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
            style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}}>
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
                  style={{background:k==="del"?S.bg:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:"16px 0",fontSize:k==="del"?16:20,fontWeight:700,color:k==="del"?S.muted:S.text,cursor:"pointer",fontFamily:"Thmanyah Extended"}}>
                  {k==="del"?"⌫":k}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button className="btn" onClick={savePin} disabled={newPin.length!==4}
                style={{flex:1,background:newPin.length===4?"#0ea5e9":"#334155",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}}>حفظ</button>
              <button onClick={()=>{setEditing(null);setNewPin("");}}
                style={{flex:1,background:"#334155",color:S.muted,border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"Thmanyah Extended",cursor:"pointer"}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Care Continuity Proof ─────────────────────────────────────────────────
function CareContinuity({tasks,onUpdate,night}){
  const S=getTheme(night);
  const danger={bg:night?"#450a0a":"#fff0ee",border:night?"#ef4444":"#f5c7c2",title:night?"#fca5a5":"#a33b32",text:night?"#fecaca":"#b85a51"};
  const success={bg:night?"#052e16":"#edf9f1",border:night?"#22c55e":"#b9dfc6",title:night?"#86efac":"#277a50",text:night?"#bbf7d0":"#478466"};
  const continuityTasks=tasks.filter(task=>task.continuity);
  const [selectedId,setSelectedId]=useState(DEMO_CONTINUITY_TASK.id);
  const [view,setView]=useState("overview");
  const [checking,setChecking]=useState(false);
  const selected=continuityTasks.find(task=>task.id===selectedId)||continuityTasks[0];
  const result=selected?evaluateContinuity(selected):null;
  const failing=continuityTasks.filter(task=>evaluateContinuity(task).status==="FAIL");
  const criticalFailing=failing.filter(task=>normalizeContinuity(task.continuity).importance==="critical");
  const tasksSummary=`${formatArabicNumber(continuityTasks.length)} ${continuityTasks.length===1?"مهمة خاضعة":"مهام خاضعة"} للفحص`;
  const risksSummary=`${formatArabicNumber(criticalFailing.length)} ${criticalFailing.length===1?"مهمة حرجة بها نقطة ضعف":"مهام حرجة بها نقاط ضعف"}`;

  const runCheck=()=>{
    setChecking(true);
    setView("check");
    setTimeout(()=>setChecking(false),850);
  };

  const repair=(key)=>{
    if(!selected)return;
    setChecking(true);
    onUpdate(repairContinuityRequirement(selected,key));
    setTimeout(()=>setChecking(false),850);
  };

  if(!selected)return <div style={{textAlign:"center",padding:36,color:S.muted}}>لا توجد مهام مهيأة لفحص الاستمرارية.</div>;

  if(view==="overview")return(
    <div className="slide-up">
      <div style={{background:night?"linear-gradient(135deg,#172554,#1e3a8a)":"linear-gradient(135deg,#f7fbff,#e8f3ff)",border:`1px solid ${night?"#3b82f6":"#cfe4f7"}`,borderRadius:22,padding:18,marginBottom:14,color:night?"#fff":S.text}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:night?"#93c5fd":"#3978b9",fontWeight:700,marginBottom:5}}><img src="/barr-logo-mark.png" alt="" aria-hidden="true" style={{width:27,height:20,objectFit:"contain"}}/> استمرارية الرعاية</div>
            <div style={{fontSize:21,fontWeight:900}}>{failing.length?"تحتاج انتباهًا":"الرعاية جاهزة للاستمرار"}</div>
            <div style={{fontSize:12,color:night?"#bfdbfe":S.subtext,marginTop:6,lineHeight:1.7}}>{tasksSummary} • {risksSummary}</div>
          </div>
          <div style={{background:failing.length?(night?"#7f1d1d":"#fbd8d4"):(night?"#14532d":"#dff2e6"),color:failing.length?(night?"#fff":"#a33b32"):(night?"#fff":"#277a50"),borderRadius:12,padding:"8px 10px",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>{failing.length?"تحتاج انتباهًا":"مكتملة"}</div>
        </div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:S.muted,margin:"0 2px 10px"}}>المهام ذات خطة استمرارية</div>
      {continuityTasks.map(task=>{
        const taskResult=evaluateContinuity(task);
        const c=normalizeContinuity(task.continuity);
        return(
          <button key={task.id} className="card" onClick={()=>{setSelectedId(task.id);setView("details");}}
            style={{width:"100%",textAlign:"right",background:taskResult.status==="FAIL"?danger.bg:S.card,border:`1px solid ${taskResult.status==="FAIL"?danger.border:S.border}`,borderRadius:18,padding:15,marginBottom:10,color:S.text,fontFamily:"Thmanyah Extended",cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:24}}>{task.icon||"🧩"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15}}>{task.name}</div>
                <div style={{fontSize:11,color:S.muted,marginTop:3}}>{formatTime12(task.time)} • {c.primary} ← {c.backup}</div>
                <div style={{fontSize:10,color:S.subtext,marginTop:2}}>{FAMILY_RELATIONSHIPS[c.primary]||"مقدم رعاية"} ← {FAMILY_RELATIONSHIPS[c.backup]||"مقدم رعاية"}</div>
              </div>
              <div style={{color:taskResult.status==="PASS"?success.title:danger.title,fontWeight:900,fontSize:12}}>{continuityStatusLabel(taskResult.status)}</div>
            </div>
            {taskResult.status==="FAIL"&&<div style={{fontSize:11,color:danger.text,marginTop:9}}>نقطة الضعف: {taskResult.missing[0].label}</div>}
          </button>
        );
      })}
    </div>
  );

  const c=normalizeContinuity(selected.continuity);
  return(
    <div className="slide-up">
      <button onClick={()=>setView("overview")} style={{background:"none",border:"none",color:night?"#38bdf8":"#3978b9",fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer",marginBottom:12}}>→ لوحة الاستمرارية</button>
      <div style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:18,padding:18,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div>
            <div style={{fontSize:19,fontWeight:900,color:S.text}}>{selected.name}</div>
            <div style={{fontSize:12,color:S.muted,marginTop:4}}>{formatTime12(selected.time)} • الأهمية: <span style={{color:c.importance==="critical"?"#ef4444":"#38bdf8",fontWeight:800}}>{c.importance==="critical"?"حرجة":"عادية"}</span></div>
          </div>
          <div style={{fontSize:25}}>{selected.icon||"🧩"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:15}}>
          <div style={{background:S.bg,borderRadius:12,padding:11}}><div style={{fontSize:10,color:S.muted}}>المسؤول الأساسي</div><div style={{fontSize:15,fontWeight:800,color:S.text,marginTop:3}}>{c.primary}</div><div style={{fontSize:10,color:S.subtext,marginTop:2}}>{FAMILY_RELATIONSHIPS[c.primary]||"مقدم رعاية"}</div></div>
          <div style={{background:S.bg,borderRadius:12,padding:11}}><div style={{fontSize:10,color:S.muted}}>البديل</div><div style={{fontSize:15,fontWeight:800,color:S.text,marginTop:3}}>{c.backup}</div><div style={{fontSize:10,color:S.subtext,marginTop:2}}>{FAMILY_RELATIONSHIPS[c.backup]||"مقدم رعاية"}</div></div>
        </div>
      </div>

      {view==="details"&&<>
        <div style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:15,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:800,color:S.text,marginBottom:10}}>جاهزية {c.backup}</div>
          {CONTINUITY_REQUIREMENTS.map(requirement=><div key={requirement.key} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${S.border}`,fontSize:13,color:S.text}}><span>{requirement.label}</span><span>{c.requirements[requirement.key]?"✅":"❌"}</span></div>)}
        </div>
        <div style={{background:result.status==="FAIL"?danger.bg:success.bg,border:`1px solid ${result.status==="FAIL"?danger.border:success.border}`,borderRadius:16,padding:14,marginBottom:12}}>
          <div style={{fontWeight:900,color:result.status==="FAIL"?danger.title:success.title}}>{result.status==="FAIL"?"⚠️ الاستمرارية غير مكتملة":"✅ تم التحقق من الاستمرارية"}</div>
          <div style={{fontSize:12,color:result.status==="FAIL"?danger.text:success.text,marginTop:5,lineHeight:1.7}}>{result.status==="FAIL"?"يوجد بديل، لكنه غير جاهز لتنفيذ المهمة بالكامل.":`إذا تعذر ${c.primary}، يستطيع ${c.backup} تنفيذ المهمة بالكامل.`}</div>
        </div>
        <button className="btn" onClick={runCheck} style={{...NS.btnConfirm,width:"100%",background:"#2563eb"}}>اختبر استمرارية المهمة</button>
      </>}

      {view==="check"&&<div>
        <div style={{textAlign:"center",background:S.card,border:`1px solid ${S.border}`,borderRadius:16,padding:18,marginBottom:12}}>
          <div style={{fontSize:12,color:S.muted}}>ماذا لو تعذر {c.primary}؟</div>
          <div style={{fontSize:16,fontWeight:800,color:danger.title,marginTop:6}}>{c.primary} • غير متاح ❌</div>
          <div style={{height:22,borderRight:"2px dashed #64748b",width:"50%"}}/>
          <div style={{fontSize:16,fontWeight:800,color:"#38bdf8"}}>الانتقال إلى {c.backup}</div>
        </div>
        {checking?<div style={{textAlign:"center",padding:35,color:"#38bdf8",fontWeight:800}}><div className="proof-pulse" style={{fontSize:34,marginBottom:8}}>🛡️</div>جاري فحص مسار التنفيذ...</div>:<>
          <div style={{background:result.status==="FAIL"?danger.bg:success.bg,border:`1px solid ${result.status==="FAIL"?danger.border:success.border}`,borderRadius:20,padding:20,textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:26,fontWeight:900,color:result.status==="FAIL"?danger.title:success.title}}>{result.status==="FAIL"?"❌ ستنقطع هذه المهمة":"✅ تم إثبات الاستمرارية"}</div>
            <div style={{fontSize:12,lineHeight:1.8,color:result.status==="FAIL"?danger.text:success.text,marginTop:8}}>{result.status==="FAIL"?`إذا تعذر ${c.primary}، لا يوجد مسار كامل لتنفيذ ${selected.name}.`:`${c.primary} ← ${c.backup} • جميع متطلبات التنفيذ مكتملة.`}</div>
          </div>
          {result.missing.map(requirement=><div key={requirement.key} style={{background:danger.bg,border:`1px solid ${danger.border}`,borderRadius:18,padding:16,marginBottom:10}}>
            <div style={{fontSize:11,color:danger.title,fontWeight:800}}>نقطة الضعف المكتشفة</div>
            <div style={{fontSize:17,fontWeight:900,color:S.text,marginTop:5}}>🔑 {requirement.label}</div>
            <div style={{fontSize:12,color:S.muted,lineHeight:1.7,margin:"7px 0 12px"}}>مسار {c.backup} غير مكتمل لأن هذا المتطلب غير مؤكد.</div>
            <button className="btn" onClick={()=>repair(requirement.key)} style={{...NS.btnConfirm,width:"100%",background:"#275d91"}}>{requirement.repairLabel}</button>
          </div>)}
          {result.status==="PASS"&&<button onClick={()=>setView("overview")} style={{...NS.btnConfirm,width:"100%",background:"#16a34a"}}>العودة إلى لوحة الاستمرارية</button>}
        </>}
      </div>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function FatherCare(){
  const [screen,setScreen]=useState("select");
  const [activeUser,setActiveUser]=useState(null);
  const [pins,setPins]=useState({});
  const [tab,setTab]=useState("today");
  const [schedule,setSchedule]=useState(()=>ensureDemoTask(DEFAULT_SCHEDULE));
  const [logs,setLogs]=useState({});
  const [notes,setNotes]=useState([]);
  const [vitals,setVitals]=useState({});
  const [healthCard,setHealthCard]=useState(()=>normalizeHealthCard(DEFAULT_HEALTH_CARD));
  const [emergencyContact,setEmergencyContact]=useState(()=>normalizeEmergencyContact(DEFAULT_EMERGENCY_CONTACT));
  const [loading,setLoading]=useState(true);
  const [showDoneModal,setShowDoneModal]=useState(null);
  const [showAddModal,setShowAddModal]=useState(false);
  const [showNotesModal,setShowNotesModal]=useState(false);
  const [showVitalsModal,setShowVitalsModal]=useState(false);
  const [showHealthCardModal,setShowHealthCardModal]=useState(false);
  const [showEmergencyContactModal,setShowEmergencyContactModal]=useState(false);
  const [pendingEmergencyCall,setPendingEmergencyCall]=useState(null);
  const [showHistoryModal,setShowHistoryModal]=useState(false);
  const [historyDate,setHistoryDate]=useState("");
  const [historyLogs,setHistoryLogs]=useState(null);
  const [historyNotes,setHistoryNotes]=useState(null);
  const [historyVitals,setHistoryVitals]=useState(null);
  const emptyAddForm={name:"",dose:"",time:"08:00",type:"medication",icon:"💊",meal:"الفطور",primary:"",backup:"",importance:"normal",requirements:Object.fromEntries(CONTINUITY_REQUIREMENTS.map(({key})=>[key,true]))};
  const [addForm,setAddForm]=useState(emptyAddForm);
  const [noteText,setNoteText]=useState("");
  const [vitalForm,setVitalForm]=useState({bp_sys:"",bp_dia:"",sugar:"",period:"صباح"});
  const [healthCardDraft,setHealthCardDraft]=useState(()=>normalizeHealthCard(DEFAULT_HEALTH_CARD));
  const [emergencyContactDraft,setEmergencyContactDraft]=useState(()=>normalizeEmergencyContact(DEFAULT_EMERGENCY_CONTACT));
  const [savingId,setSavingId]=useState(null);
  const [notification,setNotification]=useState(null);
  const [pdfLoading,setPdfLoading]=useState(false);
  const [night,setNight]=useState(false);
  const today=getToday();
  const S=getTheme(night);
  const lateCheckRef=useRef(null);

  // Restore session
  useEffect(()=>{
    const saved=localStorage.getItem("barr_session");
    if(saved){
      try{
        const user=normalizeFamilyName(JSON.parse(saved).user);
        if(FAMILY_MEMBERS.includes(user)){setActiveUser(user);setScreen("app");}
      }catch(e){}
    }
  },[]);

  useEffect(()=>{loadData();},[]);

  // FCM foreground messages
  useEffect(()=>{
    if(!messaging) return;
    const unsub = onMessage(messaging, (payload) => {
      const {title,body} = payload.notification || {};
      showNotif(`${title}: ${body}`);
    });
    return ()=>unsub();
  },[]);

  const loadData=async()=>{
    try{
      const [sched,logs_,notes_,pins_,vitals_,healthCard_,emergencyContact_]=await Promise.all([
        fbGet("schedule"),fbGet(`logs_${today}`),fbGet(`notes_${today}`),fbGet("pins"),fbGet(`vitals_${today}`),fbGet("health_card"),fbGet("emergency_contact")
      ]);
      if(sched)setSchedule(ensureDemoTask(JSON.parse(sched)));
      else setSchedule(current=>ensureDemoTask(current));
      if(logs_)setLogs(migrateLogs(JSON.parse(logs_)));
      if(notes_)setNotes(migrateNotes(JSON.parse(notes_)));
      if(pins_)setPins(migratePins(JSON.parse(pins_)));
      if(vitals_)setVitals(migrateVitals(JSON.parse(vitals_)));
      if(healthCard_)setHealthCard(normalizeHealthCard(JSON.parse(healthCard_)));
      if(emergencyContact_)setEmergencyContact(normalizeEmergencyContact(JSON.parse(emergencyContact_)));
    }catch(e){}
    setLoading(false);
  };

  useEffect(()=>{
    if(loading)return;
    const ignoreUnavailable=()=>{};
    const u1=onSnapshot(doc(db,"barr",`logs_${today}`),(s)=>{if(s.exists())setLogs(migrateLogs(JSON.parse(s.data().value)));},ignoreUnavailable);
    const u2=onSnapshot(doc(db,"barr",`notes_${today}`),(s)=>{if(s.exists())setNotes(migrateNotes(JSON.parse(s.data().value)));},ignoreUnavailable);
    const u3=onSnapshot(doc(db,"barr",`vitals_${today}`),(s)=>{if(s.exists())setVitals(migrateVitals(JSON.parse(s.data().value)));},ignoreUnavailable);
    const u4=onSnapshot(doc(db,"barr","health_card"),(s)=>{if(s.exists())setHealthCard(normalizeHealthCard(JSON.parse(s.data().value)));},ignoreUnavailable);
    const u5=onSnapshot(doc(db,"barr","emergency_contact"),(s)=>{if(s.exists())setEmergencyContact(normalizeEmergencyContact(JSON.parse(s.data().value)));},ignoreUnavailable);
    return()=>{u1();u2();u3();u4();u5();};
  },[loading]);

  // Late medication check
  useEffect(()=>{
    if(!activeUser)return;
    lateCheckRef.current=setInterval(()=>{
      const now=new Date();
      const nowMins=now.getHours()*60+now.getMinutes();
      schedule.filter(item=>!item.demoOnly).forEach(item=>{
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
  const saveSchedule=async(s)=>{
    const safeSchedule=ensureDemoTask(s);
    setSchedule(safeSchedule);
    await fbSet("schedule",JSON.stringify(safeSchedule.filter(item=>!item.demoOnly)));
  };

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
    const {primary,backup,importance,requirements,...taskFields}=addForm;
    if(Boolean(primary)!==Boolean(backup)){
      showNotif("⚠️ حدد المسؤول الأساسي والبديل معًا");
      return;
    }
    const continuity=primary&&backup?{primary,backup,importance,requirements}:undefined;
    const s=[...schedule,{...taskFields,continuity,id:`c_${Date.now()}`}];
    await saveSchedule(s);
    setAddForm(emptyAddForm);
    setShowAddModal(false);showNotif("✅ تم الإضافة");
  };

  const deleteItem=async(id)=>{await saveSchedule(schedule.filter(i=>i.id!==id));showNotif("🗑️ تم الحذف");};

  const updateContinuityTask=async(updatedTask)=>{
    const updatedSchedule=schedule.map(task=>task.id===updatedTask.id?updatedTask:task);
    if(updatedTask.demoOnly){
      setSchedule(updatedSchedule);
      return;
    }
    await saveSchedule(updatedSchedule);
  };

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

  const openHealthCardEditor=()=>{
    setHealthCardDraft(normalizeHealthCard(healthCard));
    setShowHealthCardModal(true);
  };

  const saveHealthCard=async()=>{
    const next=normalizeHealthCard({...healthCardDraft,fullName:healthCardDraft.fullName||"دعث",updatedBy:activeUser,updatedAt:getTime()});
    const saved=await fbSet("health_card",JSON.stringify(next));
    if(!saved){showNotif("❌ تعذر حفظ البطاقة، حاول مرة أخرى");return;}
    setHealthCard(next);
    setShowHealthCardModal(false);
    showNotif("✅ تم حفظ البطاقة الصحية");
  };

  const openEmergencyContactEditor=()=>{
    setEmergencyContactDraft(normalizeEmergencyContact(emergencyContact));
    setShowEmergencyContactModal(true);
  };

  const saveEmergencyContact=async()=>{
    const next=normalizeEmergencyContact({...emergencyContactDraft,updatedBy:activeUser,updatedAt:getTime()});
    if(!next.name||!createDialUri(next.phone)){
      showNotif("⚠️ أدخل اسمًا ورقم اتصال صحيحًا");
      return;
    }
    const saved=await fbSet("emergency_contact",JSON.stringify(next));
    if(!saved){showNotif("❌ تعذر حفظ الرقم، حاول مرة أخرى");return;}
    setEmergencyContact(next);
    setShowEmergencyContactModal(false);
    showNotif("✅ تم حفظ جهة اتصال الطوارئ");
  };

  const requestEmergencyCall=(contact)=>{
    const uri=createDialUri(contact.number);
    if(!uri){showNotif("⚠️ رقم الاتصال غير صالح");return;}
    setPendingEmergencyCall({...contact,uri});
  };

  const confirmEmergencyCall=()=>{
    if(!pendingEmergencyCall?.uri)return;
    const uri=pendingEmergencyCall.uri;
    setPendingEmergencyCall(null);
    window.location.href=uri;
  };

  // Load history for specific date
  const loadHistoryDate=async(date)=>{
    if(!date)return;
    setHistoryLogs(null);setHistoryNotes(null);setHistoryVitals(null);
    setShowHistoryModal(true);
    const [l,n,v]=await Promise.all([fbGet(`logs_${date}`),fbGet(`notes_${date}`),fbGet(`vitals_${date}`)]);
    setHistoryLogs(l?migrateLogs(JSON.parse(l)):{});
    setHistoryNotes(n?migrateNotes(JSON.parse(n)):[]);
    setHistoryVitals(v?migrateVitals(JSON.parse(v)):{});
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
      if(name===ADMIN){setActiveUser(name);setScreen("app");localStorage.setItem("barr_session",JSON.stringify({user:name}));requestNotifPermission(name);}
      else showNotif("⚠️ لم يُعيَّن رقم سري لهذا الشخص بعد");
      return;
    }
    setActiveUser(name);setScreen("pin");
  };

  const handlePinSuccess=(name)=>{
    setActiveUser(name);setScreen("app");
    localStorage.setItem("barr_session",JSON.stringify({user:name}));
    requestNotifPermission(name);
  };

  const logout=()=>{setScreen("select");setActiveUser(null);setTab("today");localStorage.removeItem("barr_session");};

  const todayItems=schedule.filter(item=>!item.demoOnly).sort((a,b)=>a.time.localeCompare(b.time));
  const doneCount=todayItems.filter(i=>logs[i.id]).length;
  const continuityRiskCount=schedule.filter(item=>item.continuity&&evaluateContinuity(item).status==="FAIL").length;
  const meals=["الفطور","الغداء","العشاء"];
  const pastDays=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-i-1);
    return d.toISOString().split("T")[0];
  });

  if(loading)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:S.bg,fontFamily:"Thmanyah Extended",color:S.muted,gap:12}}><div style={{fontSize:40}}>⏳</div><p>جاري التحميل...</p></div>);
  if(screen==="select")return(<div style={{background:S.bg}}><style>{getCSS(night)}</style><SelectUser onSelect={handleSelectUser} night={night}/>{notification&&<div style={NS.notif} className="slide-up">{notification}</div>}</div>);
  if(screen==="pin")return(<div style={{background:S.bg}}><style>{getCSS(night)}</style><PinScreen name={activeUser} pins={pins} onSuccess={handlePinSuccess} onBack={()=>{setScreen("select");setActiveUser(null);}} night={night}/></div>);

  return(
    <div style={{fontFamily:"'Thmanyah Extended',sans-serif",background:S.bg,minHeight:"100vh",color:S.text,maxWidth:480,margin:"0 auto",position:"relative"}} dir="rtl">
      <style>{getCSS(night)}</style>

      {/* Header */}
      <div style={{background:S.header,padding:"18px 20px 20px",borderBottom:`1px solid ${S.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/barr-logo-mark.png" alt="شعار بار" style={{width:76,height:48,objectFit:"contain",flexShrink:0}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <button className="btn" onClick={()=>{setLoading(true);loadData();}} style={{background:night?"rgba(255,255,255,.12)":S.card,border:`1px solid ${S.border}`,borderRadius:12,width:36,height:36,fontSize:15,cursor:"pointer",color:S.text,display:"flex",alignItems:"center",justifyContent:"center"}}>🔄</button>
            <button className="btn" onClick={async()=>{ await requestNotifPermission(); showNotif("🔔 تم طلب إذن الإشعارات");}} style={{background:night?"rgba(255,255,255,.12)":S.card,border:`1px solid ${S.border}`,borderRadius:12,width:36,height:36,fontSize:15,cursor:"pointer",color:S.text,display:"flex",alignItems:"center",justifyContent:"center"}} title="تفعيل الإشعارات">🔔</button>
            <button className="btn" onClick={()=>setNight(n=>!n)} style={{background:night?"rgba(255,255,255,.12)":S.card,border:`1px solid ${S.border}`,borderRadius:12,width:36,height:36,fontSize:15,cursor:"pointer",color:S.text,display:"flex",alignItems:"center",justifyContent:"center"}}>{night?"☀️":"🌙"}</button>
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="46" height="46" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke={night?"rgba(255,255,255,.2)":"#dce8f4"} strokeWidth="5"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="#67a9ec" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*22}`}
                  strokeDashoffset={`${2*Math.PI*22*(1-doneCount/Math.max(todayItems.length,1))}`}
                  strokeLinecap="round" transform="rotate(-90 28 28)" style={{transition:"stroke-dashoffset 0.5s ease"}}/>
              </svg>
              <div style={{position:"absolute",fontSize:10,fontWeight:800,color:"#3978b9"}}>{doneCount}/{todayItems.length}</div>
            </div>
          </div>
        </div>
        <div style={{marginTop:18}}>
          <div style={{fontSize:21,fontWeight:900,color:night?"#fff":S.text}}>معًا.. تستمر رعاية دعث</div>
          <div style={{fontSize:11,color:night?"rgba(255,255,255,.65)":S.subtext,marginTop:4}}>{formatDate()} • لأن الاهتمام لا يتوقف</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:night?"rgba(56,189,248,.14)":"#e8f3ff",border:"1px solid #cfe4f7",borderRadius:20,padding:"5px 12px",fontSize:12,color:night?"#7dd3fc":"#275d91"}}>
            <span>👤</span><span>{activeUser}</span><span style={{fontSize:9,color:"#2f9d68"}}>●</span>
          </div>
          <button onClick={logout} style={{marginRight:"auto",background:"none",border:`1px solid ${S.border}`,borderRadius:10,padding:"4px 11px",fontSize:11,color:S.muted,cursor:"pointer",fontFamily:"Thmanyah Extended"}}>خروج</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",zIndex:120,width:"100%",maxWidth:480,height:78,display:"grid",gridTemplateColumns:"repeat(5,1fr)",alignItems:"end",background:S.tabBg,borderTop:`1px solid ${S.tabBorder}`,padding:"7px 4px 8px",boxShadow:"0 -10px 30px rgba(18,49,90,.08)"}}>
        {[["today","اليوم"],["vitals","القياسات"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"3px 1px",background:"none",border:"none",color:tab===k?"#275d91":S.muted,fontSize:10,fontFamily:"Thmanyah Extended",cursor:"pointer",fontWeight:tab===k?800:500,whiteSpace:"nowrap",minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <NavIcon name={k} active={tab===k}/><span>{l}</span>
          </button>
        ))}
        <button onClick={()=>setTab("continuity")} aria-label="الاستمرارية"
          style={{position:"relative",top:-15,padding:0,background:"none",border:"none",color:tab==="continuity"?"#176fa8":S.text,fontSize:10,fontFamily:"Thmanyah Extended",cursor:"pointer",fontWeight:900,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{width:64,height:64,borderRadius:22,background:night?"linear-gradient(145deg,#f8fcff,#dceeff)":"linear-gradient(145deg,#fff,#e3f2ff)",border:`3px solid ${tab==="continuity"?"#54a7e1":S.tabBg}`,boxShadow:tab==="continuity"?"0 9px 24px rgba(45,129,190,.35)":"0 8px 22px rgba(18,76,124,.22)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src="/barr-logo-mark.png" alt="" aria-hidden="true" style={{width:56,height:42,objectFit:"contain"}}/>
          </span>
          <span>الاستمرارية</span>
        </button>
        {[["notes","ملاحظات"],["schedule","الجدول"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"3px 1px",background:"none",border:"none",color:tab===k?"#275d91":S.muted,fontSize:10,fontFamily:"Thmanyah Extended",cursor:"pointer",fontWeight:tab===k?800:500,whiteSpace:"nowrap",minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <NavIcon name={k} active={tab===k}/><span>{l}</span>
          </button>
        ))}
      </div>

      <div style={{padding:"16px 16px 116px",overflowY:"auto",maxHeight:"calc(100vh - 205px)"}}>

        {/* TODAY */}
        {tab==="today"&&<div className="slide-up">
          <button className="card" onClick={()=>setTab("continuity")} style={{width:"100%",background:night?"linear-gradient(135deg,#172554,#1e3a8a)":"linear-gradient(135deg,#f7fbff,#e8f3ff)",border:`1px solid ${night?"#3b82f6":"#cfe4f7"}`,borderRadius:22,padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:14,textAlign:"right",fontFamily:"Thmanyah Extended",cursor:"pointer",color:S.text}}>
            <div style={{width:72,height:62,borderRadius:19,flexShrink:0,background:night?"rgba(255,255,255,.92)":"#f8fcff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 18px rgba(79,142,213,.16)"}}><img src="/barr-logo-mark.png" alt="" aria-hidden="true" style={{width:68,height:48,objectFit:"contain"}}/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:900,color:night?"#fff":S.text}}>استمرارية الرعاية</div>
              <div style={{fontSize:11,color:night?"#bfdbfe":S.subtext,lineHeight:1.7,marginTop:4}}>نتحقق أن رعاية دعث تستمر حتى عند تعذر المسؤول</div>
            </div>
            <div style={{fontSize:20,color:"#3978b9"}}>‹</div>
          </button>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:12}}>
            {[["today","▦","المهام"],["schedule","💊","الأدوية"],["vitals","◉","القياسات"],["history","▤","السجل"]].map(([key,icon,label])=><button key={key} onClick={()=>setTab(key)} style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:15,padding:"11px 2px",fontFamily:"Thmanyah Extended",color:S.text,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><span style={{fontSize:19}}>{icon}</span><span style={{fontSize:10,fontWeight:700}}>{label}</span></button>)}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <button className="card" onClick={()=>setTab("health-card")} style={{background:night?"linear-gradient(135deg,#172554,#1e3a8a)":"linear-gradient(135deg,#edf6ff,#f9fcff)",border:`1px solid ${night?"#3b82f6":"#cfe4f7"}`,borderRadius:17,padding:"13px 12px",display:"flex",alignItems:"center",gap:9,textAlign:"right",color:S.text,cursor:"pointer"}}>
              <div style={{width:40,height:40,borderRadius:13,background:night?"rgba(255,255,255,.12)":"#dceeff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>🪪</div>
              <div><div style={{fontSize:13,fontWeight:900}}>البطاقة الصحية</div><div style={{fontSize:9,color:S.muted,marginTop:2}}>معلومات دعث الطبية</div></div>
            </button>
            <button className="card" onClick={()=>setTab("emergency")} style={{background:night?"linear-gradient(135deg,#450a0a,#7f1d1d)":"linear-gradient(135deg,#fff0ee,#fff8f7)",border:`1px solid ${night?"#991b1b":"#f5c7c2"}`,borderRadius:17,padding:"13px 12px",display:"flex",alignItems:"center",gap:9,textAlign:"right",color:night?"#fecaca":"#8f3029",cursor:"pointer"}}>
              <div style={{width:40,height:40,borderRadius:13,background:night?"rgba(255,255,255,.1)":"#fbd8d4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>☎</div>
              <div><div style={{fontSize:13,fontWeight:900}}>الطوارئ</div><div style={{fontSize:9,opacity:.72,marginTop:2}}>اتصال سريع وآمن</div></div>
            </button>
          </div>

          {continuityRiskCount>0&&<button onClick={()=>setTab("continuity")} style={{width:"100%",background:night?"#450a0a":"#fff0ee",border:`1px solid ${night?"#ef4444":"#f5c7c2"}`,borderRadius:18,padding:"14px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:12,textAlign:"right",fontFamily:"Thmanyah Extended",cursor:"pointer"}}>
            <div style={{width:42,height:42,borderRadius:14,background:night?"#7f1d1d":"#fbd8d4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>!</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:900,color:night?"#fca5a5":"#a33b32"}}>تحتاج انتباهًا</div><div style={{fontSize:11,color:night?"#fecaca":"#b85a51",marginTop:2}}>{formatArabicNumber(continuityRiskCount)} مهام حرجة بها نقاط ضعف</div></div>
            <span style={{color:night?"#fca5a5":"#a33b32",fontSize:18}}>‹</span>
          </button>}

          <div style={{fontSize:14,fontWeight:900,color:S.text,margin:"2px 2px 12px"}}>مهام اليوم</div>
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
                        <div style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,background:item.type==="medication"?(night?"#1e3a5f":"#e8f3ff"):(night?"#14532d":"#eef7f0")}}>{item.icon}</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:S.text}}>{item.name}</div>
                          <div style={{fontSize:11,color:S.muted,marginTop:1}}>{item.dose||item.desc} • {formatTime12(item.time)}</div>
                          {done&&<div style={{fontSize:11,color:night?"#4ade80":"#2f9d68",marginTop:3,fontWeight:500}}>✅ {done.doneBy} — {done.doneAt}</div>}
                          {late&&!done&&<div style={{fontSize:11,color:"#ef4444",marginTop:3,fontWeight:600}}>⚠️ تأخر أكثر من ساعة</div>}
                        </div>
                      </div>
                      <div style={{flexShrink:0,marginRight:6}}>
                        {!done
                          ?<button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontSize:13,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowDoneModal(item)} disabled={savingId===item.id}>{savingId===item.id?"⏳":"تم"}</button>
                          :<button className="btn" style={{background:S.card2,color:S.muted,border:`1px solid ${S.border}`,borderRadius:10,padding:"7px 10px",fontSize:12,fontFamily:"Thmanyah Extended",cursor:"pointer"}} onClick={()=>undoMark(item.id)}>تراجع</button>
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

        {/* CARE CONTINUITY */}
        {tab==="continuity"&&<CareContinuity tasks={schedule} onUpdate={updateContinuityTask} night={night}/>}

        {/* HEALTH CARD */}
        {tab==="health-card"&&<HealthCardView card={healthCard} isAdmin={activeUser===ADMIN} onEdit={openHealthCardEditor} onBack={()=>setTab("today")} S={S} night={night}/>}

        {/* EMERGENCY */}
        {tab==="emergency"&&<EmergencyView familyContact={emergencyContact} isAdmin={activeUser===ADMIN} onEditContact={openEmergencyContactEditor} onCall={requestEmergencyCall} onBack={()=>setTab("today")} S={S} night={night}/>}

        {/* VITALS */}
        {tab==="vitals"&&<div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:0.5}}>قياسات اليوم</div>
            <button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowVitalsModal(true)}>+ تسجيل</button>
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
              style={{flex:1,background:S.card,border:`1px solid ${S.border}`,borderRadius:10,padding:"8px 12px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none"}}/>
            <button className="btn" onClick={()=>loadHistoryDate(historyDate)} disabled={!historyDate}
              style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:13,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}}>عرض</button>
          </div>

          {/* Weekly PDF */}
          <button className="btn" onClick={downloadWeeklyPDF} disabled={pdfLoading}
              style={{width:"100%",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",borderRadius:14,padding:"12px 16px",fontSize:14,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {pdfLoading?"⏳ جاري الإنشاء...":"📄 تحميل التقرير الأسبوعي PDF"}
            </button>
        </div>}

        {/* NOTES */}
        {tab==="notes"&&<div className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:0.5}}>ملاحظات اليوم</div>
            <button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowNotesModal(true)}>+ إضافة</button>
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
            {activeUser===ADMIN&&<button className="btn" style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontFamily:"Thmanyah Extended",fontWeight:700,cursor:"pointer"}} onClick={()=>setShowAddModal(true)}>+ إضافة</button>}
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
                    {item.continuity&&<div style={{fontSize:10,color:evaluateContinuity(item).status==="PASS"?"#22c55e":"#f59e0b",marginTop:4,fontWeight:700}}>🛡️ {normalizeContinuity(item.continuity).primary} ← {normalizeContinuity(item.continuity).backup} • {continuityStatusLabel(evaluateContinuity(item).status)}{item.demoOnly?" • تجريبي":""}</div>}
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
            <button onClick={()=>setShowHistoryModal(false)} style={{width:"100%",background:"#334155",color:S.muted,border:"none",borderRadius:12,padding:"12px 0",fontSize:14,fontFamily:"Thmanyah Extended",cursor:"pointer",marginTop:12}}>إغلاق</button>
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
                    style={{flex:1,background:addForm.type===t?"#1e3a5f":S.bg,border:`1px solid ${addForm.type===t?"#0ea5e9":S.border}`,borderRadius:10,padding:"8px 0",color:addForm.type===t?"#38bdf8":S.muted,fontSize:13,fontFamily:"Thmanyah Extended",cursor:"pointer",fontWeight:addForm.type===t?700:400}}>
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
                    style={{flex:1,background:addForm.meal===m?"#1e3a5f":S.bg,border:`1px solid ${addForm.meal===m?"#0ea5e9":S.border}`,borderRadius:10,padding:"7px 0",color:addForm.meal===m?"#38bdf8":S.muted,fontSize:12,fontFamily:"Thmanyah Extended",cursor:"pointer"}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {[["name",addForm.type==="medication"?"اسم الدواء":"اسم الوجبة","مثال: دواء الضغط"],["dose",addForm.type==="medication"?"الجرعة":"الوصف","مثال: حبة واحدة"]].map(([f,l,p])=>(
              <div key={f} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>{l}</label>
                <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none"}} dir="rtl" placeholder={p} value={addForm[f]} onChange={e=>setAddForm({...addForm,[f]:e.target.value})}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الوقت</label>
              <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none"}} type="time" value={addForm.time} onChange={e=>setAddForm({...addForm,time:e.target.value})}/>
            </div>
            <div style={{height:1,background:S.border,margin:"16px 0"}}/>
            <div style={{fontSize:14,fontWeight:800,color:S.text,marginBottom:8}}>🛡️ خطة استمرارية الرعاية</div>
            <div style={{fontSize:11,color:S.muted,lineHeight:1.6,marginBottom:12}}>حدد المسؤول والبديل لإخضاع المهمة لفحص الاستمرارية.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div>
                <label style={{display:"block",fontSize:11,color:S.muted,marginBottom:5,fontWeight:600}}>المسؤول الأساسي</label>
                <select style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"9px 8px",color:S.text,fontSize:12,fontFamily:"Thmanyah Extended",outline:"none"}} value={addForm.primary} onChange={e=>setAddForm({...addForm,primary:e.target.value,backup:addForm.backup===e.target.value?"":addForm.backup})}>
                  <option value="">اختر</option>
                  {FAMILY_MEMBERS.map(name=><option key={name} value={name}>{name} • {FAMILY_RELATIONSHIPS[name]}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:S.muted,marginBottom:5,fontWeight:600}}>البديل</label>
                <select style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"9px 8px",color:S.text,fontSize:12,fontFamily:"Thmanyah Extended",outline:"none"}} value={addForm.backup} onChange={e=>setAddForm({...addForm,backup:e.target.value})}>
                  <option value="">اختر</option>
                  {FAMILY_MEMBERS.filter(name=>name!==addForm.primary).map(name=><option key={name} value={name}>{name} • {FAMILY_RELATIONSHIPS[name]}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:11,color:S.muted,marginBottom:5,fontWeight:600}}>مستوى الأهمية</label>
              <div style={{display:"flex",gap:8}}>
                {[["normal","عادية"],["critical","حرجة"]].map(([value,label])=><button key={value} type="button" onClick={()=>setAddForm({...addForm,importance:value})} style={{flex:1,background:addForm.importance===value?(value==="critical"?"#7f1d1d":"#1e3a5f"):S.bg,border:`1px solid ${addForm.importance===value?(value==="critical"?"#ef4444":"#0ea5e9"):S.border}`,borderRadius:9,padding:8,color:addForm.importance===value?"#fff":S.muted,fontFamily:"Thmanyah Extended",cursor:"pointer"}}>{label}</button>)}
              </div>
            </div>
            <div style={{fontSize:11,color:S.muted,marginBottom:6,fontWeight:700}}>متطلبات جاهزية البديل</div>
            <div style={{background:S.bg,borderRadius:12,padding:"5px 10px",marginBottom:16}}>
              {CONTINUITY_REQUIREMENTS.map(requirement=><label key={requirement.key} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",fontSize:12,color:S.text,cursor:"pointer"}}>
                <input type="checkbox" checked={addForm.requirements[requirement.key]} onChange={e=>setAddForm({...addForm,requirements:{...addForm.requirements,[requirement.key]:e.target.checked}})}/>
                <span>{requirement.label}</span>
              </label>)}
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
            <textarea style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none",height:120,resize:"none",lineHeight:1.7,marginBottom:14}} dir="rtl" placeholder="اكتب ملاحظتك هنا..." value={noteText} onChange={e=>setNoteText(e.target.value)}/>
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
                    style={{flex:1,background:vitalForm.period===p?"#1e3a5f":S.bg,border:`1px solid ${vitalForm.period===p?"#0ea5e9":S.border}`,borderRadius:10,padding:"8px 0",color:vitalForm.period===p?"#38bdf8":S.muted,fontSize:14,fontFamily:"Thmanyah Extended",cursor:"pointer",fontWeight:vitalForm.period===p?700:400}}>
                    {p==="صباح"?"🌅 صباح":"🌙 مساء"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>الضغط (mmHg)</label>
              <div style={{display:"flex",gap:8}}>
                <input style={{flex:1,background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 12px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none",textAlign:"center"}} placeholder="الانقباضي" type="number" value={vitalForm.bp_sys} onChange={e=>setVitalForm({...vitalForm,bp_sys:e.target.value})}/>
                <span style={{color:S.muted,display:"flex",alignItems:"center",fontWeight:700}}>/</span>
                <input style={{flex:1,background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 12px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none",textAlign:"center"}} placeholder="الانبساطي" type="number" value={vitalForm.bp_dia} onChange={e=>setVitalForm({...vitalForm,bp_dia:e.target.value})}/>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,color:S.muted,marginBottom:6,fontWeight:600}}>السكر (mg/dL)</label>
              <input style={{width:"100%",background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 14px",color:S.text,fontSize:14,fontFamily:"Thmanyah Extended",outline:"none",textAlign:"center"}} placeholder="مثال: 120" type="number" value={vitalForm.sugar} onChange={e=>setVitalForm({...vitalForm,sugar:e.target.value})}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn" style={NS.btnConfirm} onClick={saveVitals}>✅ حفظ</button>
              <button style={{...NS.btnCancel,background:S.card2,color:S.muted}} onClick={()=>setShowVitalsModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showHealthCardModal&&(
        <HealthCardModal draft={healthCardDraft} setDraft={setHealthCardDraft} onSave={saveHealthCard} onClose={()=>setShowHealthCardModal(false)} S={S}/>
      )}

      {showEmergencyContactModal&&(
        <EmergencyContactModal draft={emergencyContactDraft} setDraft={setEmergencyContactDraft} onSave={saveEmergencyContact} onClose={()=>setShowEmergencyContactModal(false)} S={S}/>
      )}

      <EmergencyCallModal contact={pendingEmergencyCall} onConfirm={confirmEmergencyCall} onClose={()=>setPendingEmergencyCall(null)} S={S}/>

      {notification&&<div style={NS.notif} className="slide-up">{notification}</div>}
    </div>
  );
}

const NS={
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200},
  modal:{borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480,borderBottom:"none",maxHeight:"90vh",overflowY:"auto"},
  btnConfirm:{flex:1,background:"#0ea5e9",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"'Thmanyah Extended',sans-serif",fontWeight:700,cursor:"pointer"},
  btnCancel:{flex:1,border:"none",borderRadius:12,padding:"12px 0",fontSize:15,fontFamily:"'Thmanyah Extended',sans-serif",cursor:"pointer"},
  notif:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:"10px 24px",fontSize:14,fontWeight:600,color:"#f1f5f9",zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",whiteSpace:"nowrap"},
};
