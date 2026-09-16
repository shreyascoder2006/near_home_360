import type { ResortModel } from "@/lib/architecture/types";
import type { Recommendation, SimState } from "@/lib/sim/types";
import { DAY } from "@/lib/sim/seed";
import { clamp } from "@/lib/utils";

export interface PricingInputs {
  occupancy: number;
  pacing: number;
  seasonality: number;
  dow: number;
  competitorIndex: number;
  elasticity: number;
  eventUplift: number;
}

export interface PricingResult {
  inputs: PricingInputs;
  currentMultiplier: number;
  recommendedMultiplier: number;
  currentAdr: number;
  recommendedAdr: number;
  projectedOccupancy: number;
  projectedRevpar: number;
  currentRevpar: number;
  curve: { mult: number; occ: number; revpar: number }[];
}

const seasonFor = (scenario: string, dayOfYear: number) => {
  const base = 0.5 + 0.5 * Math.sin(((dayOfYear - 340) / 365) * Math.PI * 2);
  const s = { "peak-season": 0.92, "monsoon-lull": 0.28, "conference-block": 0.7, "equipment-crisis": 0.75, "vip-arrival": 0.82 }[scenario] ?? base;
  return s;
};

export function computePricing(state: SimState, model: ResortModel): PricingResult {
  const day = Math.floor(state.t / DAY);
  const dow = day % 7;
  const seasonality = seasonFor(state.scenario, (day * 3) % 365);
  const occupancy = state.kpis.occupancy;
  const hist = state.kpiHistory.slice(-48);
  const pacing = hist.length > 4 ? occupancy - hist[0].occupancy : 0;
  const competitorIndex = { "peak-season": 1.08, "monsoon-lull": 0.86, "conference-block": 1.02, "equipment-crisis": 0.98, "vip-arrival": 1.04 }[state.scenario] ?? 1;
  const elasticity = -1.15 + seasonality * 0.45;
  const eventUplift = state.scenario === "conference-block" ? 0.12 : 0;
  const weekend = dow === 5 || dow === 6 ? 0.06 : 0;
  const rooms = Object.values(state.rooms);
  const totalRooms = rooms.length;
  const baseOcc = clamp(occupancy, 0.05, 0.99);

  const demandAt = (mult: number) => {
    const priceRatio = mult / state.rateMultiplier;
    const d = baseOcc * Math.pow(priceRatio, elasticity) * (1 + weekend + eventUplift) * (0.85 + seasonality * 0.25) * (competitorIndex >= mult ? 1.03 : 1 - (mult - competitorIndex) * 0.6);
    return clamp(d, 0.05, 0.99);
  };
  const avgRate = rooms.reduce((s, r) => s + r.rate, 0) / totalRooms / state.rateMultiplier;
  const curve: PricingResult["curve"] = [];
  let best = { mult: state.rateMultiplier, revpar: -1, occ: 0 };
  for (let m = 0.7; m <= 1.6; m += 0.025) {
    const occ = demandAt(m);
    const revpar = avgRate * m * occ;
    curve.push({ mult: +m.toFixed(3), occ, revpar });
    if (revpar > best.revpar && occ > 0.25) best = { mult: +m.toFixed(3), revpar, occ };
  }
  const currentOcc = demandAt(state.rateMultiplier);
  return {
    inputs: { occupancy, pacing, seasonality, dow, competitorIndex, elasticity, eventUplift },
    currentMultiplier: state.rateMultiplier,
    recommendedMultiplier: best.mult,
    currentAdr: avgRate * state.rateMultiplier,
    recommendedAdr: avgRate * best.mult,
    projectedOccupancy: best.occ,
    projectedRevpar: best.revpar,
    currentRevpar: avgRate * state.rateMultiplier * currentOcc,
    curve,
  };
}

export function pricingRecommendations(state: SimState, model: ResortModel): Recommendation[] {
  const p = computePricing(state, model);
  const delta = p.recommendedMultiplier - p.currentMultiplier;
  if (Math.abs(delta) < 0.04) return [];
  const dir = delta > 0 ? "Raise" : "Lower";
  const revparDelta = p.projectedRevpar - p.currentRevpar;
  return [
    {
      id: "rec-price-bar",
      module: "pricing",
      title: `${dir} BAR ${Math.abs(delta * 100).toFixed(0)}% → ₹${Math.round(p.recommendedAdr).toLocaleString("en-IN")} ADR`,
      body: `Demand model finds the RevPAR optimum at ${(p.recommendedMultiplier * 100).toFixed(0)}% of base rate. Projected occupancy ${(p.projectedOccupancy * 100).toFixed(0)}%.`,
      confidence: clamp(0.55 + Math.min(0.3, Math.abs(revparDelta) / 2000) + Math.min(0.1, state.kpiHistory.length / 300), 0, 0.92),
      basis: [
        `occupancy ${(p.inputs.occupancy * 100).toFixed(1)}% · pacing ${p.inputs.pacing >= 0 ? "+" : ""}${(p.inputs.pacing * 100).toFixed(1)} pts / 48h`,
        `seasonality index ${p.inputs.seasonality.toFixed(2)} · competitor rate index ${p.inputs.competitorIndex.toFixed(2)}`,
        `price elasticity ${p.inputs.elasticity.toFixed(2)}${p.inputs.eventUplift ? ` · event uplift +${(p.inputs.eventUplift * 100).toFixed(0)}%` : ""}`,
      ],
      impact: `RevPAR ${revparDelta >= 0 ? "+" : ""}₹${Math.round(revparDelta).toLocaleString("en-IN")} per room-night (${((revparDelta / Math.max(1, p.currentRevpar)) * 100).toFixed(1)}%).`,
      action: `Apply rate multiplier ${p.recommendedMultiplier.toFixed(2)}× across all room types.`,
      targetKind: "resort",
      targetId: "pricing",
      createdAt: state.t,
      status: "pending",
      payload: { multiplier: p.recommendedMultiplier },
    },
  ];
}
