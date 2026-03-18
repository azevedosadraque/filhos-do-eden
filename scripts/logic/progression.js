import { getAuraBudget, getCycleData, getTechniqueSlotsForCycle } from "../data/cycles.js";
import { getCasta } from "../data/castas.js";
import { getTechnique, getTechniques } from "../data/tecnicas.js";
import { buildActorProgressionUpdate, createProgressionChatCard, getAverageHitPointsByCycle, getConModifier, parseHitDieSize, syncDerivedFeatureItems } from "../helpers/actor-updates.js";
import { FDE_MODULE_ID, getFDEData, normalizeFDEData, setFDEData } from "../helpers/fde-data.js";
import { canLearnTechnique, validateCycleChange, validateTechniqueKnownCounts } from "./validations.js";

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

  if (castaProgression.derived.provinceRequired) {
    nextData.recursosCasta.provincia = nextData.recursosCasta?.provincia ?? "";
  }

  const chosenExpertise = nextData.recursosCasta?.especializacoes?.length ?? 0;
  nextData.escolhasPendentes.pericia = Math.max(0, cycle - 1);
  nextData.escolhasPendentes.salvaguarda = cycleData.extraSaveChoices;
  nextData.escolhasPendentes.tecnica = computePendingTechniqueChoices(nextData);
  nextData.escolhasPendentes.especializacao = Math.max(0, castaProgression.derived.expertiseChoices - chosenExpertise);
  nextData.escolhasPendentes.provincia = castaProgression.derived.provinceRequired && !nextData.recursosCasta?.provincia ? 1 : 0;

  return { nextData, cycleData, castaProgression, unlockedTechniques, hpMax, auraMax };
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

export function getTechniqueUsageCard(technique, actor, auraSpent = null) {
  const parts = [
    `<h2>${technique.name}</h2>`,
    `<p><strong>Nível:</strong> ${technique.level}</p>`,
    `<p><strong>Tipo:</strong> ${technique.type === "profanacao" ? "Profanação" : "Divindade"}</p>`,
    `<p><strong>Custo:</strong> ${auraSpent ?? technique.costAuraText}</p>`,
    `<p><strong>Alcance:</strong> ${technique.range}</p>`,
    `<p><strong>Duração:</strong> ${technique.duration}</p>`,
    `<p><strong>Grau de Abalo:</strong> ${technique.abalo}</p>`,
    `<p>${technique.ruleText}</p>`
  ];

  return `
    <section class="fde-chat-card fde-tech-card-chat">
      ${parts.join("")}
      <p><em>${actor.name}</em></p>
    </section>
  `;
}

export function getKnownTechniquesDetailed(actor) {
  const data = getFDEData(actor);
  return getTechniques(data.tecnicasConhecidas).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}
