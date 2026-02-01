interface Card {
  rank: string;
  suit: string;
}

function parseCard(cardStr: string): Card {
  const rank = cardStr.slice(0, -1);
  const suit = cardStr.slice(-1);
  return { rank, suit };
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function evaluatePreflop(holeCards: string[]): number {
  if (holeCards.length !== 2) return 0.3;

  const cards = holeCards.map(parseCard);
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suited = cards[0].suit === cards[1].suit;
  const [high, low] = ranks;
  const gap = high - low;

  // Pocket pairs
  if (high === low) {
    if (high >= 13) return 1.0;      // AA, KK
    if (high >= 11) return 0.9;      // QQ, JJ
    if (high >= 8) return 0.8;       // TT-88
    if (high >= 5) return 0.7;       // 77-55
    return 0.65;                     // 44-22
  }

  // High cards
  if (high === 14) {  // Ace
    if (low >= 12) return suited ? 0.85 : 0.8;   // AK, AQ
    if (low >= 10) return suited ? 0.75 : 0.7;   // AJ, AT
    if (suited) return 0.6;                       // Suited ace
    return 0.5;
  }

  if (high >= 12 && low >= 11) {
    return suited ? 0.75 : 0.7;  // KQ, KJ, QJ
  }

  // Suited connectors
  if (suited && gap <= 1 && high >= 8) {
    return 0.65;
  }

  if (suited && gap <= 2) {
    return 0.55;
  }

  // Broadway cards
  if (high >= 10 && low >= 10) {
    return 0.6;
  }

  // Medium pairs handled above, medium suited
  if (suited && high >= 8) {
    return 0.5;
  }

  // Weak hands
  if (high >= 10) return 0.4;
  if (high >= 7) return 0.3;
  return 0.2;
}

function countRanks(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

function countSuits(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) || 0) + 1);
  }
  return counts;
}

function hasFlush(cards: Card[]): boolean {
  const suitCounts = countSuits(cards);
  return Array.from(suitCounts.values()).some(count => count >= 5);
}

function hasStraight(cards: Card[]): boolean {
  const values = [...new Set(cards.map(c => RANK_VALUES[c.rank]))].sort((a, b) => a - b);

  for (let i = 0; i <= values.length - 5; i++) {
    if (values[i + 4] - values[i] === 4) {
      return true;
    }
  }

  // Check for wheel (A-2-3-4-5)
  if (values.includes(14) && values.includes(2) && values.includes(3) &&
      values.includes(4) && values.includes(5)) {
    return true;
  }

  return false;
}

export function evaluatePostflop(holeCards: string[], community: string[]): number {
  const allCards = [...holeCards, ...community].map(parseCard);
  const rankCounts = countRanks(allCards);
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);

  // Four of a kind
  if (counts[0] === 4) return 0.95;

  // Full house
  if (counts[0] === 3 && counts[1] >= 2) return 0.9;

  // Flush
  if (hasFlush(allCards)) return 0.85;

  // Straight
  if (hasStraight(allCards)) return 0.8;

  // Three of a kind
  if (counts[0] === 3) return 0.7;

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) return 0.6;

  // One pair
  if (counts[0] === 2) {
    const pairRank = Array.from(rankCounts.entries())
      .find(([_, count]) => count === 2)?.[0];
    const pairValue = pairRank ? RANK_VALUES[pairRank] : 0;

    if (pairValue >= 11) return 0.55;  // High pair
    if (pairValue >= 8) return 0.5;    // Medium pair
    return 0.45;                        // Low pair
  }

  // High card
  const highCard = Math.max(...allCards.map(c => RANK_VALUES[c.rank]));
  if (highCard === 14) return 0.4;   // Ace high
  if (highCard >= 12) return 0.35;   // King/Queen high
  return 0.3;                         // Lower
}
