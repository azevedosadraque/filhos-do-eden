const skill = (data) => Object.freeze(data);

export const FDE_SKILLS = Object.freeze({
  acr: skill({ id: "acr", label: "Acrobacia", ability: "dex", aliases: ["acrobatics", "acrobacia"] }),
  ani: skill({ id: "ani", label: "Lidar com Animais", ability: "wis", aliases: ["animal handling", "animalhandling", "lidar com animais"] }),
  arc: skill({ id: "arc", label: "Arcana", ability: "int", aliases: ["arcana", "arcano"] }),
  ath: skill({ id: "ath", label: "Vigor", ability: "str", aliases: ["athletics", "vigor", "atletismo"] }),
  dec: skill({ id: "dec", label: "Ludibriar", ability: "cha", aliases: ["deception", "ludibriar", "blefar"] }),
  his: skill({ id: "his", label: "História", ability: "int", aliases: ["history", "historia"] }),
  ins: skill({ id: "ins", label: "Perspicácia", ability: "wis", aliases: ["insight", "perspicacia"] }),
  itm: skill({ id: "itm", label: "Intimidação", ability: "cha", aliases: ["intimidation", "intimidacao"] }),
  inv: skill({ id: "inv", label: "Investigação", ability: "int", aliases: ["investigation", "investigacao"] }),
  med: skill({ id: "med", label: "Medicina", ability: "wis", aliases: ["medicine", "medicina"] }),
  nat: skill({ id: "nat", label: "Natureza", ability: "int", aliases: ["nature", "natureza"] }),
  prc: skill({ id: "prc", label: "Percepção", ability: "wis", aliases: ["perception", "percepcao"] }),
  prf: skill({ id: "prf", label: "Performance", ability: "cha", aliases: ["performance", "atuacao"] }),
  per: skill({ id: "per", label: "Persuasão", ability: "cha", aliases: ["persuasion", "persuasao"] }),
  rel: skill({ id: "rel", label: "Religião", ability: "int", aliases: ["religion", "religiao"] }),
  slt: skill({ id: "slt", label: "Prestidigitação", ability: "dex", aliases: ["sleight of hand", "sleightofhand", "prestidigitacao"] }),
  ste: skill({ id: "ste", label: "Furtividade", ability: "dex", aliases: ["stealth", "furtividade"] }),
  sur: skill({ id: "sur", label: "Sobrevivência", ability: "wis", aliases: ["survival", "sobrevivencia"] })
});

export const FDE_SKILL_ORDER = Object.freeze([
  "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv",
  "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
]);

function normalizeLookup(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const SKILL_LOOKUP = new Map();
for (const entry of Object.values(FDE_SKILLS)) {
  SKILL_LOOKUP.set(normalizeLookup(entry.id), entry.id);
  SKILL_LOOKUP.set(normalizeLookup(entry.label), entry.id);
  for (const alias of entry.aliases ?? []) {
    SKILL_LOOKUP.set(normalizeLookup(alias), entry.id);
  }
}

export function getSkillDefinition(skillIdOrName) {
  const normalized = normalizeLookup(skillIdOrName);
  const skillId = FDE_SKILLS[skillIdOrName]?.id ?? SKILL_LOOKUP.get(normalized);
  return skillId ? FDE_SKILLS[skillId] ?? null : null;
}

export function normalizeSkillId(skillIdOrName) {
  return getSkillDefinition(skillIdOrName)?.id ?? null;
}

export function getSkillAbility(skillIdOrName) {
  return getSkillDefinition(skillIdOrName)?.ability ?? null;
}

export function getSkillLabel(skillIdOrName) {
  return getSkillDefinition(skillIdOrName)?.label ?? String(skillIdOrName ?? "");
}

export function getAllSkillDefinitions() {
  return FDE_SKILL_ORDER.map((id) => FDE_SKILLS[id]).filter(Boolean);
}
