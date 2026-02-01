import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Registered bot agents
  agents: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    apiKey: v.string(),
    apiKeyHash: v.string(), // For secure lookup
    shells: v.number(), // Currency (start with 100)
    claimCode: v.optional(v.string()), // For human verification
    claimedAt: v.optional(v.number()),
    claimedBy: v.optional(v.string()), // Human's identifier
    // Stats
    handsPlayed: v.number(),
    handsWon: v.number(),
    totalWinnings: v.number(),
    totalLosses: v.number(),
    createdAt: v.number(),
  })
    .index("by_apiKeyHash", ["apiKeyHash"])
    .index("by_shells", ["shells"])
    .index("by_name", ["name"]),

  // Poker tables (cash games)
  tables: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("waiting"), // Waiting for players
      v.literal("playing"), // Hand in progress
      v.literal("between_hands") // Between hands
    ),
    minBuyIn: v.number(),
    maxBuyIn: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    maxSeats: v.number(), // 2-9
    // Current players at the table (array of seat info)
    seats: v.array(
      v.union(
        v.null(), // Empty seat
        v.object({
          agentId: v.id("agents"),
          stack: v.number(), // Chips at table
          sittingOut: v.boolean(),
        })
      )
    ),
    // Current hand state (if playing)
    currentHandId: v.optional(v.id("hands")),
    dealerSeat: v.number(), // Button position
    lastHandCompletedAt: v.optional(v.number()), // Timestamp of last hand completion
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Individual hands
  hands: defineTable({
    tableId: v.id("tables"),
    handNumber: v.number(),
    status: v.union(
      v.literal("preflop"),
      v.literal("flop"),
      v.literal("turn"),
      v.literal("river"),
      v.literal("showdown"),
      v.literal("complete")
    ),
    // Cards (stored as strings like "As", "Kh", "2d", "Tc")
    deck: v.array(v.string()), // Remaining deck
    communityCards: v.array(v.string()), // Board cards
    // Player states for this hand
    players: v.array(
      v.object({
        agentId: v.id("agents"),
        seatIndex: v.number(),
        holeCards: v.array(v.string()), // 2 cards
        stack: v.number(), // Stack at start of hand
        currentBet: v.number(), // Bet in current round
        totalBet: v.number(), // Total bet this hand
        folded: v.boolean(),
        allIn: v.boolean(),
        hasActed: v.optional(v.boolean()), // Track if player has acted this street
      })
    ),
    pot: v.number(),
    sidePots: v.array(
      v.object({
        amount: v.number(),
        eligiblePlayers: v.array(v.id("agents")),
      })
    ),
    currentBet: v.number(), // Current bet to call
    lastRaiseAmount: v.optional(v.number()), // Size of last raise for min-raise calculation
    actionOn: v.optional(v.number()), // Player index in players array (NOT seat index)
    lastAction: v.optional(
      v.object({
        agentId: v.id("agents"),
        action: v.string(),
        amount: v.optional(v.number()),
        timestamp: v.number(),
      })
    ),
    // Timing
    actionDeadline: v.optional(v.number()), // When current player must act
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    // Results
    winners: v.optional(
      v.array(
        v.object({
          agentId: v.id("agents"),
          agentName: v.optional(v.string()), // Optional for backward compatibility
          seatIndex: v.optional(v.number()), // Optional for backward compatibility
          amount: v.number(),
          hand: v.optional(v.string()), // Hand description
        })
      )
    ),
  })
    .index("by_tableId", ["tableId"])
    .index("by_status", ["status"]),

  // Action log for hand history
  actions: defineTable({
    handId: v.id("hands"),
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
    timestamp: v.number(),
    reason: v.optional(v.union(
      v.literal("player"),
      v.literal("timeout"),
      v.literal("auto")
    )),
  }).index("by_handId", ["handId"]),
});
