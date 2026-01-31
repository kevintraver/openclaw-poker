import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { startHand, processAction, getPlayerView } from "./model/game";
import { authenticateAgent } from "./model/auth";
import { Id } from "./_generated/dataModel";

/**
 * List all tables
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").collect();

    return tables.map((table) => ({
      id: table._id,
      name: table.name,
      status: table.status,
      players: table.seats.filter((s) => s !== null).length,
      maxSeats: table.maxSeats,
      blinds: `${table.smallBlind}/${table.bigBlind}`,
      minBuyIn: table.minBuyIn,
      maxBuyIn: table.maxBuyIn,
    }));
  },
});

/**
 * Get table state (for observers)
 */
export const getState = query({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId);
    if (!table) return null;

    let currentHand = null;
    if (table.currentHandId) {
      const hand = await ctx.db.get(table.currentHandId);
      if (hand) {
        // Observer view - only show hole cards if hand went to showdown (not if ended by folds)
        const wentToShowdown = hand.status === "complete" && hand.communityCards.length >= 3;
        currentHand = {
          handId: hand._id,
          handNumber: hand.handNumber,
          status: hand.status,
          pot: hand.pot,
          communityCards: hand.communityCards,
          currentBet: hand.currentBet,
          actionOn: hand.actionOn,
          players: hand.players.map((p) => ({
            seatIndex: p.seatIndex,
            stack: p.stack,
            currentBet: p.currentBet,
            folded: p.folded,
            allIn: p.allIn,
            holeCards: wentToShowdown ? p.holeCards : undefined,
          })),
          lastAction: hand.lastAction,
          winners: hand.winners,
        };
      }
    }

    // Get agent names for seats
    const seatInfo = await Promise.all(
      table.seats.map(async (seat) => {
        if (!seat) return null;
        const agent = await ctx.db.get(seat.agentId);
        return {
          agentId: seat.agentId,
          name: agent?.name ?? "Unknown",
          stack: seat.stack,
          sittingOut: seat.sittingOut,
        };
      })
    );

    return {
      id: table._id,
      name: table.name,
      status: table.status,
      blinds: { small: table.smallBlind, big: table.bigBlind },
      dealerSeat: table.dealerSeat,
      seats: seatInfo,
      currentHand,
    };
  },
});

/**
 * Create a new table (internal/admin)
 */
export const create = internalMutation({
  args: {
    name: v.string(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    minBuyIn: v.number(),
    maxBuyIn: v.number(),
    maxSeats: v.number(),
  },
  handler: async (ctx, args) => {
    const tableId = await ctx.db.insert("tables", {
      ...args,
      status: "waiting",
      seats: Array(args.maxSeats).fill(null),
      dealerSeat: 0,
      createdAt: Date.now(),
    });
    return tableId;
  },
});

/**
 * Join a table
 */
export const join = mutation({
  args: {
    tableId: v.id("tables"),
    agentId: v.id("agents"),
    buyIn: v.number(),
    seatIndex: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, agentId, buyIn, seatIndex }) => {
    const table = await ctx.db.get(tableId);
    if (!table) throw new Error("Table not found");

    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");

    // Validate buy-in
    if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
      throw new Error(`Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`);
    }
    if (buyIn > agent.shells) {
      throw new Error("Insufficient shells");
    }

    // Check if already at table
    if (table.seats.some((s) => s?.agentId === agentId)) {
      throw new Error("Already at this table");
    }

    // Find seat
    let targetSeat = seatIndex;
    if (targetSeat === undefined) {
      targetSeat = table.seats.findIndex((s) => s === null);
    }
    if (targetSeat === -1 || table.seats[targetSeat] !== null) {
      throw new Error("No available seat");
    }

    // Update agent shells
    await ctx.db.patch(agentId, { shells: agent.shells - buyIn });

    // Update table
    const newSeats = [...table.seats];
    newSeats[targetSeat] = {
      agentId,
      stack: buyIn,
      sittingOut: false,
    };

    await ctx.db.patch(tableId, { seats: newSeats });

    return { seatIndex: targetSeat, stack: buyIn };
  },
});

/**
 * Leave a table
 */
export const leave = mutation({
  args: {
    tableId: v.id("tables"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { tableId, agentId }) => {
    const table = await ctx.db.get(tableId);
    if (!table) throw new Error("Table not found");

    const seatIndex = table.seats.findIndex((s) => s?.agentId === agentId);
    if (seatIndex === -1) throw new Error("Not at this table");

    const seat = table.seats[seatIndex]!;

    // Can't leave during a hand if still active
    if (table.currentHandId) {
      const hand = await ctx.db.get(table.currentHandId);
      if (hand && hand.status !== "complete") {
        const playerInHand = hand.players.find((p) => p.agentId === agentId);
        if (playerInHand && !playerInHand.folded) {
          throw new Error("Cannot leave during an active hand");
        }
      }
    }

    // Return chips to agent
    const agent = await ctx.db.get(agentId);
    if (agent) {
      await ctx.db.patch(agentId, { shells: agent.shells + seat.stack });
    }

    // Remove from table
    const newSeats = [...table.seats];
    newSeats[seatIndex] = null;

    await ctx.db.patch(tableId, { seats: newSeats });

    return { returned: seat.stack };
  },
});

/**
 * Take an action in the current hand
 */
export const action = mutation({
  args: {
    tableId: v.id("tables"),
    agentId: v.id("agents"),
    action: v.union(
      v.literal("fold"),
      v.literal("check"),
      v.literal("call"),
      v.literal("bet"),
      v.literal("raise"),
      v.literal("all-in")
    ),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, agentId, action, amount }) => {
    const table = await ctx.db.get(tableId);
    if (!table) throw new Error("Table not found");
    if (!table.currentHandId) throw new Error("No active hand");

    await processAction(ctx, table.currentHandId, agentId, action, amount);

    return { success: true };
  },
});

/**
 * Start a new hand (if enough players)
 */
export const startNewHand = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId);
    if (!table) throw new Error("Table not found");

    if (table.status === "playing") {
      throw new Error("Hand already in progress");
    }

    const activePlayers = table.seats.filter(
      (s) => s !== null && !s.sittingOut && s.stack > 0
    );

    if (activePlayers.length < 2) {
      throw new Error("Need at least 2 players");
    }

    const handId = await startHand(ctx, tableId);
    return { handId };
  },
});

/**
 * Get player's view of current hand (includes their hole cards)
 */
export const getMyHand = query({
  args: {
    tableId: v.id("tables"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { tableId, agentId }) => {
    const table = await ctx.db.get(tableId);
    if (!table) return null;
    if (!table.currentHandId) return null;

    const hand = await ctx.db.get(table.currentHandId);
    if (!hand) return null;

    return getPlayerView(hand, agentId, table);
  },
});

/**
 * Get all actions for a hand (for action log display)
 */
export const getHandActions = query({
  args: {
    handId: v.id("hands"),
  },
  handler: async (ctx, { handId }) => {
    const actions = await ctx.db
      .query("actions")
      .withIndex("by_handId", (q) => q.eq("handId", handId))
      .collect();

    // Join with agent names
    const actionsWithNames = await Promise.all(
      actions.map(async (action) => {
        const agent = await ctx.db.get(action.agentId);
        return {
          ...action,
          agentName: agent?.name ?? "Unknown",
        };
      })
    );

    return actionsWithNames.sort((a, b) => a.timestamp - b.timestamp);
  },
});

/**
 * Quick check endpoint for bots (heartbeat-style)
 */
export const check = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, { agentId }) => {
    // Find all tables where agent is seated
    const tables = await ctx.db.query("tables").collect();

    const myTables = [];
    for (const table of tables) {
      const seatIndex = table.seats.findIndex((s) => s?.agentId === agentId);
      if (seatIndex === -1) continue;

      let yourTurn = false;
      let handId = null;

      if (table.currentHandId) {
        const hand = await ctx.db.get(table.currentHandId);
        if (hand && hand.status !== "complete") {
          handId = hand._id;
          const playerIndex = hand.players.findIndex((p) => p.agentId === agentId);
          yourTurn = hand.actionOn === playerIndex;
        }
      }

      myTables.push({
        tableId: table._id,
        tableName: table.name,
        seatIndex,
        status: table.status,
        yourTurn,
        handId,
      });
    }

    return {
      hasPendingAction: myTables.some((t) => t.yourTurn),
      tables: myTables,
    };
  },
});
