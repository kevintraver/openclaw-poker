import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Authentication utilities for bot API
 */

// Simple hash function for API key lookup (not cryptographic, just for indexing)
export function hashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Generate a random API key
export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "ocp_"; // OpenClaw Poker prefix
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Generate a claim code for human verification
export function generateClaimCode(): string {
  const words = ["ace", "bet", "call", "deal", "fold", "raise", "river", "flush"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${word}-${num}`;
}

/**
 * Authenticate a request by API key
 */
export async function authenticateAgent(
  ctx: QueryCtx | MutationCtx,
  apiKey: string
): Promise<{ agentId: Id<"agents">; agent: any } | null> {
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
  
  return { agentId: agent._id, agent };
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }
  
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  
  return null;
}
