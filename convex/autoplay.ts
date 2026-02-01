import { internalMutation } from "./_generated/server";
import { startHand } from "./model/game";

const AUTO_START_DELAY_MS = 5000; // 5 seconds between hands

/**
 * Automatically start the next hand at tables that are between hands
 * Called by cron job every 10 seconds
 */
export const maybeStartHand = internalMutation({
  handler: async (ctx) => {
    // First, cleanup any orphaned hands (tables stuck on "playing" with complete hands)
    await cleanupOrphanedHandsInternal(ctx);

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

      // Check if the last hand completed recently using lastHandCompletedAt
      if (table.lastHandCompletedAt) {
        const timeSinceCompletion = Date.now() - table.lastHandCompletedAt;
        if (timeSinceCompletion < AUTO_START_DELAY_MS) {
          // Wait a bit longer before starting next hand
          continue;
        }
      }

      // Start the next hand
      try {
        // Double-check status right before calling (minimize TOCTOU window)
        const freshTable = await ctx.db.get(table._id);
        if (!freshTable || freshTable.status !== "between_hands") {
          continue;
        }

        console.log(`Auto-starting hand at table ${table._id} (${table.name})`);
        await startHand(ctx, table._id);
      } catch (error) {
        // Handle "already playing" errors gracefully (expected in concurrent scenarios)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("already playing") || errorMessage.includes("still in progress")) {
          console.log(`Table ${table._id} already started by another process`);
        } else {
          console.error(`Failed to auto-start hand at table ${table._id}: ${error}`);
        }
      }
    }
  },
});

/**
 * Helper function to cleanup orphaned hands
 * Separated so it can be called from maybeStartHand
 */
async function cleanupOrphanedHandsInternal(ctx: any) {
  const tables = await ctx.db
    .query("tables")
    .filter((q: any) => q.eq(q.field("status"), "playing"))
    .collect();

  for (const table of tables) {
    if (!table.currentHandId) continue;

    const hand = await ctx.db.get(table.currentHandId);
    if (!hand || hand.status === "complete") {
      // Hand is missing or complete, clean up the table
      const activePlayers = table.seats.filter(
        (s: any) => s !== null && !s.sittingOut && s.stack > 0
      );
      const newStatus = activePlayers.length >= 2 ? "between_hands" : "waiting";

      await ctx.db.patch(table._id, {
        status: newStatus,
        currentHandId: undefined,
        lastHandCompletedAt: Date.now(),
      });
    }
  }
}
