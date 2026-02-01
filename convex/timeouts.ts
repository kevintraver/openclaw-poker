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

      // Process the auto-action (processAction will log it with reason="timeout")
      try {
        await processAction(ctx, hand._id, player.agentId, action, undefined, "timeout");
      } catch (error) {
        console.error(`Failed to process timeout action for hand ${hand._id}: ${error}`);
        // Don't just mark as complete - this can leave the hand in a bad state
        // Instead, force fold the player and let the game engine handle completion
        try {
          await processAction(ctx, hand._id, player.agentId, "fold", undefined, "timeout");
        } catch (fallbackError) {
          console.error(`Failed fallback fold for hand ${hand._id}: ${fallbackError}`);
          // As last resort, just skip this player - the next cron tick will retry
        }
      }
    }
  },
});
