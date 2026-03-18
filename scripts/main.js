// Filhos do Eden - Main Script

class FilhosDoEdenActorSheet extends dnd5e.applications.actor.ActorSheet5eCharacter {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "filhos-do-eden"],
      template: "modules/filhos-do-eden/templates/actor/filhos-do-eden-ficha.hbs",
      width: 720,
      height: 680
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}

Hooks.once("init", () => {
  console.log("Filhos do Eden | Inicializando módulo");

  Actors.registerSheet("filhos-do-eden", FilhosDoEdenActorSheet, {
    types: ["character"],
    makeDefault: false,
    label: "Filhos do Eden | Ficha"
  });
});
