import { getCastaSkillPackage, normalizeCastaId } from "../data/castas.js";
import { createDefaultFDEData, getFDEData, setFDEData } from "./fde-data.js";
import { synchronizeDerivedProgression } from "../logic/progression.js";
import { applyStartingSkillPackage, grantCycleSkillChoice, recalculateAllSkillData } from "../logic/progression-skills.js";

export async function resetManagedProficiencyState(actor) {
  const actorUpdate = {};

  for (const abilityId of Object.keys(actor?.system?.abilities ?? {})) {
    actorUpdate[`system.abilities.${abilityId}.proficient`] = 0;
  }

  for (const skillId of Object.keys(actor?.system?.skills ?? {})) {
    actorUpdate[`system.skills.${skillId}.value`] = 0;
  }

  for (const toolId of Object.keys(actor?.system?.tools ?? {})) {
    actorUpdate[`system.tools.${toolId}.value`] = 0;
    actorUpdate[`system.tools.${toolId}.proficient`] = 0;
    actorUpdate[`system.tools.${toolId}.prof`] = 0;
  }

  if (Object.keys(actorUpdate).length) {
    await actor.update(actorUpdate);
  }

  for (const abilityId of Object.keys(actor?.system?.abilities ?? {})) {
    if (actor.system.abilities?.[abilityId]) actor.system.abilities[abilityId].proficient = 0;
  }

  for (const skillId of Object.keys(actor?.system?.skills ?? {})) {
    if (actor.system.skills?.[skillId]) actor.system.skills[skillId].value = 0;
  }

  for (const toolId of Object.keys(actor?.system?.tools ?? {})) {
    if (actor.system.tools?.[toolId]) {
      actor.system.tools[toolId].value = 0;
      actor.system.tools[toolId].proficient = 0;
      actor.system.tools[toolId].prof = 0;
    }
  }

  const toolItems = (actor?.items ?? []).filter((item) => item.type === "tool");
  for (const item of toolItems) {
    await item.update({
      "system.proficient": 0,
      "system.proficiency.value": 0
    });

    if (item.system) {
      item.system.proficient = 0;
      if (item.system.proficiency) item.system.proficiency.value = 0;
    }
  }

  // Also clear persisted module-side proficiency sources so recalculation cannot restore old values.
  const fdeData = getFDEData(actor);
  fdeData.pericias = {
    ...(fdeData.pericias ?? {}),
    // Keep package marker aligned with current casta to avoid auto reapplication
    // of casta proficiencies right after a reset.
    pacoteInicialCasta: String(fdeData?.casta ?? "").trim(),
    fontes: {},
    escolhasLivres: [],
    especializacoes: [],
    ganhosPorCiclo: [],
    pendencias: []
  };
  fdeData.ferramentas = {
    ...(fdeData.ferramentas ?? {}),
    treinadas: [],
    especializacoes: [],
    atributos: {}
  };
  fdeData.recursosCasta = {
    ...(fdeData.recursosCasta ?? {}),
    // Legacy field still consumed by casta automation (e.g. Malakin).
    // Clearing it avoids reapplying expertise after a full reset.
    especializacoes: []
  };
  fdeData.proficienciasAlternativas = {
    armas: [],
    armaduras: [],
    escudos: []
  };

  await setFDEData(actor, fdeData);

  return { ok: true };
}

export async function ensureFDEActorData(actor) {
  if (actor.type !== "character") return null;
  const current = actor.getFlag("filhos-do-eden", "data");
  if (current) return current;
  const data = createDefaultFDEData();
  await actor.setFlag("filhos-do-eden", "data", data);
  return data;
}

export async function initializeActorSkillState(actor) {
  if (actor.type !== "character") return { ok: false, reason: "Tipo de ator não suportado." };
  await ensureFDEActorData(actor);

  const data = getFDEData(actor);
  if (data.casta && getCastaSkillPackage(data.casta) && data.pericias?.pacoteInicialCasta !== data.casta) {
    await applyStartingSkillPackage(actor, data.casta);
  }

  if (data.casta) {
    await synchronizeDerivedProgression(actor);
  }

  for (let cycle = 2; cycle <= Number(data.ciclo ?? 1); cycle += 1) {
    await grantCycleSkillChoice(actor, cycle);
  }

  return recalculateAllSkillData(actor);
}

export async function synchronizeActorSkillState(actor, previousData = null, nextData = null, options = {}) {
  if (actor.type !== "character") return { ok: false, reason: "Tipo de ator não suportado." };

  const previous = previousData ?? getFDEData(actor);
  const next = nextData ?? getFDEData(actor);
  const skipInitialPackage = Boolean(options?.skipInitialPackage);
  const normalizedNextCasta = normalizeCastaId(next.casta);
  const normalizedPackageCasta = normalizeCastaId(next.pericias?.pacoteInicialCasta);

  if (!skipInitialPackage && normalizedNextCasta && normalizedPackageCasta !== normalizedNextCasta) {
    await applyStartingSkillPackage(actor, next.casta);
  }

  if (next.casta) {
    await synchronizeDerivedProgression(actor, next);
  }

  if (Number(next.ciclo ?? 1) > Number(previous.ciclo ?? 1)) {
    for (let cycle = Number(previous.ciclo ?? 1) + 1; cycle <= Number(next.ciclo ?? 1); cycle += 1) {
      await grantCycleSkillChoice(actor, cycle);
    }
  }

  return recalculateAllSkillData(actor);
}

export async function saveAndSyncFDEData(actor, nextData, previousData = null) {
  await setFDEData(actor, nextData);
  return synchronizeActorSkillState(actor, previousData, nextData);
}
