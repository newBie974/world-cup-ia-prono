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
const BRACKET = join(ROOT, "data", "bracket.json");

/** Racine du repo (là où vivent data/, recaps/, .git). */
export const REPO_ROOT = ROOT;

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

// ---------- Phase finale (bracket) ----------
export type Round = "r32" | "r16" | "qf" | "sf" | "third" | "final";
export const ROUND_LABEL: Record<Round, string> = {
  r32: "32es de finale", r16: "16es de finale", qf: "Quarts de finale",
  sf: "Demi-finales", third: "Match 3e place", final: "Finale",
};
/** Prono de phase finale : équipe qualifiée + score temps régl./prolong. + va aux TAB. */
export interface BracketPred { team: string; score?: string | null; tab?: boolean | null }
export interface BracketMatch {
  id: string;          // ex "R32-1"
  round: Round;
  slot: string;
  home: string | null;
  away: string | null;
  pred: Partial<Record<Ai, BracketPred | string>>;
  winner: string | null;
  score: string | null; // score temps régl./prolongation
  tab: boolean | null;  // true si tirs au but
  pens: string | null;  // score des tab (affichage)
}
export interface BracketFile {
  last_updated: string | null;
  rounds?: Array<{ key: Round; label: string; count: number }>;
  matches: BracketMatch[];
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
export async function loadBracket(): Promise<BracketFile> {
  try {
    return JSON.parse(await readFile(BRACKET, "utf-8"));
  } catch {
    return { last_updated: null, matches: [] };
  }
}
export async function saveBracket(file: BracketFile): Promise<void> {
  await writeFile(BRACKET, JSON.stringify(file, null, 2) + "\n", "utf-8");
}

/** Normalise un prono bracket (tolère l'ancien format string). */
function predOf(raw: BracketPred | string | undefined): BracketPred | null {
  if (raw == null) return null;
  if (typeof raw === "string") return { team: raw, score: null, tab: null };
  return { team: raw.team, score: raw.score ?? null, tab: raw.tab ?? null };
}

/** Barème phase finale : +1 qualifié, +1 score exact, +1 BONUS si l'IA annonce les tirs
 * au but (tab=true) et qu'ils ont bien lieu. Annoncer « pas de TAB » ne rapporte rien.
 * Max 3 (2 s'il n'y a pas de séance). */
export function bracketPoints(pred: BracketPred, m: BracketMatch): number {
  let pts = 0;
  if (pred.team && pred.team === m.winner) pts += 1;
  if (pred.score && m.score && pred.score === m.score) pts += 1;
  if (pred.tab && m.tab) pts += 1;
  return pts;
}

/** Matchs à noter : poules joués (date <= `date`) + phase finale dont l'affiche est connue. */
export async function pending(date: string) {
  const [matches, res, brk] = await Promise.all([loadPredictions(), loadResults(), loadBracket()]);
  const poules = matches
    .filter((m) => m.date <= date && !(String(m.id) in res.results))
    .map((m) => ({ phase: "poules" as const, id: m.id, group: m.group, date: m.date, match: `${m.home} – ${m.away}` }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const finale = brk.matches
    .filter((m) => m.home && m.away && !m.winner)
    .map((m) => ({ phase: "finale" as const, id: m.id, round: m.round, round_label: ROUND_LABEL[m.round], match: `${m.home} – ${m.away}` }));
  return [...poules, ...finale];
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

/** Classement cumulé (poules + phase finale) + détail par match noté.
 * totals[ai] = { pts, graded (matchs notés), possible (points en jeu) }.
 * possible : 1 pt/match de poule ; 2 pts/match de phase finale (3 s'il y a une séance de TAB). */
export async function standings() {
  const [matches, res, brk] = await Promise.all([loadPredictions(), loadResults(), loadBracket()]);
  const byId = new Map(matches.map((m) => [String(m.id), m]));
  const totals = Object.fromEntries(AIS.map((a) => [a, { pts: 0, graded: 0, possible: 0 }])) as Record<Ai, { pts: number; graded: number; possible: number }>;
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
      totals[a].possible += 1;
    }
    graded.push({ id: m.id, group: m.group, match: `${m.home} – ${m.away}`, winner: actual.winner, score: actual.score, hits });
  }

  const bracketGraded: Array<{ id: string; round: Round; match: string; winner: string; score?: string | null; tab: boolean | null; pens: string | null; pts: Record<Ai, number | null> }> = [];
  for (const m of brk.matches) {
    if (!m.winner) continue;
    const pts = {} as Record<Ai, number | null>;
    for (const a of AIS) {
      const pred = predOf(m.pred?.[a]);
      if (!pred) { pts[a] = null; continue; }
      const p = bracketPoints(pred, m);
      pts[a] = p;
      totals[a].pts += p;
      totals[a].graded += 1;
      totals[a].possible += m.tab ? 3 : 2;   // point TAB en jeu seulement s'il y a séance
    }
    bracketGraded.push({ id: m.id, round: m.round, match: `${m.home} – ${m.away}`, winner: m.winner, score: m.score, tab: m.tab, pens: m.pens, pts });
  }

  const ranking = [...AIS].sort((a, b) => totals[b].pts - totals[a].pts);
  return { lastUpdated: res.last_updated, totals, ranking, graded, bracketGraded };
}

/** Enregistre le résultat d'un match de phase finale dans bracket.json. */
export async function recordBracket(
  id: string,
  winner: string,
  opts: { score?: string; tab?: boolean; pens?: string; date?: string } = {},
) {
  const brk = await loadBracket();
  const m = brk.matches.find((x) => x.id === id);
  if (!m) throw new Error(`Match de phase finale id=${id} inconnu`);
  if (!m.home || !m.away) throw new Error(`Affiche du match ${id} pas encore connue`);
  if (winner !== m.home && winner !== m.away) {
    throw new Error(`winner "${winner}" invalide pour ${id} (${m.home} – ${m.away})`);
  }
  m.winner = winner;
  m.score = opts.score ?? null;
  m.tab = opts.tab ?? false;
  m.pens = opts.pens ?? null;
  if (opts.date) brk.last_updated = opts.date;
  await saveBracket(brk);
  return { id, winner, ...opts, match: `${m.home} – ${m.away}` };
}
