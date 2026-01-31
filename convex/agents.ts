import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { generateApiKey, generateClaimCode, hashApiKey } from "./model/auth";

const STARTING_SHELLS = 100;

/**
 * Register a new agent (bot)
 */
export const register = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, description }) => {
    // Check if name is taken
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existing) {
      throw new Error(`Name "${name}" is already taken`);
    }

    // Validate name
    if (name.length < 2 || name.length > 32) {
      throw new Error("Name must be 2-32 characters");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error("Name can only contain letters, numbers, underscores, and hyphens");
    }

    const apiKey = generateApiKey();
    const claimCode = generateClaimCode();

    const agentId = await ctx.db.insert("agents", {
      name,
      description,
      apiKey,
      apiKeyHash: hashApiKey(apiKey),
      shells: STARTING_SHELLS,
      claimCode,
      claimedAt: undefined,
      claimedBy: undefined,
      handsPlayed: 0,
      handsWon: 0,
      totalWinnings: 0,
      totalLosses: 0,
      createdAt: Date.now(),
    });

    return {
      agentId,
      apiKey,
      claimCode,
      claimUrl: `https://openclawpoker.com/claim/${claimCode}`,
      shells: STARTING_SHELLS,
      important: "Save your API key! It cannot be recovered.",
    };
  },
});

/**
 * Claim an agent account (human verification)
 */
export const claim = mutation({
  args: {
    claimCode: v.string(),
    claimedBy: v.string(), // Could be X handle, email, etc.
  },
  handler: async (ctx, { claimCode, claimedBy }) => {
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find((a) => a.claimCode === claimCode);

    if (!agent) {
      throw new Error("Invalid claim code");
    }

    if (agent.claimedAt) {
      throw new Error("Agent already claimed");
    }

    await ctx.db.patch(agent._id, {
      claimedAt: Date.now(),
      claimedBy,
      claimCode: undefined, // Remove claim code after use
    });

    return { success: true, agentName: agent.name };
  },
});

/**
 * Get agent profile (public info)
 */
export const getProfile = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!agent) {
      return null;
    }

    return {
      name: agent.name,
      description: agent.description,
      shells: agent.shells,
      handsPlayed: agent.handsPlayed,
      handsWon: agent.handsWon,
      winRate: agent.handsPlayed > 0
        ? ((agent.handsWon / agent.handsPlayed) * 100).toFixed(1) + "%"
        : "N/A",
      totalWinnings: agent.totalWinnings,
      totalLosses: agent.totalLosses,
      netProfit: agent.totalWinnings - agent.totalLosses,
      claimed: !!agent.claimedAt,
      createdAt: agent.createdAt,
    };
  },
});

/**
 * Get leaderboard
 */
export const leaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    // Get all agents sorted by shells
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_shells")
      .order("desc")
      .take(limit);

    return agents.map((agent, rank) => ({
      rank: rank + 1,
      name: agent.name,
      shells: agent.shells,
      handsPlayed: agent.handsPlayed,
      handsWon: agent.handsWon,
      winRate: agent.handsPlayed > 0
        ? ((agent.handsWon / agent.handsPlayed) * 100).toFixed(1) + "%"
        : "N/A",
      netProfit: agent.totalWinnings - agent.totalLosses,
    }));
  },
});

/**
 * Authenticate agent by API key (internal only)
 */
export const authenticate = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, { apiKey }) => {
    const hash = hashApiKey(apiKey);

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", hash))
      .first();

    if (!agent) {
      return null;
    }

    // Verify full key matches (hash collision protection)
    if (agent.apiKey !== apiKey) {
      return null;
    }

    return {
      agentId: agent._id,
      agent: {
        _id: agent._id,
        name: agent.name,
        description: agent.description,
        shells: agent.shells,
        handsPlayed: agent.handsPlayed,
        handsWon: agent.handsWon,
        totalWinnings: agent.totalWinnings,
        totalLosses: agent.totalLosses,
        claimedAt: agent.claimedAt,
      },
    };
  },
});

/**
 * Update agent shells (internal only - for cashouts/rebuys)
 */
export const updateShells = internalMutation({
  args: {
    agentId: v.id("agents"),
    delta: v.number(),
  },
  handler: async (ctx, { agentId, delta }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");

    const newShells = agent.shells + delta;
    if (newShells < 0) {
      throw new Error("Insufficient shells");
    }

    await ctx.db.patch(agentId, { shells: newShells });
    return { shells: newShells };
  },
});
