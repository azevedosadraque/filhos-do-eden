// Filhos do Eden - Main Script
import { FDEActorSheet } from "./sheets/fde-actor-sheet.js";
import { HAS_DND5E_CHARACTER_SHEET } from "./sheets/fde-actor-sheet.js";
import { createDefaultFDEData } from "./helpers/fde-data.js";

Hooks.once("init", () => {
  console.log("Filhos do Eden | Inicializando módulo");
});

Hooks.once("ready", () => {
  console.log("Filhos do Eden | Registrando ficha");

  const DocumentSheetConfigClass = globalThis.foundry?.applications?.apps?.DocumentSheetConfig;

  if (!globalThis.Actor || !DocumentSheetConfigClass?.registerSheet) {
    console.warn("Filhos do Eden | API de registro de ficha não encontrada.");
    return;
  }

  if (!HAS_DND5E_CHARACTER_SHEET) {
    console.warn("Filhos do Eden | Base de ficha de personagem do sistema DnD5e não encontrada. Registro cancelado para evitar ficha quebrada.");
    return;
  }

  const sheetOptions = {
    types: ["character"],
    makeDefault: true,
    label: "Filhos do Eden | Ficha"
  };

  DocumentSheetConfigClass.registerSheet(Actor, "filhos-do-eden", FDEActorSheet, sheetOptions);
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
