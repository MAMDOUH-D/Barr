import test from "node:test";
import assert from "node:assert/strict";
import {
  createDialUri,
  hasHealthCardData,
  normalizeEmergencyContact,
  normalizeHealthCard,
  sanitizePhoneNumber,
} from "./healthSafety.js";

test("phone input is reduced to a safe telephone number", () => {
  assert.equal(sanitizePhoneNumber("+966 50 123 4567"), "+966501234567");
  assert.equal(createDialUri("997"), "tel:997");
  assert.equal(createDialUri("javascript:alert(1)"), null);
  assert.equal(createDialUri("12"), null);
});

test("saved health and emergency data are normalized before use", () => {
  const card = normalizeHealthCard({ fullName: "دعث", bloodType: "O+", insuranceCompany: "شركة التأمين", insuranceMembershipNumber: 12345, allergies: null });
  const contact = normalizeEmergencyContact({ name: "ممدوح", relationship: "ابن", phone: "050-123-4567" });

  assert.equal(card.bloodType, "O+");
  assert.equal(card.allergies, "");
  assert.equal(card.insuranceCompany, "شركة التأمين");
  assert.equal(card.insuranceMembershipNumber, "12345");
  assert.equal(contact.phone, "0501234567");
  assert.equal(hasHealthCardData(card), true);
  assert.equal(hasHealthCardData(normalizeHealthCard()), false);
});

