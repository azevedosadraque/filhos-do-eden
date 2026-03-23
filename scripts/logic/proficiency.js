import { getFDEData } from "../helpers/fde-data.js";
import { getCycleData } from "../data/cycles.js";

export function normalizeProficiencyLevel(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric >= 2) return 2;
  if (numeric >= 1) return 1;
  if (numeric >= 0.5) return 0.5;
  return 0;
}

export function getProficiencyBonusFromCycle(ciclo) {
  const cycle = Math.max(1, Math.min(6, Number(ciclo) || 1));
  const cycleData = getCycleData(cycle);
  return cycleData?.proficiencyBonus ?? (cycle + 1);
}

export function getActorCycle(actor) {
  return Number(getFDEData(actor)?.ciclo ?? actor?.getFlag?.("filhos-do-eden", "data")?.ciclo ?? 1);
}

export function getActorProficiencyBonus(actor) {
  const cycle = getActorCycle(actor);
  return getProficiencyBonusFromCycle(cycle);
}

export function getAbilityMod(actor, abilityId) {
  const key = String(abilityId ?? "").trim().toLowerCase();
  if (!key) return 0;

  const ability = actor?.system?.abilities?.[key] ?? {};
  const explicitMod = Number(ability?.mod);
  if (Number.isFinite(explicitMod)) return explicitMod;

  const score = Number(ability?.value ?? 10);
  return Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
}

export function getNumericBonus(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
