import { getFDEData, setFDEData } from "../helpers/fde-data.js";

export async function spendAura(actor, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, reason: "Quantidade de aura inválida." };
  }

  const data = getFDEData(actor);
  if (value > data.aura.value) {
    return { ok: false, reason: "Aura insuficiente." };
  }

  data.aura.value -= value;
  await setFDEData(actor, data);
  return { ok: true, spent: value, remaining: data.aura.value };
}

export async function restoreAura(actor, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, reason: "Quantidade de aura inválida." };
  }

  const data = getFDEData(actor);
  data.aura.value = Math.min(data.aura.max, data.aura.value + value);
  await setFDEData(actor, data);
  return { ok: true, restored: value, current: data.aura.value, max: data.aura.max };
}
