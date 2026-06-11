/**
 * Logique de scoring partagée du AI Prono Battle (miroir TS de scripts/score.py).
 * Source de vérité unique : data/predictions.json + data/results.json à la racine du repo.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PRED = join(ROOT, "data", "predictions.json");
const RES = join(ROOT, "data", "results.json");

export const AIS = ["claude", "gpt", "gemini"] as const;
export type Ai = (typeof AIS)[number];

export interface Match {
  id: number;
  group: string;
  date: string; // YYYY-MM-DD
  home: string;
  away: string;
  pred: Record<Ai, string>;
}
export interface Result {
  winner: string; // équipe canonique ou "Nul"
  score?: string;
}
export interface ResultsFile {
  last_updated: string | null;
  results: Record<string, Result>;
  _comment?: string;
}

export async function loadPredictions(): Promise<Match[]> {
  return JSON.parse(await readFile(PRED, "utf-8")).matches;
}
export async function loadResults(): Promise<ResultsFile> {
  return JSON.parse(await readFile(RES, "utf-8"));
}
export async function saveResults(file: ResultsFile): Promise<void> {
  await writeFile(RES, JSON.stringify(file, null, 2) + "\n", "utf-8");
}

/** Matchs dont la date <= `date` et sans résultat enregistré. */
export async function pending(date: string) {
  const [matches, res] = await Promise.all([loadPredictions(), loadResults()]);
  return matches
    .filter((m) => m.date <= date && !(String(m.id) in res.results))
    .map((m) => ({ id: m.id, group: m.group, date: m.date, match: `${m.home} – ${m.away}` }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

/** Enregistre un résultat (le winner doit matcher l'orthographe canonique de predictions.json). */
export async function record(id: number, winner: string, score: string | undefined, date: string) {
  const matches = await loadPredictions();
  const m = matches.find((x) => x.id === id);
  if (!m) throw new Error(`Match id=${id} inconnu`);
  const canonical = new Set([m.home, m.away, "Nul"]);
  if (!canonical.has(winner)) {
    throw new Error(`winner "${winner}" invalide pour le match ${id} (${m.home} – ${m.away}). Attendu : ${[...canonical].join(", ")}`);
  }
  const res = await loadResults();
  res.results[String(id)] = score ? { winner, score } : { winner };
  res.last_updated = date;
  await saveResults(res);
  return { id, winner, score, match: `${m.home} – ${m.away}` };
}

/** Classement cumulé + détail par match noté. */
export async function standings() {
  const [matches, res] = await Promise.all([loadPredictions(), loadResults()]);
  const byId = new Map(matches.map((m) => [String(m.id), m]));
  const totals = Object.fromEntries(AIS.map((a) => [a, { pts: 0, graded: 0 }])) as Record<Ai, { pts: number; graded: number }>;
  const graded: Array<{ id: number; group: string; match: string; winner: string; score?: string; hits: Record<Ai, boolean> }> = [];

  for (const [id, actual] of Object.entries(res.results).sort((a, b) => +a[0] - +b[0])) {
    const m = byId.get(id);
    if (!m) continue;
    const hits = {} as Record<Ai, boolean>;
    for (const a of AIS) {
      const hit = m.pred[a] === actual.winner;
      hits[a] = hit;
      totals[a].pts += hit ? 1 : 0;
      totals[a].graded += 1;
    }
    graded.push({ id: m.id, group: m.group, match: `${m.home} – ${m.away}`, winner: actual.winner, score: actual.score, hits });
  }

  const ranking = [...AIS].sort((a, b) => totals[b].pts - totals[a].pts);
  return { lastUpdated: res.last_updated, totals, ranking, graded };
}
