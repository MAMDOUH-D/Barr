export const EMPTY_HEALTH_CARD = Object.freeze({
  fullName: "دعث",
  bloodType: "",
  birthDate: "",
  chronicConditions: "",
  allergies: "",
  currentMedications: "",
  treatingHospital: "",
  physicianName: "",
  medicalRecordNumber: "",
  insuranceCompany: "",
  insuranceMembershipNumber: "",
  medicalNotes: "",
  updatedBy: "",
  updatedAt: "",
});

export const EMPTY_EMERGENCY_CONTACT = Object.freeze({
  name: "",
  relationship: "",
  phone: "",
  updatedBy: "",
  updatedAt: "",
});

export const DEFAULT_HEALTH_CARD = Object.freeze({
  ...EMPTY_HEALTH_CARD,
  fullName: "دعث",
  bloodType: "O+",
  birthDate: "1945-01-01",
  chronicConditions: "السكري من النوع الثاني، ارتفاع ضغط الدم",
  allergies: "لا توجد حساسية دوائية مسجلة",
  currentMedications: "حسب جدول الأدوية المعتمد في التطبيق",
  treatingHospital: "مستشفى حائل العام",
  physicianName: "الطبيب المتابع (بيانات تجريبية)",
  medicalRecordNumber: "BAR-1001",
  insuranceCompany: "التعاونية للتأمين",
  insuranceMembershipNumber: "BAR-INS-1001",
  medicalNotes: "بيانات تجريبية للعرض، ويمكن تعديلها من البطاقة الصحية.",
});

export const DEFAULT_EMERGENCY_CONTACT = Object.freeze({
  ...EMPTY_EMERGENCY_CONTACT,
  name: "مفلح",
  relationship: "الابن الأكبر والمسؤول عن الرعاية",
  phone: "0500000000",
});

export const GOVERNMENT_EMERGENCY_CONTACTS = Object.freeze([
  { id: "ambulance", name: "الإسعاف", detail: "الهلال الأحمر السعودي", number: "997", tone: "danger" },
  { id: "police", name: "الشرطة", detail: "للبلاغات الأمنية", number: "999", tone: "navy" },
  { id: "civil-defense", name: "الدفاع المدني", detail: "الحرائق والإنقاذ", number: "998", tone: "orange" },
  { id: "health", name: "وزارة الصحة", detail: "استشارات وخدمات صحية", number: "937", tone: "green" },
]);

const toText = (value) => typeof value === "string" ? value : value == null ? "" : String(value);

export const normalizeHealthCard = (value = {}) => Object.fromEntries(
  Object.keys(EMPTY_HEALTH_CARD).map((key) => [key, toText(value?.[key] ?? EMPTY_HEALTH_CARD[key])])
);

export const normalizeEmergencyContact = (value = {}) => ({
  ...EMPTY_EMERGENCY_CONTACT,
  ...Object.fromEntries(Object.keys(EMPTY_EMERGENCY_CONTACT).map((key) => [key, toText(value?.[key])])),
  phone: sanitizePhoneNumber(value?.phone),
});

export function sanitizePhoneNumber(value) {
  const raw = toText(value).trim();
  const digits = raw.replace(/\D/g, "");
  return raw.startsWith("+") && digits ? `+${digits}` : digits;
}

export function createDialUri(value) {
  const phone = sanitizePhoneNumber(value);
  return /^\+?\d{3,15}$/.test(phone) ? `tel:${phone}` : null;
}

export const hasHealthCardData = (card) => [
  "bloodType",
  "birthDate",
  "chronicConditions",
  "allergies",
  "currentMedications",
  "treatingHospital",
  "physicianName",
  "medicalRecordNumber",
  "insuranceCompany",
  "insuranceMembershipNumber",
  "medicalNotes",
].some((key) => Boolean(toText(card?.[key]).trim()));

