// Filhos do Eden - Main Script
import { FDEActorSheet } from "./sheets/fde-actor-sheet.js";
import { createDefaultFDEData } from "./helpers/fde-data.js";

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
});

function isFDESheet(app) {
  return app instanceof FDEActorSheet
    || app?.constructor?.name === "FDEActorSheet"
    || app?.options?.classes?.includes("filhos-do-eden");
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

Hooks.on("createActor", async (actor) => {
  if (actor.type !== "character") return;
  if (actor.getFlag("filhos-do-eden", "data")) return;
  await actor.setFlag("filhos-do-eden", "data", createDefaultFDEData());
});
