import { getCycleData, getTechniqueSlotsForCycle } from "../data/cycles.js";

export const FDE_MODULE_ID = "filhos-do-eden";

export function createDefaultFDEData() {
  const cycleData = getCycleData(1);
  return {
    jogador: "",
    especie: "",
    casta: "",
    lado: "",
    ciclo: 1,
    tituloCiclo: cycleData?.title ?? "Infante",
    alinhamento: "",
    experiencia: 0,
    aura: { value: 0, max: 0 },
    progressao: {
      bonusProficiencia: cycleData?.proficiencyBonus ?? 2,
      totalDadosVida: cycleData?.totalHitDice ?? 1,
      hitDie: "d10",
      hitDieSize: 10,
      pontosVidaMaximos: 0,
      formulaPontosVida: "1d10 + CON",
      maxAbilityScore: cycleData?.maxAbilityScore ?? 20,
      pontosHabilidadeTotais: cycleData?.totalAbilityPoints ?? 0,
      pontosHabilidadeConcedidos: cycleData?.abilityPointsGranted ?? 0,
      extraSalvaguardas: cycleData?.extraSaveChoices ?? 0,
      slotsTecnicas: getTechniqueSlotsForCycle(1),
      ataquesExtras: 0,
      ataquesPorAcao: 1,
      dadoLiderNato: null,
      dadoBeijoDaMorte: null,
      escolhasEspecializacao: 0,
      perksAplicados: []
    },
    beneficiosCasta: [],
    tecnicasConhecidas: [],
    tecnicasLiberadas: [],
    outrasPericias: [],
    pericias: {
      pacoteInicialCasta: "",
      fontes: {},
      escolhasLivres: [],
      especializacoes: [],
      ganhosPorCiclo: [],
      pendencias: []
    },
    ferramentas: {
      treinadas: [],
      especializacoes: [],
      atributos: {}
    },
    proficienciasAlternativas: {
      armas: [],
      armaduras: [],
      escudos: []
    },
    salvaguardas: {
      base: {},
      extras: []
    },
    escolhasPendentes: {
      pericia: 0,
      ferramenta: 0,
      arma: 0,
      armadura: 0,
      escudo: 0,
      feat: 0,
      salvaguarda: 0,
      tecnica: 0,
      especializacao: 0,
      provincia: 0
    },
    recursosCasta: {
      provincia: "",
      contatos: [],
      recursos: [],
      contratos: []
    },
    automacao: {
      compendiosProntos: true,
      chatCardsProntos: true,
      futureAutomationReady: true
    },
    historicoProgressao: []
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
}

function normalizeObjectArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === "object").map((entry) => foundry.utils.deepClone(entry));
}

function normalizeRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? foundry.utils.deepClone(value)
    : {};
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeFDEData(data = {}) {
  const base = createDefaultFDEData();
  const merged = foundry.utils.mergeObject(foundry.utils.deepClone(base), foundry.utils.deepClone(data ?? {}), { inplace: false, insertKeys: true, overwrite: true });

  merged.ciclo = Math.max(1, normalizeNumber(merged.ciclo, 1));
  merged.experiencia = Math.max(0, normalizeNumber(merged.experiencia, 0));
  merged.aura.value = Math.max(0, normalizeNumber(merged.aura?.value, 0));
  merged.aura.max = Math.max(0, normalizeNumber(merged.aura?.max, 0));

  merged.progressao.bonusProficiencia = normalizeNumber(merged.progressao?.bonusProficiencia, base.progressao.bonusProficiencia);
  merged.progressao.totalDadosVida = normalizeNumber(merged.progressao?.totalDadosVida, base.progressao.totalDadosVida);
  merged.progressao.hitDieSize = normalizeNumber(merged.progressao?.hitDieSize, 10);
  merged.progressao.pontosVidaMaximos = normalizeNumber(merged.progressao?.pontosVidaMaximos, 0);
  merged.progressao.maxAbilityScore = normalizeNumber(merged.progressao?.maxAbilityScore, base.progressao.maxAbilityScore);
  merged.progressao.pontosHabilidadeTotais = normalizeNumber(merged.progressao?.pontosHabilidadeTotais, 0);
  merged.progressao.pontosHabilidadeConcedidos = normalizeNumber(merged.progressao?.pontosHabilidadeConcedidos, 0);
  merged.progressao.extraSalvaguardas = normalizeNumber(merged.progressao?.extraSalvaguardas, 0);
  merged.progressao.ataquesExtras = normalizeNumber(merged.progressao?.ataquesExtras, 0);
  merged.progressao.ataquesPorAcao = normalizeNumber(merged.progressao?.ataquesPorAcao, 1);
  merged.progressao.escolhasEspecializacao = normalizeNumber(merged.progressao?.escolhasEspecializacao, 0);
  merged.progressao.perksAplicados = normalizeStringArray(merged.progressao?.perksAplicados);

  merged.beneficiosCasta = normalizeStringArray(merged.beneficiosCasta);
  merged.tecnicasConhecidas = normalizeStringArray(merged.tecnicasConhecidas);
  merged.tecnicasLiberadas = normalizeStringArray(merged.tecnicasLiberadas);
  merged.outrasPericias = normalizeStringArray(merged.outrasPericias);
  merged.pericias = {
    pacoteInicialCasta: String(merged.pericias?.pacoteInicialCasta ?? "").trim(),
    fontes: normalizeRecord(merged.pericias?.fontes),
    escolhasLivres: normalizeObjectArray(merged.pericias?.escolhasLivres),
    especializacoes: normalizeObjectArray(merged.pericias?.especializacoes),
    ganhosPorCiclo: normalizeObjectArray(merged.pericias?.ganhosPorCiclo),
    pendencias: normalizeObjectArray(merged.pericias?.pendencias)
  };
  merged.ferramentas = {
    treinadas: normalizeObjectArray(merged.ferramentas?.treinadas),
    especializacoes: normalizeObjectArray(merged.ferramentas?.especializacoes),
    atributos: normalizeRecord(merged.ferramentas?.atributos)
  };
  merged.proficienciasAlternativas = {
    armas: normalizeObjectArray(merged.proficienciasAlternativas?.armas),
    armaduras: normalizeObjectArray(merged.proficienciasAlternativas?.armaduras),
    escudos: normalizeObjectArray(merged.proficienciasAlternativas?.escudos)
  };
  merged.salvaguardas = {
    base: normalizeRecord(merged.salvaguardas?.base),
    extras: normalizeStringArray(merged.salvaguardas?.extras)
  };
  merged.recursosCasta.contatos = normalizeStringArray(merged.recursosCasta?.contatos);
  merged.recursosCasta.recursos = normalizeStringArray(merged.recursosCasta?.recursos);
  merged.recursosCasta.contratos = normalizeStringArray(merged.recursosCasta?.contratos);
  merged.historicoProgressao = Array.isArray(merged.historicoProgressao) ? merged.historicoProgressao : [];

  for (const key of Object.keys(base.escolhasPendentes)) {
    merged.escolhasPendentes[key] = Math.max(0, normalizeNumber(merged.escolhasPendentes?.[key], 0));
  }

  return merged;
}

export function getFDEData(actor) {
  return normalizeFDEData(actor?.getFlag(FDE_MODULE_ID, "data") ?? {});
}

export async function setFDEData(actor, data) {
  const normalized = normalizeFDEData(data);
  await actor.setFlag(FDE_MODULE_ID, "data", normalized);

  // Keep the in-memory actor flag authoritative as well.
  // Foundry's merge behavior can keep stale nested keys (e.g. old pericias.fontes)
  // when updates contain empty objects, which breaks immediate recalculation flows.
  if (!actor.flags) actor.flags = {};
  if (!actor.flags[FDE_MODULE_ID]) actor.flags[FDE_MODULE_ID] = {};
  actor.flags[FDE_MODULE_ID].data = foundry.utils.deepClone(normalized);

  return normalized;
}

export function resetFDEDataForCastaChange(currentData = {}, nextCasta = "") {
  const current = normalizeFDEData(currentData);
  const reset = createDefaultFDEData();
  const normalizedCasta = String(nextCasta ?? "").trim();

  return normalizeFDEData({
    ...reset,
    jogador: current.jogador,
    especie: current.especie,
    alinhamento: current.alinhamento,
    casta: normalizedCasta,
    pericias: {
      ...reset.pericias,
      pacoteInicialCasta: normalizedCasta
    },
    automacao: foundry.utils.deepClone(current.automacao ?? reset.automacao)
  });
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
