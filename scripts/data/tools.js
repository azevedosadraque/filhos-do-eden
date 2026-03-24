import { slugify } from "../helpers/fde-data.js";

const tool = (data) => Object.freeze(data);

export const FDE_TOOLS = Object.freeze({
  "thieves-tools": tool({ id: "thieves-tools", label: "Ferramentas de Ladrão", defaultAbility: "dex", flexibleAbilities: ["dex", "int"], aliases: ["thieves tools", "ferramentas de ladrao", "ferramentas de ladrão", "ladrao", "ladrão"] }),
  "disguise-kit": tool({ id: "disguise-kit", label: "Kit de Disfarce", defaultAbility: "cha", flexibleAbilities: ["cha", "int"], aliases: ["disguise kit", "kit de disfarce"] }),
  "forgery-kit": tool({ id: "forgery-kit", label: "Kit de Falsificação", defaultAbility: "int", flexibleAbilities: ["dex", "int"], aliases: ["forgery kit", "kit de falsificacao", "kit de falsificação"] }),
  "herbalism-kit": tool({ id: "herbalism-kit", label: "Kit de Herbalismo", defaultAbility: "wis", flexibleAbilities: ["wis", "int"], aliases: ["herbalism kit", "kit de herbalismo"] }),
  "healers-kit": tool({ id: "healers-kit", label: "Valise de Medicina", defaultAbility: "wis", flexibleAbilities: ["wis", "int"], aliases: ["healer's kit", "healers kit", "valise de medicina", "kit de curandeiro"] }),
  "poisoners-kit": tool({ id: "poisoners-kit", label: "Kit de Venenos", defaultAbility: "int", flexibleAbilities: ["dex", "int", "wis"], aliases: ["poisoner's kit", "poisoners kit", "kit de venenos"] }),
  "navigator-tools": tool({ id: "navigator-tools", label: "Ferramentas de Navegação", defaultAbility: "int", flexibleAbilities: ["int", "wis"], aliases: ["navigator's tools", "navigator tools", "ferramentas de navegacao", "ferramentas de navegação"] }),
  "artisan-tools": tool({ id: "artisan-tools", label: "Ferramentas de Artesão", defaultAbility: "int", flexibleAbilities: ["str", "dex", "int", "wis"], aliases: ["artisan tools", "ferramentas de artesao", "ferramentas de artesão"] }),
  "musical-instrument": tool({ id: "musical-instrument", label: "Instrumento Musical", defaultAbility: "cha", flexibleAbilities: ["cha", "dex", "wis"], aliases: ["musical instrument", "instrumento musical"] }),
  "gaming-set": tool({ id: "gaming-set", label: "Jogo de Apostas", defaultAbility: "int", flexibleAbilities: ["int", "wis", "cha"], aliases: ["gaming set", "jogo", "jogo de apostas"] })
});

function normalizeLookup(value) {
  return slugify(value).replace(/-/g, "");
}

const TOOL_LOOKUP = new Map();
for (const entry of Object.values(FDE_TOOLS)) {
  TOOL_LOOKUP.set(normalizeLookup(entry.id), entry.id);
  TOOL_LOOKUP.set(normalizeLookup(entry.label), entry.id);
  for (const alias of entry.aliases ?? []) {
    TOOL_LOOKUP.set(normalizeLookup(alias), entry.id);
  }
}

export function getToolDefinition(toolIdOrName) {
  const raw = String(toolIdOrName ?? "").trim();
  if (!raw) return null;

  const normalized = normalizeLookup(raw);
  const toolId = FDE_TOOLS[raw]?.id ?? TOOL_LOOKUP.get(normalized);
  if (toolId) return FDE_TOOLS[toolId] ?? null;

  const fallbackId = slugify(raw);
  return {
    id: fallbackId,
    label: raw,
    defaultAbility: "dex",
    flexibleAbilities: ["str", "dex", "con", "int", "wis", "cha"],
    aliases: [raw],
    inferred: true
  };
}

export function normalizeToolId(toolIdOrName) {
  return getToolDefinition(toolIdOrName)?.id ?? null;
}

export function getToolLabel(toolIdOrName) {
  return getToolDefinition(toolIdOrName)?.label ?? String(toolIdOrName ?? "");
}

export function getToolDefaultAbility(toolIdOrName) {
  return getToolDefinition(toolIdOrName)?.defaultAbility ?? "dex";
}

export function getToolAbilityOptions(toolIdOrName) {
  return [...(getToolDefinition(toolIdOrName)?.flexibleAbilities ?? ["dex"])];
}

export function getAllToolDefinitions() {
  return Object.values(FDE_TOOLS);
}
