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

const CASTAS = [
  "Querubim",
  "Serafim",
  "Elohim",
  "Ishim",
  "Ofanim",
  "Hashmalim",
  "Malikim",
  "Satanis",
  "Belial",
  "Zanathus"
];

const FDE_ALLOWED_TABS = new Set(["fde", "spellbook", "inventory", "features"]);

const FDE_ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

const FDE_SKILL_ORDER = [
  "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv",
  "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
];

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeFDEData(data = {}) {
  const beneficiosRaw = data.beneficiosCasta ?? data.beneficioCasta ?? FDE_DEFAULT_DATA.beneficiosCasta;
  const outrasPericiasRaw = data.outrasPericias ?? FDE_DEFAULT_DATA.outrasPericias;
  const tecnicasRaw = data.tecnicas ?? FDE_DEFAULT_DATA.tecnicas;

  return {
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
  const Extended = globalThis.FormDataExtended ?? globalThis.foundry?.applications?.ux?.FormDataExtended;
  if (Extended) return new Extended(form).object;
  return foundry.utils.expandObject(Object.fromEntries(new FormData(form).entries()));
}

export class FDEActorSheet extends (DND5ECharacterSheet ?? FallbackActorSheet) {
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
      submitOnClose: true
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.fde = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    return context;
  }

  // ApplicationV2: chamado após render
  _onRender(context, options) {
    if (super._onRender) super._onRender(context, options);
    this._injectFDETab();
    this._bindFDEActions();
  }

  // ApplicationV1 / DnD5e legado
  activateListeners(html) {
    super.activateListeners(html);
    this._injectFDETab();
    this._bindFDEActions();
  }

  _bindFDEActions() {
    const root = this._getSheetElement();
    if (!root) return;

    root.querySelectorAll("[data-fde-action]").forEach((button) => {
      if (button.dataset.fdeBound === "1") return;
      button.dataset.fdeBound = "1";
      button.addEventListener("click", this._onAction.bind(this));
    });

    root.querySelectorAll("[data-fde-system-path]").forEach((input) => {
      if (input.dataset.fdeSystemBound === "1") return;
      input.dataset.fdeSystemBound = "1";
      input.addEventListener("change", this._onSystemFieldChange.bind(this));
    });
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
        value = Math.max(0, Math.min(1, value));
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

    // Log da estrutura real do DOM para debug
    const allNavs = root.querySelectorAll("nav, [role=tablist]");
    const allTabs = root.querySelectorAll(".tab, [data-tab]");
    console.log(`Filhos do Eden | DOM debug — root.id="${root.id}" root.className="${root.className}"`);
    console.log(`Filhos do Eden | Navs encontrados: ${allNavs.length}`, [...allNavs].map(n => `<${n.tagName} class="${n.className}" data-group="${n.dataset.group}">`));
    console.log(`Filhos do Eden | Tabs encontrados: ${allTabs.length}`, [...allTabs].map(t => `[data-tab="${t.dataset.tab}"]`));

    const nav = root.querySelector('nav[data-group="primary"], nav.tabs, [role="tablist"][data-group="primary"]');
    // DnD5e v13 usa section.tab-body ou div que contém as sections de tab
    const body = root.querySelector('.tab-body')
      ?? root.querySelector('[class*="tab-body"]')
      ?? root.querySelector('.sheet-body')
      ?? root.querySelector('.window-content');

    console.log(`Filhos do Eden | nav encontrado:`, nav);
    console.log(`Filhos do Eden | body encontrado:`, body);

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
      console.log("Filhos do Eden | Injetado como fallback inline dentro de form/window-content");
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
    navItem.innerHTML = '<i class="fas fa-feather-pointed" inert></i>';
    nav.insertBefore(navItem, nav.firstElementChild ?? null);

    // Injeta conteúdo do tab
    const fde = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    const tabSection = document.createElement("section");
    tabSection.className = "tab fde-extra-tab";
    tabSection.setAttribute("data-group", "primary");
    tabSection.setAttribute("data-tab", "fde");
    tabSection.innerHTML = this._renderFDETabHTML(fde);
    body.insertBefore(tabSection, body.firstElementChild ?? null);

    // Mantém somente as abas pedidas: FDE (principal), Spellbook, Inventory, Features
    nav.querySelectorAll("[data-tab]").forEach((item) => {
      const tabName = item.dataset.tab;
      if (!FDE_ALLOWED_TABS.has(tabName)) item.remove();
    });

    body.querySelectorAll('.tab[data-group="primary"], .tab[data-tab]').forEach((section) => {
      const tabName = section.dataset.tab;
      if (!FDE_ALLOWED_TABS.has(tabName)) section.remove();
    });

    console.log(`Filhos do Eden | Tab injetado com sucesso! nav.children=${nav.children.length} body.children=${body.children.length}`);

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

    // FDE como aba principal ao abrir/renderizar
    nav.querySelectorAll("[data-tab]").forEach((el) => el.classList.remove("active"));
    root.querySelectorAll('.tab[data-group="primary"], .tab[data-tab]').forEach((el) => el.classList.remove("active"));
    navItem.classList.add("active");
    tabSection.classList.add("active");

    if (typeof this.changeTab === "function") {
      try {
        this.changeTab("fde", "primary");
      } catch (_) {
        // Fallback manual já aplicado acima
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

    const castaOptions = CASTAS.map((casta) => {
      const selected = casta === fde.casta ? " selected" : "";
      return `<option value="${escapeHTML(casta)}"${selected}>${escapeHTML(casta)}</option>`;
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

        <!-- Benefícios de Casta -->
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
            <button type="button" class="fde-btn-add" data-fde-action="add-tecnica">
              <i class="fas fa-plus"></i> Adicionar
            </button>
          </div>
          <div class="fde-tech-list">${tecnicas}</div>
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
      case "add-tecnica":
        return this._addTecnica();
      case "remove-tecnica":
        return this._removeTecnica(Number(event.currentTarget.dataset.index));
    }
  }

  async _getCurrentFDEData() {
    const base = normalizeFDEData(this.actor.getFlag("filhos-do-eden", "data") ?? {});
    if (!this.form) return base;

    const expanded = foundry.utils.expandObject(getFormDataObject(this.form));
    return normalizeFDEData({ ...base, ...(expanded.fde ?? {}) });
  }

  async _setFDEData(data) {
    await this.actor.setFlag("filhos-do-eden", "data", normalizeFDEData(data));
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
      await this.actor.setFlag("filhos-do-eden", "data", normalizeFDEData(expanded.fde));
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
