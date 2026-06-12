/**
 * AI Prono Battle — agent Flue.
 *
 * Équivalent autonome du skill manuel `/prono-recap` : à chaque exécution, l'agent
 * liste les matchs de poule joués mais pas encore notés, recherche leurs vrais
 * résultats, les enregistre dans data/results.json (la mémoire), puis restitue le
 * classement Claude vs GPT vs Gemini. Pensé pour tourner en cron (1 fois / jour).
 *
 * Lancer en local :   npx flue connect prono-agent local
 * Déployer (Cloudflare + cron trigger quotidien) : voir flue/README.md
 */
import { createAgent, defineTool, Type } from "@flue/runtime";
import { pending, record, standings } from "../lib/scoring.js";

/** Date du jour au format YYYY-MM-DD (UTC). */
const today = () => new Date().toISOString().slice(0, 10);

const listPending = defineTool({
  name: "list_pending",
  description:
    "Liste les matchs de poule dont la date est <= aujourd'hui et qui n'ont pas encore de résultat enregistré. À appeler en premier pour savoir quoi rechercher.",
  parameters: Type.Object({
    date: Type.Optional(
      Type.String({ description: "Date butoir YYYY-MM-DD. Par défaut : aujourd'hui." }),
    ),
  }),
  execute: async ({ date }) => {
    const list = await pending((date as string) || today());
    return JSON.stringify(list, null, 2);
  },
});

const recordResult = defineTool({
  name: "record_result",
  description:
    "Enregistre le résultat réel d'UN match terminé. `winner` doit être le nom canonique exact d'une des deux équipes du match, ou 'Nul'. N'enregistre que des matchs réellement terminés.",
  parameters: Type.Object({
    id: Type.Integer({ description: "id du match (1-72)" }),
    winner: Type.String({ description: "Équipe gagnante (orthographe canonique) ou 'Nul'" }),
    score: Type.Optional(Type.String({ description: "Score final, ex '2-1'" })),
  }),
  execute: async ({ id, winner, score }) => {
    const saved = await record(Number(id), String(winner), score as string | undefined, today());
    return `Enregistré : ${saved.match} → ${saved.winner}${saved.score ? ` (${saved.score})` : ""}`;
  },
});

const getStandings = defineTool({
  name: "get_standings",
  description:
    "Renvoie le classement cumulé des 3 IA (points = nombre de résultats justes) et le détail des matchs notés.",
  parameters: Type.Object({}),
  execute: async () => JSON.stringify(await standings(), null, 2),
});

export default createAgent(() => ({
  // Provider Google (clé GEMINI_API_KEY). Voir les ids dispo : https://pi.dev/docs/latest/providers
  model: "google/gemini-2.5-pro",
  tools: [listPending, recordResult, getStandings],
  instructions: `Tu tiens le "AI Prono Battle" de la Coupe du Monde 2026 : trois IA (Claude, GPT, Gemini)
ont pronostiqué les 72 matchs de poule (vainqueur ou nul). Scoring : 1 point par résultat juste.

À chaque exécution :
1. Appelle list_pending pour obtenir les matchs joués pas encore notés.
2. Si la liste est vide, appelle get_standings et résume le classement, puis termine.
3. Sinon, pour chaque match listé, recherche le score final officiel (sources fiables : FIFA, L'Équipe, ESPN).
   N'enregistre que les matchs RÉELLEMENT terminés.
4. Pour chaque résultat confirmé, appelle record_result avec le vainqueur (orthographe canonique
   exacte renvoyée par list_pending, ou 'Nul') et le score.
5. Appelle get_standings et produis un récap en français : classement à jour, qui mène, séries,
   pronostics audacieux qui ont payé ou raté, gros matchs du lendemain.

Sois factuel : ne devine jamais un résultat, vérifie-le.`,
}));
