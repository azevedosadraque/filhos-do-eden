// Filhos do Eden - Main Script
import { FDEActorSheet } from "./sheets/fde-actor-sheet.js";
import { createDefaultFDEData } from "./helpers/fde-data.js";
import { initializeActorSkillState } from "./helpers/actor-skills.js";

let fdeSheetRegistered = false;

console.warn("Filhos do Eden | Bootstrap do módulo carregado.");

function registerFDESheet() {
  if (fdeSheetRegistered) return true;

  const hasAnyActorSheetBase = Boolean(
    globalThis.dnd5e?.applications?.actor?.CharacterActorSheet
    || globalThis.dnd5e?.applications?.actor?.ActorSheet5eCharacter
    || globalThis.foundry?.appv1?.sheets?.ActorSheet
    || globalThis.ActorSheet
  );

  if (!hasAnyActorSheetBase) {
    console.warn("Filhos do Eden | Base de ActorSheet não encontrada. Registro cancelado.");
    return false;
  }

  const sheetOptions = {
    types: ["character"],
    makeDefault: false,
    label: "Filhos do Eden | Ficha"
  };

  const attempts = [
    {
      name: "Actors.registerSheet",
      fn: globalThis.Actors?.registerSheet,
      run: () => globalThis.Actors.registerSheet("filhos-do-eden", FDEActorSheet, sheetOptions)
    },
    {
      name: "DocumentSheetConfig.registerSheet",
      fn: globalThis.DocumentSheetConfig?.registerSheet,
      run: () => globalThis.DocumentSheetConfig.registerSheet(globalThis.Actor, "filhos-do-eden", FDEActorSheet, sheetOptions)
    },
    {
      name: "foundry.applications.apps.DocumentSheetConfig.registerSheet",
      fn: globalThis.foundry?.applications?.apps?.DocumentSheetConfig?.registerSheet,
      run: () => globalThis.foundry.applications.apps.DocumentSheetConfig.registerSheet(globalThis.Actor, "filhos-do-eden", FDEActorSheet, sheetOptions)
    }
  ];

  for (const attempt of attempts) {
    if (typeof attempt.fn !== "function") continue;

    try {
      attempt.run();
      fdeSheetRegistered = true;
      console.warn(`Filhos do Eden | Ficha registrada com sucesso via ${attempt.name}.`);
      return true;
    } catch (error) {
      const message = String(error?.message ?? error ?? "").toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("duplicate")) {
        fdeSheetRegistered = true;
        console.warn(`Filhos do Eden | Ficha já estava registrada (${attempt.name}).`);
        return true;
      }
      console.warn("Filhos do Eden | Tentativa de registro falhou:", error);
    }
  }

  console.warn("Filhos do Eden | API de registro de ficha não encontrada.");
  return false;
}

Hooks.once("init", () => {
  console.log("Filhos do Eden | Inicializando módulo");
  registerFDESheet();
});

Hooks.once("ready", () => {
  if (!fdeSheetRegistered) registerFDESheet();
  console.log(`Filhos do Eden | Registro ativo: ${fdeSheetRegistered ? "sim" : "não"}`);

  // Exposto para que outros pontos da ficha usem a mesma rolagem custom de dano.
  globalThis.fdeRollItemDamageFromChat = rollItemDamageFromChat;

  for (const actor of globalThis.game?.actors ?? []) {
    if (actor.type !== "character") continue;
    void initializeActorSkillState(actor).catch((error) => {
      console.warn("Filhos do Eden | Falha ao inicializar estado de perícias do ator.", error);
    });
  }
});

function isFDESheet(app) {
  return app instanceof FDEActorSheet
    || app?.constructor?.name === "FDEActorSheet"
    || app?.options?.classes?.includes("filhos-do-eden");
}

function getActorFDEData(actor) {
  return actor?.getFlag?.("filhos-do-eden", "data") ?? {};
}

function hasKnownTechnique(actor, techniqueId) {
  const data = getActorFDEData(actor);
  return Array.isArray(data?.tecnicasConhecidas) && data.tecnicasConhecidas.includes(techniqueId);
}

function getActorCycle(actor) {
  const data = getActorFDEData(actor);
  const raw = Number(data?.ciclo ?? 1);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(6, Math.trunc(raw)));
}

function getArmaDedicadaDamageBonus(cycle) {
  return Math.max(2, Math.min(7, cycle + 1));
}

function isWeaponItem(item) {
  if (!item) return false;
  if (String(item.type ?? "").toLowerCase() === "weapon") return true;
  const actionType = String(item?.system?.actionType ?? "").toLowerCase();
  return actionType === "mwak" || actionType === "rwak";
}

function getExpandedCriticalThreshold(actor, item) {
  if (!isWeaponItem(item)) return 20;
  if (!hasKnownTechnique(actor, "arma-dedicada")) return 20;
  const cycle = getActorCycle(actor);
  return cycle >= 4 ? 18 : 19;
}

function getMessageNaturalD20(message) {
  for (const roll of message?.rolls ?? []) {
    for (const die of roll?.dice ?? []) {
      if (Number(die?.faces) !== 20) continue;
      const result = die?.results?.find?.((entry) => entry?.active !== false);
      const value = Number(result?.result);
      if (Number.isFinite(value) && value >= 1 && value <= 20) return value;
    }
  }
  return null;
}

function messageLikelyMatchesItem(message, actorId, item) {
  if (!message || String(message?.speaker?.actor ?? "") !== String(actorId ?? "")) return false;

  const itemId = String(item?.id ?? "");
  const dnd5e = message?.flags?.dnd5e ?? {};
  if (String(dnd5e?.itemId ?? "") === itemId) return true;
  if (String(dnd5e?.roll?.itemId ?? "") === itemId) return true;
  if (String(dnd5e?.itemUuid ?? "").includes(itemId)) return true;
  if (String(dnd5e?.roll?.itemUuid ?? "").includes(itemId)) return true;

  const name = String(item?.name ?? "").trim();
  if (name && String(message?.content ?? "").toLowerCase().includes(name.toLowerCase())) return true;

  return false;
}

function findRecentAttackNatural(actorId, item) {
  const messages = globalThis.game?.messages?.contents ?? [];
  if (!messages.length) return null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!messageLikelyMatchesItem(message, actorId, item)) continue;
    const natural = getMessageNaturalD20(message);
    if (natural == null) continue;
    return natural;
  }

  return null;
}

function multiplyDiceInFormula(formula, multiplier) {
  if (!formula || multiplier <= 1) return formula;
  return String(formula).replace(/(\d*)d(\d+)((?:k[hl]\d+|d[hl]\d+)*)/gi, (_match, qtyRaw, sides, suffix) => {
    const qty = Number(qtyRaw || 1);
    const nextQty = Number.isFinite(qty) ? Math.max(1, Math.trunc(qty * multiplier)) : multiplier;
    return `${nextQty}d${sides}${suffix ?? ""}`;
  });
}

function extractDamageFormulas(item) {
  const formulas = [];
  const parts = item?.system?.damage?.parts;

  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (Array.isArray(part) && typeof part[0] === "string" && part[0].trim()) {
        formulas.push(part[0].trim());
        continue;
      }
      if (part && typeof part === "object") {
        const candidate = String(part.formula ?? "").trim();
        if (candidate) formulas.push(candidate);
      }
    }
  }

  const baseFormula = String(item?.system?.damage?.base?.formula ?? "").trim();
  if (baseFormula) formulas.push(baseFormula);

  const itemFormula = String(item?.system?.formula ?? "").trim();
  if (itemFormula) formulas.push(itemFormula);

  return [...new Set(formulas.filter(Boolean))];
}

function getActorCastaDamageDie(actor) {
  const fdeData = getActorFDEData(actor);
  const raw = String(fdeData?.progressao?.hitDie ?? "d10").trim().toLowerCase();
  if (/^d\d+$/.test(raw)) return raw;
  return "d10";
}

function buildSupplementDamageFormula(actor, item, options = {}) {
  const castaDamageDie = getActorCastaDamageDie(actor);
  const baseFormula = `1${castaDamageDie}`;

  const multiplier = options.mode === "critical"
    ? (options.quadrupleCritical ? 4 : 2)
    : 1;

  let formula = multiplyDiceInFormula(baseFormula, multiplier);

  if (Number.isFinite(options.flatBonus) && options.flatBonus !== 0) {
    formula += ` + ${Math.trunc(options.flatBonus)}`;
  }

  return formula;
}

async function rollSupplementDamage(actor, item, formula, flavor, event) {
  const rollData = {
    ...(typeof actor?.getRollData === "function" ? actor.getRollData() : {}),
    ...(typeof item?.getRollData === "function" ? item.getRollData() : {})
  };

  const roll = await (new Roll(formula, rollData)).evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    flags: {
      "filhos-do-eden": {
        supplementDamageRoll: true,
        itemId: String(item?.id ?? "")
      }
    }
  });

  return roll;
}

async function promptDamageRollMode(options = {}) {
  const DialogClass = globalThis.Dialog;
  if (!DialogClass) return "normal";

  const suggestCritical = Boolean(options?.suggestCritical);
  const hasPontoFraco = Boolean(options?.hasPontoFraco);
  const hint = String(options?.hint ?? "").trim();

  return new Promise((resolve) => {
    const dialog = new DialogClass({
      title: "Rolar Dano",
      content: `
        <form class="fde-roll-options">
          ${hint ? `<p><em>${hint}</em></p>` : ""}
          <div class="form-group">
            <label>Tipo de dano</label>
            <select name="damageMode">
              <option value="normal"${suggestCritical ? "" : " selected"}>Normal</option>
              <option value="critical"${suggestCritical ? " selected" : ""}>Crítico${hasPontoFraco ? " (Ponto Fraco: x4 dados)" : ""}</option>
            </select>
          </div>
        </form>
      `,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancelar",
          callback: () => resolve(null)
        },
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Rolar",
          callback: (html) => {
            const root = html?.[0] ?? html;
            const rawMode = String(root?.querySelector?.('[name="damageMode"]')?.value ?? "normal");
            resolve(rawMode === "critical" ? "critical" : "normal");
          }
        }
      },
      default: "roll",
      close: () => resolve(null)
    });

    dialog.render(true);
  });
}

async function rollItemDamageFromChat(actorId, itemId, event) {
  const actor = globalThis.game?.actors?.get?.(String(actorId ?? "").trim());
  if (!actor) {
    ui.notifications?.warn("Ator não encontrado para rolar dano.");
    return;
  }

  const item = actor.items?.get?.(String(itemId ?? "").trim());
  if (!item) {
    ui.notifications?.warn("Item não encontrado para rolar dano.");
    return;
  }

  const isWeapon = isWeaponItem(item);
  const hasArmaDedicada = hasKnownTechnique(actor, "arma-dedicada") && isWeapon;
  const hasPontoFraco = hasKnownTechnique(actor, "ponto-fraco") && isWeapon;
  const cycle = getActorCycle(actor);
  const armaDedicadaBonus = hasArmaDedicada ? getArmaDedicadaDamageBonus(cycle) : 0;

  const criticalThreshold = getExpandedCriticalThreshold(actor, item);
  const recentNatural = findRecentAttackNatural(actor.id, item);
  const expandedCriticalDetected = Number.isFinite(recentNatural) && Number(recentNatural) >= criticalThreshold;

  const hintParts = [];
  if (hasArmaDedicada) hintParts.push(`Arma Dedicada ativa: crítico em ${criticalThreshold}+ e +${armaDedicadaBonus} no dano.`);
  if (hasPontoFraco) hintParts.push("Ponto Fraco ativo: crítico quadruplica apenas os dados.");
  if (expandedCriticalDetected) hintParts.push(`Último ataque detectado com ${recentNatural} natural (crítico ampliado).`);

  const mode = await promptDamageRollMode({
    suggestCritical: expandedCriticalDetected,
    hasPontoFraco,
    hint: hintParts.join(" ")
  });
  if (!mode) return;

  const isCriticalMode = mode === "critical";
  const useQuadrupleCritical = isCriticalMode && hasPontoFraco;

  const formula = buildSupplementDamageFormula(actor, item, {
    mode,
    quadrupleCritical: useQuadrupleCritical,
    flatBonus: armaDedicadaBonus
  });

  const modeLabel = isCriticalMode
    ? (useQuadrupleCritical ? "Dano crítico (x4 dados)" : "Dano crítico")
    : "Dano normal";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <section class="fde-chat-card fde-item-attack-chat">
        <p><strong>${modeLabel} selecionado</strong> · ${item.name ?? "Item"}${armaDedicadaBonus ? ` · Arma Dedicada +${armaDedicadaBonus}` : ""}</p>
      </section>
    `
  });

  if (formula) {
    await rollSupplementDamage(
      actor,
      item,
      formula,
      `${item.name ?? "Item"} · ${modeLabel}${armaDedicadaBonus ? ` · Arma Dedicada +${armaDedicadaBonus}` : ""}`,
      event
    );
    return;
  }

  try {
    if (isCriticalMode && typeof item.rollCritical === "function") {
      await item.rollCritical({ event });
      return;
    }

    if (typeof item.rollDamage === "function") {
      await item.rollDamage({ event, critical: isCriticalMode });
      return;
    }
  } catch (_error) {
    try {
      if (isCriticalMode && typeof item.rollCritical === "function") {
        await item.rollCritical();
        return;
      }

      if (typeof item.rollDamage === "function") {
        await item.rollDamage();
        return;
      }
    } catch (_error2) {
      // fallthrough
    }
  }

  ui.notifications?.warn("Este item não possui rolagem de dano disponível.");
}

// Garante injeção via hook também (cobre casos onde _onRender/_activateListeners não disparam)
Hooks.on("renderActorSheet", (app, html) => {
  if (!isFDESheet(app)) return;
  console.log(`Filhos do Eden | Render confirmado da ficha custom: ${app.actor?.name ?? "(sem nome)"}`);
  // Aguarda o DOM estar totalmente pronto antes de injetar
  setTimeout(() => {
    const root = app._getSheetElement?.();
    const hasNativeFDETemplate = Boolean(root?.querySelector("form.fde-sheet"));
    if (!hasNativeFDETemplate) app._injectFDETab();
    app._bindFDEActions();
  }, 50);
});

Hooks.on("renderChatMessage", (_message, html) => {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("[data-fde-chat-item-damage]").forEach((button) => {
    if (button.dataset.fdeChatDamageBound === "1") return;
    button.dataset.fdeChatDamageBound = "1";

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget;
      const actorId = String(target?.dataset?.fdeChatActorId ?? "").trim();
      const itemId = String(target?.dataset?.fdeChatItemDamage ?? "").trim();
      if (!actorId || !itemId) return;

      await rollItemDamageFromChat(actorId, itemId, event);
    });
  });
});

Hooks.on("createActor", async (actor) => {
  if (actor.type !== "character") return;
  if (actor.getFlag("filhos-do-eden", "data")) return;
  await actor.setFlag("filhos-do-eden", "data", createDefaultFDEData());
  await initializeActorSkillState(actor);
});
