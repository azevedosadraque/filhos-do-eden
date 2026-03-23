import { FDE_SKILLS, getAllSkillDefinitions, getSkillAbility as getCatalogSkillAbility, getSkillDefinition, getSkillLabel, normalizeSkillId } from "../data/skills.js";
import { getFDEData } from "../helpers/fde-data.js";
import { getAbilityMod, getActorProficiencyBonus, getNumericBonus, normalizeProficiencyLevel } from "./proficiency.js";

function getSkillSourcesRecord(actor) {
  return getFDEData(actor)?.pericias?.fontes ?? {};
}

export function getSkillAbility(skillId) {
  return getCatalogSkillAbility(skillId);
}

export function getSkillProficiencyLevel(actor, skillId) {
  const normalized = normalizeSkillId(skillId);
  if (!normalized) return 0;

  const fdeData = getFDEData(actor);
  const isFDEManaged = Boolean(String(fdeData?.casta ?? "").trim());
  const sourceEntries = Array.isArray(getSkillSourcesRecord(actor)?.[normalized])
    ? getSkillSourcesRecord(actor)[normalized]
    : [];
  const manualOverride = sourceEntries.find((entry) => entry?.source === "manual-override");
  const manualOverrideLevel = normalizeProficiencyLevel(manualOverride?.value);
  if (manualOverride?.source === "manual-override") {
    return Math.max(0, Math.min(2, Math.trunc(manualOverrideLevel)));
  }

  const nativeValue = normalizeProficiencyLevel(actor?.system?.skills?.[normalized]?.value ?? 0);
  const hasModuleSource = sourceEntries.length > 0;
  const hasModuleExpertise = fdeData?.pericias?.especializacoes?.some((entry) => entry?.type === "skill" && normalizeSkillId(entry?.target) === normalized) ?? false;

  let derived = hasModuleExpertise ? 2 : (hasModuleSource ? 1 : 0);
  if (!isFDEManaged && nativeValue === 0.5 && derived < 1) derived = 0.5;
  return isFDEManaged ? derived : Math.max(nativeValue, derived);
}

export function hasSkillProficiency(actor, skillId) {
  return getSkillProficiencyLevel(actor, skillId) >= 1;
}

export function hasSkillExpertise(actor, skillId) {
  return getSkillProficiencyLevel(actor, skillId) >= 2;
}

export function getSkillOriginEntries(actor, skillId) {
  const normalized = normalizeSkillId(skillId);
  if (!normalized) return [];
  const entries = getSkillSourcesRecord(actor)?.[normalized];
  return Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
}

export function getSkillOriginLabel(entry) {
  switch (entry?.source) {
    case "casta-fixed": return "Casta";
    case "casta-choice": return "Escolha da Casta";
    case "cycle": return `Ciclo ${entry?.cycle ?? "-"}`;
    case "manual": return "Manual";
    case "manual-override": return "Manual";
    default: return entry?.label ?? "Outra Fonte";
  }
}

export function getSkillOriginText(actor, skillId) {
  const pieces = getSkillOriginEntries(actor, skillId).map(getSkillOriginLabel);
  if (hasSkillExpertise(actor, skillId)) pieces.push("Especialização");
  return [...new Set(pieces)].join(" · ");
}

function makeBadge(label, tone = "neutral") {
  return { label, tone };
}

export function getSkillOriginBadges(actor, skillId) {
  const normalized = normalizeSkillId(skillId);
  if (!normalized) return [];

  const badges = [];
  for (const entry of getSkillOriginEntries(actor, normalized)) {
    switch (entry?.source) {
      case "casta-fixed":
        badges.push(makeBadge("Casta", "casta"));
        break;
      case "casta-choice":
        badges.push(makeBadge("Escolha da Casta", "choice"));
        break;
      case "cycle":
        badges.push(makeBadge(`Ciclo ${entry?.cycle ?? "-"}`, "cycle"));
        break;
      case "manual":
        badges.push(makeBadge("Manual", "manual"));
        break;
      case "manual-override":
        badges.push(makeBadge("Manual", "manual"));
        break;
      default:
        badges.push(makeBadge(entry?.label ?? "Outra Fonte", "neutral"));
        break;
    }
  }

  if (hasSkillExpertise(actor, normalized)) {
    badges.push(makeBadge("Especialização", "expertise"));
  }

  return badges.filter((badge, index, list) => list.findIndex((entry) => entry.label === badge.label) === index);
}

export function getSkillStatusBadges(actor, skillId) {
  const level = getSkillProficiencyLevel(actor, skillId);
  const badges = [];

  if (level >= 2) {
    badges.push(makeBadge("Especialização", "expertise"));
  } else if (level >= 1) {
    badges.push(makeBadge("Proficiente", "trained"));
  } else if (level >= 0.5) {
    badges.push(makeBadge("Meia Prof.", "half"));
  } else {
    badges.push(makeBadge("Sem Prof.", "muted"));
  }

  return badges;
}

export function getSkillTotal(actor, skillId) {
  const normalized = normalizeSkillId(skillId);
  if (!normalized) return 0;

  const abilityId = getCatalogSkillAbility(normalized) ?? String(actor?.system?.skills?.[normalized]?.ability ?? "").toLowerCase();
  const abilityMod = getAbilityMod(actor, abilityId);
  const proficiencyBonus = getActorProficiencyBonus(actor);
  const proficiencyLevel = getSkillProficiencyLevel(actor, normalized);
  const profPart = Math.floor(proficiencyBonus * proficiencyLevel);
  const checkBonus = getNumericBonus(actor?.system?.skills?.[normalized]?.bonuses?.check ?? 0);
  return abilityMod + profPart + checkBonus;
}

export function getSkillPassive(actor, skillId) {
  return 10 + getSkillTotal(actor, skillId);
}

export function getSkillRows(actor) {
  const skillLabels = globalThis.CONFIG?.DND5E?.skills ?? {};
  const abilityLabels = globalThis.CONFIG?.DND5E?.abilities ?? {};

  return getAllSkillDefinitions()
    .filter((entry) => actor?.system?.skills?.[entry.id])
    .map((entry) => {
      const abilityId = getCatalogSkillAbility(entry.id) ?? actor?.system?.skills?.[entry.id]?.ability;
      const total = getSkillTotal(actor, entry.id);
      const proficiencyLevel = getSkillProficiencyLevel(actor, entry.id);
      const label = typeof skillLabels[entry.id] === "string" ? globalThis.game?.i18n?.localize?.(skillLabels[entry.id]) ?? entry.label : entry.label;
      const abilityLabelRaw = abilityLabels[abilityId];
      const abilityLabel = typeof abilityLabelRaw === "string"
        ? globalThis.game?.i18n?.localize?.(abilityLabelRaw) ?? abilityId?.toUpperCase?.() ?? "-"
        : String(abilityId ?? "-").toUpperCase();

      return {
        id: entry.id,
        label,
        ability: abilityLabel,
        abilityId,
        total,
        totalLabel: total >= 0 ? `+${total}` : String(total),
        passive: getSkillPassive(actor, entry.id),
        proficiencyLevel,
        proficiency: proficiencyLevel >= 2 ? "Especialização" : proficiencyLevel >= 1 ? "Proficiente" : proficiencyLevel >= 0.5 ? "Meia Prof." : "Sem Prof.",
        expertise: proficiencyLevel >= 2,
        origin: getSkillOriginText(actor, entry.id),
        statusBadges: getSkillStatusBadges(actor, entry.id),
        originBadges: getSkillOriginBadges(actor, entry.id)
      };
    });
}

export function buildSkillSyncUpdate(actor) {
  const updateData = {
    "system.attributes.prof": getActorProficiencyBonus(actor)
  };

  for (const skillId of Object.keys(FDE_SKILLS)) {
    if (!actor?.system?.skills?.[skillId]) continue;
    updateData[`system.skills.${skillId}.ability`] = getCatalogSkillAbility(skillId);
    updateData[`system.skills.${skillId}.value`] = getSkillProficiencyLevel(actor, skillId);
  }

  return updateData;
}

export function getAvailableSkillChoices(actor) {
  return getAllSkillDefinitions().map((entry) => ({
    id: entry.id,
    label: getSkillLabel(entry.id),
    disabled: hasSkillProficiency(actor, entry.id)
  }));
}

export function getAvailableExpertiseSkillChoices(actor) {
  return getAllSkillDefinitions().map((entry) => ({
    id: entry.id,
    label: getSkillLabel(entry.id),
    disabled: !hasSkillProficiency(actor, entry.id) || hasSkillExpertise(actor, entry.id)
  }));
}
