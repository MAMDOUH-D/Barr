import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_CONTINUITY_TASK,
  DEMO_CONTINUITY_TASKS,
  ensureDemoTask,
  evaluateContinuity,
  normalizeFamilyName,
  repairContinuityRequirement,
} from "./continuityEngine.js";

test("demo fails only because access to medication is missing", () => {
  assert.equal(DEMO_CONTINUITY_TASK.continuity.primary, "ممدوح");
  assert.equal(DEMO_CONTINUITY_TASK.continuity.backup, "مدعث");
  const result = evaluateContinuity(DEMO_CONTINUITY_TASK);
  assert.equal(result.status, "FAIL");
  assert.deepEqual(result.missing.map(({ key }) => key), ["canAccessResource"]);
  assert.equal(result.readyCount, 5);
});

test("three demo scenarios expose three different failure causes", () => {
  assert.equal(DEMO_CONTINUITY_TASKS.length, 3);
  assert.equal(DEMO_CONTINUITY_TASKS[1].continuity.primary, "مفلح");
  assert.deepEqual(
    DEMO_CONTINUITY_TASKS.map((task) => evaluateContinuity(task).missing.map(({ key }) => key)),
    [["canAccessResource"], ["knowsInstructions"], ["available"]],
  );
});

test("legacy family name is migrated to Muflih", () => {
  assert.equal(normalizeFamilyName("صاهود"), "مفلح");
  const [task] = ensureDemoTask([{id:"legacy",continuity:{primary:"صاهود",backup:"عبدالله",requirements:{}}}]);
  assert.equal(task.continuity.primary, "مفلح");
});

test("repairing the missing requirement makes the proof pass", () => {
  const repaired = repairContinuityRequirement(DEMO_CONTINUITY_TASK, "canAccessResource");
  const result = evaluateContinuity(repaired);
  assert.equal(result.status, "PASS");
  assert.equal(result.readyCount, result.totalCount);
  assert.equal(DEMO_CONTINUITY_TASK.continuity.requirements.canAccessResource, false);
});

test("refresh hydration resets a completed demo to its failure state", () => {
  const completed = repairContinuityRequirement(DEMO_CONTINUITY_TASK, "canAccessResource");
  assert.equal(evaluateContinuity(completed).status, "PASS");

  const reset = ensureDemoTask([completed]).find(({ id }) => id === completed.id);
  assert.equal(evaluateContinuity(reset).status, "FAIL");
  assert.deepEqual(evaluateContinuity(reset).missing.map(({ key }) => key), ["canAccessResource"]);
});

test("existing schedules receive one demo without duplication", () => {
  const once = ensureDemoTask([{ id: "existing", name: "مهمة" }]);
  const twice = ensureDemoTask(once);
  assert.equal(twice.filter(({ demoOnly }) => demoOnly).length, 3);
  assert.equal(new Set(twice.map(({ id }) => id)).size, twice.length);
});
