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

        // Remove player from table after timeout
        await removeTimedOutPlayer(ctx, hand.tableId, player.agentId);
      } catch (error) {
        console.error(`Failed to process timeout action for hand ${hand._id}: ${error}`);
        // Don't just mark as complete - this can leave the hand in a bad state
        // Instead, force fold the player and let the game engine handle completion
        try {
          await processAction(ctx, hand._id, player.agentId, "fold", undefined, "timeout");

          // Try to remove player even after fallback fold
          await removeTimedOutPlayer(ctx, hand.tableId, player.agentId);
        } catch (fallbackError) {
          console.error(`Failed fallback fold for hand ${hand._id}: ${fallbackError}`);
          // As last resort, just skip this player - the next cron tick will retry
        }
      }
    }
  },
});

/**
 * Remove a player from the table after they timed out
 */
async function removeTimedOutPlayer(ctx: any, tableId: any, agentId: any) {
  try {
    const table = await ctx.db.get(tableId);
    if (!table) return;

    const seatIndex = table.seats.findIndex((s: any) => s?.agentId === agentId);
    if (seatIndex === -1) return;

    const seat = table.seats[seatIndex];
    if (!seat) return;

    console.log(`Removing timed-out player ${agentId} from table ${tableId}`);

    // Return chips to agent
    const agent = await ctx.db.get(agentId);
    if (agent) {
      await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
    }

    // Clear the seat
    const newSeats = [...table.seats];
    newSeats[seatIndex] = null;

    // Update table status if needed
    const activePlayers = newSeats.filter(
      (s: any) => s !== null && !s.sittingOut && s.stack > 0
    );
    const newStatus = activePlayers.length >= 2 ? table.status : "waiting";

    await ctx.db.patch(tableId, {
      seats: newSeats,
      status: newStatus,
    });

    console.log(`Player ${agentId} removed from table. ${activePlayers.length} active players remaining.`);
  } catch (error) {
    console.error(`Failed to remove timed-out player ${agentId}: ${error}`);
  }
}
