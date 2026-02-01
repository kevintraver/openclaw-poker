import { internalMutation } from "./_generated/server";

/**
 * Cleanup hands that are marked complete but didn't properly update the table
 * This can happen if timeout error handling left the hand in a bad state
 */
export const cleanupOrphanedHands = internalMutation({
  handler: async (ctx) => {
    // Find tables that are "playing" with a currentHandId that references a complete hand
    const tables = await ctx.db
      .query("tables")
      .filter((q) => q.eq(q.field("status"), "playing"))
      .collect();

    let cleaned = 0;
    for (const table of tables) {
      if (!table.currentHandId) continue;

      const hand = await ctx.db.get(table.currentHandId);
      if (!hand) {
        // Hand doesn't exist, clear it from table
        console.log(`Cleaning orphaned hand reference on table ${table.name}`);
        await ctx.db.patch(table._id, {
          status: "between_hands",
          currentHandId: undefined,
        });
        cleaned++;
        continue;
      }

      if (hand.status === "complete") {
        // Hand is complete but table wasn't updated
        console.log(
          `Cleaning complete hand ${hand._id} from table ${table.name} (hand #${hand.handNumber})`
        );

        // Count active players to determine next status
        const activePlayers = table.seats.filter(
          (s) => s !== null && !s.sittingOut && s.stack > 0
        );
        const newStatus = activePlayers.length >= 2 ? "between_hands" : "waiting";

        await ctx.db.patch(table._id, {
          status: newStatus,
          currentHandId: undefined,
          lastHandCompletedAt: Date.now(),
        });
        cleaned++;
      }
    }

    return { message: `Cleaned ${cleaned} orphaned hands` };
  },
});
