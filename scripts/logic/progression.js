import { getAuraBudget, getCycleData, getTechniqueSlotsForCycle } from "../data/cycles.js";
import { getCasta } from "../data/castas.js";
import { getTechnique, getTechniques } from "../data/tecnicas.js";
import { buildActorProgressionUpdate, createProgressionChatCard, getAverageHitPointsByCycle, getConModifier, parseHitDieSize, syncDerivedFeatureItems, syncManagedClassLevel } from "../helpers/actor-updates.js";
import { FDE_MODULE_ID, getFDEData, normalizeFDEData, setFDEData } from "../helpers/fde-data.js";
import { spendAura } from "./aura.js";
import { grantCycleSkillChoice, recalculateAllSkillData } from "./progression-skills.js";
import { canLearnTechnique, canUseTechnique, validateCycleChange, validateTechniqueKnownCounts } from "./validations.js";

const FDE_ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

const FDE_ABILITY_NAME_MAP = {
  forca: "str",
  destreza: "dex",
  constituicao: "con",
  inteligencia: "int",
  sabedoria: "wis",
  carisma: "cha"
};

const FDE_SKILL_NAME_MAP = {
  arcana: "arc",
  atletismo: "ath",
  atuacao: "prf",
  performance: "prf",
  furtividade: "ste",
  historia: "his",
  investigacao: "inv",
  medicina: "med",
  natureza: "nat",
  percepcao: "prc",
  perspicacia: "ins",
  religiao: "rel",
  sobrevivencia: "sur"
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAbilityLabel(abilityId) {
  const normalized = String(abilityId ?? "").trim().toLowerCase();
  const localized = globalThis.game?.i18n?.localize?.(`DND5E.Ability${normalized.toUpperCase()}`);
  if (localized && !localized.startsWith("DND5E.")) return localized;

  const fallbackLabels = {
    str: "Força",
    dex: "Destreza",
    con: "Constituição",
    int: "Inteligência",
    wis: "Sabedoria",
    cha: "Carisma"
  };

  return fallbackLabels[normalized] ?? normalized.toUpperCase();
}

function normalizeLookupValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeTextForParsing(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveAbilityId(rawValue, fallback = "wis") {
  const normalized = normalizeLookupValue(rawValue);
  return FDE_ABILITY_NAME_MAP[normalized] ?? fallback;
}

function resolveSkillId(rawValue) {
  const normalized = normalizeLookupValue(rawValue);
  return FDE_SKILL_NAME_MAP[normalized] ?? null;
}

function getAbilityModifier(actor, abilityId) {
  const ability = actor?.system?.abilities?.[abilityId];
  const storedMod = Number(ability?.mod);
  if (Number.isFinite(storedMod)) return Math.trunc(storedMod);

  const score = Number(ability?.value ?? 10);
  if (!Number.isFinite(score)) return 0;
  return Math.floor((score - 10) / 2);
}

export function getTechniqueSaveDC(actor, abilityId = "wis") {
  const proficiencyBonus = Number(getFDEData(actor)?.progressao?.bonusProficiencia ?? actor?.system?.attributes?.prof ?? 0) || 0;
  const abilityMod = getAbilityModifier(actor, abilityId);
  return {
    abilityId,
    abilityLabel: getAbilityLabel(abilityId),
    abilityMod,
    proficiencyBonus,
    dc: 8 + proficiencyBonus + abilityMod
  };
}

function buildDiceFormula(actor, amountText, scaleSuffix = "", bonusAbilityText = "") {
  const diceMatch = /^(\d+)d(\d+)$/i.exec(String(amountText ?? "").trim());
  if (diceMatch) {
    let quantity = Number(diceMatch[1]);
    const faces = Number(diceMatch[2]);
    const normalizedScale = normalizeLookupValue(scaleSuffix);
    if (normalizedScale.includes("porciclo")) quantity *= Math.max(1, Number(getFDEData(actor)?.ciclo ?? 1) || 1);

    let formula = `${quantity}d${faces}`;
    const bonusAbilityId = resolveAbilityId(bonusAbilityText, "");
    if (bonusAbilityId) {
      const abilityMod = getAbilityModifier(actor, bonusAbilityId);
      if (abilityMod > 0) formula += ` + ${abilityMod}`;
      if (abilityMod < 0) formula += ` - ${Math.abs(abilityMod)}`;
    }
    return formula;
  }

  const flatMatch = /^(\d+)$/i.exec(String(amountText ?? "").trim());
  if (flatMatch) {
    let amount = Number(flatMatch[1]);
    const normalizedScale = normalizeLookupValue(scaleSuffix);
    if (normalizedScale.includes("porciclo")) amount *= Math.max(1, Number(getFDEData(actor)?.ciclo ?? 1) || 1);
    return String(amount);
  }

  return null;
}

function getCurrentCycle(actor) {
  return Math.max(1, Number(getFDEData(actor)?.ciclo ?? 1) || 1);
}

function getActorProvince(actor) {
  return normalizeLookupValue(getFDEData(actor)?.recursosCasta?.provincia ?? "");
}

function actorKnowsTechnique(actor, techniqueId) {
  const known = getFDEData(actor)?.tecnicasConhecidas ?? [];
  return Array.isArray(known) && known.includes(techniqueId);
}

function getAllowedProvinces(actor) {
  const baseProvince = getActorProvince(actor);
  const all = ["fogo", "terra", "agua", "ar"];

  if (!baseProvince) return new Set(all);

  // While extra provinces are not fully modeled, Elementalista unlocks broad choice.
  if (actorKnowsTechnique(actor, "elementalista")) return new Set(all);

  return new Set([baseProvince]);
}

function isProvinceAllowed(actor, province) {
  const normalizedProvince = normalizeLookupValue(province);
  const allowed = getAllowedProvinces(actor);
  return allowed.has(normalizedProvince);
}

function getTechniqueAttackModifier(actor, abilityId = "dex") {
  const proficiencyBonus = Number(getFDEData(actor)?.progressao?.bonusProficiencia ?? actor?.system?.attributes?.prof ?? 0) || 0;
  return proficiencyBonus + getAbilityModifier(actor, abilityId);
}

function formatSignedNumber(value) {
  const numeric = Number(value) || 0;
  return numeric >= 0 ? `+${numeric}` : `${numeric}`;
}

function buildScaledFormula(diceCount, faces, multiplier = 1, flatBonus = 0) {
  const totalDice = Math.max(1, Number(diceCount) || 1) * Math.max(1, Number(multiplier) || 1);
  let formula = `${totalDice}d${Math.max(2, Number(faces) || 2)}`;
  const bonus = Number(flatBonus) || 0;
  if (bonus > 0) formula += ` + ${bonus}`;
  if (bonus < 0) formula += ` - ${Math.abs(bonus)}`;
  return formula;
}

function splitLines(value) {
  return uniqueEntries(String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean));
}

function parseIntegerField(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
}

function buildSaveButton(abilityId, dc, label = getAbilityLabel(abilityId), summary = null) {
  const displayLabel = String(label ?? getAbilityLabel(abilityId));
  return {
    type: "save",
    label: `Resistência ${displayLabel} CD ${dc}`,
    ability: abilityId,
    dc,
    saveLabel: displayLabel,
    summary: summary ?? `${displayLabel} contra CD ${dc}.`
  };
}

function buildAttackButton(actor, abilityId = "dex", label = null, modifier = null, summary = null) {
  const finalModifier = Number.isFinite(modifier) ? Number(modifier) : getTechniqueAttackModifier(actor, abilityId);
  const finalLabel = label ?? `Ataque (${getAbilityLabel(abilityId)})`;
  return {
    type: "attack",
    label: finalLabel,
    ability: abilityId,
    modifier: finalModifier,
    summary: summary ?? `Ataque com bônus ${formatSignedNumber(finalModifier)}.`
  };
}

function buildDamageButton(formula, damageType = "", label = null, summary = null) {
  const finalLabel = label ?? `Dano ${formula}`;
  const typeLabel = String(damageType ?? "").trim();
  return {
    type: "damage",
    label: finalLabel,
    formula,
    damageType: typeLabel,
    summary: summary ?? `Rolagem de dano: ${formula}${typeLabel ? ` (${typeLabel})` : ""}.`
  };
}

function buildHealButton(formula, label = null, summary = null) {
  return {
    type: "heal",
    label: label ?? `Cura ${formula}`,
    formula,
    summary: summary ?? `Rolagem de cura: ${formula}.`
  };
}

function hasFlexibleAuraCost(technique) {
  const normalized = normalizeTextForParsing(technique?.costAuraText ?? "");
  if (!technique) return false;
  if (!Number.isFinite(technique.costAura)) return true;
  if (String(technique.costAuraText ?? "").trim() === String(technique.costAura)) return false;

  return /(\bpor\b|\bou\b|\bmais\b|conforme|cada|extra|base|vezes|\+|×| x |aliado|passageiro|hora|horas|minuto|minutos|rodada|rodadas|dia|dias|metro|metros|metrico|metrica|sem custo proprio|ver descricao)/i.test(normalized);
}

function getProvinceSelectOptions(actor) {
  const actorProvince = getActorProvince(actor);
  const allowed = getAllowedProvinces(actor);
  const options = [
    { value: "fogo", label: "Fogo", selected: actorProvince === "fogo" },
    { value: "terra", label: "Terra", selected: actorProvince === "terra" },
    { value: "agua", label: "Água", selected: actorProvince === "agua" },
    { value: "ar", label: "Ar", selected: actorProvince === "ar" }
  ].filter((entry) => allowed.has(entry.value));

  if (!options.length) {
    return [
      { value: "fogo", label: "Fogo", selected: true },
      { value: "terra", label: "Terra", selected: false },
      { value: "agua", label: "Água", selected: false },
      { value: "ar", label: "Ar", selected: false }
    ];
  }

  if (!options.some((entry) => entry.selected)) {
    options[0].selected = true;
  }

  return options;
}

function getTechniqueCastBuilder(actor, technique) {
  const cycle = getCurrentCycle(actor);
  const defaultAttackModifier = getTechniqueAttackModifier(actor, "dex");
  const wisdomSave = getTechniqueSaveDC(actor, "wis");
  const intelligenceSave = getTechniqueSaveDC(actor, "int");

  switch (technique.id) {
    case "ataque-fulminante":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "variant",
            label: "Variante",
            type: "select",
            options: [
              { value: "circular", label: "Ataque Circular" },
              { value: "ponto-vital", label: "Ponto Vital" }
            ],
            value: "circular",
            help: "Cada versão usa um custo e uma automação diferente."
          },
          {
            name: "attackBonus",
            label: "Bônus de ataque usado",
            type: "number",
            value: defaultAttackModifier,
            step: 1,
            help: "Usado para calcular a CD do Ataque Circular e para o ataque do Ponto Vital."
          }
        ],
        resolve: (_actor, _technique, values) => {
          const variant = String(values.variant ?? "circular").trim();
          const attackBonus = parseIntegerField(values.attackBonus) ?? defaultAttackModifier;

          if (variant === "ponto-vital") {
            return {
              amount: 4,
              techniqueLabel: "Ataque Fulminante: Ponto Vital",
              contextLines: [
                "Variante: Ponto Vital.",
                `Bônus de ataque usado: ${formatSignedNumber(attackBonus)}.`,
                "Em acerto, o alvo faz Constituição CD 15 ou cai a 0 PV."
              ],
              suppressGenericAutomation: true,
              automationButtons: [
                buildAttackButton(actor, "dex", "Ataque", attackBonus),
                buildSaveButton("con", 15, "Constituição", "Constituição contra CD 15.")
              ],
              automationSummaryLines: [
                `Ataque com bônus ${formatSignedNumber(attackBonus)}.`,
                "Em acerto, Constituição contra CD 15 ou o alvo cai a 0 PV."
              ]
            };
          }

          const dc = 8 + attackBonus;
          return {
            amount: 2,
            techniqueLabel: "Ataque Fulminante: Ataque Circular",
            contextLines: [
              "Variante: Ataque Circular.",
              `CD calculada com o bônus de ataque informado: ${dc}.`,
              "Atinge todos ao redor com um único dano de arma."
            ],
            suppressGenericAutomation: true,
            automationButtons: [
              buildSaveButton("dex", dc, "Destreza", `Destreza contra CD ${dc}.`)
            ],
            automationSummaryLines: [
              `Destreza contra CD ${dc}.`,
              "Em falha, o alvo sofre o dano normal da arma."
            ]
          };
        }
      };
    case "conjurar-elementos":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "variant",
            label: "Elemento / modo",
            type: "select",
            options: [
              { value: "fogo-rajada", label: `Fogo: rajada (${cycle} disparos)` },
              { value: "fogo-concentrado", label: "Fogo: disparo concentrado" },
              { value: "agua", label: "Água / gelo" },
              { value: "terra-rajada", label: `Terra: rajada (${cycle} disparos)` },
              { value: "terra-concentrado", label: "Terra: disparo concentrado" },
              { value: "ar", label: "Ar: raio elétrico" }
            ],
            value: "fogo-rajada"
          }
        ],
        resolve: (_actor, _technique, values) => {
          const variant = String(values.variant ?? "fogo-rajada").trim();
          const variantProvinceMap = {
            "fogo-rajada": "fogo",
            "fogo-concentrado": "fogo",
            agua: "agua",
            "terra-rajada": "terra",
            "terra-concentrado": "terra",
            ar: "ar"
          };
          const requiredProvince = variantProvinceMap[variant] ?? "fogo";
          if (!isProvinceAllowed(actor, requiredProvince)) {
            return {
              ok: false,
              reason: "Esta variante não corresponde à província atualmente disponível para o personagem."
            };
          }

          const variantMap = {
            "fogo-rajada": {
              techniqueLabel: "Conjurar Elementos: Fogo",
              contextLines: [`Até ${cycle} chamas nesta rodada.`, "Cada ataque causa 2d8 de dano de fogo."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque de fogo"), buildDamageButton("2d8", "fogo")],
              automationSummaryLines: ["Ataque com Destreza para cada chama conjurada.", "Cada acerto causa 2d8 de dano de fogo."]
            },
            "fogo-concentrado": {
              techniqueLabel: "Conjurar Elementos: Fogo Concentrado",
              contextLines: ["Todo o poder concentrado em um único disparo."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque de fogo"), buildDamageButton(buildScaledFormula(2, 8, cycle), "fogo")],
              automationSummaryLines: [`Ataque com Destreza; em acerto, causa ${buildScaledFormula(2, 8, cycle)} de dano de fogo.`]
            },
            agua: {
              techniqueLabel: "Conjurar Elementos: Água / Gelo",
              contextLines: ["Lasca de gelo arremessada a distância."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque de gelo"), buildDamageButton(buildScaledFormula(2, 8, cycle), "frio")],
              automationSummaryLines: [`Ataque com Destreza; em acerto, causa ${buildScaledFormula(2, 8, cycle)} de dano de frio.`]
            },
            "terra-rajada": {
              techniqueLabel: "Conjurar Elementos: Terra",
              contextLines: [`Até ${cycle} projéteis de terra, pedra ou metal.`, "Cada ataque causa 2d8 de dano de perfuração."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque de terra"), buildDamageButton("2d8", "perfuracao")],
              automationSummaryLines: ["Ataque com Destreza para cada projétil.", "Cada acerto causa 2d8 de perfuração."]
            },
            "terra-concentrado": {
              techniqueLabel: "Conjurar Elementos: Terra Concentrada",
              contextLines: ["Projétil único mais pesado e concentrado."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque de terra"), buildDamageButton(buildScaledFormula(2, 8, cycle), "perfuracao")],
              automationSummaryLines: [`Ataque com Destreza; em acerto, causa ${buildScaledFormula(2, 8, cycle)} de perfuração.`]
            },
            ar: {
              techniqueLabel: "Conjurar Elementos: Ar",
              contextLines: ["Raio elétrico disparado contra um único alvo."],
              automationButtons: [buildAttackButton(actor, "dex", "Ataque elétrico"), buildDamageButton(buildScaledFormula(2, 8, cycle), "eletrico")],
              automationSummaryLines: [`Ataque com Destreza; em acerto, causa ${buildScaledFormula(2, 8, cycle)} de dano elétrico.`]
            }
          };

          return {
            amount: 0,
            suppressGenericAutomation: true,
            ...(variantMap[variant] ?? variantMap["fogo-rajada"])
          };
        }
      };
    case "flagelo-na-natureza":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "province",
            label: "Província",
            type: "select",
            options: getProvinceSelectOptions(actor),
            value: getActorProvince(actor) || "fogo"
          }
        ],
        resolve: (_actor, _technique, values) => {
          const province = String(values.province ?? (getActorProvince(actor) || "fogo")).trim();
          if (!isProvinceAllowed(actor, province)) {
            return {
              ok: false,
              reason: "A província escolhida não está disponível para o personagem."
            };
          }

          const provinceMap = {
            fogo: {
              techniqueLabel: "Flagelo na Natureza: Fogo",
              contextLines: ["Explosão em esfera de até 8 m de raio.", "Sucesso reduz o dano à metade."],
              automationButtons: [buildSaveButton("dex", wisdomSave.dc, "Destreza"), buildDamageButton("10d8", "fogo")],
              automationSummaryLines: [`Destreza contra CD ${wisdomSave.dc}; em falha, sofre 10d8 de dano de fogo.`]
            },
            terra: {
              techniqueLabel: "Flagelo na Natureza: Terra",
              contextLines: ["Alvo único a até 20 metros.", "Em falha, o alvo fica petrificado e pode repetir o teste a cada hora."],
              automationButtons: [buildSaveButton("con", wisdomSave.dc, "Constituição")],
              automationSummaryLines: [`Constituição contra CD ${wisdomSave.dc}; em falha, petrificação.`]
            },
            agua: {
              techniqueLabel: "Flagelo na Natureza: Água",
              contextLines: ["Cone de 20 metros.", "Sucesso reduz o dano à metade; falha também paralisa por 1d4 rodadas."],
              automationButtons: [buildSaveButton("dex", wisdomSave.dc, "Destreza"), buildDamageButton("8d6", "frio")],
              automationSummaryLines: [`Destreza contra CD ${wisdomSave.dc}; em falha, sofre 8d6 de dano de frio e fica congelado.`]
            },
            ar: {
              techniqueLabel: "Flagelo na Natureza: Ar",
              contextLines: ["Linha de 40 metros por 2 metros de largura.", "Sucesso reduz o dano à metade."],
              automationButtons: [buildSaveButton("dex", wisdomSave.dc, "Destreza"), buildDamageButton("10d8", "eletrico")],
              automationSummaryLines: [`Destreza contra CD ${wisdomSave.dc}; em falha, sofre 10d8 de dano elétrico.`]
            }
          };

          return {
            amount: 3,
            suppressGenericAutomation: true,
            ...(provinceMap[province] ?? provinceMap.fogo)
          };
        }
      };
    case "muralha-elemental":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "variant",
            label: "Forma elemental",
            type: "select",
            options: [
              { value: "fogo", label: "Muralha de Fogo" },
              { value: "pedra", label: "Muralha de Pedra" },
              { value: "gelo", label: "Muralha de Gelo" },
              { value: "ciclone", label: "Ciclone" }
            ],
            value: getActorProvince(actor) || "fogo"
          },
          {
            name: "shape",
            label: "Formato",
            type: "select",
            options: [
              { value: "muralha", label: "Muralha" },
              { value: "esfera", label: "Esfera" },
              { value: "semiesfera", label: "Semiesfera" },
              { value: "cubo", label: "Cubo" }
            ],
            value: "muralha",
            help: "Use o formato compatível com a variante escolhida."
          }
        ],
        resolve: (_actor, _technique, values) => {
          const variant = String(values.variant ?? (getActorProvince(actor) || "fogo")).trim();
          const variantProvinceMap = {
            fogo: "fogo",
            pedra: "terra",
            gelo: "agua",
            ciclone: "ar"
          };
          const requiredProvince = variantProvinceMap[variant] ?? "fogo";
          if (!isProvinceAllowed(actor, requiredProvince)) {
            return {
              ok: false,
              reason: "A forma elemental escolhida não está disponível para a província do personagem."
            };
          }

          const shape = String(values.shape ?? "muralha").trim();
          const shapeLabel = shape === "semiesfera" ? "semiesfera" : shape;
          const variantMap = {
            fogo: {
              techniqueLabel: "Muralha Elemental: Fogo",
              contextLines: [`Formato escolhido: ${shapeLabel}.`, "Quem atravessar a barreira sofre dano imediatamente."],
              automationButtons: [buildDamageButton("10d6", "fogo")],
              automationSummaryLines: ["Cruzar a barreira causa 10d6 de dano de fogo."]
            },
            pedra: {
              techniqueLabel: "Muralha Elemental: Pedra",
              contextLines: [`Formato escolhido: ${shapeLabel}.`, "CA 15 e 200 pontos de dano para abrir uma brecha.", "Permanece até ser desfeita."],
              automationButtons: [],
              automationSummaryLines: ["Estrutura física permanente, sem rolagem direta automatizada."]
            },
            gelo: {
              techniqueLabel: "Muralha Elemental: Gelo",
              contextLines: [`Formato escolhido: ${shapeLabel}.`, "Quem atravessar a brecha faz Constituição; sucesso reduz o dano à metade."],
              automationButtons: [buildSaveButton("con", wisdomSave.dc, "Constituição"), buildDamageButton("5d8", "frio")],
              automationSummaryLines: [`Constituição contra CD ${wisdomSave.dc}; em falha, sofre 5d8 de dano de frio.`]
            },
            ciclone: {
              techniqueLabel: "Muralha Elemental: Ciclone",
              contextLines: ["Barreira móvel em torno do grupo.", "Falha em Força arremessa para fora e causa 5d8; sucesso ainda causa 2d8 de corte."],
              automationButtons: [
                buildSaveButton("str", wisdomSave.dc, "Força"),
                buildDamageButton("5d8", "impacto", "Dano na falha"),
                buildDamageButton("2d8", "corte", "Dano no sucesso")
              ],
              automationSummaryLines: [`Força contra CD ${wisdomSave.dc}; falha causa 5d8 de impacto, sucesso causa 2d8 de corte.`]
            }
          };

          return {
            amount: 3,
            suppressGenericAutomation: true,
            ...(variantMap[variant] ?? variantMap.fogo)
          };
        }
      };
    case "sopro-do-tempo":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "mode",
            label: "Modo",
            type: "select",
            options: [
              { value: "rejuvenescer", label: "Rejuvenescer" },
              { value: "envelhecer-mortal", label: "Envelhecer mortal" },
              { value: "envelhecer-imortal", label: "Envelhecer imortal" }
            ],
            value: "rejuvenescer"
          }
        ],
        resolve: (_actor, _technique, values) => {
          const mode = String(values.mode ?? "rejuvenescer").trim();
          if (mode === "envelhecer-imortal") {
            return {
              amount: 5,
              techniqueLabel: "Sopro do Tempo: Envelhecer Imortal",
              contextLines: ["Afeta apenas Força e Destreza em imortais.", "Os efeitos terminam após um descanso longo."],
              suppressGenericAutomation: true,
              automationButtons: [buildSaveButton("con", intelligenceSave.dc, "Constituição")],
              automationSummaryLines: [`Constituição contra CD ${intelligenceSave.dc}; em falha, perde 1d6 de Força e Destreza temporariamente.`]
            };
          }

          if (mode === "envelhecer-mortal") {
            return {
              amount: 2,
              techniqueLabel: "Sopro do Tempo: Envelhecer Mortal",
              contextLines: ["Em falha, o alvo perde 1d6 de Força, Destreza e Constituição permanentemente."],
              suppressGenericAutomation: true,
              automationButtons: [buildSaveButton("con", intelligenceSave.dc, "Constituição")],
              automationSummaryLines: [`Constituição contra CD ${intelligenceSave.dc}; em falha, perde 1d6 de Força, Destreza e Constituição.`]
            };
          }

          return {
            amount: 2,
            techniqueLabel: "Sopro do Tempo: Rejuvenescer",
            contextLines: ["Restaura a forma física de outrora do alvo."],
            suppressGenericAutomation: true,
            automationButtons: [],
            automationSummaryLines: ["Sem rolagem automática: efeito narrativo/benéfico." ]
          };
        }
      };
    case "cura-pelas-maos":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "diceCount",
            label: "Aura gasta / dados",
            type: "number",
            value: 1,
            min: 1,
            step: 1,
            help: "Cada ponto de aura adiciona 1d12 + modificador de Sabedoria."
          }
        ],
        resolve: (_actor, _technique, values) => {
          const diceCount = Math.max(1, parseIntegerField(values.diceCount) ?? 1);
          const wisdomMod = getAbilityModifier(actor, "wis") * diceCount;
          const formula = buildScaledFormula(1, 12, diceCount, wisdomMod);

          return {
            amount: diceCount,
            techniqueLabel: "Cura pelas Mãos",
            contextLines: [`Aura gasta: ${diceCount}.`, `Fórmula total: ${formula}.`],
            suppressGenericAutomation: true,
            automationButtons: [buildHealButton(formula)],
            automationSummaryLines: [`Recupera ${formula} pontos de vida.`]
          };
        }
      };
    case "controlar-massas":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "baseTechnique",
            label: "Técnica projetada",
            type: "select",
            options: [
              { value: "bons-amigos", label: "Bons Amigos" },
              { value: "voz-de-comando", label: "Voz de Comando" },
              { value: "controlar-mentes", label: "Controlar Mentes" }
            ],
            value: "bons-amigos"
          }
        ],
        resolve: (_actor, _technique, values) => {
          const baseTechnique = String(values.baseTechnique ?? "bons-amigos").trim();
          const amountMap = {
            "bons-amigos": 8,
            "voz-de-comando": 8,
            "controlar-mentes": 12
          };
          const baseAutomation = getTechniqueAutomationData(actor, baseTechnique) ?? { summaryLines: [], buttons: [] };
          const baseName = getTechnique(baseTechnique)?.name ?? baseTechnique;

          return {
            amount: amountMap[baseTechnique] ?? 8,
            techniqueLabel: `Controlar Massas: ${baseName}`,
            contextLines: [
              `Técnica-base projetada: ${baseName}.`,
              "O mestre pode usar uma rolagem única para a multidão e rolagens individuais para alvos importantes."
            ],
            suppressGenericAutomation: true,
            automationButtons: baseAutomation.buttons,
            automationSummaryLines: [
              ...baseAutomation.summaryLines,
              "Aplique a mesma resolução à massa inteira ou por grupos, conforme a cena."
            ]
          };
        }
      };
    case "catastrofe":
      return {
        showNotes: true,
        controlsAmount: true,
        getFields: () => [
          {
            name: "province",
            label: "Província",
            type: "select",
            options: getProvinceSelectOptions(actor),
            value: getActorProvince(actor) || "fogo"
          }
        ],
        resolve: (_actor, _technique, values) => {
          const province = String(values.province ?? (getActorProvince(actor) || "fogo")).trim();
          if (!isProvinceAllowed(actor, province)) {
            return {
              ok: false,
              reason: "A manifestação escolhida não está disponível para a província do personagem."
            };
          }

          const provinceMap = {
            fogo: { amount: 30, label: "Catástrofe: Fogo", detail: "Nuvem Incendiária" },
            terra: { amount: 15, label: "Catástrofe: Terra", detail: "Terremoto" },
            agua: { amount: 15, label: "Catástrofe: Água", detail: "Tsunami" },
            ar: { amount: 15, label: "Catástrofe: Ar", detail: "Furacão" }
          };
          const selected = provinceMap[province] ?? provinceMap.fogo;

          return {
            amount: selected.amount,
            techniqueLabel: selected.label,
            contextLines: [
              `Manifestação escolhida: ${selected.detail}.`,
              "Área, dano e testes seguem a versão completa do suplemento."
            ],
            suppressGenericAutomation: true,
            automationButtons: [],
            automationSummaryLines: ["Efeito massivo dependente do suplemento; card contextualizado para referência rápida."]
          };
        }
      };
    default:
      return null;
  }
}

function uniqueEntries(entries = [], keyBuilder = (entry) => JSON.stringify(entry)) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = keyBuilder(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSaveEntries(actor, ruleText) {
  const entries = [];
  const text = normalizeTextForParsing(ruleText);
  const dynamicSaveRegex = /(teste de resistencia|resistencia|teste) de ([A-Za-zÀ-ÿ]+)(?: \([^)]+\))?[^.]{0,140}?(?:dificuldade|contra CD)\s*8\s*\+\s*(?:bonus de )?proficiencia\s*\+\s*(?:modificador de )?([A-Za-zÀ-ÿ]+) do (?:conjurador|atacante)/gi;
  const fixedSaveRegex = /(teste de resistencia|resistencia|teste) de ([A-Za-zÀ-ÿ]+)(?: \([^)]+\))?[^.]{0,140}?(?:dificuldade|contra CD)\s*(\d+)(?!\s*\+)/gi;

  for (const match of text.matchAll(dynamicSaveRegex)) {
    const saveAbilityId = resolveAbilityId(match[2], "wis");
    const castingAbilityId = resolveAbilityId(match[3], "wis");
    const saveData = getTechniqueSaveDC(actor, castingAbilityId);
    entries.push({
      type: "save",
      label: `Resistência ${getAbilityLabel(saveAbilityId)} CD ${saveData.dc}`,
      ability: saveAbilityId,
      dc: saveData.dc,
      saveLabel: getAbilityLabel(saveAbilityId),
      summary: `${getAbilityLabel(saveAbilityId)} contra CD ${saveData.dc}.`
    });
  }

  for (const match of text.matchAll(fixedSaveRegex)) {
    const saveAbilityId = resolveAbilityId(match[2], "wis");
    const dc = Number(match[3]);
    if (!Number.isFinite(dc)) continue;
    entries.push({
      type: "save",
      label: `Resistência ${getAbilityLabel(saveAbilityId)} CD ${dc}`,
      ability: saveAbilityId,
      dc,
      saveLabel: getAbilityLabel(saveAbilityId),
      summary: `${getAbilityLabel(saveAbilityId)} contra CD ${dc}.`
    });
  }

  return uniqueEntries(entries, (entry) => `${entry.type}:${entry.ability}:${entry.dc}`);
}

function extractCheckEntries(_actor, ruleText) {
  const entries = [];
  const text = normalizeTextForParsing(ruleText);
  const skillRegex = /(teste de|faca um teste de) ([A-Za-zÀ-ÿ]+) \(([A-Za-zÀ-ÿ]+)\),? dificuldade\s*(\d+)(?!\s*\+)/gi;
  const abilityRegex = /(teste de|faca um teste de) (?!resistencia\b)([A-Za-zÀ-ÿ]+),? dificuldade\s*(\d+)(?!\s*\+)/gi;

  for (const match of text.matchAll(skillRegex)) {
    const abilityId = resolveAbilityId(match[2], "wis");
    const skillId = resolveSkillId(match[3]);
    const dc = Number(match[4]);
    if (!skillId || !Number.isFinite(dc)) continue;
    entries.push({
      type: "skill",
      label: `Perícia ${match[3]} CD ${dc}`,
      ability: abilityId,
      skill: skillId,
      dc,
      summary: `Teste de ${match[2]} (${match[3]}) contra CD ${dc}.`
    });
  }

  for (const match of text.matchAll(abilityRegex)) {
    const abilityId = resolveAbilityId(match[2], "");
    const dc = Number(match[3]);
    if (!abilityId || !Number.isFinite(dc)) continue;
    entries.push({
      type: "check",
      label: `Teste ${getAbilityLabel(abilityId)} CD ${dc}`,
      ability: abilityId,
      dc,
      summary: `Teste de ${getAbilityLabel(abilityId)} contra CD ${dc}.`
    });
  }

  return uniqueEntries(entries, (entry) => `${entry.type}:${entry.skill ?? entry.ability}:${entry.dc}`);
}

function extractAttackEntries(actor, ruleText) {
  const entries = [];
  const text = normalizeTextForParsing(ruleText);
  const attackRegex = /tirada de ataque(?: usando| com)?(?: bonus de proficiencia \+ modificador de| por proficiencia \+| usando proficiencia \+) ([A-Za-zÀ-ÿ]+)/gi;

  for (const match of text.matchAll(attackRegex)) {
    const abilityId = resolveAbilityId(match[1], "dex");
    const proficiencyBonus = Number(getFDEData(actor)?.progressao?.bonusProficiencia ?? actor?.system?.attributes?.prof ?? 0) || 0;
    const modifier = proficiencyBonus + getAbilityModifier(actor, abilityId);
    entries.push({
      type: "attack",
      label: `Ataque (${getAbilityLabel(abilityId)})`,
      ability: abilityId,
      modifier,
      summary: `Ataque com bônus ${modifier >= 0 ? `+${modifier}` : modifier}.`
    });
  }

  if (!entries.length && attackRegex.test(text)) {
    const abilityId = resolveAbilityId("destreza", "dex");
    const proficiencyBonus = Number(getFDEData(actor)?.progressao?.bonusProficiencia ?? actor?.system?.attributes?.prof ?? 0) || 0;
    const modifier = proficiencyBonus + getAbilityModifier(actor, abilityId);
    entries.push({
      type: "attack",
      label: `Ataque (${getAbilityLabel(abilityId)})`,
      ability: abilityId,
      modifier,
      summary: `Ataque com bônus ${modifier >= 0 ? `+${modifier}` : modifier}.`
    });
  }

  return uniqueEntries(entries, (entry) => `${entry.type}:${entry.ability}:${entry.modifier}`);
}

function extractRollFormulaEntries(actor, ruleText) {
  const entries = [];
  const text = String(ruleText ?? "");
  const regex = /(\d+d\d+|\d+)(?:\s*\+\s*(?:seu\s+)?modificador de ([A-Za-zÀ-ÿ]+))?([^.]*)/gi;

  for (const match of text.matchAll(regex)) {
    const fullMatch = match[0] ?? "";
    const trailing = match[3] ?? "";
    const context = `${fullMatch} ${trailing}`;
    const normalized = normalizeLookupValue(context);
    const amountText = match[1];
    const bonusAbilityText = match[2] ?? "";

    if (!/(dano|vida|cura|recuper|restaura|pv|temporarios)/i.test(context)) continue;

    const scaleSuffix = /por ciclo/i.test(context) ? "por ciclo" : "";
    const formula = buildDiceFormula(actor, amountText, scaleSuffix, bonusAbilityText);
    if (!formula) continue;

    const isHealing = /(recuper|restaura|cura|pontos de vida|pv)/i.test(context) && !/dano/i.test(context);
    const damageTypeMatch = /dano ([A-Za-zÀ-ÿ]+)/i.exec(context);
    const damageType = damageTypeMatch?.[1] ? String(damageTypeMatch[1]).toLowerCase() : "";

    entries.push(isHealing
      ? {
          type: "heal",
          label: `Cura ${formula}`,
          formula,
          summary: `Rolagem de cura: ${formula}.`
        }
      : {
          type: "damage",
          label: `Dano ${formula}`,
          formula,
          damageType,
          summary: `Rolagem de dano: ${formula}${damageType ? ` (${damageType})` : ""}.`
        });
  }

  return uniqueEntries(entries, (entry) => `${entry.type}:${entry.formula}:${entry.damageType ?? ""}`);
}

function getManualTechniqueAutomationData(actor, technique, cycle) {
  switch (technique.id) {
    case "rasgo-na-psique": {
      const saveData = getTechniqueSaveDC(actor, "wis");
      const damageFormula = `${cycle}d10`;

      return {
        summaryLines: [
          `Teste de resistência de ${saveData.abilityLabel} contra CD ${saveData.dc}.`,
          `Em falha: ${damageFormula} de dano psíquico e desvantagem em ataques, resistências e perícias até o fim da rodada.`
        ],
        buttons: [
          {
            type: "save",
            label: saveData.abilityLabel,
            ability: saveData.abilityId,
            dc: saveData.dc,
            saveLabel: saveData.abilityLabel
          },
          {
            type: "damage",
            label: `Dano ${damageFormula}`,
            formula: damageFormula,
            damageType: "psiquico"
          }
        ]
      };
    }
    default:
      return null;
  }
}

export function getTechniqueCastDialogData(actor, techniqueOrId) {
  const technique = typeof techniqueOrId === "string" ? getTechnique(techniqueOrId) : techniqueOrId;
  if (!technique || !actor) return null;

  const builder = getTechniqueCastBuilder(actor, technique);
  const flexibleAura = hasFlexibleAuraCost(technique);
  if (!builder && !flexibleAura) return null;

  const fields = [...(builder?.getFields?.(actor, technique) ?? [])];

  if (!builder?.controlsAmount && flexibleAura) {
    fields.push({
      name: "amount",
      label: "Aura gasta",
      type: "number",
      value: Number.isFinite(technique.costAura) ? technique.costAura : "",
      min: 0,
      step: 1,
      required: true,
      help: technique.costAuraText
    });
  }

  if (builder?.showNotes !== false || (!builder && flexibleAura)) {
    fields.push({
      name: "details",
      label: "Observações da conjuração",
      type: "textarea",
      value: "",
      fullWidth: true,
      help: "Opcional. Cada linha será exibida no card do chat."
    });
  }

  return {
    technique,
    title: `Conjurar ${technique.name}`,
    hint: flexibleAura ? `Custo variável: ${technique.costAuraText}.` : "Configure a variante antes de conjurar.",
    fields
  };
}

export function resolveTechniqueCastOptions(actor, techniqueOrId, values = {}) {
  const technique = typeof techniqueOrId === "string" ? getTechnique(techniqueOrId) : techniqueOrId;
  if (!technique || !actor) return { ok: false, reason: "Técnica não encontrada para conjuração." };

  const builder = getTechniqueCastBuilder(actor, technique);
  const flexibleAura = hasFlexibleAuraCost(technique);
  const resolved = builder?.resolve?.(actor, technique, values) ?? {};
  if (resolved?.ok === false) return resolved;

  let amount = resolved.amount;
  if (!Number.isFinite(amount)) {
    if (flexibleAura) {
      amount = parseIntegerField(values.amount);
      if (!Number.isFinite(amount)) {
        return { ok: false, reason: "Informe quanto de aura será gasto nesta conjuração." };
      }
    } else {
      amount = technique.costAura;
    }
  }

  const detailLines = splitLines(values.details);

  return {
    ok: true,
    amount,
    techniqueLabel: resolved.techniqueLabel,
    ruleText: resolved.ruleText,
    suppressGenericAutomation: resolved.suppressGenericAutomation === true,
    automationButtons: uniqueEntries(resolved.automationButtons ?? [], (entry) => JSON.stringify(entry)),
    automationSummaryLines: uniqueEntries(resolved.automationSummaryLines ?? []),
    contextLines: uniqueEntries([...(resolved.contextLines ?? []), ...detailLines])
  };
}

export function getTechniqueAutomationData(actor, techniqueOrId, options = {}) {
  const technique = typeof techniqueOrId === "string" ? getTechnique(techniqueOrId) : techniqueOrId;
  if (!technique || !actor) return null;

  const cycle = getCurrentCycle(actor);
  const manual = getManualTechniqueAutomationData(actor, technique, cycle);
  const ruleText = options.ruleText ?? technique.ruleText;
  const extractedSaves = options.suppressGenericAutomation === true ? [] : extractSaveEntries(actor, ruleText);
  const extractedChecks = options.suppressGenericAutomation === true ? [] : extractCheckEntries(actor, ruleText);
  const filteredChecks = extractedChecks.filter((entry) => {
    if (entry.type !== "check") return true;
    return !extractedSaves.some((save) => save.type === "save" && save.ability === entry.ability && save.dc === entry.dc);
  });

  const genericButtons = options.suppressGenericAutomation === true
    ? []
    : [
        ...extractedSaves,
        ...filteredChecks,
        ...extractAttackEntries(actor, ruleText),
        ...extractRollFormulaEntries(actor, ruleText)
      ];
  const buttons = [
    ...genericButtons,
    ...(options.automationButtons ?? []),
    ...(manual?.buttons ?? [])
  ];

  const uniqueButtons = uniqueEntries(buttons, (entry) => `${entry.type}:${entry.label ?? ""}:${entry.ability ?? ""}:${entry.skill ?? ""}:${entry.dc ?? ""}:${entry.modifier ?? ""}:${entry.formula ?? ""}:${entry.damageType ?? ""}`);
  const summaryLines = uniqueEntries([
    ...(uniqueButtons.map((entry) => entry.summary).filter(Boolean)),
    ...(options.automationSummaryLines ?? []),
    ...(manual?.summaryLines ?? [])
  ]);

  if (!summaryLines.length && !uniqueButtons.length) return null;

  return {
    id: technique.id,
    summaryLines,
    buttons: uniqueButtons
  };
}

function buildTechniqueAutomationHTML(actor, technique, options = {}) {
  const automation = getTechniqueAutomationData(actor, technique, options);
  if (!automation) return "";

  const summary = (automation.summaryLines ?? [])
    .map((line) => `<p>${escapeHTML(line)}</p>`)
    .join("");

  const buttons = (automation.buttons ?? []).map((button) => {
    const commonData = [
      `data-fde-tech-roll="${escapeHTML(button.type)}"`,
      `data-fde-technique-id="${escapeHTML(technique.id)}"`,
      `data-fde-technique-name="${escapeHTML(technique.name)}"`,
      `data-fde-tech-caster-id="${escapeHTML(actor.id)}"`,
      `data-fde-tech-caster-name="${escapeHTML(actor.name ?? "")}"`
    ];

    if (button.type === "save") {
      commonData.push(`data-fde-tech-roll-ability="${escapeHTML(button.ability)}"`);
      commonData.push(`data-fde-tech-roll-dc="${escapeHTML(button.dc)}"`);
      commonData.push(`data-fde-tech-roll-save-label="${escapeHTML(button.saveLabel ?? button.label)}"`);
    }

    if (button.type === "check") {
      commonData.push(`data-fde-tech-roll-ability="${escapeHTML(button.ability)}"`);
      commonData.push(`data-fde-tech-roll-dc="${escapeHTML(button.dc)}"`);
    }

    if (button.type === "skill") {
      commonData.push(`data-fde-tech-roll-ability="${escapeHTML(button.ability)}"`);
      commonData.push(`data-fde-tech-roll-skill="${escapeHTML(button.skill)}"`);
      commonData.push(`data-fde-tech-roll-dc="${escapeHTML(button.dc)}"`);
    }

    if (button.type === "attack") {
      commonData.push(`data-fde-tech-roll-ability="${escapeHTML(button.ability)}"`);
      commonData.push(`data-fde-tech-roll-modifier="${escapeHTML(button.modifier ?? 0)}"`);
    }

    if (button.type === "damage") {
      commonData.push(`data-fde-tech-roll-formula="${escapeHTML(button.formula)}"`);
      commonData.push(`data-fde-tech-roll-damage-type="${escapeHTML(button.damageType ?? "")}"`);
    }

    if (button.type === "heal") {
      commonData.push(`data-fde-tech-roll-formula="${escapeHTML(button.formula)}"`);
    }

    return `
      <button type="button" class="fde-tech-chat-button" ${commonData.join(" ")}>${escapeHTML(button.label)}</button>
    `;
  }).join("");

  return `
    <div class="fde-tech-chat-automation">
      ${summary}
      <div class="fde-tech-chat-actions">${buttons}</div>
    </div>
  `;
}

export function getLeaderDieByCycle(cycle) {
  if (cycle >= 6) return "1d10";
  if (cycle >= 4) return "1d8";
  if (cycle >= 2) return "1d6";
  return "1d4";
}

export function getExtraAttacksByCycle(cycle) {
  if (cycle >= 6) return 3;
  if (cycle >= 4) return 2;
  if (cycle >= 2) return 1;
  return 0;
}

export function getDeathKissDieByCycle(cycle) {
  if (cycle >= 6) return "1d12";
  if (cycle >= 4) return "1d10";
  if (cycle >= 2) return "1d8";
  return "1d6";
}

export function getMalakinExpertiseChoices(cycle) {
  if (cycle >= 6) return 6;
  if (cycle >= 3) return 4;
  return 2;
}

export function getCastaProgression(castaIdOrName, cycle) {
  const casta = getCasta(castaIdOrName);
  if (!casta) return null;

  const activeBenefits = [...casta.fixedBenefits];
  const rawProgression = [];

  for (const [requiredCycle, benefits] of Object.entries(casta.cycleProgression ?? {})) {
    if (Number(requiredCycle) <= Number(cycle)) {
      rawProgression.push(...benefits);
      activeBenefits.push(...benefits.map((benefit) => ({
        id: `${benefit.id}-${requiredCycle}`,
        name: benefit.name,
        summary: benefit.summary ?? benefit.name
      })));
    }
  }

  const derived = {
    extraAttacks: ["querubim", "malikis"].includes(casta.id) ? getExtraAttacksByCycle(cycle) : 0,
    attacksPerAction: 1 + (["querubim", "malikis"].includes(casta.id) ? getExtraAttacksByCycle(cycle) : 0),
    leaderDie: ["serafim", "satanis"].includes(casta.id) ? getLeaderDieByCycle(cycle) : null,
    deathKissDie: casta.id === "succubus-incubus" ? getDeathKissDieByCycle(cycle) : null,
    expertiseChoices: casta.id === "malakin" ? getMalakinExpertiseChoices(cycle) : 0,
    provinceRequired: ["ishim", "zanathus"].includes(casta.id)
  };

  return {
    casta,
    cycle: Number(cycle),
    activeBenefits,
    rawProgression,
    derived
  };
}

export function getUnlockedTechniques(castaIdOrName, cycle) {
  const casta = getCasta(castaIdOrName);
  if (!casta) return [];

  const unlockedIds = [];
  for (const [level, ids] of Object.entries(casta.techniqueLevels ?? {})) {
    if (Number(level) <= Number(cycle)) unlockedIds.push(...ids);
  }

  return unlockedIds
    .map((id) => {
      const technique = getTechnique(id);
      if (!technique) {
        return {
          id,
          name: id,
          level: Number(Object.entries(casta.techniqueLevels).find(([, list]) => list.includes(id))?.[0] ?? 0),
          type: casta.side === "anjo" ? "divindade" : "profanacao",
          castaAllowed: [casta.id],
          minCycle: Number(Object.entries(casta.techniqueLevels).find(([, list]) => list.includes(id))?.[0] ?? 1),
          missingCatalogEntry: true
        };
      }

      return {
        ...technique,
        type: casta.side === "anjo" ? "divindade" : "profanacao",
        castaAllowed: [casta.id],
        minCycle: technique.level
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}

function buildBenefitsList(castaProgression) {
  return castaProgression.activeBenefits.map((benefit) => `${benefit.name}: ${benefit.summary ?? benefit.name}`);
}

function computePendingTechniqueChoices(fdeData) {
  const counts = validateTechniqueKnownCounts(fdeData);
  const slots = fdeData.progressao?.slotsTecnicas ?? {};
  let remaining = 0;
  for (const [level, total] of Object.entries(slots)) {
    remaining += Math.max(0, Number(total) - Number(counts[level] ?? 0));
  }
  return remaining;
}

function normalizeAbilityProficiency(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(2, Math.trunc(parsed)));
}

function synchronizeTechniqueState(fdeData, unlockedTechniques) {
  const unlockedIds = new Set((unlockedTechniques ?? []).map((entry) => String(entry?.id ?? "")).filter(Boolean));
  fdeData.tecnicasLiberadas = [...unlockedIds];
  fdeData.tecnicasConhecidas = (fdeData.tecnicasConhecidas ?? []).filter((id) => unlockedIds.has(String(id ?? "")) && getTechnique(id));
}

function synchronizeExtraSaveState(actor, fdeData) {
  const actorAbilities = actor?.system?.abilities ?? {};
  const base = {};

  for (const abilityKey of FDE_ABILITY_ORDER) {
    const storedBase = fdeData.salvaguardas?.base?.[abilityKey];
    const actorValue = actorAbilities?.[abilityKey]?.proficient;
    base[abilityKey] = normalizeAbilityProficiency(storedBase, normalizeAbilityProficiency(actorValue, 0));
  }

  const maxExtras = Math.max(0, Number(fdeData.progressao?.extraSalvaguardas ?? 0));
  let extras = Array.isArray(fdeData.salvaguardas?.extras)
    ? fdeData.salvaguardas.extras.map((entry) => String(entry ?? "").trim().toLowerCase()).filter((entry) => FDE_ABILITY_ORDER.includes(entry))
    : [];

  extras = [...new Set(extras)].filter((abilityKey) => base[abilityKey] < 1).slice(0, maxExtras);

  const available = FDE_ABILITY_ORDER.filter((abilityKey) => base[abilityKey] < 1 && !extras.includes(abilityKey));
  while (extras.length < maxExtras && available.length) {
    extras.push(available.shift());
  }

  fdeData.salvaguardas.base = base;
  fdeData.salvaguardas.extras = extras;
  fdeData.escolhasPendentes.salvaguarda = Math.max(0, maxExtras - extras.length);
}

function buildExtraSaveSyncUpdate(actor, fdeData) {
  const update = {};
  const extras = new Set(fdeData.salvaguardas?.extras ?? []);

  for (const abilityKey of FDE_ABILITY_ORDER) {
    const currentValue = normalizeAbilityProficiency(actor?.system?.abilities?.[abilityKey]?.proficient, 0);
    const baseValue = normalizeAbilityProficiency(fdeData.salvaguardas?.base?.[abilityKey], currentValue);
    const nextValue = Math.max(baseValue, extras.has(abilityKey) ? 1 : 0);
    if (currentValue !== nextValue) {
      update[`system.abilities.${abilityKey}.proficient`] = nextValue;
    }
  }

  return update;
}

function deriveProgressionState(actor, fdeData, cycle, casta) {
  const cycleData = getCycleData(cycle);
  const castaProgression = getCastaProgression(casta.id, cycle);
  const conModifier = getConModifier(actor);
  const hitDieSize = parseHitDieSize(casta.hitDie);
  const auraMax = getAuraBudget(casta.hitDie, cycle);
  const hpMax = getAverageHitPointsByCycle(casta.hitDie, cycle, conModifier);
  const knownTechniqueIds = (fdeData.tecnicasConhecidas ?? []).filter((id) => getTechnique(id));
  const unlockedTechniques = getUnlockedTechniques(casta.id, cycle);

  const nextData = normalizeFDEData({
    ...fdeData,
    lado: casta.side,
    casta: casta.id,
    ciclo: cycle,
    tituloCiclo: cycleData.title,
    aura: {
      value: Math.min(fdeData.aura?.value ?? 0, auraMax),
      max: auraMax
    },
    progressao: {
      ...fdeData.progressao,
      bonusProficiencia: cycleData.proficiencyBonus,
      totalDadosVida: cycleData.totalHitDice,
      hitDie: casta.hitDie,
      hitDieSize,
      pontosVidaMaximos: hpMax,
      formulaPontosVida: `${cycleData.totalHitDice}${casta.hitDie} + CON x ${cycleData.totalHitDice}`,
      maxAbilityScore: cycleData.maxAbilityScore,
      pontosHabilidadeTotais: cycleData.totalAbilityPoints,
      pontosHabilidadeConcedidos: cycleData.abilityPointsGranted,
      extraSalvaguardas: cycleData.extraSaveChoices,
      slotsTecnicas: getTechniqueSlotsForCycle(cycle),
      ataquesExtras: castaProgression.derived.extraAttacks,
      ataquesPorAcao: castaProgression.derived.attacksPerAction,
      dadoLiderNato: castaProgression.derived.leaderDie,
      dadoBeijoDaMorte: castaProgression.derived.deathKissDie,
      escolhasEspecializacao: castaProgression.derived.expertiseChoices,
      perksAplicados: buildBenefitsList(castaProgression)
    },
    beneficiosCasta: buildBenefitsList(castaProgression),
    tecnicasLiberadas: unlockedTechniques.map((entry) => entry.id),
    tecnicasConhecidas: knownTechniqueIds
  });

  synchronizeTechniqueState(nextData, unlockedTechniques);
  synchronizeExtraSaveState(actor, nextData);

  if (castaProgression.derived.provinceRequired) {
    nextData.recursosCasta.provincia = nextData.recursosCasta?.provincia ?? "";
  }

  const chosenExpertise = nextData.recursosCasta?.especializacoes?.length ?? 0;
  nextData.escolhasPendentes.pericia = Math.max(0, cycle - 1);
  nextData.escolhasPendentes.tecnica = computePendingTechniqueChoices(nextData);
  nextData.escolhasPendentes.especializacao = Math.max(0, castaProgression.derived.expertiseChoices - chosenExpertise);
  nextData.escolhasPendentes.provincia = castaProgression.derived.provinceRequired && !nextData.recursosCasta?.provincia ? 1 : 0;

  return { nextData, cycleData, castaProgression, unlockedTechniques, hpMax, auraMax };
}

export async function synchronizeDerivedProgression(actor, sourceData = null) {
  const current = normalizeFDEData(sourceData ?? getFDEData(actor));
  const casta = getCasta(current.casta);
  if (!casta) return { ok: false, reason: "Casta não definida para sincronizar progressão." };

  const derived = deriveProgressionState(actor, current, Number(current.ciclo ?? 1), casta);
  const nextData = normalizeFDEData({
    ...current,
    ...derived.nextData,
    historicoProgressao: current.historicoProgressao ?? []
  });

  await setFDEData(actor, nextData);
  const actorUpdate = foundry.utils.mergeObject(buildActorProgressionUpdate(actor, nextData), buildExtraSaveSyncUpdate(actor, nextData), { inplace: false, insertKeys: true, overwrite: true });
  await actor.update(actorUpdate);
  await syncManagedClassLevel(actor, nextData);

  return {
    ok: true,
    casta,
    cycle: nextData.ciclo,
    data: nextData
  };
}

export function previewCycleUpgrade(actor, newCycle) {
  const validation = validateCycleChange(actor, newCycle);
  if (!validation.ok) return validation;

  const { current, casta } = validation;
  const currentCycleData = getCycleData(current.ciclo);
  const derived = deriveProgressionState(actor, current, Number(newCycle), casta);

  const gained = [
    `Ciclo ${current.ciclo} → ${newCycle}`,
    `Título: ${current.tituloCiclo || currentCycleData?.title || "-"} → ${derived.nextData.tituloCiclo}`,
    `Proficiência: +${current.progressao?.bonusProficiencia ?? currentCycleData?.proficiencyBonus ?? 2} → +${derived.nextData.progressao.bonusProficiencia}`,
    `Dados de vida: ${current.progressao?.totalDadosVida ?? currentCycleData?.totalHitDice ?? 1}${current.progressao?.hitDie ?? casta.hitDie} → ${derived.nextData.progressao.totalDadosVida}${derived.nextData.progressao.hitDie}`,
    `PV máximos (média): ${current.progressao?.pontosVidaMaximos ?? 0} → ${derived.hpMax}`,
    `Aura máxima: ${current.aura?.max ?? 0} → ${derived.auraMax}`
  ];

  if (derived.nextData.progressao.ataquesExtras > (current.progressao?.ataquesExtras ?? 0)) {
    gained.push(`Ataque Extra total: ${derived.nextData.progressao.ataquesExtras}`);
  }

  if (derived.nextData.progressao.dadoLiderNato && derived.nextData.progressao.dadoLiderNato !== current.progressao?.dadoLiderNato) {
    gained.push(`Líder Nato: ${derived.nextData.progressao.dadoLiderNato}`);
  }

  if (derived.nextData.progressao.dadoBeijoDaMorte && derived.nextData.progressao.dadoBeijoDaMorte !== current.progressao?.dadoBeijoDaMorte) {
    gained.push(`Beijo da Morte: ${derived.nextData.progressao.dadoBeijoDaMorte}`);
  }

  const pendingChoices = [];
  if (derived.nextData.escolhasPendentes.pericia > 0) pendingChoices.push(`${derived.nextData.escolhasPendentes.pericia} escolha(s) de perícia/alternativa marcial/ferramenta/armadura.`);
  if (derived.nextData.escolhasPendentes.salvaguarda > 0) pendingChoices.push(`${derived.nextData.escolhasPendentes.salvaguarda} escolha(s) adicional(is) de salvaguarda.`);
  if (derived.nextData.escolhasPendentes.tecnica > 0) pendingChoices.push(`${derived.nextData.escolhasPendentes.tecnica} técnica(s) ainda podem ser aprendidas dentro dos slots atuais.`);
  if (derived.nextData.escolhasPendentes.especializacao > 0) pendingChoices.push(`${derived.nextData.escolhasPendentes.especializacao} escolha(s) de especialização de Malakin.`);
  if (derived.nextData.escolhasPendentes.provincia > 0) pendingChoices.push(`Selecionar a província elemental da casta.`);

  return {
    ok: true,
    actor,
    casta,
    fromCycle: current.ciclo,
    toCycle: Number(newCycle),
    title: derived.nextData.tituloCiclo,
    gained,
    pendingChoices,
    unlockedTechniqueIds: derived.unlockedTechniques.map((entry) => entry.id),
    unlockedTechniques: derived.unlockedTechniques,
    nextData: derived.nextData
  };
}

export async function applyCycleProgression(actor, newCycle) {
  const preview = previewCycleUpgrade(actor, newCycle);
  if (!preview.ok) return preview;

  const previousCycle = Number(getFDEData(actor)?.ciclo ?? 1);

  const dataToApply = preview.nextData;
  dataToApply.historicoProgressao = [...(dataToApply.historicoProgressao ?? []), {
    timestamp: new Date().toISOString(),
    fromCycle: preview.fromCycle,
    toCycle: preview.toCycle,
    title: preview.title,
    gained: preview.gained
  }];

  await setFDEData(actor, dataToApply);
  await actor.update(buildActorProgressionUpdate(actor, dataToApply));
  await syncManagedClassLevel(actor, dataToApply);
  for (let cycle = previousCycle + 1; cycle <= Number(newCycle); cycle += 1) {
    await grantCycleSkillChoice(actor, cycle);
  }
  await recalculateAllSkillData(actor);
  await syncDerivedFeatureItems(actor, dataToApply);

  const content = createProgressionChatCard(actor, preview);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      [FDE_MODULE_ID]: {
        progressionSummary: true,
        cycle: preview.toCycle
      }
    }
  });

  return {
    ok: true,
    ...preview,
    appliedData: dataToApply
  };
}

export async function learnTechnique(actor, techniqueId) {
  const validation = canLearnTechnique(actor, techniqueId);
  if (!validation.ok) return validation;

  const data = getFDEData(actor);
  data.tecnicasConhecidas = [...data.tecnicasConhecidas, techniqueId];
  data.escolhasPendentes.tecnica = Math.max(0, computePendingTechniqueChoices(normalizeFDEData(data)) - 1);
  await setFDEData(actor, data);
  return { ok: true, technique: validation.technique };
}

export async function forgetTechnique(actor, techniqueId) {
  const data = getFDEData(actor);
  data.tecnicasConhecidas = data.tecnicasConhecidas.filter((id) => id !== techniqueId);
  data.escolhasPendentes.tecnica = computePendingTechniqueChoices(normalizeFDEData(data));
  await setFDEData(actor, data);
  return { ok: true };
}

export function getTechniqueUsageCard(technique, actor, auraSpent = null, options = {}) {
  const automationHTML = buildTechniqueAutomationHTML(actor, technique, options);
  const contextHTML = (options.contextLines ?? []).length
    ? `
      <div class="fde-tech-chat-context">
        ${(options.contextLines ?? []).map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
      </div>
    `
    : "";
  const actorSide = String(getFDEData(actor)?.lado ?? "").trim().toLowerCase();
  const isProfanacao = actorSide === "diabo";
  const parts = [
    `<h2>${escapeHTML(options.techniqueLabel ?? technique.name)}</h2>`,
    `<p><strong>Nível:</strong> ${technique.level}</p>`,
    `<p><strong>Tipo:</strong> ${isProfanacao ? "Profanação" : "Divindade"}</p>`,
    `<p><strong>Custo:</strong> ${auraSpent ?? technique.costAuraText}</p>`,
    `<p><strong>Conjuração:</strong> ${technique.castTime ?? "-"}</p>`,
    `<p><strong>Alcance:</strong> ${technique.range}</p>`,
    `<p><strong>Duração:</strong> ${technique.duration}</p>`,
    `<p><strong>Grau de Abalo:</strong> ${technique.abalo}</p>`,
    `<p>${escapeHTML(options.ruleText ?? technique.ruleText)}</p>`
  ];

  return `
    <section class="fde-chat-card fde-tech-card-chat">
      ${parts.join("")}
      ${contextHTML}
      ${automationHTML}
      <p><em>${actor.name}</em></p>
    </section>
  `;
}

export async function useTechnique(actor, techniqueId, options = {}) {
  const checked = canUseTechnique(actor, techniqueId, options);
  if (!checked.ok) return checked;

  let auraSpent = checked.amount;
  let remainingAura = Number(checked.actorData?.aura?.value ?? 0);

  if (Number.isFinite(checked.amount) && checked.amount > 0 && options.spendAura !== false) {
    const spendResult = await spendAura(actor, checked.amount);
    if (!spendResult?.ok) return spendResult;
    auraSpent = spendResult.spent;
    remainingAura = spendResult.remaining;
  }

  const content = getTechniqueUsageCard(checked.technique, actor, auraSpent, options);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      [FDE_MODULE_ID]: {
        techniqueUse: true,
        techniqueId: checked.technique.id,
        auraSpent,
        remainingAura,
        techniqueLabel: options.techniqueLabel ?? checked.technique.name,
        contextLines: options.contextLines ?? []
      }
    }
  });

  return {
    ok: true,
    technique: checked.technique,
    auraSpent,
    remainingAura
  };
}

export function getKnownTechniquesDetailed(actor) {
  const data = getFDEData(actor);
  return getTechniques(data.tecnicasConhecidas).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}
