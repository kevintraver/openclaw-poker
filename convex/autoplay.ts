import { internalMutation } from "./_generated/server";
import { startHand } from "./model/game";

const AUTO_START_DELAY_MS = 5000; // 5 seconds between hands

/**
 * Automatically start the next hand at tables that are between hands
 * Called by cron job every 10 seconds
 */
export const maybeStartHand = internalMutation({
  handler: async (ctx) => {
    // Find tables in "between_hands" status
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "between_hands"))
      .collect();

    for (const table of tables) {
      // Count active players (not sitting out, with chips)
      const activePlayers = table.seats.filter(
        (seat) => seat !== null && !seat.sittingOut && seat.stack > 0
      );

      if (activePlayers.length < 2) {
        // Not enough players, skip
        continue;
      }

      // Check if the last hand completed recently
      if (table.currentHandId) {
        const lastHand = await ctx.db.get(table.currentHandId);
        if (lastHand && lastHand.completedAt) {
          const timeSinceCompletion = Date.now() - lastHand.completedAt;
          if (timeSinceCompletion < AUTO_START_DELAY_MS) {
            // Wait a bit longer before starting next hand
            continue;
          }
        }
      }

      // Start the next hand
      try {
        console.log(`Auto-starting hand at table ${table._id} (${table.name})`);
        await startHand(ctx, table._id);
      } catch (error) {
        console.error(`Failed to auto-start hand at table ${table._id}: ${error}`);
      }
    }
  },
});
