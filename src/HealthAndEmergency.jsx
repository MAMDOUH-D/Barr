import { GOVERNMENT_EMERGENCY_CONTACTS, hasHealthCardData } from "./healthSafety.js";

const inputStyle = (S) => ({
  width: "100%",
  background: S.bg,
  border: `1px solid ${S.border}`,
  borderRadius: 12,
  padding: "11px 13px",
  color: S.text,
  fontSize: 14,
  outline: "none",
});

const labelStyle = (S) => ({ display: "block", fontSize: 11, color: S.muted, marginBottom: 6, fontWeight: 700 });

function BackHeader({ title, subtitle, onBack, S }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <button onClick={onBack} aria-label="العودة للرئيسية" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${S.border}`, background: S.card, color: S.text, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>→</button>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: S.text }}>{title}</div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 3, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, icon, S, multiline = false }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: multiline ? "flex-start" : "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: value ? S.text : S.muted, fontWeight: value ? 650 : 400, lineHeight: 1.7, whiteSpace: multiline ? "pre-wrap" : "normal" }}>{value || "غير مضاف"}</div>
      </div>
    </div>
  );
}

export function HealthCardView({ card, isAdmin, onEdit, onBack, S, night }) {
  const hasData = hasHealthCardData(card);
  return (
    <div className="slide-up">
      <BackHeader title="البطاقة الصحية" subtitle="معلومات دعث المهمة تظهر للأسرة عند الحاجة" onBack={onBack} S={S} />

      <div style={{ background: night ? "linear-gradient(135deg,#17365e,#1e4e75)" : "linear-gradient(135deg,#e8f4ff,#f7fbff)", border: `1px solid ${night ? "#3b82f6" : "#cfe4f7"}`, borderRadius: 22, padding: 18, marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", background: night ? "rgba(125,211,252,.08)" : "rgba(103,169,236,.12)", left: -42, top: -55 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ fontSize: 11, color: night ? "#bfdbfe" : S.muted, marginBottom: 4 }}>كبير السن</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: night ? "#fff" : S.text }}>{card.fullName || "دعث"}</div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: card.bloodType ? "#b91c1c" : S.card, border: `1px solid ${card.bloodType ? "#ef4444" : S.border}`, color: card.bloodType ? "#fff" : S.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(24,49,83,.12)" }}>
            <div style={{ fontSize: 10, opacity: .82 }}>فصيلة الدم</div>
            <div style={{ fontSize: 22, fontWeight: 900, direction: "ltr" }}>{card.bloodType || "—"}</div>
          </div>
        </div>
        {card.updatedAt && <div style={{ fontSize: 9, color: night ? "#bfdbfe" : S.muted, marginTop: 12 }}>آخر تحديث: {card.updatedAt}{card.updatedBy ? ` بواسطة ${card.updatedBy}` : ""}</div>}
      </div>

      {!hasData && <div style={{ background: night ? "#422006" : "#fff8e7", border: `1px solid ${night ? "#a16207" : "#f4d58d"}`, borderRadius: 14, padding: 13, fontSize: 12, color: night ? "#fde68a" : "#8a5a16", lineHeight: 1.7, marginBottom: 12 }}>لم تُستكمل البطاقة الصحية بعد. أضف المعلومات الأساسية لتكون جاهزة وقت الحاجة.</div>}

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 18, padding: "2px 15px", marginBottom: 14 }}>
        <HealthRow label="تاريخ الميلاد" value={card.birthDate} icon="📅" S={S} />
        <HealthRow label="الأمراض المزمنة" value={card.chronicConditions} icon="🩺" S={S} multiline />
        <HealthRow label="الحساسية" value={card.allergies} icon="⚠️" S={S} multiline />
        <HealthRow label="الأدوية الحالية" value={card.currentMedications} icon="💊" S={S} multiline />
        <HealthRow label="المستشفى المتابع" value={card.treatingHospital} icon="🏥" S={S} />
        <HealthRow label="الطبيب المعالج" value={card.physicianName} icon="👨‍⚕️" S={S} />
        <HealthRow label="رقم الملف الطبي" value={card.medicalRecordNumber} icon="📁" S={S} />
        <HealthRow label="شركة التأمين" value={card.insuranceCompany} icon="🛡️" S={S} />
        <HealthRow label="رقم عضوية التأمين" value={card.insuranceMembershipNumber} icon="🔢" S={S} />
        <HealthRow label="ملاحظات طبية" value={card.medicalNotes} icon="📝" S={S} multiline />
      </div>

      {isAdmin
        ? <button className="btn" onClick={onEdit} style={{ width: "100%", background: "#176fa8", color: "#fff", border: "none", borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{hasData ? "تعديل البطاقة الصحية" : "إكمال البطاقة الصحية"}</button>
        : <div style={{ textAlign: "center", color: S.muted, fontSize: 11 }}>يمكن لممدوح تعديل بيانات البطاقة الصحية.</div>}
    </div>
  );
}

const toneColors = {
  danger: ["#b91c1c", "#ef4444", "#fff"],
  navy: ["#17365e", "#3978b9", "#fff"],
  orange: ["#9a3412", "#f97316", "#fff"],
  green: ["#166534", "#22c55e", "#fff"],
};

function CallCard({ contact, onCall, featured = false, S }) {
  const [background, border, color] = toneColors[contact.tone || "navy"];
  return (
    <button className="card" onClick={() => onCall(contact)} style={{ width: "100%", gridColumn: !featured && contact.id === "health" ? "1 / -1" : "auto", background: featured ? `linear-gradient(135deg,${background},#7f1d1d)` : S.card, border: `1px solid ${featured ? border : S.border}`, borderRadius: 18, padding: featured ? 17 : 13, marginBottom: 9, display: "flex", alignItems: "center", gap: 12, color: featured ? color : S.text, textAlign: "right", cursor: "pointer" }}>
      <div style={{ width: featured ? 52 : 42, height: featured ? 52 : 42, borderRadius: 15, background: featured ? "rgba(255,255,255,.15)" : `${border}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: featured ? 24 : 19, flexShrink: 0 }}>☎</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: featured ? 18 : 14, fontWeight: 900 }}>{contact.name}</div>
        <div style={{ fontSize: 10, opacity: featured ? .78 : .65, marginTop: 2 }}>{contact.detail}</div>
      </div>
      <div style={{ direction: "ltr", fontSize: featured ? 24 : 18, fontWeight: 900, color: featured ? "#fff" : border }}>{contact.number}</div>
    </button>
  );
}

export function EmergencyView({ familyContact, isAdmin, onEditContact, onCall, onBack, S, night }) {
  const hasFamilyContact = Boolean(familyContact.name && familyContact.phone);
  return (
    <div className="slide-up">
      <BackHeader title="الطوارئ" subtitle="وصول سريع للجهة المناسبة وللمسؤول عن دعث" onBack={onBack} S={S} />

      <div style={{ background: night ? "#450a0a" : "#fff0ee", border: `1px solid ${night ? "#991b1b" : "#f5c7c2"}`, borderRadius: 15, padding: 13, color: night ? "#fecaca" : "#8f3029", fontSize: 11, lineHeight: 1.75, marginBottom: 13 }}>
        في الحالة الطبية الخطرة اتصل بالإسعاف مباشرة، وجهّز البطاقة الصحية لعرض المعلومات المهمة.
      </div>

      <div style={{ fontSize: 12, color: S.muted, fontWeight: 800, margin: "0 2px 9px" }}>الطوارئ الحكومية</div>
      <CallCard contact={GOVERNMENT_EMERGENCY_CONTACTS[0]} onCall={onCall} featured S={S} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {GOVERNMENT_EMERGENCY_CONTACTS.slice(1).map((contact) => <CallCard key={contact.id} contact={contact} onCall={onCall} S={S} />)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <div style={{ fontSize: 12, color: S.muted, fontWeight: 800 }}>جهة اتصال العائلة</div>
        {isAdmin && <button onClick={onEditContact} style={{ background: "none", border: "none", color: "#3978b9", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{hasFamilyContact ? "تعديل" : "+ إضافة"}</button>}
      </div>

      {hasFamilyContact ? (
        <button className="card" onClick={() => onCall({ name: familyContact.name, detail: familyContact.relationship || "مسؤول عن دعث", number: familyContact.phone, tone: "navy" })} style={{ width: "100%", background: night ? "linear-gradient(135deg,#172554,#1e3a8a)" : "linear-gradient(135deg,#edf6ff,#f9fcff)", border: `1px solid ${night ? "#3b82f6" : "#cfe4f7"}`, borderRadius: 18, padding: 15, display: "flex", alignItems: "center", gap: 12, color: S.text, textAlign: "right", cursor: "pointer" }}>
          <div style={{ width: 48, height: 48, borderRadius: 15, background: night ? "rgba(255,255,255,.12)" : "#dceeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{familyContact.name}</div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{familyContact.relationship || "مسؤول عن دعث"}</div>
          </div>
          <div style={{ direction: "ltr", color: "#176fa8", fontSize: 14, fontWeight: 900 }}>{familyContact.phone}</div>
        </button>
      ) : (
        <div style={{ background: S.card, border: `1px dashed ${S.border}`, borderRadius: 16, padding: 20, textAlign: "center", color: S.muted }}>
          <div style={{ fontSize: 30, marginBottom: 7 }}>👤</div>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>لم يُضف رقم عائلي للطوارئ بعد.</div>
          {isAdmin && <button onClick={onEditContact} style={{ marginTop: 10, background: "#176fa8", color: "#fff", border: "none", borderRadius: 10, padding: "8px 15px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>إضافة مسؤول</button>}
        </div>
      )}
    </div>
  );
}

export function HealthCardModal({ draft, setDraft, onSave, onClose, S }) {
  const fields = [
    ["birthDate", "تاريخ الميلاد", "date", ""],
    ["chronicConditions", "الأمراض المزمنة", "textarea", "مثال: السكري، ضغط الدم"],
    ["allergies", "الحساسية", "textarea", "حساسية من دواء أو غذاء"],
    ["currentMedications", "الأدوية الحالية", "textarea", "اكتب أهم الأدوية الحالية"],
    ["treatingHospital", "المستشفى المتابع", "text", "اسم المستشفى"],
    ["physicianName", "الطبيب المعالج", "text", "اسم الطبيب"],
    ["medicalRecordNumber", "رقم الملف الطبي", "text", "اختياري"],
    ["insuranceCompany", "شركة التأمين", "text", "اسم شركة التأمين"],
    ["insuranceMembershipNumber", "رقم عضوية التأمين", "text", "رقم العضوية أو المشترك"],
    ["medicalNotes", "ملاحظات طبية", "textarea", "أي معلومة مهمة للطوارئ"],
  ];
  return (
    <div style={modalStyles.overlay} className="fade-in" onClick={onClose}>
      <div style={{ ...modalStyles.modal, background: S.card, border: `1px solid ${S.border}` }} className="slide-up" onClick={(event) => event.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 900, color: S.text, marginBottom: 4 }}>تعديل البطاقة الصحية</div>
        <div style={{ fontSize: 10, color: S.muted, lineHeight: 1.6, marginBottom: 16 }}>أضف المعلومات المؤكدة فقط، واترك أي معلومة غير معروفة فارغة.</div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle(S)}>فصيلة الدم</label>
          <select value={draft.bloodType} onChange={(event) => setDraft({ ...draft, bloodType: event.target.value })} style={inputStyle(S)}>
            <option value="">غير محددة</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        {fields.map(([key, label, type, placeholder]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={labelStyle(S)}>{label}</label>
            {type === "textarea"
              ? <textarea value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={placeholder} style={{ ...inputStyle(S), minHeight: 74, resize: "vertical", lineHeight: 1.7 }} />
              : <input type={type} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={placeholder} style={inputStyle(S)} />}
          </div>
        ))}

        <div style={{ display: "flex", gap: 9, marginTop: 17 }}>
          <button className="btn" onClick={onSave} style={{ flex: 1, background: "#176fa8", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>حفظ البطاقة</button>
          <button onClick={onClose} style={{ flex: 1, background: S.card2, color: S.muted, border: "none", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer" }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export function EmergencyContactModal({ draft, setDraft, onSave, onClose, S }) {
  return (
    <div style={modalStyles.overlay} className="fade-in" onClick={onClose}>
      <div style={{ ...modalStyles.modal, background: S.card, border: `1px solid ${S.border}` }} className="slide-up" onClick={(event) => event.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 900, color: S.text, marginBottom: 16 }}>جهة اتصال العائلة</div>
        {[
          ["name", "الاسم", "مثال: ممدوح"],
          ["relationship", "صلة القرابة أو الصفة", "مثال: ابن — المسؤول عن الرعاية"],
          ["phone", "رقم الجوال", "05xxxxxxxx"],
        ].map(([key, label, placeholder]) => (
          <div key={key} style={{ marginBottom: 13 }}>
            <label style={labelStyle(S)}>{label}</label>
            <input type={key === "phone" ? "tel" : "text"} dir={key === "phone" ? "ltr" : "rtl"} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={placeholder} style={{ ...inputStyle(S), textAlign: key === "phone" ? "left" : "right" }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 9, marginTop: 17 }}>
          <button className="btn" onClick={onSave} style={{ flex: 1, background: "#176fa8", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>حفظ الرقم</button>
          <button onClick={onClose} style={{ flex: 1, background: S.card2, color: S.muted, border: "none", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer" }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export function EmergencyCallModal({ contact, onConfirm, onClose, S }) {
  if (!contact) return null;
  return (
    <div style={modalStyles.overlay} className="fade-in" onClick={onClose}>
      <div style={{ ...modalStyles.modal, background: S.card, border: `1px solid ${S.border}`, textAlign: "center" }} className="slide-up" onClick={(event) => event.stopPropagation()}>
        <div style={{ width: 66, height: 66, borderRadius: 22, background: "#fee2e2", color: "#b91c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 12px" }}>☎</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: S.text }}>تأكيد الاتصال</div>
        <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, margin: "7px 0 4px" }}>سيُفتح تطبيق الاتصال للاتصال بـ</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: S.text }}>{contact.name}</div>
        <div style={{ direction: "ltr", fontSize: 26, fontWeight: 900, color: "#b91c1c", margin: "4px 0 20px" }}>{contact.number}</div>
        <button className="btn" onClick={onConfirm} style={{ width: "100%", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 13, padding: 13, fontSize: 15, fontWeight: 900, cursor: "pointer", marginBottom: 8 }}>فتح الاتصال الآن</button>
        <button onClick={onClose} style={{ width: "100%", background: S.card2, color: S.muted, border: "none", borderRadius: 13, padding: 12, fontSize: 14, cursor: "pointer" }}>إلغاء</button>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.74)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 240 },
  modal: { borderRadius: "22px 22px 0 0", padding: "23px 19px 34px", width: "100%", maxWidth: 480, borderBottom: "none", maxHeight: "92vh", overflowY: "auto" },
};

