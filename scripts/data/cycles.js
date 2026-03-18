export const MAX_CYCLE = 6;

export const CYCLE_TABLE = Object.freeze({
  1: Object.freeze({
    cycle: 1,
    title: "Infante",
    experience: 0,
    proficiencyBonus: 2,
    totalHitDice: 1,
    extraSkillChoices: 0,
    totalSkillChoices: 4,
    abilityPointsGranted: 0,
    totalAbilityPoints: 0,
    maxAbilityScore: 20,
    extraSaveChoices: 0,
    techniqueSlots: Object.freeze({ 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 })
  }),
  2: Object.freeze({
    cycle: 2,
    title: "Decano",
    experience: 6500,
    proficiencyBonus: 3,
    totalHitDice: 5,
    extraSkillChoices: 1,
    totalSkillChoices: 5,
    abilityPointsGranted: 2,
    totalAbilityPoints: 2,
    maxAbilityScore: 22,
    extraSaveChoices: 0,
    techniqueSlots: Object.freeze({ 1: 3, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 })
  }),
  3: Object.freeze({
    cycle: 3,
    title: "Arcante",
    experience: 48000,
    proficiencyBonus: 4,
    totalHitDice: 9,
    extraSkillChoices: 1,
    totalSkillChoices: 6,
    abilityPointsGranted: 4,
    totalAbilityPoints: 6,
    maxAbilityScore: 24,
    extraSaveChoices: 0,
    techniqueSlots: Object.freeze({ 1: 3, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0 })
  }),
  4: Object.freeze({
    cycle: 4,
    title: "Legado",
    experience: 120000,
    proficiencyBonus: 5,
    totalHitDice: 13,
    extraSkillChoices: 1,
    totalSkillChoices: 7,
    abilityPointsGranted: 4,
    totalAbilityPoints: 10,
    maxAbilityScore: 26,
    extraSaveChoices: 1,
    techniqueSlots: Object.freeze({ 1: 4, 2: 3, 3: 2, 4: 1, 5: 0, 6: 0 })
  }),
  5: Object.freeze({
    cycle: 5,
    title: "Tribuno",
    experience: 225000,
    proficiencyBonus: 6,
    totalHitDice: 17,
    extraSkillChoices: 1,
    totalSkillChoices: 8,
    abilityPointsGranted: 6,
    totalAbilityPoints: 16,
    maxAbilityScore: 28,
    extraSaveChoices: 1,
    techniqueSlots: Object.freeze({ 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0 })
  }),
  6: Object.freeze({
    cycle: 6,
    title: "Arauto",
    experience: 400000,
    proficiencyBonus: 7,
    totalHitDice: 21,
    extraSkillChoices: 1,
    totalSkillChoices: 9,
    abilityPointsGranted: 8,
    totalAbilityPoints: 24,
    maxAbilityScore: 30,
    extraSaveChoices: 2,
    techniqueSlots: Object.freeze({ 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 })
  })
});

export const AURA_BY_HIT_DIE = Object.freeze({
  d12: Object.freeze({ 1: 2, 2: 4, 3: 10, 4: 15, 5: 40, 6: 80 }),
  d10: Object.freeze({ 1: 3, 2: 5, 3: 15, 4: 18, 5: 50, 6: 90 }),
  d8: Object.freeze({ 1: 4, 2: 6, 3: 18, 4: 22, 5: 60, 6: 100 })
});

export function getCycleData(cycle) {
  return CYCLE_TABLE[Number(cycle)] ?? null;
}

export function getTechniqueSlotsForCycle(cycle) {
  return foundry.utils.deepClone(getCycleData(cycle)?.techniqueSlots ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
}

export function getAuraBudget(hitDie, cycle) {
  return AURA_BY_HIT_DIE[hitDie]?.[Number(cycle)] ?? 0;
}

export function isValidCycle(cycle) {
  return Number.isInteger(Number(cycle)) && Number(cycle) >= 1 && Number(cycle) <= MAX_CYCLE;
}
