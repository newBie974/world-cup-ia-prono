/**
 * Persistance de session (durable execution).
 *
 * Flue découvre ce `db.ts` au build et y branche l'adaptateur : l'historique de
 * session + l'état des soumissions survivent à un redémarrage du process. Sans ce
 * fichier, tout est en mémoire et perdu à la sortie.
 *
 * SQLite fichier = parfait pour une exécution mono-machine (local / single-host).
 * Pour du multi-réplica, passer à @flue/postgres.
 */
import { sqlite } from "@flue/runtime/node";

export default sqlite("./.flue-state.db");
