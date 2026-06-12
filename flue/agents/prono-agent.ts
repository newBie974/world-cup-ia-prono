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

const fetchResults = defineTool({
  name: "fetch_results",
  description:
    "Récupère les résultats RÉELS des matchs de Coupe du Monde pour une date donnée (API TheSportsDB, JSON). Renvoie la liste des matchs 'FIFA World Cup' du jour avec score et statut. ⚠️ Les noms d'équipes sont en ANGLAIS — à mapper vers le français de list_pending (Mexico=Mexique, Czech Republic=Tchéquie, South Korea=Corée du Sud, United States=États-Unis, etc.). N'utilise que les matchs dont finished=true.",
  parameters: Type.Object({
    date: Type.Optional(Type.String({ description: "Date YYYY-MM-DD. Par défaut : aujourd'hui." })),
  }),
  execute: async ({ date }) => {
    const d = (date as string) || today();
    const key = process.env.SPORTSDB_KEY || "123"; // clé de test publique gratuite
    const u = `https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${d}&s=Soccer`;
    const r = await fetch(u, { headers: { "user-agent": "prono-battle-agent/0.1" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} (TheSportsDB)`);
    const data: any = await r.json();
    const matches = (data.events || [])
      .filter((e: any) => /world cup/i.test(e.strLeague || ""))
      .map((e: any) => {
        const hs = e.intHomeScore, as = e.intAwayScore;
        const finished = /^(FT|AET|PEN|Match Finished)$/i.test(e.strStatus || "");
        return {
          home: e.strHomeTeam,
          away: e.strAwayTeam,
          score: hs != null && as != null ? `${hs}-${as}` : null,
          status: e.strStatus || null,
          finished: finished && hs != null && as != null,
        };
      });
    return JSON.stringify({ date: d, count: matches.length, matches }, null, 2);
  },
});

const fetchUrl = defineTool({
  name: "fetch_url",
  description:
    "Secours générique : récupère le contenu texte d'une page web (GET, HTML supprimé, tronqué à 20 000 caractères). À utiliser seulement si fetch_results ne couvre pas un match.",
  parameters: Type.Object({
    url: Type.String({ description: "URL http(s) à récupérer" }),
  }),
  execute: async ({ url }) => {
    const u = String(url);
    if (!/^https?:\/\//.test(u)) throw new Error("URL invalide (doit commencer par http:// ou https://)");
    const resp = await fetch(u, { headers: { "user-agent": "prono-battle-agent/0.1" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} sur ${u}`);
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#\d+;/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 20000);
  },
});

export default createAgent(() => ({
  // Provider Google (clé GEMINI_API_KEY). gemini-2.5-flash = éligible free tier ;
  // gemini-2.5-pro exige un projet Google avec facturation (sinon 429 "limit: 0").
  // Catalogue des ids : https://pi.dev/docs/latest/providers
  model: "google/gemini-2.5-flash",
  tools: [listPending, recordResult, getStandings, fetchResults, fetchUrl],
  instructions: `Tu tiens le "AI Prono Battle" de la Coupe du Monde 2026 : trois IA (Claude, GPT, Gemini)
ont pronostiqué les 72 matchs de poule (vainqueur ou nul). Scoring : 1 point par résultat juste.

À chaque exécution :
1. Appelle list_pending pour obtenir les matchs joués pas encore notés (noms d'équipes en français).
2. Si la liste est vide, appelle get_standings et résume le classement, puis termine.
3. Sinon, pour CHAQUE date distincte présente dans la liste, appelle fetch_results(date) pour
   obtenir les vrais scores. Fais correspondre chaque match terminé (finished=true) de l'API
   (noms en anglais) au match français de list_pending. N'enregistre QUE les matchs finished=true ;
   ignore ceux non joués / en cours. (Si un match attendu manque dans fetch_results, tu peux
   vérifier via fetch_url sur une source fiable, sinon ne l'enregistre pas.)
4. Pour chaque résultat confirmé, appelle record_result avec le vainqueur (orthographe canonique
   EXACTE renvoyée par list_pending, ou 'Nul' si match nul) et le score "X-Y".
5. Appelle get_standings et produis un récap en français : classement à jour, qui mène, séries,
   pronostics audacieux qui ont payé ou raté, gros matchs du lendemain.

Sois factuel : ne devine jamais un résultat, vérifie-le. En cas de doute sur un score, n'enregistre pas le match.`,
}));
