import { getCycleData } from "../data/cycles.js";
import { getCasta, getCastaOptions } from "../data/castas.js";
import { getTechnique } from "../data/tecnicas.js";
import { applyCycleProgression, getUnlockedTechniques, learnTechnique, previewCycleUpgrade } from "../logic/progression.js";
import { validateTechniqueKnownCounts } from "../logic/validations.js";

const DND5ECharacterSheet = globalThis.dnd5e?.applications?.actor?.CharacterActorSheet
  ?? globalThis.dnd5e?.applications?.actor?.ActorSheet5eCharacter;

export const HAS_DND5E_CHARACTER_SHEET = Boolean(DND5ECharacterSheet);

const FallbackActorSheet = globalThis.foundry?.appv1?.sheets?.ActorSheet;

const FDE_DEFAULT_DATA = {
  jogador: "",
  especie: "",
  casta: "",
  ciclo: 1,
  alinhamento: "",
  experiencia: 0,
  aura: { value: 0, max: 0 },
  progressao: {
    escolhasEspecializacao: 0
  },
  escolhasPendentes: {
    especializacao: 0,
    provincia: 0
  },
  recursosCasta: {
    provincia: "",
    provinciaEfeitos: [],
    contatos: [],
    recursos: [],
    contratos: [],
    especializacoes: [],
    possessao: {
      hospedeiro: "",
      observacoes: ""
    }
  },
  beneficiosCasta: [""],
  tecnicas: [
    {
      nome: "",
      nivel: 1,
      tipo: "divindade",
      custoAura: 0,
      descricao: ""
    }
  ],
  outrasPericias: []
};

const FDE_ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

const FDE_SKILL_ORDER = [
  "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv",
  "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
];

const FDE_ACTIONS = new Set([
  "add-beneficio",
  "remove-beneficio",
  "add-pericia",
  "remove-pericia",
  "add-especializacao",
  "remove-especializacao",
  "add-contato",
  "remove-contato",
  "add-recurso",
  "remove-recurso",
  "add-contrato",
  "remove-contrato",
  "learn-technique",
  "confirm-learn-technique",
  "close-learn-inline",
  "add-tecnica",
  "remove-tecnica",
  "advance-cycle"
]);

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeFDEData(data = {}) {
  const base = data && typeof data === "object" ? foundry.utils.deepClone(data) : {};
  const beneficiosRaw = data.beneficiosCasta ?? data.beneficioCasta ?? FDE_DEFAULT_DATA.beneficiosCasta;
  const outrasPericiasRaw = data.outrasPericias ?? FDE_DEFAULT_DATA.outrasPericias;
  const tecnicasRaw = data.tecnicas ?? FDE_DEFAULT_DATA.tecnicas;
  const contatosRaw = data.recursosCasta?.contatos ?? FDE_DEFAULT_DATA.recursosCasta.contatos;
  const recursosRaw = data.recursosCasta?.recursos ?? FDE_DEFAULT_DATA.recursosCasta.recursos;
  const contratosRaw = data.recursosCasta?.contratos ?? FDE_DEFAULT_DATA.recursosCasta.contratos;
  const especializacoesRaw = data.recursosCasta?.especializacoes ?? FDE_DEFAULT_DATA.recursosCasta.especializacoes;
  const provinciaEfeitosRaw = data.recursosCasta?.provinciaEfeitos ?? FDE_DEFAULT_DATA.recursosCasta.provinciaEfeitos;

  return {
    ...base,
    jogador: data.jogador ?? FDE_DEFAULT_DATA.jogador,
    especie: data.especie ?? FDE_DEFAULT_DATA.especie,
    casta: data.casta ?? FDE_DEFAULT_DATA.casta,
    ciclo: Number(data.ciclo ?? FDE_DEFAULT_DATA.ciclo),
    alinhamento: data.alinhamento ?? FDE_DEFAULT_DATA.alinhamento,
    experiencia: Number(data.experiencia ?? FDE_DEFAULT_DATA.experiencia),
    aura: {
      value: Number(data.aura?.value ?? FDE_DEFAULT_DATA.aura.value),
      max: Number(data.aura?.max ?? FDE_DEFAULT_DATA.aura.max)
    },
    progressao: {
      ...(base.progressao ?? {}),
      escolhasEspecializacao: Number(data.progressao?.escolhasEspecializacao ?? base.progressao?.escolhasEspecializacao ?? FDE_DEFAULT_DATA.progressao.escolhasEspecializacao)
    },
    escolhasPendentes: {
      ...(base.escolhasPendentes ?? {}),
      especializacao: Number(data.escolhasPendentes?.especializacao ?? base.escolhasPendentes?.especializacao ?? FDE_DEFAULT_DATA.escolhasPendentes.especializacao),
      provincia: Number(data.escolhasPendentes?.provincia ?? base.escolhasPendentes?.provincia ?? FDE_DEFAULT_DATA.escolhasPendentes.provincia)
    },
    recursosCasta: {
      ...(base.recursosCasta ?? {}),
      provincia: String(data.recursosCasta?.provincia ?? base.recursosCasta?.provincia ?? FDE_DEFAULT_DATA.recursosCasta.provincia),
      provinciaEfeitos: (Array.isArray(provinciaEfeitosRaw) ? provinciaEfeitosRaw : [provinciaEfeitosRaw]).map((item) => String(item ?? "")).filter(Boolean),
      contatos: (Array.isArray(contatosRaw) ? contatosRaw : [contatosRaw]).map((item) => String(item ?? "")),
      recursos: (Array.isArray(recursosRaw) ? recursosRaw : [recursosRaw]).map((item) => String(item ?? "")),
      contratos: (Array.isArray(contratosRaw) ? contratosRaw : [contratosRaw]).map((item) => String(item ?? "")),
      especializacoes: (Array.isArray(especializacoesRaw) ? especializacoesRaw : [especializacoesRaw]).map((item) => String(item ?? "")),
      possessao: {
        ...(base.recursosCasta?.possessao ?? {}),
        hospedeiro: String(data.recursosCasta?.possessao?.hospedeiro ?? base.recursosCasta?.possessao?.hospedeiro ?? FDE_DEFAULT_DATA.recursosCasta.possessao.hospedeiro),
        observacoes: String(data.recursosCasta?.possessao?.observacoes ?? base.recursosCasta?.possessao?.observacoes ?? FDE_DEFAULT_DATA.recursosCasta.possessao.observacoes)
      }
    },
    beneficiosCasta: (Array.isArray(beneficiosRaw) ? beneficiosRaw : [beneficiosRaw]).map((item) => String(item ?? "")),
    tecnicas: (Array.isArray(tecnicasRaw) ? tecnicasRaw : [tecnicasRaw]).map((tecnica) => ({
      nome: tecnica?.nome ?? "",
      nivel: Number(tecnica?.nivel ?? 1),
      tipo: tecnica?.tipo === "profanacao" ? "profanacao" : "divindade",
      custoAura: Number(tecnica?.custoAura ?? 0),
      descricao: tecnica?.descricao ?? ""
    })),
    outrasPericias: (Array.isArray(outrasPericiasRaw) ? outrasPericiasRaw : [outrasPericiasRaw]).map((item) => String(item ?? ""))
  };
}

function getFormDataObject(form) {
  const Extended = globalThis.foundry?.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
  if (Extended) return new Extended(form).object;
  return foundry.utils.expandObject(Object.fromEntries(new FormData(form).entries()));
}

export class FDEActorSheet extends (DND5ECharacterSheet ?? FallbackActorSheet) {
  get template() {
    return "modules/filhos-do-eden/templates/actor/fde-actor-sheet.hbs";
  }

  _toNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  _scalarFromFormValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value[value.length - 1] : undefined;
    }
    return value;
  }

  _sanitizeSystemFields(expanded) {
    const system = expanded?.system;
    if (!system) return;

    const abilities = system.abilities ?? {};
    for (const [abilityKey, abilityData] of Object.entries(abilities)) {
      if (!abilityData || typeof abilityData !== "object") continue;

      if ("value" in abilityData) {
        const rawScore = this._scalarFromFormValue(abilityData.value);
        abilityData.value = Math.trunc(this._toNumber(rawScore, 10));
      }

      if ("proficient" in abilityData) {
        const rawProficient = this._scalarFromFormValue(abilityData.proficient);
        const parsed = Math.trunc(this._toNumber(rawProficient, 0));
        abilityData.proficient = Math.max(0, Math.min(2, parsed));
      }
    }

    const skills = system.skills ?? {};
    for (const [skillKey, skillData] of Object.entries(skills)) {
      if (!skillData || typeof skillData !== "object") continue;

      if ("value" in skillData) {
        const rawValue = this._scalarFromFormValue(skillData.value);
        const parsed = this._toNumber(rawValue, 0);
        skillData.value = Math.round(parsed * 2) / 2;
      }

      if (skillData.bonuses && typeof skillData.bonuses === "object" && "check" in skillData.bonuses) {
        const rawCheck = this._scalarFromFormValue(skillData.bonuses.check);
        skillData.bonuses.check = String(rawCheck ?? "").trim();
      }
    }
  }

  _sanitizeFlatSystemFields(flatData) {
    if (!flatData || typeof flatData !== "object") return flatData;

    const expanded = foundry.utils.expandObject(foundry.utils.deepClone(flatData));
    this._sanitizeSystemFields(expanded);
    return foundry.utils.flattenObject(expanded);
  }

  _resolveLabel(rawLabel, fallback) {
    const candidate = rawLabel?.label ?? rawLabel?.long ?? rawLabel?.short ?? rawLabel;
    const asString = typeof candidate === "string" ? candidate : null;
    if (!asString) return fallback;

    // Se for chave de i18n (ex: DND5E.SkillAcr), localiza.
    if (asString.includes(".")) {
      const localized = globalThis.game?.i18n?.localize?.(asString);
      if (localized && localized !== asString) return localized;
    }
    return asString;
  }

  _getSheetElement() {
    // ApplicationV2: this.element é HTMLElement direto
    if (this.element instanceof HTMLElement) return this.element;
    // ApplicationV1/jQuery: this.element é jQuery, [0] é o DOM element
    if (this.element && this.element[0] instanceof HTMLElement) return this.element[0];
    // Fallback: busca pelo ID do app no documento
    if (this.id) {
      const byId = document.getElementById(this.id);
      if (byId) return byId;
    }
    return null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "filhos-do-eden"],
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "geral" }]
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.fde = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    return context;
  }

  // ApplicationV2: chamado após render
  _onRender(context, options) {
    if (super._onRender) {
      try {
        super._onRender(context, options);
      } catch (error) {
        console.warn("Filhos do Eden | Falha em super._onRender (compatibilidade com template custom).", error);
      }
    }
    const root = this._getSheetElement();
    const hasNativeFDETemplate = Boolean(root?.querySelector("form.fde-sheet"));
    if (!hasNativeFDETemplate) this._injectFDETab();
    this._bindFDEActions();
  }

  // ApplicationV1 / DnD5e legado
  activateListeners(html) {
    super.activateListeners(html);
    const root = this._getSheetElement();
    const hasNativeFDETemplate = Boolean(root?.querySelector("form.fde-sheet"));
    if (!hasNativeFDETemplate) this._injectFDETab();
    this._bindFDEActions();
  }

  _bindFDEActions() {
    const root = this._getSheetElement();
    if (!root) return;

    root.querySelectorAll("[data-fde-action], [data-action]").forEach((button) => {
      const actionName = button.dataset.fdeAction ?? button.dataset.action;
      if (!actionName) return;
      if (!FDE_ACTIONS.has(actionName)) return;
      if (button.dataset.fdeBound === "1") return;
      button.dataset.fdeBound = "1";
      if (!button.dataset.fdeAction) button.dataset.fdeAction = actionName;
      button.addEventListener("click", this._onAction.bind(this));
    });

    root.querySelectorAll("[data-fde-system-path]").forEach((input) => {
      if (input.dataset.fdeSystemBound === "1") return;
      input.dataset.fdeSystemBound = "1";
      input.addEventListener("change", this._onSystemFieldChange.bind(this));
    });

    root.querySelectorAll("[data-fde-subtab]").forEach((button) => {
      if (button.dataset.fdeSubtabBound === "1") return;
      button.dataset.fdeSubtabBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const subtab = button.dataset.fdeSubtab;
        const tabRoot = button.closest(".fde-extra-tab") ?? root;
        if (!subtab || !tabRoot) return;

        tabRoot.querySelectorAll("[data-fde-subtab]").forEach((el) => el.classList.remove("active"));
        tabRoot.querySelectorAll("[data-fde-panel]").forEach((panel) => { panel.hidden = true; });

        button.classList.add("active");
        const target = tabRoot.querySelector(`[data-fde-panel="${subtab}"]`);
        if (target) target.hidden = false;
      });
    });

    root.querySelectorAll("[data-fde-learn-filter]").forEach((control) => {
      if (control.dataset.fdeLearnFilterBound === "1") return;
      control.dataset.fdeLearnFilterBound = "1";
      const eventName = control.tagName === "INPUT" ? "input" : "change";
      control.addEventListener(eventName, (event) => {
        const source = event.currentTarget;
        const dialogRoot = source?.closest?.(".fde-learn-dialog");
        if (dialogRoot) this._applyLearnTechniqueFilters(dialogRoot);
      });
    });
  }

  _openLearnTechniqueInline(contentHTML) {
    const root = this._getSheetElement();
    const host = root?.querySelector?.(".fde-learn-inline-host");
    if (!host) {
      ui.notifications?.warn("Não foi possível abrir a lista de técnicas nesta ficha.");
      return;
    }

    host.innerHTML = `
      <section class="fde-learn-inline">
        <div class="fde-sub-header">
          <h5>Aprender Técnicas (por Slot)</h5>
          <button type="button" class="fde-btn-remove" data-fde-action="close-learn-inline" title="Fechar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        ${contentHTML}
      </section>
    `;

    const dialogRoot = host.querySelector(".fde-learn-dialog");
    if (dialogRoot) this._applyLearnTechniqueFilters(dialogRoot);
    this._bindFDEActions();
  }

  _setupInjectedSubtabs(tabSection) {
    if (!tabSection) return;
    const scroll = tabSection.querySelector(".fde-scroll");
    if (!scroll) return;
    if (scroll.querySelector(".fde-inner-tabs")) return;

    const blocks = Array.from(scroll.querySelectorAll(":scope > .fde-block"));
    if (!blocks.length) return;

    const nav = document.createElement("div");
    nav.className = "fde-inner-tabs";
    nav.innerHTML = `
      <button type="button" class="fde-inner-tab active" data-fde-subtab="geral">Geral</button>
      <button type="button" class="fde-inner-tab" data-fde-subtab="casta">Casta</button>
      <button type="button" class="fde-inner-tab" data-fde-subtab="tecnicas">Técnicas</button>
    `;

    const panelGeral = document.createElement("section");
    panelGeral.className = "fde-inner-panel";
    panelGeral.dataset.fdePanel = "geral";

    const panelCasta = document.createElement("section");
    panelCasta.className = "fde-inner-panel";
    panelCasta.dataset.fdePanel = "casta";
    panelCasta.hidden = true;

    const panelTecnicas = document.createElement("section");
    panelTecnicas.className = "fde-inner-panel";
    panelTecnicas.dataset.fdePanel = "tecnicas";
    panelTecnicas.hidden = true;

    for (const block of blocks) {
      const title = String(block.querySelector(".fde-section-header h4")?.textContent ?? "").toLowerCase();
      if (title.includes("técnicas") || title.includes("tecnicas")) {
        panelTecnicas.appendChild(block);
      } else if (title.includes("casta") || title.includes("recursos") || title.includes("outras perícias") || title.includes("outras pericias")) {
        panelCasta.appendChild(block);
      } else {
        panelGeral.appendChild(block);
      }
    }

    scroll.prepend(panelTecnicas);
    scroll.prepend(panelCasta);
    scroll.prepend(panelGeral);
    scroll.prepend(nav);
  }

  async _onSystemFieldChange(event) {
    const element = event.currentTarget;
    const path = element.dataset.fdeSystemPath;
    const mode = element.dataset.fdeMode ?? "number";
    if (!path) return;

    let value = this._scalarFromFormValue(element.value);

    switch (mode) {
      case "int": {
        value = Math.trunc(this._toNumber(value, 0));
        break;
      }
      case "ability-prof": {
        value = Math.trunc(this._toNumber(value, 0));
        value = Math.max(0, Math.min(2, value));
        break;
      }
      case "half-step": {
        value = Math.round(this._toNumber(value, 0) * 2) / 2;
        value = Math.max(0, Math.min(2, value));
        break;
      }
      default: {
        value = this._toNumber(value, 0);
      }
    }

    const updateData = {};
    foundry.utils.setProperty(updateData, path, value);
    await this.actor.update(updateData);
  }

  _injectFDETab() {
    const root = this._getSheetElement();
    if (!root) {
      console.warn("Filhos do Eden | _injectFDETab: root não encontrado. this.element =", this.element, "this.id =", this.id);
      return;
    }

    const nav = root.querySelector('nav[data-group="primary"], nav.tabs, [role="tablist"][data-group="primary"]');
    // DnD5e v13 usa section.tab-body ou div que contém as sections de tab
    const body = root.querySelector('.tab-body')
      ?? root.querySelector('[class*="tab-body"]')
      ?? root.querySelector('.sheet-body')
      ?? root.querySelector('.window-content');

    // Remove injeção anterior
    root.querySelector('[data-tab="fde"]')?.closest('a, button, .item')?.remove();
    nav?.querySelector('[data-tab="fde"]')?.remove();
    root.querySelector('.fde-extra-tab')?.remove();

    if (!nav || !body) {
      console.warn("Filhos do Eden | nav ou body não encontrado — usando fallback inline");
      const form = root.querySelector("form") ?? root.querySelector(".window-content");
      if (!form) { console.warn("Filhos do Eden | fallback também falhou"); return; }
      const fde = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
      const section = document.createElement("section");
      section.className = "fde-extra-tab fde-inline-fallback";
      section.style.cssText = "display:block; padding:8px; border-top:2px solid #7c7c7c; margin-top:8px;";
      section.innerHTML = this._renderFDETabHTML(fde);
      form.appendChild(section);
      return;
    }

    // Injeta item de nav como PRIMEIRO item
    const navItem = document.createElement("a");
    navItem.className = "item control";
    navItem.setAttribute("data-action", "tab");
    navItem.setAttribute("data-group", "primary");
    navItem.setAttribute("data-tab", "fde");
    navItem.setAttribute("aria-label", "Filhos do Eden");
    navItem.setAttribute("data-tooltip", "Filhos do Eden");
    navItem.innerHTML = '<i class="fas fa-feather-pointed" inert></i> <span>Filhos do Éden</span>';
    nav.insertBefore(navItem, nav.firstElementChild ?? null);

    // Injeta conteúdo do tab
    const fde = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    const tabSection = document.createElement("section");
    tabSection.className = "tab fde-extra-tab";
    tabSection.setAttribute("data-group", "primary");
    tabSection.setAttribute("data-tab", "fde");
    tabSection.innerHTML = this._renderFDETabHTML(fde);
    this._setupInjectedSubtabs(tabSection);
    body.insertBefore(tabSection, body.firstElementChild ?? null);

    // No modo de injeção (layout base DnD), mantém apenas a aba FDE visível.
    const allowedTabs = new Set(["fde"]);
    nav.querySelectorAll("[data-tab]").forEach((item) => {
      const tabName = item.dataset.tab;
      if (!allowedTabs.has(tabName)) item.remove();
    });
    root.querySelectorAll('.tab[data-group="primary"], .tab[data-tab]').forEach((section) => {
      const tabName = section.dataset.tab;
      if (!allowedTabs.has(tabName)) section.remove();
    });

    // Ativa o tab ao clicar no nav item
    navItem.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Tenta usar o sistema nativo de tabs do ApplicationV2
      if (typeof this.changeTab === "function") {
        try {
          this.changeTab("fde", "primary", { event: e });
          return;
        } catch (_) { /* segue para fallback manual */ }
      }
      // Fallback manual
      nav.querySelectorAll("[data-tab]").forEach(el => el.classList.remove("active"));
      root.querySelectorAll(`.tab[data-group="primary"]`).forEach(el => el.classList.remove("active"));
      navItem.classList.add("active");
      tabSection.classList.add("active");
    });

    // Garante a aba FDE ativa após podar as abas padrão.
    nav.querySelectorAll("[data-tab]").forEach((el) => el.classList.remove("active"));
    root.querySelectorAll('.tab[data-group="primary"], .tab[data-tab]').forEach((el) => el.classList.remove("active"));
    navItem.classList.add("active");
    tabSection.classList.add("active");

    if (typeof this.changeTab === "function") {
      try {
        this.changeTab("fde", "primary");
      } catch (_) {
        // fallback manual já aplicado acima
      }
    }
  }

  _getAbilitiesForDisplay() {
    const abilities = this.actor?.system?.abilities ?? {};
    const labels = globalThis.CONFIG?.DND5E?.abilities ?? {};
    const proficiencyBonus = this._toNumber(this.actor?.system?.attributes?.prof, 0);

    return FDE_ABILITY_ORDER.map((key) => {
      const ability = abilities[key] ?? {};
      const score = this._toNumber(ability.value, 10);
      const mod = this._toNumber(ability.mod, Math.floor((score - 10) / 2));
      const proficientRaw = ability.proficient;
      const proficientParsed = typeof proficientRaw === "boolean"
        ? (proficientRaw ? 1 : 0)
        : this._toNumber(proficientRaw, 0);
      const proficient = Math.max(0, Math.min(2, Math.trunc(proficientParsed)));
      const computedSave = mod + (proficiencyBonus * proficient);
      const save = this._toNumber(ability.save, computedSave);
      const label = this._resolveLabel(labels[key], key.toUpperCase());

      return {
        key,
        label,
        score,
        mod,
        save,
        proficient,
        modLabel: mod >= 0 ? `+${mod}` : `${mod}`,
        saveLabel: save >= 0 ? `+${save}` : `${save}`
      };
    });
  }

  _getSkillsForDisplay() {
    const skills = this.actor?.system?.skills ?? {};
    const abilities = this.actor?.system?.abilities ?? {};
    const labels = globalThis.CONFIG?.DND5E?.skills ?? {};
    const abilityLabels = globalThis.CONFIG?.DND5E?.abilities ?? {};
    const proficiencyBonus = this._toNumber(this.actor?.system?.attributes?.prof, 0);

    const proficiencyLabel = (value) => {
      if (value >= 2) return "Expertise";
      if (value >= 1) return "Proficiente";
      if (value >= 0.5) return "Meia Prof.";
      return "Sem Prof.";
    };

    return FDE_SKILL_ORDER
      .filter((key) => key in skills)
      .map((key) => {
        const skill = skills[key] ?? {};
        const proficiencyRaw = this._toNumber(skill.value, 0);
        const proficiency = Math.round(proficiencyRaw * 2) / 2;
        const abilityKey = String(skill.ability ?? "").toLowerCase();
        const abilityData = abilities[abilityKey] ?? {};
        const abilityMod = this._toNumber(abilityData.mod, 0);
        const profPart = Math.floor(proficiencyBonus * proficiency);
        const bonusCheck = String(skill?.bonuses?.check ?? "");
        const bonusNumeric = this._toNumber((bonusCheck || "").replace(",", "."), 0);
        const computedTotal = abilityMod + profPart + bonusNumeric;
        const total = this._toNumber(skill.total, computedTotal);
        const label = this._resolveLabel(labels[key], key.toUpperCase());
        const passive = this._toNumber(skill.passive, 10 + total);
        const abilityLabel = this._resolveLabel(abilityLabels[abilityKey], abilityKey.toUpperCase() || "-");

        return {
          key,
          label,
          abilityKey,
          abilityLabel,
          abilityMod,
          profPart,
          total,
          passive,
          proficiency,
          bonusCheck,
          bonusNumeric,
          proficiencyText: proficiencyLabel(proficiency),
          totalLabel: total >= 0 ? `+${total}` : `${total}`
        };
      });
  }

  _renderFDETabHTML(fde) {
    const abilityRows = this._getAbilitiesForDisplay();
    const skillRows = this._getSkillsForDisplay();
    const cycleData = getCycleData(fde.ciclo);
    const cycleTitle = cycleData?.title ?? "Desconhecido";
    const nextCycleData = fde.ciclo < 6 ? getCycleData(fde.ciclo + 1) : null;
    const nextCycleXP = nextCycleData?.experience ?? Infinity;
    const xpProgress = fde.ciclo < 6 ? Math.min(100, (fde.experiencia / nextCycleXP) * 100) : 100;
    const techniqueSlots = fde.progressao?.slotsTecnicas ?? cycleData?.techniqueSlots ?? {};
    const techniqueSlotsLine = Object.values(techniqueSlots).join(" / ");

    const castaOptions = getCastaOptions().map((casta) => {
      const selected = casta.value === fde.casta ? " selected" : "";
      return `<option value="${escapeHTML(casta.value)}"${selected}>${escapeHTML(casta.label)}</option>`;
    }).join("");

    const abilitiesHTML = abilityRows.map((row) => `
      <div class="fde-stat-card" data-ability="${row.key}">
        <div class="fde-stat-top">
          <span class="fde-stat-abbr">${escapeHTML(row.key.toUpperCase())}</span>
          <span class="fde-stat-name">${escapeHTML(row.label)}</span>
        </div>
        <div class="fde-stat-main">${row.modLabel}</div>
        <div class="fde-stat-bottom">
          <label class="fde-inline-field">
            <span>Valor</span>
            <input type="number" value="${row.score}" data-fde-system-path="system.abilities.${row.key}.value" data-fde-mode="int" />
          </label>
          <label class="fde-inline-field">
            <span>Prof.</span>
            <select data-fde-system-path="system.abilities.${row.key}.proficient" data-fde-mode="ability-prof">
              <option value="0"${row.proficient <= 0 ? " selected" : ""}>0</option>
              <option value="1"${row.proficient === 1 ? " selected" : ""}>1</option>
            </select>
          </label>
          <span>Teste: <strong>${row.saveLabel}</strong></span>
        </div>
      </div>
    `).join("");

    const skillsHTML = skillRows.map((row) => `
      <div class="fde-skill-row" data-skill="${row.key}">
        <div class="fde-skill-mainline">
          <span class="fde-skill-name" title="${escapeHTML(row.label)}">${escapeHTML(row.label)}</span>
          <span class="fde-skill-total">${row.totalLabel}</span>
          <span class="fde-skill-passive">Passiva ${row.passive}</span>
        </div>
        <div class="fde-skill-breakdown">
          <span>${escapeHTML(row.abilityLabel)} ${row.abilityMod >= 0 ? `+${row.abilityMod}` : row.abilityMod}</span>
          <span>Prof ${row.profPart >= 0 ? `+${row.profPart}` : row.profPart} (${escapeHTML(row.proficiencyText)})</span>
          ${row.bonusNumeric !== 0 ? `<span>Extra ${row.bonusNumeric >= 0 ? `+${row.bonusNumeric}` : row.bonusNumeric}</span>` : ""}
        </div>
        <div class="fde-skill-editline">
          <label class="fde-inline-field">
            <span>Prof.</span>
            <select data-fde-system-path="system.skills.${row.key}.value" data-fde-mode="half-step">
              <option value="0"${row.proficiency === 0 ? " selected" : ""}>0</option>
              <option value="0.5"${row.proficiency === 0.5 ? " selected" : ""}>1/2</option>
              <option value="1"${row.proficiency === 1 ? " selected" : ""}>1</option>
              <option value="2"${row.proficiency === 2 ? " selected" : ""}>2</option>
            </select>
          </label>
        </div>
      </div>
    `).join("");

    const beneficios = fde.beneficiosCasta.length
      ? fde.beneficiosCasta.map((b, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.beneficiosCasta.${i}" value="${escapeHTML(b)}" placeholder="Benefício ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-beneficio" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhum benefício cadastrado.</p>`;

    const outrasPericias = fde.outrasPericias.length
      ? fde.outrasPericias.map((p, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.outrasPericias.${i}" value="${escapeHTML(p)}" placeholder="Perícia extra ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-pericia" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhuma perícia extra cadastrada.</p>`;

    const tecnicas = fde.tecnicas.map((t, i) => {
      const isProfanacao = t.tipo === "profanacao";
      return `
        <article class="fde-tech-card${isProfanacao ? " tipo-profanacao" : ""}">
          <div class="fde-tech-header">
            <div class="fde-field">
              <label>Nome da Técnica</label>
              <input type="text" name="fde.tecnicas.${i}.nome" value="${escapeHTML(t.nome)}" placeholder="Nome..." />
            </div>
            <div class="fde-field narrow">
              <label>Nível</label>
              <input type="number" min="1" max="20" name="fde.tecnicas.${i}.nivel" value="${t.nivel}" />
            </div>
            <div class="fde-field wide">
              <label>Tipo</label>
              <select name="fde.tecnicas.${i}.tipo">
                <option value="divindade"${!isProfanacao ? " selected" : ""}>Divindade</option>
                <option value="profanacao"${isProfanacao ? " selected" : ""}>Profanação</option>
              </select>
            </div>
            <div class="fde-field narrow">
              <label>Custo (Aura)</label>
              <input type="number" min="0" name="fde.tecnicas.${i}.custoAura" value="${t.custoAura}" />
            </div>
            <span class="fde-tipo-badge${isProfanacao ? " profanacao" : ""}">
              ${isProfanacao ? "Profanação" : "Divindade"}
            </span>
          </div>
          <div class="fde-field">
            <label>Descrição</label>
            <textarea rows="2" name="fde.tecnicas.${i}.descricao" placeholder="Descreva a técnica...">${escapeHTML(t.descricao)}</textarea>
          </div>
          <div class="fde-tech-footer">
            <button type="button" class="fde-btn-remove" data-fde-action="remove-tecnica" data-index="${i}" title="Remover técnica">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </article>`;
    }).join("");

    const knownTechniqueIds = Array.isArray(fde.tecnicasConhecidas) ? fde.tecnicasConhecidas : [];
    const knownTechniquesByLevel = new Map();
    for (const techniqueId of knownTechniqueIds) {
      const technique = getTechnique(techniqueId);
      if (!technique) continue;
      const level = Number(technique.level ?? 1);
      if (!knownTechniquesByLevel.has(level)) knownTechniquesByLevel.set(level, []);
      knownTechniquesByLevel.get(level).push(technique);
    }

    const slotLevelSet = new Set([
      ...Object.keys(techniqueSlots ?? {}),
      ...Array.from(knownTechniquesByLevel.keys(), (level) => String(level))
    ]);

    const slotLevels = [...slotLevelSet]
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .sort((a, b) => a - b);

    const learnedSlotsPanel = slotLevels.length
      ? slotLevels.map((level) => {
        const total = Number(techniqueSlots?.[level] ?? 0);
        const known = [...(knownTechniquesByLevel.get(level) ?? [])]
          .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
        const used = known.length;
        const remaining = Math.max(0, total - used);

        const knownList = known.length
          ? `
            <ul class="fde-tech-known-list">
              ${known.map((technique) => {
                const explanation = String(technique.ruleText ?? technique.description ?? "").trim();
                const costAura = technique.costAuraText ?? "-";
                const castTime = technique.castTime ?? "-";
                const duration = technique.duration ?? "-";
                const range = technique.range ?? "-";

                return `
                  <li>
                    <details class="fde-tech-known-details">
                      <summary>${escapeHTML(technique.name)}</summary>
                      <div class="fde-tech-known-body">
                        <p><strong>Custo de Aura:</strong> ${escapeHTML(costAura)}</p>
                        <p><strong>Tempo de Conjuração:</strong> ${escapeHTML(castTime)}</p>
                        <p><strong>Alcance:</strong> ${escapeHTML(range)}</p>
                        <p><strong>Duração:</strong> ${escapeHTML(duration)}</p>
                        <p>${escapeHTML(explanation || "Sem descrição disponível.")}</p>
                      </div>
                    </details>
                  </li>
                `;
              }).join("")}
            </ul>
          `
          : '<p class="fde-empty-hint">Nenhuma técnica já aprendida neste nível.</p>';

        return `
          <article class="fde-tech-slot-card">
            <header class="fde-tech-slot-head">
              <strong>Nível ${level}</strong>
              <span>Slots ${used}/${total} · Disponíveis ${remaining}</span>
            </header>
            ${knownList}
          </article>
        `;
      }).join("")
      : '<p class="fde-empty-hint">Não há slots de técnicas para o ciclo atual.</p>';

    const castaId = getCasta(fde.casta)?.id ?? "";
    const recursosCasta = fde.recursosCasta ?? {};
    const especializacoes = recursosCasta.especializacoes ?? [];
    const contatos = recursosCasta.contatos ?? [];
    const recursos = recursosCasta.recursos ?? [];
    const contratos = recursosCasta.contratos ?? [];
    const provinciaEfeitos = recursosCasta.provinciaEfeitos ?? [];
    const isProvinceCasta = ["ishim", "zanathus"].includes(castaId);
    const isMalakin = castaId === "malakin";
    const isDaimoniun = castaId === "daimoniun";
    const isBelial = castaId === "belial";

    const especializacoesHTML = especializacoes.length
      ? especializacoes.map((item, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.recursosCasta.especializacoes.${i}" value="${escapeHTML(item)}" placeholder="Especialização ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-especializacao" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhuma especialização cadastrada.</p>`;

    const contatosHTML = contatos.length
      ? contatos.map((item, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.recursosCasta.contatos.${i}" value="${escapeHTML(item)}" placeholder="Contato ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-contato" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhum contato cadastrado.</p>`;

    const recursosHTML = recursos.length
      ? recursos.map((item, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.recursosCasta.recursos.${i}" value="${escapeHTML(item)}" placeholder="Recurso ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-recurso" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhum recurso cadastrado.</p>`;

    const contratosHTML = contratos.length
      ? contratos.map((item, i) => `
        <div class="fde-item-row">
          <input type="text" name="fde.recursosCasta.contratos.${i}" value="${escapeHTML(item)}" placeholder="Contrato ${i + 1}" />
          <button type="button" class="fde-btn-remove" data-fde-action="remove-contrato" data-index="${i}" title="Remover">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join("")
      : `<p class="fde-empty-hint">Nenhum contrato cadastrado.</p>`;

    const recursosCastaHTML = `
      <div class="fde-block">
        <div class="fde-section-header">
          <h4><i class="fas fa-crown"></i> Recursos de Casta</h4>
        </div>

        ${isProvinceCasta ? `
          <div class="fde-casta-resource-group">
            <div class="fde-field">
              <label>Província Elemental</label>
              <select name="fde.recursosCasta.provincia">
                <option value=""${!recursosCasta.provincia ? " selected" : ""}>Selecione...</option>
                <option value="fogo"${recursosCasta.provincia === "fogo" ? " selected" : ""}>Fogo</option>
                <option value="agua"${recursosCasta.provincia === "agua" ? " selected" : ""}>Água</option>
                <option value="terra"${recursosCasta.provincia === "terra" ? " selected" : ""}>Terra</option>
                <option value="ar"${recursosCasta.provincia === "ar" ? " selected" : ""}>Ar</option>
              </select>
            </div>
            ${provinciaEfeitos.length ? `
              <ul class="fde-resource-effects">
                ${provinciaEfeitos.map((entry) => `<li>${escapeHTML(entry)}</li>`).join("")}
              </ul>
            ` : ""}
            ${Number(fde.escolhasPendentes?.provincia ?? 0) > 0 ? '<p class="fde-pending-note">Escolha pendente de província elemental.</p>' : ""}
          </div>` : ""}

        ${isMalakin ? `
          <div class="fde-casta-resource-group">
            <div class="fde-sub-header">
              <h5>Especializações (Expertise)</h5>
              <button type="button" class="fde-btn-add" data-fde-action="add-especializacao">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
            <p class="fde-empty-hint">Use chave/nome de perícia (ex.: per, arc, ins) ou nome da ferramenta para aplicar expertise automática.</p>
            <p class="fde-resource-counter">Escolhas: ${especializacoes.length}/${Number(fde.progressao?.escolhasEspecializacao ?? 0)}</p>
            ${Number(fde.escolhasPendentes?.especializacao ?? 0) > 0 ? `<p class="fde-pending-note">Faltam ${fde.escolhasPendentes.especializacao} especialização(ões).</p>` : ""}
            <div class="fde-item-list">${especializacoesHTML}</div>
          </div>` : ""}

        ${isDaimoniun ? `
          <div class="fde-casta-resource-group">
            <div class="fde-field">
              <label>Hospedeiro Atual (Possessão)</label>
              <input type="text" name="fde.recursosCasta.possessao.hospedeiro" value="${escapeHTML(recursosCasta.possessao?.hospedeiro ?? "")}" placeholder="Nome do hospedeiro" />
            </div>
            <div class="fde-field">
              <label>Observações de Possessão</label>
              <textarea rows="2" name="fde.recursosCasta.possessao.observacoes" placeholder="Condições, restrições e duração...">${escapeHTML(recursosCasta.possessao?.observacoes ?? "")}</textarea>
            </div>
          </div>` : ""}

        ${isBelial ? `
          <div class="fde-casta-resource-group">
            <div class="fde-sub-header">
              <h5>Contratos Místicos</h5>
              <button type="button" class="fde-btn-add" data-fde-action="add-contrato">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
            <div class="fde-item-list">${contratosHTML}</div>

            <div class="fde-sub-header">
              <h5>Contatos</h5>
              <button type="button" class="fde-btn-add" data-fde-action="add-contato">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
            <div class="fde-item-list">${contatosHTML}</div>

            <div class="fde-sub-header">
              <h5>Recursos</h5>
              <button type="button" class="fde-btn-add" data-fde-action="add-recurso">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
            <div class="fde-item-list">${recursosHTML}</div>
          </div>` : ""}

        ${(!isProvinceCasta && !isMalakin && !isDaimoniun && !isBelial)
          ? '<p class="fde-empty-hint">Esta casta não possui recursos especiais configuráveis nesta etapa.</p>'
          : ""}
      </div>
    `;

    return `
      <div class="fde-scroll">

        <!-- Dados Gerais -->
        <div class="fde-block">
          <div class="fde-section-header"><h4><i class="fas fa-scroll"></i> Dados Gerais</h4></div>
          <div class="fde-fields-grid">
            <div class="fde-field">
              <label>Jogador</label>
              <input type="text" name="fde.jogador" value="${escapeHTML(fde.jogador)}" placeholder="Nome do jogador" />
            </div>
            <div class="fde-field">
              <label>Espécie</label>
              <input type="text" name="fde.especie" value="${escapeHTML(fde.especie)}" placeholder="Ex: Humano, Elfo..." />
            </div>
            <div class="fde-field">
              <label>Casta</label>
              <select name="fde.casta">${castaOptions}</select>
            </div>
            <div class="fde-field">
              <label>Ciclo</label>
              <input type="number" min="1" max="6" name="fde.ciclo" value="${fde.ciclo}" />
            </div>
            <div class="fde-field">
              <label>Alinhamento</label>
              <input type="text" name="fde.alinhamento" value="${escapeHTML(fde.alinhamento)}" placeholder="Ex: Leal e Bom" />
            </div>
            <div class="fde-field">
              <label>Experiência</label>
              <input type="number" min="0" name="fde.experiencia" value="${fde.experiencia}" />
            </div>
          </div>
          <!-- Aura em linha separada com destaque -->
          <div class="fde-fields-grid cols-2">
            <div class="fde-field">
              <label>Aura</label>
              <div class="fde-aura-row">
                <input type="number" name="fde.aura.value" value="${fde.aura.value}" placeholder="Atual" title="Aura atual" />
                <span class="fde-aura-sep">/</span>
                <input type="number" name="fde.aura.max" value="${fde.aura.max}" placeholder="Máx" title="Aura máxima" />
              </div>
            </div>
          </div>
        </div>

        <!-- Progressão de Ciclo -->
        <div class="fde-block fde-cycle-block">
          <div class="fde-section-header"><h4><i class="fas fa-ring"></i> Progressão de Ciclo</h4></div>
          <div class="fde-cycle-display">
            <div class="fde-cycle-badge">
              <div class="fde-cycle-number">${fde.ciclo}</div>
              <div class="fde-cycle-name">${escapeHTML(cycleTitle)}</div>
            </div>
            <div class="fde-cycle-details">
              <div class="fde-xp-info">
                <span>XP: ${fde.experiencia} / ${nextCycleXP === Infinity ? "∞" : nextCycleXP}</span>
                ${fde.ciclo < 6 ? `<div class="fde-xp-bar"><div class="fde-xp-fill" style="width: ${xpProgress}%"></div></div>` : ""}
              </div>
              <div class="fde-xp-info">
                <span>Slots de Técnicas (N1→N6): ${escapeHTML(techniqueSlotsLine)}</span>
              </div>
              ${fde.ciclo < 6
                ? `<button type="button" class="fde-btn-advance" data-fde-action="advance-cycle" title="Avançar para o próximo ciclo">Subir de Ciclo</button>`
                : '<span class="fde-cycle-max">Ciclo Máximo</span>'}
            </div>
          </div>
        </div>

        <!-- Atributos -->
        <div class="fde-block">
          <div class="fde-section-header">
            <h4><i class="fas fa-dice-d20"></i> Atributos</h4>
          </div>
          <div class="fde-stats-grid">${abilitiesHTML}</div>
        </div>

        <div class="fde-block">
          <div class="fde-section-header">
            <h4><i class="fas fa-list-check"></i> Perícias</h4>
          </div>
          <div class="fde-skill-list">${skillsHTML || '<p class="fde-empty-hint">Perícias não encontradas.</p>'}</div>
        </div>

        <!-- Benefícios de Casta -->
        <div class="fde-block">
          <div class="fde-section-header">
            <h4><i class="fas fa-star"></i> Benefícios de Casta</h4>
          </div>
          <div class="fde-sub-header">
            <h5>Lista de Benefícios</h5>
            <button type="button" class="fde-btn-add" data-fde-action="add-beneficio">
              <i class="fas fa-plus"></i> Adicionar
            </button>
          </div>
          <div class="fde-item-list">${beneficios}</div>
        </div>

        ${recursosCastaHTML}

        <!-- Outras Perícias -->
        <div class="fde-block">
          <div class="fde-section-header">
            <h4><i class="fas fa-book-open"></i> Outras Perícias</h4>
          </div>
          <div class="fde-sub-header">
            <h5>Perícias Extras</h5>
            <button type="button" class="fde-btn-add" data-fde-action="add-pericia">
              <i class="fas fa-plus"></i> Adicionar
            </button>
          </div>
          <div class="fde-item-list">${outrasPericias}</div>
        </div>

        <!-- Técnicas -->
        <div class="fde-block">
          <div class="fde-section-header">
            <h4><i class="fas fa-bolt"></i> Técnicas</h4>
          </div>
          <div class="fde-sub-header">
            <h5>Divindade / Profanação</h5>
            <div class="fde-inline-actions">
              <button type="button" class="fde-btn-add" data-fde-action="learn-technique">
                <i class="fas fa-graduation-cap"></i> Aprender Técnicas
              </button>
              <button type="button" class="fde-btn-add" data-fde-action="add-tecnica">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
          </div>
          <div class="fde-tech-slots-panel">${learnedSlotsPanel}</div>
          <div class="fde-tech-list">${tecnicas}</div>
          <div class="fde-learn-inline-host"></div>
        </div>

      </div>
    `;
  }

  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.fdeAction;

    switch (action) {
      case "add-beneficio":
        return this._addBeneficio();
      case "remove-beneficio":
        return this._removeBeneficio(Number(event.currentTarget.dataset.index));
      case "add-pericia":
        return this._addOutraPericia();
      case "remove-pericia":
        return this._removeOutraPericia(Number(event.currentTarget.dataset.index));
      case "add-especializacao":
        return this._addEspecializacao();
      case "remove-especializacao":
        return this._removeEspecializacao(Number(event.currentTarget.dataset.index));
      case "add-contato":
        return this._addContato();
      case "remove-contato":
        return this._removeContato(Number(event.currentTarget.dataset.index));
      case "add-recurso":
        return this._addRecurso();
      case "remove-recurso":
        return this._removeRecurso(Number(event.currentTarget.dataset.index));
      case "add-contrato":
        return this._addContrato();
      case "remove-contrato":
        return this._removeContrato(Number(event.currentTarget.dataset.index));
      case "learn-technique":
        return this._openLearnTechniqueDialog();
      case "confirm-learn-technique": {
        const techniqueId = event.currentTarget?.dataset?.techniqueId;
        if (!techniqueId) return undefined;
        const result = await learnTechnique(this.actor, techniqueId);
        if (!result?.ok) {
          ui.notifications?.warn(result?.reason ?? "Não foi possível aprender esta técnica.");
          return undefined;
        }
        ui.notifications?.info(`Técnica aprendida: ${result.technique?.name ?? techniqueId}.`);
        this.render(true);
        return undefined;
      }
      case "close-learn-inline": {
        const host = this._getSheetElement()?.querySelector?.(".fde-learn-inline-host");
        if (host) host.innerHTML = "";
        return undefined;
      }
      case "add-tecnica":
        return this._addTecnica();
      case "remove-tecnica":
        return this._removeTecnica(Number(event.currentTarget.dataset.index));
      case "advance-cycle":
        return this._advanceCycle();
      default:
        return undefined;
    }

  }

  _syncCastaPendingChoices(data) {
    const castaId = getCasta(data?.casta)?.id ?? "";
    const safe = normalizeFDEData(data ?? {});
    const chosenExpertise = safe.recursosCasta?.especializacoes?.filter((entry) => String(entry ?? "").trim().length > 0).length ?? 0;
    const totalExpertise = Number(safe.progressao?.escolhasEspecializacao ?? 0);
    const normalizedProvince = String(safe.recursosCasta?.provincia ?? "").trim().toLowerCase();

    safe.recursosCasta = {
      ...(safe.recursosCasta ?? {}),
      provincia: normalizedProvince,
      provinciaEfeitos: ["ishim", "zanathus"].includes(castaId) ? this._getProvinceEffects(normalizedProvince) : []
    };

    safe.escolhasPendentes = {
      ...(safe.escolhasPendentes ?? {}),
      especializacao: castaId === "malakin" ? Math.max(0, totalExpertise - chosenExpertise) : 0,
      provincia: ["ishim", "zanathus"].includes(castaId) && !normalizedProvince ? 1 : 0
    };

    return safe;
  }

  _normalizeLookupValue(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  _resolveSkillKeyFromExpertiseEntry(entry) {
    const candidate = this._normalizeLookupValue(entry);
    if (!candidate) return null;

    const skills = this.actor?.system?.skills ?? {};
    if (candidate in skills) return candidate;

    const skillLabels = globalThis.CONFIG?.DND5E?.skills ?? {};
    for (const key of Object.keys(skills)) {
      const byKey = this._normalizeLookupValue(key);
      const byLabel = this._normalizeLookupValue(this._resolveLabel(skillLabels[key], key));
      if (candidate === byKey || candidate === byLabel) return key;
    }

    return null;
  }

  _resolveToolTargetsFromExpertiseEntry(entry) {
    const candidate = this._normalizeLookupValue(entry);
    if (!candidate) return { toolKeys: [], itemIds: [] };

    const toolKeys = [];
    const itemIds = [];

    const actorTools = this.actor?.system?.tools ?? {};
    const toolLabels = globalThis.CONFIG?.DND5E?.tools ?? {};

    for (const key of Object.keys(actorTools)) {
      const byKey = this._normalizeLookupValue(key);
      const byLabel = this._normalizeLookupValue(this._resolveLabel(toolLabels[key], key));
      if (candidate === byKey || candidate === byLabel) {
        toolKeys.push(key);
      }
    }

    const toolItems = this.actor?.items?.filter((item) => item.type === "tool") ?? [];
    for (const item of toolItems) {
      const byName = this._normalizeLookupValue(item.name);
      if (candidate === byName) {
        itemIds.push(item.id);
      }
    }

    return { toolKeys, itemIds };
  }

  _getProvinceEffects(province) {
    const effectsByProvince = {
      fogo: [
        "Afinidade elemental com fogo (efeitos técnicos dependem das técnicas conhecidas).",
        "Permite narrar manifestações visuais de calor/chamas nos poderes da casta."
      ],
      agua: [
        "Deslocamento de nado: 18m enquanto a província da Água estiver ativa.",
        "Afinidade elemental com água e técnicas relacionadas."
      ],
      terra: [
        "Percepção de criaturas em contato com o solo: raio de 30m por ciclo.",
        "Afinidade elemental com terra e resistência posicional em terreno sólido."
      ],
      ar: [
        "Afinidade elemental com vento/pressão e técnicas de mobilidade.",
        "Leveza sobrenatural para deslocamentos narrativos e manobras aéreas."
      ]
    };

    return effectsByProvince[province] ?? [];
  }

  async _applyCastaResourceAutomation(fdeData) {
    const safe = normalizeFDEData(fdeData ?? {});
    const castaId = getCasta(safe.casta)?.id ?? "";
    const actorUpdate = {};
    const toolItemUpdates = [];
    const scheduledToolItemIds = new Set();
    const appliedSkillKeys = new Set();
    const appliedToolKeys = new Set();
    const appliedToolItemNames = new Set();

    if (castaId === "malakin") {
      const expertiseEntries = safe.recursosCasta?.especializacoes ?? [];
      for (const entry of expertiseEntries) {
        const skillKey = this._resolveSkillKeyFromExpertiseEntry(entry);
        if (skillKey) {
          const currentValue = this._toNumber(this.actor?.system?.skills?.[skillKey]?.value, 0);
          if (currentValue < 2) {
            actorUpdate[`system.skills.${skillKey}.value`] = 2;
            appliedSkillKeys.add(skillKey);
          }
        }

        const toolTargets = this._resolveToolTargetsFromExpertiseEntry(entry);
        for (const toolKey of toolTargets.toolKeys) {
          const currentToolProf = this._toNumber(
            this.actor?.system?.tools?.[toolKey]?.value
              ?? this.actor?.system?.tools?.[toolKey]?.proficient
              ?? this.actor?.system?.tools?.[toolKey]?.prof,
            0
          );

          if (currentToolProf < 2) {
            actorUpdate[`system.tools.${toolKey}.value`] = 2;
            actorUpdate[`system.tools.${toolKey}.proficient`] = 2;
            actorUpdate[`system.tools.${toolKey}.prof`] = 2;
            appliedToolKeys.add(toolKey);
          }
        }

        for (const itemId of toolTargets.itemIds) {
          if (scheduledToolItemIds.has(itemId)) continue;
          const item = this.actor?.items?.get(itemId);
          if (!item) continue;

          const currentItemProf = this._toNumber(item.system?.proficient ?? item.system?.proficiency?.value, 0);
          if (currentItemProf < 2) {
            scheduledToolItemIds.add(itemId);
            toolItemUpdates.push(item.update({
              "system.proficient": 2,
              "system.proficiency.value": 2,
              "flags.filhos-do-eden.expertiseSource": "malakin"
            }));
            appliedToolItemNames.add(String(item.name ?? itemId));
          }
        }
      }
    }

    if (Object.keys(actorUpdate).length) {
      await this.actor.update(actorUpdate);
    }

    if (toolItemUpdates.length) {
      await Promise.all(toolItemUpdates);
    }

    this._notifyExpertiseAutomationReport(appliedSkillKeys, appliedToolKeys, appliedToolItemNames);
  }

  _notifyExpertiseAutomationReport(skillKeys, toolKeys, toolItemNames) {
    const hasSkills = (skillKeys?.size ?? 0) > 0;
    const hasTools = (toolKeys?.size ?? 0) > 0;
    const hasToolItems = (toolItemNames?.size ?? 0) > 0;
    if (!hasSkills && !hasTools && !hasToolItems) return;

    const skillLabels = globalThis.CONFIG?.DND5E?.skills ?? {};
    const toolLabels = globalThis.CONFIG?.DND5E?.tools ?? {};

    const pieces = [];

    if (hasSkills) {
      const names = [...skillKeys].map((key) => this._resolveLabel(skillLabels[key], key.toUpperCase()));
      pieces.push(`Perícias: ${names.join(", ")}`);
    }

    if (hasTools) {
      const names = [...toolKeys].map((key) => this._resolveLabel(toolLabels[key], key.toUpperCase()));
      pieces.push(`Ferramentas (sistema): ${names.join(", ")}`);
    }

    if (hasToolItems) {
      pieces.push(`Ferramentas (itens): ${[...toolItemNames].join(", ")}`);
    }

    ui.notifications?.info(`Expertise aplicada automaticamente. ${pieces.join(" | ")}`);
  }

  _buildLearnTechniqueDialogHTML(fdeData) {
    const unlocked = getUnlockedTechniques(fdeData.casta, fdeData.ciclo);
    if (!unlocked.length) {
      return '<p class="fde-empty-hint">Nenhuma técnica está liberada para a casta e ciclo atuais.</p>';
    }

    const knownSet = new Set(fdeData.tecnicasConhecidas ?? []);
    const knownCounts = validateTechniqueKnownCounts(fdeData);
    const grouped = new Map();

    for (const technique of unlocked) {
      const level = Number(technique.level ?? 1);
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level).push(technique);
    }

    const levels = [...grouped.keys()].sort((a, b) => a - b);
    const levelOptions = levels
      .map((level) => `<option value="${level}">Nível ${level}</option>`)
      .join("");

    const filters = `
      <div class="fde-learn-filters">
        <label class="fde-learn-filter-field">
          <span>Nível</span>
          <select data-fde-learn-filter="level">
            <option value="all">Todos</option>
            ${levelOptions}
          </select>
        </label>
        <label class="fde-learn-filter-field">
          <span>Status</span>
          <select data-fde-learn-filter="status">
            <option value="all">Todos</option>
            <option value="available">Disponível</option>
            <option value="known">Já aprendida</option>
            <option value="blocked">Sem slot</option>
          </select>
        </label>
        <label class="fde-learn-filter-field fde-learn-filter-search">
          <span>Buscar</span>
          <input type="text" data-fde-learn-filter="search" placeholder="Nome da técnica..." />
        </label>
      </div>
    `;

    const sections = levels.map((level) => {
      const total = Number(fdeData.progressao?.slotsTecnicas?.[level] ?? 0);
      const used = Number(knownCounts[level] ?? 0);
      const available = Math.max(0, total - used);

      const rows = grouped.get(level)
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"))
        .map((technique) => {
          const known = knownSet.has(technique.id);
          const blockedBySlot = !known && available <= 0;
          const disabled = known || blockedBySlot;
          const status = known ? "Já aprendida" : (blockedBySlot ? "Sem slot disponível" : "Disponível para aprender");
          const statusKey = known ? "known" : (blockedBySlot ? "blocked" : "available");
          const cost = technique.costAuraText ?? "-";

          return `
            <li class="fde-learn-row${known ? " is-known" : ""}" data-level="${level}" data-status="${statusKey}">
              <div class="fde-learn-main">
                <span class="fde-learn-name">${escapeHTML(technique.name)}</span>
                <span class="fde-learn-meta">Custo de Aura: ${escapeHTML(cost)} · ${escapeHTML(status)}</span>
              </div>
              <button
                type="button"
                class="fde-btn-add"
                data-fde-action="confirm-learn-technique"
                data-technique-id="${escapeHTML(technique.id)}"
                ${disabled ? "disabled" : ""}
              >Aprender Técnica</button>
            </li>
          `;
        }).join("");

      return `
        <section class="fde-learn-group">
          <header class="fde-learn-group-header">
            <strong>Nível ${level}</strong>
            <span>Slots: ${used}/${total} (restante: ${available})</span>
          </header>
          <ul class="fde-learn-list">${rows}</ul>
        </section>
      `;
    }).join("");

    return `
      <div class="fde-learn-dialog">
        <p class="fde-empty-hint">Selecione uma técnica disponível. Técnicas já aprendidas ou sem slot ficam bloqueadas.</p>
        ${filters}
        ${sections}
        <p class="fde-empty-hint fde-learn-no-results" hidden>Nenhuma técnica corresponde aos filtros informados.</p>
      </div>
    `;
  }

  _applyLearnTechniqueFilters(root) {
    const levelFilter = root.querySelector('[data-fde-learn-filter="level"]')?.value ?? "all";
    const statusFilter = root.querySelector('[data-fde-learn-filter="status"]')?.value ?? "all";
    const searchFilter = String(root.querySelector('[data-fde-learn-filter="search"]')?.value ?? "").trim().toLocaleLowerCase("pt-BR");

    const rows = [...root.querySelectorAll(".fde-learn-row")];

    for (const row of rows) {
      const rowLevel = String(row.dataset.level ?? "");
      const rowStatus = String(row.dataset.status ?? "");
      const rowName = String(row.querySelector(".fde-learn-name")?.textContent ?? "").toLocaleLowerCase("pt-BR");

      const matchLevel = levelFilter === "all" || rowLevel === levelFilter;
      const matchStatus = statusFilter === "all" || rowStatus === statusFilter;
      const matchSearch = !searchFilter || rowName.includes(searchFilter);

      row.hidden = !(matchLevel && matchStatus && matchSearch);
    }

    const groups = [...root.querySelectorAll(".fde-learn-group")];
    for (const group of groups) {
      const hasVisibleRows = [...group.querySelectorAll(".fde-learn-row")].some((row) => !row.hidden);
      group.hidden = !hasVisibleRows;
    }

    const noResults = root.querySelector(".fde-learn-no-results");
    if (noResults) {
      const hasVisibleAny = rows.some((row) => !row.hidden);
      noResults.hidden = hasVisibleAny;
    }
  }

  async _openLearnTechniqueDialog() {
    const fdeData = await this._getCurrentFDEData();
    const DialogClass = globalThis.Dialog;

    if (!DialogClass) {
      this._openLearnTechniqueInline(this._buildLearnTechniqueDialogHTML(fdeData));
      return;
    }

    const content = this._buildLearnTechniqueDialogHTML(fdeData);

    const dialog = new DialogClass({
      title: "Aprender Técnicas (por Slot)",
      content,
      buttons: {
        close: {
          label: "Fechar"
        }
      },
      render: (html) => {
        const root = html?.[0] ?? html;
        if (!root) return;

        root.querySelectorAll?.('[data-fde-learn-filter]').forEach((control) => {
          const eventName = control.tagName === "INPUT" ? "input" : "change";
          control.addEventListener(eventName, () => this._applyLearnTechniqueFilters(root));
        });

        this._applyLearnTechniqueFilters(root);

        root.querySelectorAll?.('[data-fde-action="confirm-learn-technique"]').forEach((button) => {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            const techniqueId = event.currentTarget?.dataset?.techniqueId;
            if (!techniqueId) return;

            const result = await learnTechnique(this.actor, techniqueId);
            if (!result?.ok) {
              ui.notifications?.warn(result?.reason ?? "Não foi possível aprender esta técnica.");
              return;
            }

            ui.notifications?.info(`Técnica aprendida: ${result.technique?.name ?? techniqueId}.`);
            dialog.close();
            this.render(true);
          });
        });
      }
    });

    dialog.render(true);
  }

  async _advanceCycle() {
    const currentData = await this._getCurrentFDEData();
    const syncedCurrent = normalizeFDEData(this._syncCastaPendingChoices(currentData));

    // Garante que validações/progressão usem a casta/ciclo atuais da ficha (mesmo sem submit prévio).
    await this.actor.setFlag("filhos-do-eden", "data", syncedCurrent);

    const currentCycle = Number(currentData.ciclo ?? 1);
    const targetCycle = currentCycle + 1;

    const preview = previewCycleUpgrade(this.actor, targetCycle);
    if (!preview?.ok) {
      ui.notifications?.warn(preview?.reason ?? "Não foi possível preparar a progressão de ciclo.");
      return;
    }

    const confirmed = await this._confirmCycleAdvance(preview);
    if (!confirmed) return;

    const result = await applyCycleProgression(this.actor, targetCycle);
    if (!result?.ok) {
      ui.notifications?.warn(result?.reason ?? "Não foi possível subir de ciclo.");
      return;
    }

    ui.notifications?.info(`${this.actor.name} avançou para o ciclo ${targetCycle}: ${result.title}.`);
    this.render(true);
  }

  async _confirmCycleAdvance(preview) {
    const DialogClass = globalThis.Dialog;
    const gainsList = (preview.gained ?? []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join("");
    const pendingList = (preview.pendingChoices ?? []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join("");

    const content = `
      <div class="fde-cycle-confirm">
        <p><strong>${escapeHTML(this.actor.name)}</strong> irá avançar para <strong>${preview.toCycle}º ciclo (${escapeHTML(preview.title)})</strong>.</p>
        <h4>Ganhos previstos</h4>
        <ul>${gainsList || "<li>Nenhuma alteração adicional listada.</li>"}</ul>
        <h4>Escolhas pendentes</h4>
        <ul>${pendingList || "<li>Nenhuma pendência.</li>"}</ul>
      </div>
    `;

    if (!DialogClass) {
      return globalThis.confirm?.(`Confirmar avanço para o ciclo ${preview.toCycle} (${preview.title})?`) ?? false;
    }

    return new Promise((resolve) => {
      const dialog = new DialogClass({
        title: "Confirmar Progressão de Ciclo",
        content,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar",
            callback: () => resolve(false)
          },
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Aplicar Progressão",
            callback: () => resolve(true)
          }
        },
        default: "confirm",
        close: () => resolve(false)
      });

      dialog.render(true);
    });
  }

  async _getCurrentFDEData() {
    const base = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    if (!this.form) return base;

    const expanded = foundry.utils.expandObject(getFormDataObject(this.form));
    return normalizeFDEData({ ...base, ...(expanded.fde ?? {}) });
  }

  async _setFDEData(data) {
    const synced = this._syncCastaPendingChoices(data);
    const normalized = normalizeFDEData(synced);
    await this.actor.setFlag("filhos-do-eden", "data", normalized);
    await this._applyCastaResourceAutomation(normalized);
    this.render(true);
  }

  async _addBeneficio() {
    const data = await this._getCurrentFDEData();
    data.beneficiosCasta.push("");
    return this._setFDEData(data);
  }

  async _removeBeneficio(index) {
    const data = await this._getCurrentFDEData();
    data.beneficiosCasta.splice(index, 1);
    if (!data.beneficiosCasta.length) data.beneficiosCasta.push("");
    return this._setFDEData(data);
  }

  async _addOutraPericia() {
    const data = await this._getCurrentFDEData();
    data.outrasPericias.push("");
    return this._setFDEData(data);
  }

  async _removeOutraPericia(index) {
    const data = await this._getCurrentFDEData();
    data.outrasPericias.splice(index, 1);
    return this._setFDEData(data);
  }

  async _addEspecializacao() {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.especializacoes = data.recursosCasta.especializacoes ?? [];
    data.recursosCasta.especializacoes.push("");
    return this._setFDEData(data);
  }

  async _removeEspecializacao(index) {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.especializacoes = data.recursosCasta.especializacoes ?? [];
    data.recursosCasta.especializacoes.splice(index, 1);
    return this._setFDEData(data);
  }

  async _addContato() {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.contatos = data.recursosCasta.contatos ?? [];
    data.recursosCasta.contatos.push("");
    return this._setFDEData(data);
  }

  async _removeContato(index) {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.contatos = data.recursosCasta.contatos ?? [];
    data.recursosCasta.contatos.splice(index, 1);
    return this._setFDEData(data);
  }

  async _addRecurso() {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.recursos = data.recursosCasta.recursos ?? [];
    data.recursosCasta.recursos.push("");
    return this._setFDEData(data);
  }

  async _removeRecurso(index) {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.recursos = data.recursosCasta.recursos ?? [];
    data.recursosCasta.recursos.splice(index, 1);
    return this._setFDEData(data);
  }

  async _addContrato() {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.contratos = data.recursosCasta.contratos ?? [];
    data.recursosCasta.contratos.push("");
    return this._setFDEData(data);
  }

  async _removeContrato(index) {
    const data = await this._getCurrentFDEData();
    data.recursosCasta.contratos = data.recursosCasta.contratos ?? [];
    data.recursosCasta.contratos.splice(index, 1);
    return this._setFDEData(data);
  }

  async _addTecnica() {
    const data = await this._getCurrentFDEData();
    data.tecnicas.push({ nome: "", nivel: 1, tipo: "divindade", custoAura: 0, descricao: "" });
    return this._setFDEData(data);
  }

  async _removeTecnica(index) {
    const data = await this._getCurrentFDEData();
    data.tecnicas.splice(index, 1);
    if (!data.tecnicas.length) {
      data.tecnicas.push({ nome: "", nivel: 1, tipo: "divindade", custoAura: 0, descricao: "" });
    }
    return this._setFDEData(data);
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    this._sanitizeSystemFields(expanded);

    if (expanded.fde) {
      const current = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
      const merged = normalizeFDEData({ ...current, ...(expanded.fde ?? {}) });
      const synced = this._syncCastaPendingChoices(merged);
      const normalized = normalizeFDEData(synced);
      await this.actor.setFlag("filhos-do-eden", "data", normalized);
      await this._applyCastaResourceAutomation(normalized);
      delete expanded.fde;
    }
    return super._updateObject(event, expanded);
  }

  _prepareSubmitData(...args) {
    const submitData = super._prepareSubmitData(...args);
    const sanitized = this._sanitizeFlatSystemFields(submitData);

    // Campos editados via actor.update imediato; remover do submit evita conflito por chaves duplicadas
    for (const key of Object.keys(sanitized)) {
      if (/^system\.abilities\.[a-z]+\.proficient$/i.test(key)) delete sanitized[key];
      if (/^system\.skills\.[a-z]+\.value$/i.test(key)) delete sanitized[key];
    }

    return sanitized;
  }
}
