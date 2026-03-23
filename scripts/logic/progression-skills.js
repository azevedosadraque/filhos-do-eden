import { getCastaSkillPackage, normalizeCastaId } from "../data/castas.js";
import { getSkillLabel, normalizeSkillId } from "../data/skills.js";
import { getToolLabel, normalizeToolId } from "../data/tools.js";
import { getFDEData, normalizeFDEData, setFDEData, slugify } from "../helpers/fde-data.js";
import { getProficiencyBonusFromCycle } from "./proficiency.js";
import { buildSkillSyncUpdate, hasSkillExpertise, hasSkillProficiency } from "./skills.js";
import { buildToolSyncPlan, hasToolExpertise, hasToolProficiency } from "./tools.js";

function cloneData(actor) {
  return normalizeFDEData(foundry.utils.deepClone(getFDEData(actor)));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureSkillSourceBucket(data, skillId) {
  data.pericias.fontes[skillId] = ensureArray(data.pericias.fontes[skillId]);
  return data.pericias.fontes[skillId];
}

function pushUniqueSource(list, entry) {
  const exists = list.some((current) => current?.source === entry.source && current?.cycle === entry.cycle && current?.castaId === entry.castaId);
  if (!exists) list.push(entry);
}

function upsertPending(data, entry) {
  const exists = data.pericias.pendencias.some((current) => current?.id === entry.id);
  if (!exists) data.pericias.pendencias.push(entry);
}

function removeCastaDerivedEntries(data) {
  for (const skillId of Object.keys(data.pericias.fontes ?? {})) {
    data.pericias.fontes[skillId] = ensureArray(data.pericias.fontes[skillId]).filter((entry) => !String(entry?.source ?? "").startsWith("casta"));
    if (!data.pericias.fontes[skillId].length) delete data.pericias.fontes[skillId];
  }

  data.ferramentas.treinadas = ensureArray(data.ferramentas.treinadas).filter((entry) => !String(entry?.source ?? "").startsWith("casta"));
  data.pericias.especializacoes = ensureArray(data.pericias.especializacoes).filter((entry) => !String(entry?.source ?? "").startsWith("casta"));
  data.ferramentas.especializacoes = ensureArray(data.ferramentas.especializacoes).filter((entry) => !String(entry?.source ?? "").startsWith("casta"));
  data.pericias.pendencias = ensureArray(data.pericias.pendencias).filter((entry) => !String(entry?.source ?? "").startsWith("casta"));
}

function refreshPendingCounters(data) {
  const pending = ensureArray(data.pericias.pendencias).filter((entry) => !entry?.resolved);
  data.escolhasPendentes.pericia = pending.filter((entry) => (entry.allowed ?? []).includes("skill") || entry.kind === "skill").length;
  data.escolhasPendentes.ferramenta = pending.filter((entry) => (entry.allowed ?? []).length === 1 && (entry.allowed ?? []).includes("tool")).length;
  data.escolhasPendentes.arma = pending.filter((entry) => (entry.allowed ?? []).length === 1 && (entry.allowed ?? []).includes("weapon")).length;
  data.escolhasPendentes.armadura = pending.filter((entry) => (entry.allowed ?? []).length === 1 && (entry.allowed ?? []).includes("armor")).length;
  data.escolhasPendentes.escudo = pending.filter((entry) => (entry.allowed ?? []).length === 1 && (entry.allowed ?? []).includes("shield")).length;
  data.escolhasPendentes.especializacao = Math.max(0, Number(data.progressao?.escolhasEspecializacao ?? 0)
    - ensureArray(data.pericias.especializacoes).length
    - ensureArray(data.ferramentas.especializacoes).length);
}

function buildPendingEntry({ source, cycle = null, allowed = ["skill"], label, castaId = "" }) {
  const id = slugify(`${source}-${castaId || "generic"}-${cycle ?? "base"}-${allowed.join("-")}-${label}`);
  return {
    id,
    source,
    cycle,
    label,
    allowed,
    resolved: false,
    createdAt: new Date().toISOString(),
    castaId
  };
}

function removeFutureCycleDerivedEntries(data) {
  const currentCycle = Number(data.ciclo ?? 1);
  const isFutureCycleEntry = (entry) => Number(entry?.cycle ?? 0) > currentCycle;
  const isManagedCycleEntry = (entry) => ["cycle", "casta-expertise"].includes(String(entry?.source ?? ""));

  for (const skillId of Object.keys(data.pericias.fontes ?? {})) {
    data.pericias.fontes[skillId] = ensureArray(data.pericias.fontes[skillId]).filter((entry) => !(isManagedCycleEntry(entry) && isFutureCycleEntry(entry)));
    if (!data.pericias.fontes[skillId].length) delete data.pericias.fontes[skillId];
  }

  data.pericias.escolhasLivres = ensureArray(data.pericias.escolhasLivres).filter((entry) => !(String(entry?.source ?? "") === "cycle" && isFutureCycleEntry(entry)));
  data.pericias.especializacoes = ensureArray(data.pericias.especializacoes).filter((entry) => !(isManagedCycleEntry(entry) && isFutureCycleEntry(entry)));
  data.ferramentas.treinadas = ensureArray(data.ferramentas.treinadas).filter((entry) => !(String(entry?.source ?? "") === "cycle" && isFutureCycleEntry(entry)));
  data.ferramentas.especializacoes = ensureArray(data.ferramentas.especializacoes).filter((entry) => !(isManagedCycleEntry(entry) && isFutureCycleEntry(entry)));
  data.proficienciasAlternativas.armas = ensureArray(data.proficienciasAlternativas.armas).filter((entry) => !(String(entry?.source ?? "") === "cycle" && isFutureCycleEntry(entry)));
  data.proficienciasAlternativas.armaduras = ensureArray(data.proficienciasAlternativas.armaduras).filter((entry) => !(String(entry?.source ?? "") === "cycle" && isFutureCycleEntry(entry)));
  data.proficienciasAlternativas.escudos = ensureArray(data.proficienciasAlternativas.escudos).filter((entry) => !(String(entry?.source ?? "") === "cycle" && isFutureCycleEntry(entry)));
  data.pericias.pendencias = ensureArray(data.pericias.pendencias).filter((entry) => !(isManagedCycleEntry(entry) && isFutureCycleEntry(entry)));
  data.pericias.ganhosPorCiclo = ensureArray(data.pericias.ganhosPorCiclo).filter((entry) => Number(entry?.cycle ?? 0) <= currentCycle);
}

function synchronizeCycleDerivedEntries(data) {
  removeFutureCycleDerivedEntries(data);

  const currentCycle = Number(data.ciclo ?? 1);
  const packageData = getCastaSkillPackage(data.casta);

  data.pericias.ganhosPorCiclo = ensureArray(data.pericias.ganhosPorCiclo);
  data.pericias.pendencias = ensureArray(data.pericias.pendencias);

  for (let cycle = 2; cycle <= currentCycle; cycle += 1) {
    const alreadyGranted = data.pericias.ganhosPorCiclo.some((entry) => Number(entry?.cycle) === cycle && entry?.source === "cycle");
    if (!alreadyGranted) {
      const pendingEntry = buildPendingEntry({
        source: "cycle",
        cycle,
        allowed: ["skill", "tool", "weapon", "armor", "shield"],
        label: `Progressão do ${cycle}º ciclo`
      });

      upsertPending(data, pendingEntry);
      data.pericias.ganhosPorCiclo.push({
        cycle,
        source: "cycle",
        pendingId: pendingEntry.id,
        resolved: false,
        resolution: null,
        grantedAt: new Date().toISOString()
      });
    }
  }

  for (const entry of data.pericias.ganhosPorCiclo) {
    if (entry?.source !== "cycle" || entry?.resolved) continue;
    const pendingExists = data.pericias.pendencias.some((pending) => pending?.id === entry.pendingId);
    if (pendingExists) continue;

    upsertPending(data, {
      id: entry.pendingId,
      source: "cycle",
      cycle: Number(entry.cycle ?? 0) || null,
      label: `Progressão do ${entry.cycle}º ciclo`,
      allowed: ["skill", "tool", "weapon", "armor", "shield"],
      resolved: false,
      createdAt: new Date().toISOString(),
      castaId: ""
    });
  }

  for (const [cycle, extraChoices] of Object.entries(packageData?.especializacoesPorCiclo ?? {})) {
    if (Number(cycle) > currentCycle) continue;
    for (let index = 0; index < Number(extraChoices ?? 0); index += 1) {
      upsertPending(data, buildPendingEntry({
        source: "casta-expertise",
        cycle: Number(cycle),
        allowed: ["expertise-skill", "expertise-tool"],
        label: `${packageData.nome} · Especialização do ${cycle}º ciclo ${index + 1}`,
        castaId: packageData.id
      }));
    }
  }

  return data;
}

async function persistAndSync(actor, data) {
  const normalized = normalizeFDEData(data);
  synchronizeCycleDerivedEntries(normalized);
  normalized.progressao.bonusProficiencia = getProficiencyBonusFromCycle(normalized.ciclo);
  refreshPendingCounters(normalized);
  await setFDEData(actor, normalized);
  return recalculateAllSkillData(actor);
}

export async function applyStartingSkillPackage(actor, castaId) {
  const packageData = getCastaSkillPackage(castaId);
  if (!packageData) return { ok: false, reason: "Casta sem pacote de perícias mapeado." };

  const data = cloneData(actor);
  removeCastaDerivedEntries(data);

  data.pericias.pacoteInicialCasta = normalizeCastaId(castaId);

  for (const skillId of packageData.periciasFixas ?? []) {
    const normalizedSkillId = normalizeSkillId(skillId);
    if (!normalizedSkillId) continue;
    const bucket = ensureSkillSourceBucket(data, normalizedSkillId);
    pushUniqueSource(bucket, {
      source: "casta-fixed",
      label: packageData.nome,
      castaId: packageData.id
    });
  }

  for (let index = 0; index < Number(packageData.escolhasPericia ?? 0); index += 1) {
    upsertPending(data, buildPendingEntry({
      source: "casta-choice",
      allowed: ["skill"],
      label: `${packageData.nome} · Escolha de Perícia ${index + 1}`,
      castaId: packageData.id
    }));
  }

  for (let index = 0; index < Number(packageData.escolhasFerramenta ?? 0); index += 1) {
    upsertPending(data, buildPendingEntry({
      source: "casta-tool-choice",
      allowed: ["tool"],
      label: `${packageData.nome} · Escolha de Ferramenta ${index + 1}`,
      castaId: packageData.id
    }));
  }

  for (let index = 0; index < Number(packageData.especializacoesIniciais ?? 0); index += 1) {
    upsertPending(data, buildPendingEntry({
      source: "casta-expertise",
      allowed: ["expertise-skill", "expertise-tool"],
      label: `${packageData.nome} · Especialização ${index + 1}`,
      castaId: packageData.id
    }));
  }

  for (const [cycle, extraChoices] of Object.entries(packageData.especializacoesPorCiclo ?? {})) {
    if (Number(cycle) > Number(data.ciclo)) continue;
    for (let index = 0; index < Number(extraChoices ?? 0); index += 1) {
      upsertPending(data, buildPendingEntry({
        source: "casta-expertise",
        cycle: Number(cycle),
        allowed: ["expertise-skill", "expertise-tool"],
        label: `${packageData.nome} · Especialização do ${cycle}º ciclo ${index + 1}`,
        castaId: packageData.id
      }));
    }
  }

  await persistAndSync(actor, data);
  return { ok: true, data: getFDEData(actor) };
}

export async function grantCycleSkillChoice(actor, ciclo) {
  const cycle = Number(ciclo);
  if (!Number.isFinite(cycle) || cycle <= 1) return { ok: true, granted: false };

  const data = cloneData(actor);
  data.pericias.ganhosPorCiclo = ensureArray(data.pericias.ganhosPorCiclo);
  const alreadyGranted = data.pericias.ganhosPorCiclo.some((entry) => Number(entry?.cycle) === cycle && entry?.source === "cycle");
  if (alreadyGranted) return { ok: true, granted: false };

  const pendingEntry = buildPendingEntry({
    source: "cycle",
    cycle,
    allowed: ["skill", "tool", "weapon", "armor", "shield"],
    label: `Progressão do ${cycle}º ciclo`
  });

  data.pericias.pendencias.push(pendingEntry);
  data.pericias.ganhosPorCiclo.push({
    cycle,
    source: "cycle",
    pendingId: pendingEntry.id,
    resolved: false,
    resolution: null,
    grantedAt: new Date().toISOString()
  });

  await persistAndSync(actor, data);
  return { ok: true, granted: true, pendingId: pendingEntry.id };
}

export async function applySkillOrToolChoice(actor, choice) {
  const data = cloneData(actor);
  const pendingId = String(choice?.pendingId ?? "").trim();
  const targetType = String(choice?.type ?? "").trim().toLowerCase();
  const target = String(choice?.target ?? "").trim();
  const cycle = Number(choice?.cycle ?? 0) || null;

  const pending = data.pericias.pendencias.find((entry) => entry?.id === pendingId)
    ?? data.pericias.pendencias.find((entry) => !entry?.resolved && (entry?.allowed ?? []).includes(targetType));

  if (!pending) return { ok: false, reason: "Nenhuma escolha pendente compatível encontrada." };

  const allowed = ensureArray(pending.allowed);
  if (!allowed.includes(targetType)) return { ok: false, reason: "Tipo de escolha não permitido para esta pendência." };

  if (targetType === "skill") {
    const skillId = normalizeSkillId(target);
    if (!skillId) return { ok: false, reason: "Perícia inválida." };
    if (hasSkillProficiency(actor, skillId) || ensureArray(data.pericias.fontes[skillId]).length > 0) {
      return { ok: false, reason: `A perícia ${getSkillLabel(skillId)} já é proficiente.` };
    }
    const bucket = ensureSkillSourceBucket(data, skillId);
    pushUniqueSource(bucket, {
      source: pending.source === "casta-choice" ? "casta-choice" : "cycle",
      cycle: pending.cycle ?? cycle,
      label: pending.label,
      castaId: pending.castaId ?? ""
    });
    data.pericias.escolhasLivres.push({ skillId, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "tool") {
    const toolId = normalizeToolId(target);
    if (!toolId) return { ok: false, reason: "Ferramenta inválida." };
    if (hasToolProficiency(actor, toolId) || data.ferramentas.treinadas.some((entry) => normalizeToolId(entry?.toolId) === toolId)) {
      return { ok: false, reason: `A ferramenta ${getToolLabel(toolId)} já é proficiente.` };
    }
    data.ferramentas.treinadas.push({ toolId, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "weapon") {
    const weaponId = slugify(target);
    data.proficienciasAlternativas.armas.push({ id: weaponId, label: target, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "armor") {
    const armorId = slugify(target);
    data.proficienciasAlternativas.armaduras.push({ id: armorId, label: target, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "shield") {
    data.proficienciasAlternativas.escudos.push({ id: "shield", label: target || "Escudo", source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "expertise-skill") {
    const skillId = normalizeSkillId(target);
    if (!skillId) return { ok: false, reason: "Perícia inválida para especialização." };
    if (!hasSkillProficiency(actor, skillId) && !ensureArray(data.pericias.fontes[skillId]).length) {
      return { ok: false, reason: `A perícia ${getSkillLabel(skillId)} precisa ser proficiente antes de receber especialização.` };
    }
    if (hasSkillExpertise(actor, skillId) || data.pericias.especializacoes.some((entry) => entry?.type === "skill" && normalizeSkillId(entry?.target) === skillId)) {
      return { ok: false, reason: `A perícia ${getSkillLabel(skillId)} já possui especialização.` };
    }
    data.pericias.especializacoes.push({ type: "skill", target: skillId, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else if (targetType === "expertise-tool") {
    const toolId = normalizeToolId(target);
    if (!toolId) return { ok: false, reason: "Ferramenta inválida para especialização." };
    if (!hasToolProficiency(actor, toolId) && !data.ferramentas.treinadas.some((entry) => normalizeToolId(entry?.toolId) === toolId)) {
      return { ok: false, reason: `A ferramenta ${getToolLabel(toolId)} precisa ser proficiente antes de receber especialização.` };
    }
    if (hasToolExpertise(actor, toolId) || data.ferramentas.especializacoes.some((entry) => normalizeToolId(entry?.toolId ?? entry?.target) === toolId)) {
      return { ok: false, reason: `A ferramenta ${getToolLabel(toolId)} já possui especialização.` };
    }
    data.ferramentas.especializacoes.push({ toolId, source: pending.source, cycle: pending.cycle ?? cycle, pendingId: pending.id });
  } else {
    return { ok: false, reason: "Tipo de escolha não suportado." };
  }

  pending.resolved = true;
  pending.resolution = { type: targetType, target };

  for (const entry of data.pericias.ganhosPorCiclo) {
    if (entry?.pendingId !== pending.id) continue;
    entry.resolved = true;
    entry.resolution = { type: targetType, target };
  }

  await persistAndSync(actor, data);
  return { ok: true, pendingId: pending.id };
}

export async function recalculateAllSkillData(actor) {
  const data = cloneData(actor);
  synchronizeCycleDerivedEntries(data);
  data.progressao.bonusProficiencia = getProficiencyBonusFromCycle(data.ciclo);
  refreshPendingCounters(data);
  await setFDEData(actor, data);

  const actorUpdate = buildSkillSyncUpdate(actor);
  const { actorUpdate: toolUpdate, itemUpdates } = buildToolSyncPlan(actor);
  const mergedUpdate = foundry.utils.mergeObject(actorUpdate, toolUpdate, { inplace: false, insertKeys: true, overwrite: true });

  if (Object.keys(mergedUpdate).length) {
    await actor.update(mergedUpdate);
  }

  for (const entry of itemUpdates) {
    await entry.item.update(entry.data);
  }

  return { ok: true, data: getFDEData(actor) };
}
