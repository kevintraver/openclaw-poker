import { internalMutation } from "./_generated/server";
import { processAction } from "./model/game";

/**
 * Checks for expired action deadlines and auto-folds/checks players
 * Called by cron job every 5 seconds
 */
export const checkActionTimeouts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find all active hands with expired deadlines
    const hands = await ctx.db
      .query("hands")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "complete"),
          q.lt(q.field("actionDeadline"), now)
        )
      )
      .collect();

    for (const hand of hands) {
      if (hand.actionOn === undefined) continue;

      const player = hand.players[hand.actionOn];
      if (!player || player.folded || player.allIn) continue;

      // Determine auto-action: check if possible, otherwise fold
      const canCheck = player.currentBet >= hand.currentBet;
      const action = canCheck ? "check" : "fold";

      console.log(
        `Timeout: Player ${player.agentId} at hand ${hand._id} - auto ${action}`
      );

      // Log the timeout action with a special marker
      await ctx.db.insert("actions", {
        handId: hand._id,
        agentId: player.agentId,
        action,
        amount: undefined,
        timestamp: now,
      });

      // Process the auto-action
      try {
        await processAction(ctx, hand._id, player.agentId, action);
      } catch (error) {
        console.error(`Failed to process timeout action: ${error}`);
        // If auto-action fails, mark hand as complete to prevent infinite loop
        await ctx.db.patch(hand._id, {
          status: "complete",
          actionOn: undefined,
          actionDeadline: undefined,
        });
      }
    }
  },
});
