import { FDE_MODULE_ID } from "./fde-data.js";

export function getConModifier(actor) {
  return Number(actor?.system?.abilities?.con?.mod ?? 0);
}

export function parseHitDieSize(hitDie) {
  return Number(String(hitDie ?? "").replace(/^d/i, "")) || 10;
}

export function getAverageHitPointsByCycle(hitDie, cycle, conModifier) {
  const dieSize = parseHitDieSize(hitDie);
  const firstCycle = dieSize + conModifier;

  if (cycle <= 1) {
    return Math.max(1, firstCycle);
  }

  const averagePerFourDice = ({ 12: 28, 10: 24, 8: 20 })[dieSize] ?? Math.ceil((dieSize / 2 + 0.5) * 4);
  const additionalCycles = cycle - 1;
  return Math.max(1, firstCycle + (additionalCycles * (averagePerFourDice + (conModifier * 4))));
}

export function buildActorProgressionUpdate(actor, fdeData) {
  const hpMax = Number(fdeData?.progressao?.pontosVidaMaximos ?? 0);
  const currentHp = Number(actor?.system?.attributes?.hp?.value ?? hpMax);
  const cappedHp = hpMax > 0 ? Math.min(currentHp || hpMax, hpMax) : currentHp;

  return {
    "system.attributes.prof": Number(fdeData?.progressao?.bonusProficiencia ?? 2),
    "system.attributes.hp.max": hpMax,
    "system.attributes.hp.value": hpMax > 0 ? cappedHp : currentHp,
    [`flags.${FDE_MODULE_ID}.progressionReady`]: true
  };
}

export async function upsertFeatItem(actor, itemData) {
  const existing = actor.items.find((item) => item.type === "feat" && item.getFlag(FDE_MODULE_ID, "featureId") === itemData.featureId);
  const payload = {
    name: itemData.name,
    type: "feat",
    img: itemData.img ?? "icons/svg/angel.svg",
    system: {
      description: {
        value: itemData.description ?? ""
      }
    },
    flags: {
      [FDE_MODULE_ID]: {
        featureId: itemData.featureId,
        generated: true
      }
    }
  };

  if (existing) {
    await existing.update(payload);
    return existing;
  }

  const created = await actor.createEmbeddedDocuments("Item", [payload]);
  return created[0] ?? null;
}

export async function syncDerivedFeatureItems(actor, fdeData) {
  const features = [];

  if ((fdeData?.progressao?.ataquesExtras ?? 0) > 0) {
    features.push({
      featureId: "extra-attack",
      name: "Ataque Extra (Filhos do Éden)",
      description: `<p>O personagem realiza <strong>${fdeData.progressao.ataquesPorAcao}</strong> ataques por ação de Ataque.</p>`
    });
  }

  if (fdeData?.progressao?.dadoLiderNato) {
    features.push({
      featureId: "lider-nato",
      name: "Líder Nato (Filhos do Éden)",
      description: `<p>Dado atual de liderança: <strong>${fdeData.progressao.dadoLiderNato}</strong>.</p>`
    });
  }

  if (fdeData?.progressao?.dadoBeijoDaMorte) {
    features.push({
      featureId: "beijo-da-morte",
      name: "Beijo da Morte (Filhos do Éden)",
      description: `<p>Dado atual do Beijo da Morte: <strong>${fdeData.progressao.dadoBeijoDaMorte}</strong>.</p>`
    });
  }

  for (const feature of features) {
    await upsertFeatItem(actor, feature);
  }
}

export function createProgressionChatCard(actor, summary) {
  const gains = (summary.gained ?? []).map((entry) => `<li>${entry}</li>`).join("");
  const pending = (summary.pendingChoices ?? []).map((entry) => `<li>${entry}</li>`).join("");

  return `
    <section class="fde-chat-card">
      <h2>${actor.name} alcançou o ${summary.toCycle}º ciclo</h2>
      <p><strong>${summary.title}</strong></p>
      <ul>${gains || "<li>Nenhuma mudança adicional registrada.</li>"}</ul>
      ${pending ? `<h3>Escolhas pendentes</h3><ul>${pending}</ul>` : ""}
    </section>
  `;
}
