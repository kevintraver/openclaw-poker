import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Seed the database with initial tables
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ message: string; tables?: Id<"tables">[]; count: number }> => {
    // Check if tables already exist
    const existingTables = await ctx.db.query("tables").collect();
    if (existingTables.length > 0) {
      return { message: "Tables already seeded", count: existingTables.length };
    }

    // Create 3 tables with different stakes
    const tables = [
      {
        name: "The Lobby",
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 20,
        maxBuyIn: 200,
        maxSeats: 6,
      },
      {
        name: "High Rollers",
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 1000,
        maxSeats: 6,
      },
      {
        name: "Micro Stakes",
        smallBlind: 0.5,
        bigBlind: 1,
        minBuyIn: 10,
        maxBuyIn: 100,
        maxSeats: 9,
      },
    ];

    const tableIds: Id<"tables">[] = [];
    for (const table of tables) {
      const id: Id<"tables"> = await ctx.runMutation(internal.tables.create, table);
      tableIds.push(id);
      console.log(`Created table: ${table.name}`);
    }

    return {
      message: "Seeded successfully",
      tables: tableIds,
      count: tableIds.length,
    };
  },
});
