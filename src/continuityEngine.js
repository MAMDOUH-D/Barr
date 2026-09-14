export const CONTINUITY_REQUIREMENTS = [
  { key: "available", label: "التوفر وقت المهمة", repairLabel: "تأكيد توفر البديل" },
  { key: "knowsInstructions", label: "معرفة تعليمات الدواء", repairLabel: "مشاركة تعليمات الدواء" },
  { key: "hasSkill", label: "القدرة على تنفيذ المهمة", repairLabel: "تأكيد القدرة على التنفيذ" },
  { key: "canReachPerson", label: "الوصول إلى دعث", repairLabel: "تجهيز الوصول إلى دعث" },
  { key: "canAccessResource", label: "الوصول إلى الدواء", repairLabel: "تم تجهيز الوصول" },
  { key: "resourceAvailable", label: "توفر دواء دعث", repairLabel: "توفير الدواء" },
];

export const DEMO_CONTINUITY_TASK = {
  id: "continuity_demo_9pm",
  name: "دواء دعث الساعة 9",
  dose: "جرعة المساء — سيناريو توضيحي",
  time: "21:00",
  type: "medication",
  icon: "💊",
  meal: "العشاء",
  demoOnly: true,
  continuity: {
    primary: "ممدوح",
    backup: "مدعث",
    importance: "critical",
    requirements: {
      available: true,
      knowsInstructions: true,
      hasSkill: true,
      canReachPerson: true,
      canAccessResource: false,
      resourceAvailable: true,
    },
  },
};

export const DEMO_CONTINUITY_TASKS = [
  DEMO_CONTINUITY_TASK,
  {
    id: "continuity_demo_morning",
    name: "دواء دعث الصباحي",
    dose: "جرعة الصباح — سيناريو توضيحي",
    time: "08:00",
    type: "medication",
    icon: "💊",
    meal: "الفطور",
    demoOnly: true,
    continuity: {
      primary: "صاهود",
      backup: "عبدالله",
      importance: "critical",
      requirements: {
        available: true,
        knowsInstructions: false,
        hasSkill: true,
        canReachPerson: true,
        canAccessResource: true,
        resourceAvailable: true,
      },
    },
  },
  {
    id: "continuity_demo_noon",
    name: "دواء دعث وقت الظهر",
    dose: "جرعة الظهر — سيناريو توضيحي",
    time: "13:00",
    type: "medication",
    icon: "💊",
    meal: "الغداء",
    demoOnly: true,
    continuity: {
      primary: "مضحي",
      backup: "ماجد",
      importance: "critical",
      requirements: {
        available: false,
        knowsInstructions: true,
        hasSkill: true,
        canReachPerson: true,
        canAccessResource: true,
        resourceAvailable: true,
      },
    },
  },
];

export function normalizeContinuity(continuity = {}) {
  const requirements = {};
  for (const requirement of CONTINUITY_REQUIREMENTS) {
    requirements[requirement.key] = Boolean(continuity.requirements?.[requirement.key]);
  }

  return {
    primary: continuity.primary || "غير محدد",
    backup: continuity.backup || "غير محدد",
    importance: continuity.importance || "normal",
    requirements,
  };
}

export function evaluateContinuity(task) {
  const continuity = normalizeContinuity(task?.continuity);
  const missing = CONTINUITY_REQUIREMENTS.filter(
    (requirement) => !continuity.requirements[requirement.key],
  );

  return {
    status: missing.length === 0 ? "PASS" : "FAIL",
    readyCount: CONTINUITY_REQUIREMENTS.length - missing.length,
    totalCount: CONTINUITY_REQUIREMENTS.length,
    missing,
  };
}

export function repairContinuityRequirement(task, requirementKey) {
  if (!CONTINUITY_REQUIREMENTS.some(({ key }) => key === requirementKey)) return task;

  return {
    ...task,
    continuity: {
      ...normalizeContinuity(task.continuity),
      requirements: {
        ...normalizeContinuity(task.continuity).requirements,
        [requirementKey]: true,
      },
    },
  };
}

export function ensureDemoTask(schedule = []) {
  const demoIds = new Set(DEMO_CONTINUITY_TASKS.map(({ id }) => id));
  const normalized = schedule.filter(({ id }) => !demoIds.has(id)).map((task) => ({
    ...task,
    continuity: task.continuity ? normalizeContinuity(task.continuity) : undefined,
  }));

  return [...normalized, ...DEMO_CONTINUITY_TASKS.map((task) => structuredClone(task))];
}
