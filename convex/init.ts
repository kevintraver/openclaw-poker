import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Initialize the database with default tables
 * Run this after deployment: npx convex run init:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if any tables exist
    const existingTables = await ctx.db.query("tables").collect();
    
    if (existingTables.length > 0) {
      console.log(`Already have ${existingTables.length} table(s), skipping seed`);
      return { created: 0, existing: existingTables.length };
    }

    // Create default tables
    const defaultTables = [
      {
        name: "The Lobby",
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 20,
        maxBuyIn: 100,
        maxSeats: 6,
      },
      {
        name: "High Rollers",
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 500,
        maxSeats: 6,
      },
      {
        name: "Heads Up",
        smallBlind: 2,
        bigBlind: 4,
        minBuyIn: 40,
        maxBuyIn: 200,
        maxSeats: 2,
      },
    ];

    for (const table of defaultTables) {
      await ctx.db.insert("tables", {
        ...table,
        status: "waiting",
        seats: Array(table.maxSeats).fill(null),
        dealerSeat: 0,
        createdAt: Date.now(),
      });
      console.log(`Created table: ${table.name}`);
    }

    return { created: defaultTables.length, existing: 0 };
  },
});
