import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time helper to fix table status for tables stuck on "waiting"
 * with enough players to start
 */
export const fixWaitingTables = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").collect();

    let fixed = 0;
    for (const table of tables) {
      if (table.status === "waiting") {
        const activePlayers = table.seats.filter(
          (s) => s !== null && !s.sittingOut && s.stack > 0
        );

        if (activePlayers.length >= 2) {
          await ctx.db.patch(table._id, { status: "between_hands" });
          fixed++;
          console.log(`Fixed table ${table.name}: ${activePlayers.length} players, status waiting -> between_hands`);
        }
      }
    }

    return { message: `Fixed ${fixed} tables` };
  },
});
