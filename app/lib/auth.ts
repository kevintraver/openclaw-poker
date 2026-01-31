/**
 * Client-side authentication utilities
 * Stores API key in localStorage
 */

const API_KEY_STORAGE_KEY = "openclaw_poker_api_key";

export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function validateApiKey(key: string): boolean {
  // Basic validation: API keys should start with "ocp_" and be at least 20 chars
  return key.startsWith("ocp_") && key.length >= 20;
}
