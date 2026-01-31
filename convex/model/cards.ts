/**
 * Card utilities for Texas Hold'em
 * Cards are represented as 2-char strings: rank + suit
 * Ranks: 2-9, T, J, Q, K, A
 * Suits: s (spades), h (hearts), d (diamonds), c (clubs)
 */

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS = ["s", "h", "d", "c"];

export function createDeck(): string[] {
  const deck: string[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(rank + suit);
    }
  }
  return deck;
}

export function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: string[], count: number): { cards: string[]; remaining: string[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

// Hand evaluation
const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

export type HandRank = {
  rank: number; // 1-10 (high card to royal flush)
  name: string;
  tiebreakers: number[]; // For comparing hands of same rank
};

export function getRank(card: string): string {
  return card[0];
}

export function getSuit(card: string): string {
  return card[1];
}

export function getRankValue(card: string): number {
  return RANK_VALUES[getRank(card)];
}

/**
 * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(cards: string[]): HandRank {
  if (cards.length < 5) {
    return { rank: 0, name: "Incomplete", tiebreakers: [] };
  }

  // Get all 5-card combinations from the cards
  const combinations = getCombinations(cards, 5);
  let bestHand: HandRank = { rank: 0, name: "High Card", tiebreakers: [] };

  for (const combo of combinations) {
    const hand = evaluate5Cards(combo);
    if (compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand;
}

function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length === 0) return [];
  
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, size - 1).map(combo => [first, ...combo]);
  const withoutFirst = getCombinations(rest, size);
  
  return [...withFirst, ...withoutFirst];
}

function evaluate5Cards(cards: string[]): HandRank {
  const ranks = cards.map(getRankValue).sort((a, b) => b - a);
  const suits = cards.map(getSuit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const rankCounts = new Map<number, number>();
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  }
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const uniqueRanks = Array.from(rankCounts.keys()).sort((a, b) => b - a);
  
  // Check for straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = 0;
  
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (uniqueRanks[0] === 14 && uniqueRanks[1] === 5) {
      // A-2-3-4-5 wheel
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return { rank: 10, name: "Royal Flush", tiebreakers: [] };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 9, name: "Straight Flush", tiebreakers: [straightHigh] };
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    const quadRank = [...rankCounts.entries()].find(([, c]) => c === 4)![0];
    const kicker = [...rankCounts.entries()].find(([, c]) => c === 1)![0];
    return { rank: 8, name: "Four of a Kind", tiebreakers: [quadRank, kicker] };
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = [...rankCounts.entries()].find(([, c]) => c === 3)![0];
    const pairRank = [...rankCounts.entries()].find(([, c]) => c === 2)![0];
    return { rank: 7, name: "Full House", tiebreakers: [tripRank, pairRank] };
  }
  
  // Flush
  if (isFlush) {
    return { rank: 6, name: "Flush", tiebreakers: ranks };
  }
  
  // Straight
  if (isStraight) {
    return { rank: 5, name: "Straight", tiebreakers: [straightHigh] };
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    const tripRank = [...rankCounts.entries()].find(([, c]) => c === 3)![0];
    const kickers = [...rankCounts.entries()]
      .filter(([, c]) => c === 1)
      .map(([r]) => r)
      .sort((a, b) => b - a);
    return { rank: 4, name: "Three of a Kind", tiebreakers: [tripRank, ...kickers] };
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = [...rankCounts.entries()]
      .filter(([, c]) => c === 2)
      .map(([r]) => r)
      .sort((a, b) => b - a);
    const kicker = [...rankCounts.entries()].find(([, c]) => c === 1)![0];
    return { rank: 3, name: "Two Pair", tiebreakers: [...pairs, kicker] };
  }
  
  // One Pair
  if (counts[0] === 2) {
    const pairRank = [...rankCounts.entries()].find(([, c]) => c === 2)![0];
    const kickers = [...rankCounts.entries()]
      .filter(([, c]) => c === 1)
      .map(([r]) => r)
      .sort((a, b) => b - a);
    return { rank: 2, name: "Pair", tiebreakers: [pairRank, ...kickers] };
  }
  
  // High Card
  return { rank: 1, name: "High Card", tiebreakers: ranks };
}

/**
 * Compare two hands. Returns:
 * - positive if hand1 wins
 * - negative if hand2 wins
 * - 0 if tie
 */
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
    const t1 = hand1.tiebreakers[i] ?? 0;
    const t2 = hand2.tiebreakers[i] ?? 0;
    if (t1 !== t2) {
      return t1 - t2;
    }
  }
  
  return 0;
}

/**
 * Format a hand for display
 */
export function formatHand(cards: string[]): string {
  const suitSymbols: Record<string, string> = {
    s: "♠", h: "♥", d: "♦", c: "♣"
  };
  return cards.map(c => c[0] + suitSymbols[c[1]]).join(" ");
}
