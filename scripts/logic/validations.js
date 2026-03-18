import { getCasta } from "../data/castas.js";
import { getCycleData, isValidCycle } from "../data/cycles.js";
import { getTechnique } from "../data/tecnicas.js";
import { getFDEData } from "../helpers/fde-data.js";

export function validateCycleChange(actor, newCycle) {
  const current = getFDEData(actor);
  const cycle = Number(newCycle);

  if (!isValidCycle(cycle)) {
    return { ok: false, reason: "Ciclo inválido ou acima do máximo suportado (6)." };
  }

  if (cycle <= current.ciclo) {
    return { ok: false, reason: "O novo ciclo precisa ser maior que o ciclo atual." };
  }

  if (cycle > current.ciclo + 1) {
    return { ok: false, reason: "A progressão automática suporta apenas um ciclo por vez." };
  }

  const casta = getCasta(current.casta);
  if (!casta) {
    return { ok: false, reason: "A ficha precisa ter uma casta válida antes de subir de ciclo." };
  }

  const cycleData = getCycleData(cycle);
  if (!cycleData) {
    return { ok: false, reason: "Não foi possível localizar os dados do ciclo solicitado." };
  }

  return { ok: true, current, casta, cycleData };
}

export function validateTechniqueKnownCounts(fdeData) {
  const counts = {};
  for (const techniqueId of fdeData.tecnicasConhecidas ?? []) {
    const technique = getTechnique(techniqueId);
    if (!technique) continue;
    counts[technique.level] = (counts[technique.level] ?? 0) + 1;
  }
  return counts;
}

export function canLearnTechnique(actor, techniqueId) {
  const data = getFDEData(actor);
  const technique = getTechnique(techniqueId);
  if (!technique) return { ok: false, reason: "Técnica não cadastrada." };
  if (!data.tecnicasLiberadas.includes(techniqueId)) return { ok: false, reason: "Técnica ainda não liberada para a casta/ciclo atual." };
  if (data.tecnicasConhecidas.includes(techniqueId)) return { ok: false, reason: "Técnica já conhecida." };

  const counts = validateTechniqueKnownCounts(data);
  const slots = data.progressao?.slotsTecnicas?.[technique.level] ?? 0;
  const used = counts[technique.level] ?? 0;
  if (used >= slots) {
    return { ok: false, reason: `Sem espaços restantes para técnicas de nível ${technique.level}.` };
  }

  return { ok: true, technique, counts, slots, used };
}

export function canUseTechnique(actor, techniqueOrId, options = {}) {
  const data = getFDEData(actor);
  const technique = typeof techniqueOrId === "string" ? getTechnique(techniqueOrId) : techniqueOrId;
  if (!technique) return { ok: false, reason: "Técnica não encontrada." };

  const casta = getCasta(data.casta);
  if (!casta) return { ok: false, reason: "Casta inválida na ficha." };

  if (!data.tecnicasLiberadas.includes(technique.id)) {
    return { ok: false, reason: "Técnica não liberada para o ciclo/casta atual." };
  }

  if (!data.tecnicasConhecidas.includes(technique.id)) {
    return { ok: false, reason: "Técnica ainda não foi marcada como conhecida na ficha." };
  }

  const allowedTechniques = Object.values(casta.techniqueLevels).flat();
  if (!allowedTechniques.includes(technique.id)) {
    return { ok: false, reason: "A técnica não pertence à casta atual." };
  }

  if (technique.level > data.ciclo) {
    return { ok: false, reason: "O ciclo atual não permite usar uma técnica desse nível." };
  }

  const amount = Number.isFinite(options.amount) ? Number(options.amount) : technique.costAura;
  if (amount === null) {
    return { ok: false, reason: "O custo de aura desta técnica ainda exige revisão manual no suplemento." };
  }

  if (amount > data.aura.value) {
    return { ok: false, reason: "Aura insuficiente para usar a técnica." };
  }

  return { ok: true, technique, amount, actorData: data, casta };
}
