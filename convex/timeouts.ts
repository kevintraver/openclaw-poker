import { internalMutation } from "./_generated/server";
import { processAction } from "./model/game";

/**
 * Checks for expired action deadlines and auto-folds/checks players
 * Called by cron job every 5 seconds
 */
export const checkActionTimeouts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // First, cleanup players who timed out in completed hands
    await removeTimedOutPlayersFromCompletedHands(ctx);

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
      // Mark player for removal after hand completes
      try {
        await processAction(ctx, hand._id, player.agentId, action, undefined, "timeout");

        // Mark the player's seat for removal after hand completes
        const table = await ctx.db.get(hand.tableId);
        if (table) {
          const seatIndex = table.seats.findIndex((s: any) => s?.agentId === player.agentId);
          if (seatIndex !== -1 && table.seats[seatIndex]) {
            const newSeats = [...table.seats];
            newSeats[seatIndex] = {
              ...table.seats[seatIndex]!,
              sittingOut: true, // Mark as sitting out so they won't be dealt into next hand
            };
            await ctx.db.patch(table._id, { seats: newSeats });
            console.log(`Player ${player.agentId} marked as sitting out due to timeout. Will be removed after hand completes.`);
          }
        }
      } catch (error) {
        console.error(`Failed to process timeout action for hand ${hand._id}: ${error}`);
        // Don't just mark as complete - this can leave the hand in a bad state
        // Instead, force fold the player and let the game engine handle completion
        try {
          await processAction(ctx, hand._id, player.agentId, "fold", undefined, "timeout");
          console.log(`Player ${player.agentId} fallback fold succeeded.`);
        } catch (fallbackError) {
          console.error(`Failed fallback fold for hand ${hand._id}: ${fallbackError}`);
          // As last resort, just skip this player - the next cron tick will retry
        }
      }
    }
  },
});

/**
 * Remove players who are sitting out from tables with completed hands
 * Called at the start of each timeout check
 */
async function removeTimedOutPlayersFromCompletedHands(ctx: any) {
  const tables = await ctx.db.query("tables").collect();

  for (const table of tables) {
    // Skip tables with active hands
    if (table.currentHandId) {
      const hand = await ctx.db.get(table.currentHandId);
      if (hand && hand.status !== "complete") {
        continue; // Hand still in progress, skip
      }
    }

    // Find sitting out players (marked during timeout)
    const sittingOutSeats = table.seats
      .map((seat: any, idx: number) => ({ seat, idx }))
      .filter(({ seat }: any) => seat && seat.sittingOut);

    for (const { seat, idx } of sittingOutSeats) {
      console.log(`Removing timed-out player ${seat.agentId} from table ${table._id} (between hands)`);

      // Refund chips to agent
      const agent = await ctx.db.get(seat.agentId);
      if (agent) {
        await ctx.db.patch(seat.agentId, {
          shells: agent.shells + seat.stack,
        });
      }

      // Remove the seat
      const newSeats = [...table.seats];
      newSeats[idx] = null;

      // Update table status if needed
      const activePlayers = newSeats.filter(
        (s: any) => s !== null && !s.sittingOut && s.stack > 0
      );
      const newStatus = activePlayers.length >= 2 ? table.status : "waiting";

      // Rotate dealer if needed
      let newDealerSeat = table.dealerSeat;
      if (table.dealerSeat === idx) {
        console.log(`Removed player was dealer, rotating button`);
        let rotations = 0;
        newDealerSeat = (table.dealerSeat + 1) % table.maxSeats;
        while (newSeats[newDealerSeat] === null && rotations < table.maxSeats) {
          newDealerSeat = (newDealerSeat + 1) % table.maxSeats;
          rotations++;
        }
      }

      await ctx.db.patch(table._id, {
        seats: newSeats,
        status: newStatus,
        dealerSeat: newDealerSeat,
      });

      console.log(`Player ${seat.agentId} removed. ${activePlayers.length} active players remaining.`);
    }
  }
}

/**
 * Remove a player from the table after they timed out
 * Does NOT remove all-in players who have chips in the pot
 * DEPRECATED: Use removeTimedOutPlayersFromCompletedHands instead
 */
async function removeTimedOutPlayer(ctx: any, tableId: any, agentId: any) {
  try {
    const table = await ctx.db.get(tableId);
    if (!table) return;

    const seatIndex = table.seats.findIndex((s: any) => s?.agentId === agentId);
    if (seatIndex === -1) return;

    const seat = table.seats[seatIndex];
    if (!seat) return;

    // Check if player is all-in in current hand
    if (table.currentHandId) {
      const hand = await ctx.db.get(table.currentHandId);
      if (hand && hand.status !== "complete") {
        const player = hand.players.find((p: any) => p.agentId === agentId);
        if (player && player.allIn) {
          console.log(`Player ${agentId} is all-in, not removing until hand completes`);
          return; // Don't remove yet, they have chips in pot
        }

        // If player is in an active hand, refund their ACTUAL stack (not seat stack)
        // because chips they bet are still in the pot
        if (player) {
          console.log(`Removing timed-out player ${agentId} from table ${tableId} (mid-hand)`);

          // Return ACTUAL remaining chips (after bets) to agent
          const agent = await ctx.db.get(agentId);
          if (agent) {
            await ctx.db.patch(agentId, {
              shells: agent.shells + player.stack
            });
          }
        } else {
          // Player not in current hand (already folded), seat.stack is correct
          console.log(`Removing timed-out player ${agentId} from table ${tableId} (already folded)`);
          const agent = await ctx.db.get(agentId);
          if (agent) {
            await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
          }
        }
      } else {
        // Hand is complete, use seat.stack (already updated by awardWinnings)
        console.log(`Removing timed-out player ${agentId} from table ${tableId} (between hands)`);
        const agent = await ctx.db.get(agentId);
        if (agent) {
          await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
        }
      }
    } else {
      // No active hand, seat.stack is correct
      console.log(`Removing timed-out player ${agentId} from table ${tableId} (no hand)`);
      const agent = await ctx.db.get(agentId);
      if (agent) {
        await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
      }
    }

    console.log(`Removing timed-out player ${agentId} from table ${tableId}`);

    // Return chips to agent - REMOVED (handled above based on game state)
    // const agent = await ctx.db.get(agentId);
    // if (agent) {
    //   await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
    // }

    // Clear the seat
    const newSeats = [...table.seats];
    newSeats[seatIndex] = null;

    // Update table status if needed
    const activePlayers = newSeats.filter(
      (s: any) => s !== null && !s.sittingOut && s.stack > 0
    );
    const newStatus = activePlayers.length >= 2 ? table.status : "waiting";

    // If removed player was dealer, rotate dealer button
    let newDealerSeat = table.dealerSeat;
    if (table.dealerSeat === seatIndex) {
      console.log(`Removed player was dealer, rotating button`);
      let rotations = 0;
      newDealerSeat = (table.dealerSeat + 1) % table.maxSeats;
      while (newSeats[newDealerSeat] === null && rotations < table.maxSeats) {
        newDealerSeat = (newDealerSeat + 1) % table.maxSeats;
        rotations++;
      }
    }

    await ctx.db.patch(tableId, {
      seats: newSeats,
      status: newStatus,
      dealerSeat: newDealerSeat,
    });

    console.log(`Player ${agentId} removed from table. ${activePlayers.length} active players remaining.`);
  } catch (error) {
    console.error(`Failed to remove timed-out player ${agentId}: ${error}`);
  }
}
