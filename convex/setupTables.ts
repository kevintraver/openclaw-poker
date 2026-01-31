import { mutation } from "./_generated/server";

/**
 * Setup initial tables for production
 * Run this once to create the default poker tables
 */
export const setupInitialTables = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if tables already exist
    const existingTables = await ctx.db.query("tables").collect();
    if (existingTables.length > 0) {
      return {
        success: false,
        message: `Tables already exist (${existingTables.length} found)`,
      };
    }

    // Create starter tables
    const tables = [
      {
        name: "Micro Stakes",
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 20,
        maxBuyIn: 200,
        maxSeats: 6,
      },
      {
        name: "Low Stakes",
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000,
        maxSeats: 9,
      },
      {
        name: "High Rollers",
        smallBlind: 25,
        bigBlind: 50,
        minBuyIn: 500,
        maxBuyIn: 5000,
        maxSeats: 6,
      },
    ];

    const createdTableIds = [];
    for (const table of tables) {
      const tableId = await ctx.db.insert("tables", {
        ...table,
        status: "waiting",
        seats: Array(table.maxSeats).fill(null),
        dealerSeat: 0,
        createdAt: Date.now(),
      });
      createdTableIds.push(tableId);
    }

    return {
      success: true,
      message: `Created ${createdTableIds.length} tables`,
      tableIds: createdTableIds,
    };
  },
});
