import { getAllToolDefinitions, getToolAbilityOptions, getToolDefaultAbility, getToolDefinition, getToolLabel, normalizeToolId } from "../data/tools.js";
import { getFDEData, slugify } from "../helpers/fde-data.js";
import { getAbilityMod, getActorProficiencyBonus, normalizeProficiencyLevel } from "./proficiency.js";

function getToolTrainingEntries(actor) {
  return getFDEData(actor)?.ferramentas?.treinadas ?? [];
}

function getToolExpertiseEntries(actor) {
  return getFDEData(actor)?.ferramentas?.especializacoes ?? [];
}

function getToolAbilityOverrides(actor) {
  return getFDEData(actor)?.ferramentas?.atributos ?? {};
}

function matchesTool(entry, toolId) {
  return normalizeToolId(entry?.toolId ?? entry?.target ?? entry?.id) === normalizeToolId(toolId);
}

function makeBadge(label, tone = "neutral") {
  return { label, tone };
}

export function getToolAbility(actor, toolId, abilityOverride = null) {
  const normalized = normalizeToolId(toolId);
  if (!normalized) return "dex";

  const explicit = String(abilityOverride ?? "").trim().toLowerCase();
  if (explicit) return explicit;

  const fromFlags = String(getToolAbilityOverrides(actor)?.[normalized] ?? "").trim().toLowerCase();
  if (fromFlags) return fromFlags;

  return getToolDefaultAbility(normalized);
}

export function getToolProficiencyLevel(actor, toolId) {
  const normalized = normalizeToolId(toolId);
  if (!normalized) return 0;

  const fdeData = getFDEData(actor);
  const hasCasta = Boolean(String(fdeData?.casta ?? "").trim());
  if (!hasCasta) return 0;

  const moduleTrained = getToolTrainingEntries(actor).some((entry) => matchesTool(entry, normalized));
  const moduleExpertise = getToolExpertiseEntries(actor).some((entry) => matchesTool(entry, normalized));

  // FDE sheet is module-managed; ignore native dnd5e fallback values.
  return moduleExpertise ? 2 : (moduleTrained ? 1 : 0);
}

export function hasToolProficiency(actor, toolId) {
  return getToolProficiencyLevel(actor, toolId) >= 1;
}

export function hasToolExpertise(actor, toolId) {
  return getToolProficiencyLevel(actor, toolId) >= 2;
}

export function getToolTotal(actor, toolId, ability = null) {
  const normalized = normalizeToolId(toolId);
  if (!normalized) return 0;

  const abilityId = getToolAbility(actor, normalized, ability);
  const abilityMod = getAbilityMod(actor, abilityId);
  const proficiencyBonus = getActorProficiencyBonus(actor);
  const proficiencyLevel = getToolProficiencyLevel(actor, normalized);
  return abilityMod + Math.floor(proficiencyBonus * proficiencyLevel);
}

export function getToolOriginText(actor, toolId) {
  const normalized = normalizeToolId(toolId);
  if (!normalized) return "";

  const labels = [];
  for (const entry of getToolTrainingEntries(actor)) {
    if (!matchesTool(entry, normalized)) continue;
    switch (entry?.source) {
      case "casta-choice": labels.push("Escolha da Casta"); break;
      case "casta-fixed": labels.push("Casta"); break;
      case "cycle": labels.push(`Ciclo ${entry?.cycle ?? "-"}`); break;
      default: labels.push(entry?.label ?? "Outra Fonte");
    }
  }

  if (hasToolExpertise(actor, normalized)) labels.push("Especialização");
  return [...new Set(labels)].join(" · ");
}

export function getToolOriginBadges(actor, toolId) {
  const normalized = normalizeToolId(toolId);
  if (!normalized) return [];

  const badges = [];
  for (const entry of getToolTrainingEntries(actor)) {
    if (!matchesTool(entry, normalized)) continue;

    switch (entry?.source) {
      case "casta-choice":
        badges.push(makeBadge("Escolha da Casta", "choice"));
        break;
      case "casta-fixed":
        badges.push(makeBadge("Casta", "casta"));
        break;
      case "cycle":
        badges.push(makeBadge(`Ciclo ${entry?.cycle ?? "-"}`, "cycle"));
        break;
      default:
        badges.push(makeBadge(entry?.label ?? "Outra Fonte", "neutral"));
        break;
    }
  }

  if (hasToolExpertise(actor, normalized)) {
    badges.push(makeBadge("Especialização", "expertise"));
  }

  return badges.filter((badge, index, list) => list.findIndex((entry) => entry.label === badge.label) === index);
}

export function getToolStatusBadges(actor, toolId) {
  const level = getToolProficiencyLevel(actor, toolId);
  if (level >= 2) return [makeBadge("Especialização", "expertise")];
  if (level >= 1) return [makeBadge("Proficiente", "trained")];
  return [makeBadge("Sem Prof.", "muted")];
}

export function getKnownToolIds(actor) {
  const ids = new Set();

  for (const entry of getAllToolDefinitions()) ids.add(entry.id);
  for (const entry of getToolTrainingEntries(actor)) {
    const normalized = normalizeToolId(entry?.toolId ?? entry?.target ?? entry?.id);
    if (normalized) ids.add(normalized);
  }
  for (const entry of getToolExpertiseEntries(actor)) {
    const normalized = normalizeToolId(entry?.toolId ?? entry?.target ?? entry?.id);
    if (normalized) ids.add(normalized);
  }
  for (const item of actor?.items ?? []) {
    if (item.type !== "tool") continue;
    ids.add(normalizeToolId(item.name ?? item.id) ?? slugify(item.name ?? item.id));
  }
  for (const key of Object.keys(actor?.system?.tools ?? {})) ids.add(normalizeToolId(key) ?? slugify(key));

  return [...ids].filter(Boolean).sort((a, b) => getToolLabel(a).localeCompare(getToolLabel(b), "pt-BR"));
}

export function getToolRows(actor) {
  return getKnownToolIds(actor)
    .map((toolId) => {
      const definition = getToolDefinition(toolId);
      const abilityId = getToolAbility(actor, toolId);
      const abilityLabelRaw = globalThis.CONFIG?.DND5E?.abilities?.[abilityId];
      const abilityLabel = typeof abilityLabelRaw === "string"
        ? globalThis.game?.i18n?.localize?.(abilityLabelRaw) ?? String(abilityId).toUpperCase()
        : String(abilityId).toUpperCase();
      const total = getToolTotal(actor, toolId);
      const abilityOptions = getToolAbilityOptions(toolId).map((optionId) => {
        const rawLabel = globalThis.CONFIG?.DND5E?.abilities?.[optionId];
        const label = typeof rawLabel === "string"
          ? globalThis.game?.i18n?.localize?.(rawLabel) ?? String(optionId).toUpperCase()
          : String(optionId).toUpperCase();
        return { value: optionId, label };
      });
      return {
        id: definition.id,
        label: definition.label,
        abilityId,
        ability: abilityLabel,
        total,
        totalLabel: total >= 0 ? `+${total}` : String(total),
        proficiencyLevel: getToolProficiencyLevel(actor, toolId),
        proficiency: hasToolExpertise(actor, toolId) ? "Especialização" : hasToolProficiency(actor, toolId) ? "Proficiente" : "Sem Prof.",
        origin: getToolOriginText(actor, toolId),
        abilityOptions,
        statusBadges: getToolStatusBadges(actor, toolId),
        originBadges: getToolOriginBadges(actor, toolId)
      };
    })
    .filter((entry) => entry.proficiencyLevel > 0 || !entry.id.startsWith("artisan-tools") || entry.origin);
}

export function getAvailableToolChoices(actor) {
  return getKnownToolIds(actor).map((toolId) => ({
    id: toolId,
    label: getToolLabel(toolId),
    disabled: hasToolProficiency(actor, toolId)
  }));
}

export function getAvailableExpertiseToolChoices(actor) {
  return getKnownToolIds(actor).map((toolId) => ({
    id: toolId,
    label: getToolLabel(toolId),
    disabled: !hasToolProficiency(actor, toolId) || hasToolExpertise(actor, toolId)
  }));
}

export function buildToolSyncPlan(actor) {
  const actorUpdate = {};
  const itemUpdates = [];

  for (const toolId of getKnownToolIds(actor)) {
    const level = getToolProficiencyLevel(actor, toolId);
    if (actor?.system?.tools?.[toolId]) {
      actorUpdate[`system.tools.${toolId}.value`] = level;
      actorUpdate[`system.tools.${toolId}.proficient`] = level;
      actorUpdate[`system.tools.${toolId}.prof`] = level;
      actorUpdate[`system.tools.${toolId}.ability`] = getToolAbility(actor, toolId);
    }
  }

  for (const item of actor?.items ?? []) {
    if (item.type !== "tool") continue;
    const toolId = normalizeToolId(item.name ?? item.id);
    if (!toolId) continue;
    const level = getToolProficiencyLevel(actor, toolId);
    itemUpdates.push({
      item,
      data: {
        "system.proficient": level,
        "system.proficiency.value": level,
        [`flags.filhos-do-eden.toolId`]: toolId,
        [`flags.filhos-do-eden.toolAbility`]: getToolAbility(actor, toolId)
      }
    });
  }

  return { actorUpdate, itemUpdates };
}
