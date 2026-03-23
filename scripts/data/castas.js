const casta = (data) => Object.freeze(data);

export const CASTAS = Object.freeze({
  querubim: casta({
    id: "querubim",
    name: "Querubim",
    aliases: ["querubim", "querubins"],
    side: "anjo",
    equivalent: "malikis",
    hitDie: "d12",
    initialAttributes: {
      fixed: { con: 2 },
      choices: [{ count: 1, amount: 2, options: ["str", "dex"] }],
      notes: "+2 em Constituição e +2 em Força ou Destreza."
    },
    resistances: ["str", "con"],
    baseSkills: ["prc", "ath"],
    proficiencies: {
      armor: ["all", "shield"],
      weapons: ["simple", "martial"],
      tools: 1
    },
    fixedBenefits: [
      { id: "querubim-unarmed", name: "Ataque Desarmado", summary: "Ataque desarmado causa 1d6 de dano." }
    ],
    cycleProgression: {
      2: [{ id: "extra-attack", name: "Ataque Extra", value: 1, summary: "+1 ataque extra." }],
      4: [{ id: "extra-attack", name: "Ataque Extra", value: 2, summary: "+2 ataques extras." }],
      6: [{ id: "extra-attack", name: "Ataque Extra", value: 3, summary: "+3 ataques extras." }]
    },
    techniqueLevels: {
      1: ["arma-dedicada", "controle-gravitacional", "reflexos-rapidos", "sentidos-agucados", "trilha-do-cacador", "ultimo-suspiro"],
      2: ["ataque-fulminante", "controle-de-adrenalina", "presa-facil", "projetar-golpe", "senso-de-perigo"],
      3: ["armadura-celestial", "detectar-presenca", "efeito-camaleao", "rastro-do-trovao"],
      4: ["ira-de-deus", "pureza-do-corpo", "regeneracao"],
      5: ["ponto-fraco", "ressurgimento-heroico"],
      6: ["furor-de-batalha"]
    },
    passiveRules: ["Ataque Extra escala nos ciclos 2, 4 e 6.", "Ataque desarmado sempre disponível."],
    implementationNotes: ["Criar/atualizar item de característica de Ataque Extra."]
  }),
  serafim: casta({
    id: "serafim",
    name: "Serafim",
    aliases: ["serafim", "serafins"],
    side: "anjo",
    equivalent: "satanis",
    hitDie: "d10",
    initialAttributes: {
      fixed: { cha: 2, int: 1, wis: 1 },
      choices: [],
      notes: "+2 em Carisma, +1 em Inteligência e +1 em Sabedoria."
    },
    resistances: ["cha", "wis"],
    baseSkills: ["per", "ins"],
    proficiencies: {
      armor: ["all", "shield"],
      weapons: ["dagger", "quarterstaff", "light-hammer", "mace", "spear", "flail", "glaive", "halberd", "lance", "longsword", "rapier", "scimitar", "shortsword", "trident"],
      tools: 1
    },
    fixedBenefits: [
      { id: "lider-nato", name: "Líder Nato", summary: "Bônus em liderança para aliados; o dado escala por ciclo." }
    ],
    cycleProgression: {
      1: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d4" }],
      2: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d6" }],
      4: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d8" }],
      6: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d10" }]
    },
    techniqueLevels: {
      1: ["controlar-o-tecido", "ler-emocoes", "mente-fechada", "miragem", "rasgo-na-psique", "telepatia"],
      2: ["bons-amigos", "confessionario", "discurso-da-vitoria", "ler-mentes", "voz-de-comando"],
      3: ["alucinacao-coletiva", "choque-mental", "clarividencia", "controlar-mentes"],
      4: ["controlar-massas", "ilusao-permanente", "muralha-telecinetica"],
      5: ["mente-em-branco", "teleporte"],
      6: ["soberania"]
    },
    passiveRules: ["Enquanto lidera, não pode realizar ações ativas.", "Usos por descanso: modificador de Carisma."],
    implementationNotes: ["Centralizar cálculo do dado de liderança."]
  }),
  elohim: casta({
    id: "elohim",
    name: "Elohim",
    aliases: ["elohim", "elohins"],
    side: "anjo",
    equivalent: "belial",
    hitDie: "d10",
    initialAttributes: {
      fixed: { wis: 2, int: 1, cha: 1 },
      choices: [],
      notes: "+2 em Sabedoria, +1 em Inteligência e +1 em Carisma."
    },
    resistances: ["wis", "int"],
    baseSkills: ["dec", "his"],
    proficiencies: {
      armor: ["all"],
      weapons: ["simple", "firearms"],
      tools: 3
    },
    fixedBenefits: [
      { id: "mascarar-aura", name: "Mascarar Aura", summary: "Oculta e mascara a aura como humana." },
      { id: "recursos", name: "Recursos", summary: "Identidade humana e recursos materiais." },
      { id: "contatos", name: "Contatos", summary: "Rede de apoio humano para informações e abrigo." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["abracadabra", "duas-caras", "chumbo-grosso", "desatino", "ler-emocoes", "saco-sem-fundo"],
      2: ["controle-remoto", "cortina-de-aco", "cruzar-paredes", "fascinio", "gadget"],
      3: ["atalho", "bolsao-dimensional", "escudo-humano", "sorte-grande"],
      4: ["carcere", "casulo", "pureza-do-corpo"],
      5: ["portal", "clone"],
      6: ["senhorio"]
    },
    passiveRules: ["Recursos e contatos dependem de validação do narrador.", "Estrutura pronta para contratos, custos e testes sociais futuros."],
    implementationNotes: ["Expor bloco próprio de recursos/contatos na ficha."]
  }),
  ofanim: casta({
    id: "ofanim",
    name: "Ofanim",
    aliases: ["ofanim", "ofanins"],
    side: "anjo",
    equivalent: "daimoniun",
    hitDie: "d8",
    initialAttributes: {
      fixed: { cha: 2, wis: 2 },
      choices: [],
      notes: "+2 em Carisma e +2 em Sabedoria."
    },
    resistances: ["cha", "wis"],
    baseSkills: ["per", "med"],
    proficiencies: {
      armor: [],
      weapons: ["quarterstaff"],
      tools: 1
    },
    fixedBenefits: [
      { id: "santuario", name: "Santuário", summary: "Inimigos o ignoram enquanto não agir ofensivamente." },
      { id: "redencao", name: "Redenção", summary: "Vantagem em Persuasão para redimir fantasmas e confortar desesperados." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["companheiro-animal", "ler-emocoes", "luz", "quebrar-o-pao", "refugio-seguro", "telepatia"],
      2: ["bencao", "bons-amigos", "cura-pelas-maos", "escudo-de-fe", "exorcismo"],
      3: ["dispersar-energia", "pazes", "pressentimento", "sorte-grande"],
      4: ["circulo-de-cura", "forma-de-luz", "redoma-de-luz"],
      5: ["restauracao-molecular", "zona-neutra"],
      6: ["ressurreicao"]
    },
    passiveRules: ["Usos de Santuário por descanso: modificador de Carisma."],
    implementationNotes: ["Guardar CD de Santuário na progressão derivada."]
  }),
  hashmalim: casta({
    id: "hashmalim",
    name: "Hashmalim",
    aliases: ["hashmalim", "hashmalins"],
    side: "anjo",
    equivalent: "baal",
    hitDie: "d8",
    initialAttributes: {
      fixed: { cha: 2, wis: 2 },
      choices: [],
      notes: "+2 em Carisma e +2 em Sabedoria."
    },
    resistances: ["con", "wis"],
    baseSkills: ["arc", "itm"],
    proficiencies: {
      armor: ["light"],
      weapons: ["simple", "scimitar", "shortsword"],
      tools: 1
    },
    fixedBenefits: [
      { id: "provocar-medo", name: "Provocar Medo", summary: "Aura de medo com CD baseada em Carisma e proficiência." },
      { id: "visao-das-trevas", name: "Visão das Trevas", summary: "Enxerga na escuridão normal e mística." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["controlar-o-tecido", "escuridao", "psicometria", "servo-invisivel", "sussurro-dos-mortos", "visao-do-alem"],
      2: ["confessionario", "cortina-de-aco", "exorcismo", "serpentes-do-abismo", "transferencia-espiritual"],
      3: ["conjurar-espectros", "forma-de-sombras", "sopro-da-morte", "sugar-energia"],
      4: ["caminho-das-sombras", "despertar-os-mortos", "vortice"],
      5: ["exterminio", "travessia-espiritual"],
      6: ["entropia"]
    },
    passiveRules: ["Não afeta imortais de ciclo maior ou com mais dados de vida."],
    implementationNotes: ["Guardar CD de medo derivada na ficha."]
  }),
  ishim: casta({
    id: "ishim",
    name: "Ishim",
    aliases: ["ishim", "ishins"],
    side: "anjo",
    equivalent: "zanathus",
    hitDie: "d10",
    initialAttributes: {
      fixed: { dex: 2, wis: 1, con: 1 },
      choices: [],
      notes: "+2 em Destreza, +1 em Sabedoria e +1 em Constituição."
    },
    resistances: ["dex", "con"],
    baseSkills: ["sur", "nat"],
    proficiencies: {
      armor: ["all"],
      weapons: ["simple", "martial"],
      tools: 2
    },
    fixedBenefits: [
      { id: "provincia-elemental", name: "Província Elemental", summary: "Escolha fogo, água, terra ou ar; benefícios dependem da opção." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["companheiro-animal", "conjurar-elementos", "controle-gravitacional", "gravitacao", "infravisao", "neblina"],
      2: ["comunicacao-com-a-natureza", "couraca-elemental", "debilitar", "fusao-com-os-elementos", "pane"],
      3: ["convocar-animais", "flagelo-na-natureza", "magnetismo", "muralha-elemental"],
      4: ["conjurar-elementais", "elementalista", "forma-elemental"],
      5: ["caminho-natural", "plasma"],
      6: ["catastrofe"]
    },
    passiveRules: ["Província da terra detecta criaturas em raio de 30m por ciclo.", "Província da água tem deslocamento de nado de 18m."],
    implementationNotes: ["Adicionar campo de seleção de província na ficha."]
  }),
  malakin: casta({
    id: "malakin",
    name: "Malakin",
    aliases: ["malakin", "malakins", "malikim", "malikins"],
    side: "anjo",
    equivalent: null,
    hitDie: "d8",
    initialAttributes: {
      fixed: { int: 2, wis: 2 },
      choices: [],
      notes: "+2 em Inteligência e +2 em Sabedoria."
    },
    resistances: ["int", "wis"],
    baseSkills: ["rel", "arc"],
    proficiencies: {
      armor: ["light"],
      weapons: ["quarterstaff", "dagger"],
      tools: 3
    },
    fixedBenefits: [
      { id: "especializacao", name: "Especialização", summary: "Escolhe perícias/ferramentas com proficiência dobrada." },
      { id: "nocao-do-tempo", name: "Noção do Tempo", summary: "Sabe sempre as horas e mede o tempo com precisão perfeita." }
    ],
    cycleProgression: {
      1: [{ id: "expertise-choices", name: "Especialização", value: 2, summary: "Escolha 2 perícias ou ferramentas." }],
      3: [{ id: "expertise-choices", name: "Especialização", value: 4, summary: "Total de 4 escolhas de especialização." }],
      6: [{ id: "expertise-choices", name: "Especialização", value: 6, summary: "Total de 6 escolhas de especialização." }]
    },
    techniqueLevels: {
      1: ["levitar", "mente-fechada", "psicometria", "remendo", "telepatia", "visao-do-alem"],
      2: ["ler-objetos", "memoria-eidetica", "quimera", "sopro-do-tempo", "voz-de-comando"],
      3: ["bolsao-dimensional", "clarividencia", "furacao-temporal", "pressentimento"],
      4: ["bolha-de-estase", "onisciencia", "visao-do-tempo"],
      5: ["portal", "profecia"],
      6: ["linha-de-cronos"]
    },
    passiveRules: ["Especialização aumenta no 3º e 6º ciclos."],
    implementationNotes: ["Pendência de UI para escolha exata das perícias/ferramentas com expertise."]
  }),
  malikis: casta({
    id: "malikis",
    name: "Malikis",
    aliases: ["malikis", "maliki", "malikis"],
    side: "diabo",
    equivalent: "querubim",
    hitDie: "d12",
    initialAttributes: {
      fixed: { con: 2 },
      choices: [{ count: 1, amount: 2, options: ["str", "dex"] }],
      notes: "+2 em Constituição e +2 em Força ou Destreza."
    },
    resistances: ["str", "con"],
    baseSkills: ["itm", "ath"],
    proficiencies: {
      armor: ["all", "shield"],
      weapons: ["simple", "martial"],
      tools: 1
    },
    fixedBenefits: [{ id: "malikis-unarmed", name: "Ataque Desarmado", summary: "Ataque desarmado causa 1d6 de dano." }],
    cycleProgression: {
      2: [{ id: "extra-attack", name: "Ataque Extra", value: 1, summary: "+1 ataque extra." }],
      4: [{ id: "extra-attack", name: "Ataque Extra", value: 2, summary: "+2 ataques extras." }],
      6: [{ id: "extra-attack", name: "Ataque Extra", value: 3, summary: "+3 ataques extras." }]
    },
    techniqueLevels: {
      1: ["arma-dedicada", "controle-gravitacional", "reflexos-rapidos", "sentidos-agucados", "trilha-do-cacador", "ultimo-suspiro"],
      2: ["ataque-fulminante", "controle-de-adrenalina", "presa-facil", "projetar-golpe", "senso-de-perigo"],
      3: ["armadura-celestial", "detectar-presenca", "efeito-camaleao", "rastro-do-trovao"],
      4: ["ira-de-deus", "pureza-do-corpo", "regeneracao"],
      5: ["ponto-fraco", "ressurgimento-heroico"],
      6: ["furor-de-batalha"]
    },
    passiveRules: ["Ataque Extra escala nos ciclos 2, 4 e 6.", "Ataque desarmado sempre disponível."],
    implementationNotes: ["Mesma automação-base de Querubim, mudando o lado e o tipo das técnicas."]
  }),
  satanis: casta({
    id: "satanis",
    name: "Satanis",
    aliases: ["satanis"],
    side: "diabo",
    equivalent: "serafim",
    hitDie: "d10",
    initialAttributes: {
      fixed: { cha: 2, int: 1, wis: 1 },
      choices: [],
      notes: "+2 em Carisma, +1 em Inteligência e +1 em Sabedoria."
    },
    resistances: ["cha", "wis"],
    baseSkills: ["per", "ins"],
    proficiencies: {
      armor: ["all", "shield"],
      weapons: ["dagger", "quarterstaff", "light-hammer", "mace", "spear", "flail", "glaive", "halberd", "lance", "longsword", "rapier", "scimitar", "shortsword", "trident"],
      tools: 1
    },
    fixedBenefits: [{ id: "lider-nato", name: "Líder Nato", summary: "Bônus em liderança para aliados; o dado escala por ciclo." }],
    cycleProgression: {
      1: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d4" }],
      2: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d6" }],
      4: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d8" }],
      6: [{ id: "leader-die", name: "Líder Nato", leaderDie: "1d10" }]
    },
    techniqueLevels: {
      1: ["arma-dedicada", "controlar-o-tecido", "ler-emocoes", "mente-fechada", "telepatia", "servo-invisivel"],
      2: ["controle-remoto", "discurso-da-vitoria", "fascinio", "ler-mentes", "voz-de-comando"],
      3: ["clarividencia", "controlar-mentes", "escudo-humano", "pressentimento"],
      4: ["controlar-massas", "muralha-telecinetica", "onisciencia"],
      5: ["clone", "teleporte"],
      6: ["soberania"]
    },
    passiveRules: ["Enquanto lidera, não pode realizar ações ativas.", "Recarga ao próximo pôr do sol."],
    implementationNotes: ["Centralizar cálculo do dado de liderança."]
  }),
  belial: casta({
    id: "belial",
    name: "Belial",
    aliases: ["belial", "belials"],
    side: "diabo",
    equivalent: "elohim",
    hitDie: "d8",
    initialAttributes: {
      fixed: { cha: 2, int: 1, wis: 1 },
      choices: [],
      notes: "+2 em Carisma, +1 em Inteligência e +1 em Sabedoria."
    },
    resistances: ["cha", "int"],
    baseSkills: ["dec", "arc"],
    proficiencies: {
      armor: ["light"],
      weapons: ["simple", "martial", "firearms"],
      tools: 3
    },
    fixedBenefits: [
      { id: "contrato", name: "Contrato", summary: "Formaliza contratos místicos assinados com sangue." },
      { id: "recursos", name: "Recursos", summary: "Recursos materiais na Haled." },
      { id: "contatos", name: "Contatos", summary: "Rede humana de interesse para informações e abrigo." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["abracadabra", "desatino", "duas-caras", "ler-emocoes", "psicometria", "remendo"],
      2: ["bencao", "cura-pelas-maos", "fascinio", "sopro-do-tempo", "transferencia-espiritual"],
      3: ["alucinacao-coletiva", "atalho", "pazes", "sorte-grande"],
      4: ["caminho-das-sombras", "casulo", "ilusao-permanente"],
      5: ["restauracao-molecular", "travessia-espiritual"],
      6: ["ressurreicao"]
    },
    passiveRules: ["Estrutura pronta para custos e cláusulas de contratos."],
    implementationNotes: ["Adicionar automação futura de contratos e favores." ]
  }),
  daimoniun: casta({
    id: "daimoniun",
    name: "Daimoniun",
    aliases: ["daimoniun", "daimoniuns", "daimonium"],
    side: "diabo",
    equivalent: "ofanim",
    hitDie: "d8",
    initialAttributes: {
      fixed: { cha: 2, wis: 2 },
      choices: [],
      notes: "+2 em Carisma e +2 em Sabedoria."
    },
    resistances: ["cha", "wis"],
    baseSkills: ["dec", "itm"],
    proficiencies: {
      armor: [],
      weapons: ["simple"],
      tools: 2
    },
    fixedBenefits: [
      { id: "possessao", name: "Possessão", summary: "Possui corpos humanos em vez de se materializar." },
      { id: "maus-conselhos", name: "Maus Conselhos", summary: "Vantagem em Ludibriar para sugerir ações impulsivas." },
      { id: "corpo-de-trevas", name: "Corpo de Trevas", summary: "Resistência espiritual a corte, impacto e perfuração." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["escuridao", "gravitacao", "sentidos-agucados", "sussurro-dos-mortos", "telepatia", "visao-do-alem"],
      2: ["ler-mentes", "pane", "transferencia-espiritual", "serpentes-do-abismo", "sopro-do-tempo"],
      3: ["conjurar-espectros", "controlar-mentes", "sopro-da-morte", "sugar-energia"],
      4: ["caminho-das-sombras", "ilusao-permanente", "vortice"],
      5: ["eter", "travessia-espiritual"],
      6: ["mestre-dos-fantoches"]
    },
    passiveRules: ["Possessão dura até o próximo nascer do sol.", "Falha no alvo cria imunidade até o próximo ciclo lunar."],
    implementationNotes: ["Automação de possessão deixada preparada para etapas futuras."]
  }),
  baal: casta({
    id: "baal",
    name: "Baal",
    aliases: ["baal", "baals"],
    side: "diabo",
    equivalent: "hashmalim",
    hitDie: "d10",
    initialAttributes: {
      fixed: { cha: 2, con: 2 },
      choices: [],
      notes: "+2 em Carisma e +2 em Constituição."
    },
    resistances: ["cha", "con"],
    baseSkills: ["itm", "ins"],
    proficiencies: {
      armor: ["light", "medium"],
      weapons: ["simple", "flail", "whip", "net"],
      tools: 2
    },
    fixedBenefits: [
      { id: "causar-dor", name: "Causar Dor", summary: "Olhar que paralisa mortais e impõe desvantagem a imortais." },
      { id: "visao-das-trevas", name: "Visão das Trevas", summary: "Enxerga na escuridão normal e mística." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["arma-dedicada", "controlar-o-tecido", "escuridao", "infravisao", "servo-invisivel", "sussurro-dos-mortos"],
      2: ["confessionario", "cortina-de-aco", "exorcismo", "presa-facil", "transferencia-espiritual"],
      3: ["conjurar-espectros", "efeito-camaleao", "magnetismo", "sugar-energia"],
      4: ["caminho-das-sombras", "despertar-os-mortos", "regeneracao"],
      5: ["exterminio", "portal"],
      6: ["entropia"]
    },
    passiveRules: ["Mortais falham e ficam paralisados por minutos iguais ao ciclo.", "Imortais sofrem desvantagem no próximo turno."],
    implementationNotes: ["Guardar duração derivada de Causar Dor na prévia da ficha."]
  }),
  zanathus: casta({
    id: "zanathus",
    name: "Zanathus",
    aliases: ["zanathus"],
    side: "diabo",
    equivalent: "ishim",
    hitDie: "d10",
    initialAttributes: {
      fixed: { dex: 2, wis: 1, con: 1 },
      choices: [],
      notes: "+2 em Destreza, +1 em Sabedoria e +1 em Constituição."
    },
    resistances: ["dex", "con"],
    baseSkills: ["sur", "nat"],
    proficiencies: {
      armor: ["all"],
      weapons: ["simple", "martial"],
      tools: 2
    },
    fixedBenefits: [
      { id: "provincia-elemental", name: "Província Elemental", summary: "Escolha fogo, água, terra ou ar; benefícios dependem da opção." }
    ],
    cycleProgression: {},
    techniqueLevels: {
      1: ["companheiro-animal", "conjurar-elementos", "controle-gravitacional", "gravitacao", "infravisao", "neblina"],
      2: ["comunicacao-com-a-natureza", "couraca-elemental", "debilitar", "fusao-com-os-elementos", "pane"],
      3: ["convocar-animais", "flagelo-na-natureza", "magnetismo", "muralha-elemental"],
      4: ["conjurar-elementais", "elementalista", "forma-elemental"],
      5: ["caminho-natural", "eter"],
      6: ["catastrofe"]
    },
    passiveRules: ["Província da terra detecta criaturas em raio de 30m por ciclo.", "Província da água tem deslocamento de nado de 18m."],
    implementationNotes: ["Adicionar campo de seleção de província na ficha."]
  }),
  "succubus-incubus": casta({
    id: "succubus-incubus",
    name: "Succubus/Incubus",
    aliases: ["succubus", "incubus", "succubus/incubus", "succubus e incubus"],
    side: "diabo",
    equivalent: null,
    hitDie: "d8",
    initialAttributes: {
      fixed: { cha: 2, wis: 1, con: 1 },
      choices: [],
      notes: "+2 em Carisma, +1 em Sabedoria e +1 em Constituição."
    },
    resistances: ["cha", "con"],
    baseSkills: ["dec", "prf"],
    proficiencies: {
      armor: ["light"],
      weapons: ["simple"],
      tools: 2
    },
    fixedBenefits: [
      { id: "seducao", name: "Sedução", summary: "Vantagem em testes de Blefar/Social para sedução compatível com o alvo." },
      { id: "beijo-da-morte", name: "Beijo da Morte", summary: "Drena vida e converte em PV ou aura; o dado escala por ciclo." }
    ],
    cycleProgression: {
      1: [{ id: "death-kiss-die", name: "Beijo da Morte", die: "1d6" }],
      2: [{ id: "death-kiss-die", name: "Beijo da Morte", die: "1d8" }],
      4: [{ id: "death-kiss-die", name: "Beijo da Morte", die: "1d10" }],
      6: [{ id: "death-kiss-die", name: "Beijo da Morte", die: "1d12" }]
    },
    techniqueLevels: {
      1: ["abracadabra", "conjurar-elemento-fogo", "ler-emocoes", "sentidos-agucados", "servo-invisivel", "telepatia"],
      2: ["bons-amigos", "controle-remoto", "debilitar", "exorcismo", "fascinio"],
      3: ["detectar-presenca", "escudo-humano", "sorte-grande", "sugar-energia"],
      4: ["carcere", "controlar-massas", "pureza-do-corpo"],
      5: ["clone", "travessia-espiritual"],
      6: ["soberania"]
    },
    passiveRules: ["Beijo da Morte só afeta humanos vivos seduzidos previamente."],
    implementationNotes: ["Preparar futura automação de drenagem e sedução contextual."]
  })
});

export const CASTA_SKILL_PACKAGES = Object.freeze({
  querubim: Object.freeze({
    id: "querubim",
    nome: "Querubim",
    periciasFixas: ["prc", "ath"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  serafim: Object.freeze({
    id: "serafim",
    nome: "Serafim",
    periciasFixas: ["per", "ins"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  elohim: Object.freeze({
    id: "elohim",
    nome: "Elohim",
    periciasFixas: ["dec", "his"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 3,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  ofanim: Object.freeze({
    id: "ofanim",
    nome: "Ofanim",
    periciasFixas: ["per", "med"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  hashmalim: Object.freeze({
    id: "hashmalim",
    nome: "Hashmalim",
    periciasFixas: ["arc", "itm"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  ishim: Object.freeze({
    id: "ishim",
    nome: "Ishim",
    periciasFixas: ["sur", "nat"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 2,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  malakin: Object.freeze({
    id: "malakin",
    nome: "Malakin",
    periciasFixas: ["rel", "arc"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 3,
    especializacoesIniciais: 2,
    especializacoesPorCiclo: { 3: 2, 6: 2 }
  }),
  malikis: Object.freeze({
    id: "malikis",
    nome: "Malikis",
    periciasFixas: ["itm", "ath"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  satanis: Object.freeze({
    id: "satanis",
    nome: "Satanis",
    periciasFixas: ["per", "ins"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 1,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  belial: Object.freeze({
    id: "belial",
    nome: "Belial",
    periciasFixas: ["dec", "arc"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 3,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  daimoniun: Object.freeze({
    id: "daimoniun",
    nome: "Daimoniun",
    periciasFixas: ["dec", "itm"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 2,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  baal: Object.freeze({
    id: "baal",
    nome: "Baal",
    periciasFixas: ["itm", "ins"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 2,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  zanathus: Object.freeze({
    id: "zanathus",
    nome: "Zanathus",
    periciasFixas: ["sur", "nat"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 2,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  }),
  "succubus-incubus": Object.freeze({
    id: "succubus-incubus",
    nome: "Succubus/Incubus",
    periciasFixas: ["dec", "prf"],
    escolhasPericia: 2,
    ferramentasFixas: [],
    escolhasFerramenta: 2,
    especializacoesIniciais: 0,
    especializacoesPorCiclo: {}
  })
});

export function normalizeCastaId(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/^-+|-+$/g, "");

  for (const entry of Object.values(CASTAS)) {
    if (entry.id === normalized) return entry.id;
    if (entry.aliases.some((alias) => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized.replace(/-/g, " ").replace(/\//g, "/"))) {
      return entry.id;
    }
    if (entry.aliases.some((alias) => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9/]+/g, "-") === normalized)) {
      return entry.id;
    }
  }

  return normalized;
}

export function getCasta(idOrName) {
  return CASTAS[normalizeCastaId(idOrName)] ?? null;
}

export function getCastaSkillPackage(idOrName) {
  const castaId = normalizeCastaId(idOrName);
  return CASTA_SKILL_PACKAGES[castaId] ?? null;
}

export function getCastaOptions() {
  return Object.values(CASTAS).map((entry) => ({ value: entry.id, label: entry.name }));
}
