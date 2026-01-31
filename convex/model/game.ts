import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { createDeck, shuffleDeck, dealCards, evaluateHand, compareHands, formatHand } from "./cards";

const ACTION_TIMEOUT_MS = 30000; // 30 seconds to act

type Hand = Doc<"hands">;
type Table = Doc<"tables">;

/**
 * Start a new hand at a table
 */
export async function startHand(
  ctx: MutationCtx,
  tableId: Id<"tables">
): Promise<Id<"hands">> {
  const table = await ctx.db.get(tableId);
  if (!table) throw new Error("Table not found");

  // Get active players (not sitting out, with chips)
  const activePlayers = table.seats
    .map((seat, index) => ({ seat, index }))
    .filter((s) => s.seat !== null && !s.seat.sittingOut && s.seat.stack > 0);

  if (activePlayers.length < 2) {
    throw new Error("Need at least 2 players to start a hand");
  }

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Deal hole cards to each player
  let remainingDeck = deck;
  const players = activePlayers.map(({ seat, index }) => {
    const { cards, remaining } = dealCards(remainingDeck, 2);
    remainingDeck = remaining;
    return {
      agentId: seat!.agentId,
      seatIndex: index,
      holeCards: cards,
      stack: seat!.stack,
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
    };
  });

  // Move dealer button
  const newDealerSeat = findNextActiveSeat(table, table.dealerSeat, activePlayers.map(p => p.index));

  // Get last hand number
  const lastHand = await ctx.db
    .query("hands")
    .withIndex("by_tableId", (q) => q.eq("tableId", tableId))
    .order("desc")
    .first();
  const handNumber = (lastHand?.handNumber ?? 0) + 1;

  // Create the hand
  const handId = await ctx.db.insert("hands", {
    tableId,
    handNumber,
    status: "preflop",
    deck: remainingDeck,
    communityCards: [],
    players,
    pot: 0,
    sidePots: [],
    currentBet: 0,
    lastRaiseAmount: undefined,
    actionOn: undefined,
    lastAction: undefined,
    actionDeadline: undefined,
    startedAt: Date.now(),
    completedAt: undefined,
    winners: undefined,
  });

  // Update table with new dealer seat FIRST
  await ctx.db.patch(tableId, {
    status: "playing",
    currentHandId: handId,
    dealerSeat: newDealerSeat,
  });

  // Fetch updated table to get correct dealer seat
  const updatedTable = await ctx.db.get(tableId);
  if (!updatedTable) throw new Error("Table not found after update");

  // Post blinds with updated table
  await postBlinds(ctx, handId, updatedTable, players);

  return handId;
}

/**
 * Post small and big blinds
 */
async function postBlinds(
  ctx: MutationCtx,
  handId: Id<"hands">,
  table: Table,
  players: Hand["players"]
): Promise<void> {
  const hand = await ctx.db.get(handId);
  if (!hand) throw new Error("Hand not found");

  const activeSeats = players.map((p) => p.seatIndex);
  const isHeadsUp = players.length === 2;

  let sbSeatIndex: number;
  let bbSeatIndex: number;
  let firstToActSeat: number;

  if (isHeadsUp) {
    // Heads-up: dealer (button) is small blind
    sbSeatIndex = table.dealerSeat;
    // Other player is big blind
    bbSeatIndex = findNextActiveSeat(table, sbSeatIndex, activeSeats);
    // Small blind acts first preflop in heads-up
    firstToActSeat = sbSeatIndex;
  } else {
    // 3+ players: standard blind posting
    // Small blind is left of dealer
    sbSeatIndex = findNextActiveSeat(table, table.dealerSeat, activeSeats);
    // Big blind is left of small blind
    bbSeatIndex = findNextActiveSeat(table, sbSeatIndex, activeSeats);
    // Action starts left of big blind
    firstToActSeat = findNextActiveSeat(table, bbSeatIndex, activeSeats);
  }

  const updatedPlayers = [...hand.players];
  let pot = 0;

  // Post small blind
  const sbPlayerIndex = updatedPlayers.findIndex((p) => p.seatIndex === sbSeatIndex);
  if (sbPlayerIndex !== -1) {
    const sbAmount = Math.min(table.smallBlind, updatedPlayers[sbPlayerIndex].stack);
    updatedPlayers[sbPlayerIndex] = {
      ...updatedPlayers[sbPlayerIndex],
      currentBet: sbAmount,
      totalBet: sbAmount,
      stack: updatedPlayers[sbPlayerIndex].stack - sbAmount,
      allIn: updatedPlayers[sbPlayerIndex].stack - sbAmount === 0,
    };
    pot += sbAmount;
  }

  // Post big blind
  const bbPlayerIndex = updatedPlayers.findIndex((p) => p.seatIndex === bbSeatIndex);
  let actualBB = table.bigBlind;
  if (bbPlayerIndex !== -1) {
    const bbAmount = Math.min(table.bigBlind, updatedPlayers[bbPlayerIndex].stack);
    actualBB = bbAmount; // Track actual BB posted (may be short if all-in)
    updatedPlayers[bbPlayerIndex] = {
      ...updatedPlayers[bbPlayerIndex],
      currentBet: bbAmount,
      totalBet: bbAmount,
      stack: updatedPlayers[bbPlayerIndex].stack - bbAmount,
      allIn: updatedPlayers[bbPlayerIndex].stack - bbAmount === 0,
    };
    pot += bbAmount;
  }

  const firstToActIndex = updatedPlayers.findIndex((p) => p.seatIndex === firstToActSeat);

  await ctx.db.patch(handId, {
    players: updatedPlayers,
    pot,
    currentBet: actualBB, // Use actual BB posted, not table BB
    lastRaiseAmount: actualBB, // Initial raise based on actual BB posted
    actionOn: firstToActIndex,
    actionDeadline: Date.now() + ACTION_TIMEOUT_MS,
  });
}

function findNextActiveSeat(table: Table, currentSeat: number, activeSeats: number[]): number {
  const sortedSeats = activeSeats.sort((a, b) => a - b);
  for (const seat of sortedSeats) {
    if (seat > currentSeat) return seat;
  }
  return sortedSeats[0]; // Wrap around
}

/**
 * Process a player action
 */
export async function processAction(
  ctx: MutationCtx,
  handId: Id<"hands">,
  agentId: Id<"agents">,
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in",
  amount?: number,
  reason?: "player" | "timeout" | "auto"
): Promise<void> {
  const hand = await ctx.db.get(handId);
  if (!hand) throw new Error("Hand not found");
  if (hand.status === "complete" || hand.status === "showdown") {
    throw new Error("Hand is complete");
  }

  // Check timeout with 1 second grace period for network latency
  if (hand.actionDeadline && Date.now() > hand.actionDeadline + 1000) {
    throw new Error("Action deadline expired");
  }

  const playerIndex = hand.players.findIndex((p) => p.agentId === agentId);
  if (playerIndex === -1) throw new Error("Player not in hand");
  if (hand.actionOn !== playerIndex) throw new Error("Not your turn");

  const player = hand.players[playerIndex];
  if (player.folded) throw new Error("Player has folded");

  const table = await ctx.db.get(hand.tableId);
  if (!table) throw new Error("Table not found");

  const updatedPlayers = [...hand.players];
  let newPot = hand.pot;
  let newCurrentBet = hand.currentBet;
  let newLastRaiseAmount = hand.lastRaiseAmount;

  // Validate and process action
  switch (action) {
    case "fold":
      updatedPlayers[playerIndex] = { ...player, folded: true };
      break;

    case "check":
      if (player.currentBet < hand.currentBet) {
        throw new Error("Cannot check - must call or raise");
      }
      break;

    case "call": {
      const callAmount = Math.min(hand.currentBet - player.currentBet, player.stack);
      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: player.currentBet + callAmount,
        totalBet: player.totalBet + callAmount,
        stack: player.stack - callAmount,
        allIn: player.stack - callAmount === 0,
      };
      newPot += callAmount;
      break;
    }

    case "bet":
    case "raise": {
      if (amount === undefined || amount <= 0) {
        throw new Error("Bet/raise amount required");
      }

      // Minimum raise is currentBet + lastRaiseAmount
      const lastRaise = hand.lastRaiseAmount ?? table.bigBlind;
      const minRaise = hand.currentBet + lastRaise;

      if (amount < minRaise && amount < player.stack + player.currentBet) {
        throw new Error(`Minimum raise is ${minRaise}`);
      }

      const totalBetAmount = Math.min(amount, player.stack + player.currentBet);
      const additionalAmount = totalBetAmount - player.currentBet;
      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: totalBetAmount,
        totalBet: player.totalBet + additionalAmount,
        stack: player.stack - additionalAmount,
        allIn: player.stack - additionalAmount === 0,
      };
      newPot += additionalAmount;

      // Update raise tracking
      const raiseAmount = totalBetAmount - hand.currentBet;
      newCurrentBet = totalBetAmount;
      newLastRaiseAmount = raiseAmount;
      break;
    }

    case "all-in": {
      const allInAmount = player.stack;
      const newBet = player.currentBet + allInAmount;
      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: newBet,
        totalBet: player.totalBet + allInAmount,
        stack: 0,
        allIn: true,
      };
      newPot += allInAmount;
      if (newBet > newCurrentBet) {
        const raiseAmount = newBet - newCurrentBet;
        newCurrentBet = newBet;
        newLastRaiseAmount = raiseAmount;
      }
      break;
    }
  }

  // Log the action with reason
  await ctx.db.insert("actions", {
    handId,
    agentId,
    action,
    amount,
    timestamp: Date.now(),
    reason: reason ?? "player",
  });

  // Find next player to act
  const { nextPlayerIndex, roundComplete } = findNextToAct(
    updatedPlayers,
    playerIndex,
    newCurrentBet
  );

  // Check if only one player remains
  const activePlayers = updatedPlayers.filter((p) => !p.folded);
  if (activePlayers.length === 1) {
    // Award pot to winner
    await awardPot(ctx, handId, hand.tableId, updatedPlayers, newPot);
    return;
  }

  if (roundComplete) {
    // Move to next street
    await advanceStreet(ctx, handId, hand, updatedPlayers, newPot);
  } else {
    // Continue betting round
    await ctx.db.patch(handId, {
      players: updatedPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      lastRaiseAmount: newLastRaiseAmount,
      actionOn: nextPlayerIndex,
      actionDeadline: Date.now() + ACTION_TIMEOUT_MS,
      lastAction: {
        agentId,
        action,
        amount,
        timestamp: Date.now(),
      },
    });
  }
}

function findNextToAct(
  players: Hand["players"],
  currentIndex: number,
  currentBet: number
): { nextPlayerIndex: number | undefined; roundComplete: boolean } {
  const activePlayers = players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => !p.folded && !p.allIn);

  if (activePlayers.length === 0) {
    return { nextPlayerIndex: undefined, roundComplete: true };
  }

  // Find next player who hasn't matched the bet
  for (let i = 1; i <= players.length; i++) {
    const nextIndex = (currentIndex + i) % players.length;
    const player = players[nextIndex];
    if (!player.folded && !player.allIn && player.currentBet < currentBet) {
      return { nextPlayerIndex: nextIndex, roundComplete: false };
    }
  }

  // Check if betting round is complete (everyone has acted and matched)
  const playersToCheck = players.filter((p) => !p.folded && !p.allIn);
  const allMatched = playersToCheck.every((p) => p.currentBet === currentBet);
  
  if (allMatched) {
    return { nextPlayerIndex: undefined, roundComplete: true };
  }

  // Find next active player
  for (let i = 1; i <= players.length; i++) {
    const nextIndex = (currentIndex + i) % players.length;
    const player = players[nextIndex];
    if (!player.folded && !player.allIn) {
      return { nextPlayerIndex: nextIndex, roundComplete: false };
    }
  }

  return { nextPlayerIndex: undefined, roundComplete: true };
}

async function advanceStreet(
  ctx: MutationCtx,
  handId: Id<"hands">,
  hand: Hand,
  players: Hand["players"],
  pot: number
): Promise<void> {
  // Reset current bets for new street
  const resetPlayers = players.map((p) => ({ ...p, currentBet: 0 }));

  // Deal community cards
  let { deck, communityCards, status: currentStatus } = hand;
  let newStatus: Hand["status"];
  let cardsToAdd: string[];

  switch (currentStatus) {
    case "preflop":
      ({ cards: cardsToAdd, remaining: deck } = dealCards(deck, 3)); // Flop
      newStatus = "flop";
      break;
    case "flop":
      ({ cards: cardsToAdd, remaining: deck } = dealCards(deck, 1)); // Turn
      newStatus = "turn";
      break;
    case "turn":
      ({ cards: cardsToAdd, remaining: deck } = dealCards(deck, 1)); // River
      newStatus = "river";
      break;
    case "river":
      // Go to showdown
      await showdown(ctx, handId, hand.tableId, resetPlayers, pot, [...communityCards]);
      return;
    default:
      return;
  }

  communityCards = [...communityCards, ...cardsToAdd];

  // Find first active player after dealer to act
  const table = await ctx.db.get(hand.tableId);
  if (!table) throw new Error("Table not found");

  const activeSeats = resetPlayers
    .filter((p) => !p.folded && !p.allIn)
    .map((p) => p.seatIndex);

  // Check if all remaining players are all-in
  if (activeSeats.length === 0) {
    // Run out the board
    let finalDeck = deck;
    let finalCommunity = communityCards;
    
    while (finalCommunity.length < 5) {
      const { cards, remaining } = dealCards(finalDeck, 1);
      finalCommunity = [...finalCommunity, ...cards];
      finalDeck = remaining;
    }
    
    await showdown(ctx, handId, hand.tableId, resetPlayers, pot, finalCommunity);
    return;
  }

  const firstSeat = findNextActiveSeat(table, table.dealerSeat, activeSeats);
  const firstPlayerIndex = resetPlayers.findIndex((p) => p.seatIndex === firstSeat);

  await ctx.db.patch(handId, {
    status: newStatus,
    deck,
    communityCards,
    players: resetPlayers,
    pot,
    currentBet: 0,
    lastRaiseAmount: undefined, // Reset for new street
    actionOn: firstPlayerIndex,
    actionDeadline: Date.now() + ACTION_TIMEOUT_MS,
  });
}

/**
 * Calculate side pots using threshold-based algorithm
 * Returns array of side pots with eligible players for each
 */
function calculateSidePots(players: Hand["players"]): {
  amount: number;
  eligiblePlayers: Id<"agents">[];
}[] {
  const activePlayers = players.filter((p) => !p.folded);
  if (activePlayers.length === 0) return [];

  // Sort players by total bet amount (lowest to highest)
  const sortedByBet = [...activePlayers].sort((a, b) => a.totalBet - b.totalBet);

  const sidePots: { amount: number; eligiblePlayers: Id<"agents">[] }[] = [];
  let previousThreshold = 0;

  for (let i = 0; i < sortedByBet.length; i++) {
    const threshold = sortedByBet[i].totalBet;

    // Skip if this player bet the same as previous (already included in that pot)
    if (threshold === previousThreshold) continue;

    // Players who bet at least this threshold can compete for this pot
    const eligiblePlayers = activePlayers
      .filter((p) => p.totalBet >= threshold)
      .map((p) => p.agentId);

    // Calculate pot amount: (threshold - previousThreshold) * number of eligible players
    const potAmount = (threshold - previousThreshold) * eligiblePlayers.length;

    if (potAmount > 0) {
      sidePots.push({
        amount: potAmount,
        eligiblePlayers,
      });
    }

    previousThreshold = threshold;
  }

  return sidePots;
}

async function showdown(
  ctx: MutationCtx,
  handId: Id<"hands">,
  tableId: Id<"tables">,
  players: Hand["players"],
  pot: number,
  communityCards: string[]
): Promise<void> {
  const activePlayers = players.filter((p) => !p.folded);

  // Evaluate each player's hand
  const evaluated = activePlayers.map((p) => {
    const allCards = [...p.holeCards, ...communityCards];
    const handRank = evaluateHand(allCards);
    return { player: p, handRank };
  });

  // Sort by hand strength (best first)
  evaluated.sort((a, b) => compareHands(b.handRank, a.handRank));

  // Calculate side pots
  const sidePots = calculateSidePots(players);

  // Award each side pot to the best hand among eligible players
  const totalWinnings = new Map<Id<"agents">, number>();
  const winningHands = new Map<Id<"agents">, string>();

  for (const sidePot of sidePots) {
    // Find eligible winners for this pot
    const eligibleEvaluated = evaluated.filter((e) =>
      sidePot.eligiblePlayers.includes(e.player.agentId)
    );

    if (eligibleEvaluated.length === 0) continue;

    // Find best hand among eligible players
    const bestHand = eligibleEvaluated[0].handRank;
    const tiedWinners = eligibleEvaluated.filter(
      (e) => compareHands(e.handRank, bestHand) === 0
    );

    // Split pot among tied winners
    const winAmount = Math.floor(sidePot.amount / tiedWinners.length);
    for (const { player, handRank } of tiedWinners) {
      const currentWinnings = totalWinnings.get(player.agentId) || 0;
      totalWinnings.set(player.agentId, currentWinnings + winAmount);

      if (!winningHands.has(player.agentId)) {
        winningHands.set(
          player.agentId,
          `${handRank.name} (${formatHand(player.holeCards)})`
        );
      }
    }
  }

  // Convert to winners array with enriched data
  const winners: { agentId: Id<"agents">; agentName?: string; seatIndex?: number; amount: number; hand?: string }[] = [];
  for (const [agentId, amount] of totalWinnings.entries()) {
    const player = players.find(p => p.agentId === agentId);
    const agent = await ctx.db.get(agentId);
    winners.push({
      agentId,
      agentName: agent?.name ?? "Unknown",
      seatIndex: player?.seatIndex ?? 0,
      amount,
      hand: winningHands.get(agentId) || "Unknown",
    });
  }

  await ctx.db.patch(handId, {
    status: "complete",
    communityCards,
    sidePots,
    winners,
    completedAt: Date.now(),
    actionOn: undefined,
    actionDeadline: undefined,
  });

  // Update table and player stacks
  await awardWinnings(ctx, tableId, winners, players);
}

async function awardPot(
  ctx: MutationCtx,
  handId: Id<"hands">,
  tableId: Id<"tables">,
  players: Hand["players"],
  pot: number
): Promise<void> {
  const winner = players.find((p) => !p.folded)!;

  // Calculate side pots in case winner was all-in
  const sidePots = calculateSidePots(players);

  // Winner takes all pots they're eligible for
  let totalWinnings = 0;
  for (const sidePot of sidePots) {
    if (sidePot.eligiblePlayers.includes(winner.agentId)) {
      totalWinnings += sidePot.amount;
    }
  }

  // If no side pots calculated, give entire pot
  if (totalWinnings === 0) {
    totalWinnings = pot;
  }

  const agent = await ctx.db.get(winner.agentId);
  const winners: { agentId: Id<"agents">; agentName?: string; seatIndex?: number; amount: number; hand?: string }[] = [{
    agentId: winner.agentId,
    agentName: agent?.name ?? "Unknown",
    seatIndex: winner.seatIndex,
    amount: totalWinnings,
    hand: "Others folded"
  }];

  await ctx.db.patch(handId, {
    status: "complete",
    sidePots,
    winners,
    completedAt: Date.now(),
    actionOn: undefined,
    actionDeadline: undefined,
  });

  await awardWinnings(ctx, tableId, winners, players);
}

async function awardWinnings(
  ctx: MutationCtx,
  tableId: Id<"tables">,
  winners: { agentId: Id<"agents">; amount: number }[],
  players: Hand["players"]
): Promise<void> {
  const table = await ctx.db.get(tableId);
  if (!table) return;

  const updatedSeats = [...table.seats];

  // Update stacks at table
  for (const player of players) {
    const seatIndex = player.seatIndex;
    const seat = updatedSeats[seatIndex];
    if (seat) {
      const winning = winners.find((w) => w.agentId === player.agentId);
      const finalStack = player.stack + (winning?.amount ?? 0);
      updatedSeats[seatIndex] = { ...seat, stack: finalStack };
    }
  }

  // Update agent stats
  for (const player of players) {
    const agent = await ctx.db.get(player.agentId);
    if (agent) {
      const winning = winners.find((w) => w.agentId === player.agentId);
      const won = (winning?.amount ?? 0) > player.totalBet;
      await ctx.db.patch(player.agentId, {
        handsPlayed: agent.handsPlayed + 1,
        handsWon: agent.handsWon + (won ? 1 : 0),
        totalWinnings: agent.totalWinnings + (winning?.amount ?? 0),
        totalLosses: agent.totalLosses + player.totalBet,
      });
    }
  }

  await ctx.db.patch(tableId, {
    seats: updatedSeats,
    status: "between_hands",
    currentHandId: undefined,
    lastHandCompletedAt: Date.now(),
  });
}

/**
 * Get the current game state for a player (hides opponent hole cards)
 */
export function getPlayerView(
  hand: Hand,
  agentId: Id<"agents">,
  table: Table
): object {
  const playerIndex = hand.players.findIndex((p) => p.agentId === agentId);
  const player = hand.players[playerIndex];

  // Only show opponent hole cards if hand went to showdown (not if ended by folds)
  const wentToShowdown = hand.status === "complete" && hand.communityCards.length >= 3;

  return {
    handId: hand._id,
    status: hand.status,
    pot: hand.pot,
    communityCards: hand.communityCards,
    currentBet: hand.currentBet,
    yourTurn: hand.actionOn === playerIndex,
    actionDeadline: hand.actionDeadline,
    yourCards: player?.holeCards ?? [],
    yourStack: player?.stack ?? 0,
    yourCurrentBet: player?.currentBet ?? 0,
    players: hand.players.map((p, i) => ({
      seatIndex: p.seatIndex,
      stack: p.stack,
      currentBet: p.currentBet,
      folded: p.folded,
      allIn: p.allIn,
      isYou: i === playerIndex,
      // Show own cards always, opponent cards only at showdown
      holeCards:
        i === playerIndex || wentToShowdown
          ? p.holeCards
          : undefined,
    })),
    validActions: getValidActions(hand, playerIndex, table.bigBlind),
    lastAction: hand.lastAction,
    winners: hand.winners,
  };
}

function getValidActions(
  hand: Hand,
  playerIndex: number,
  bigBlind?: number
): { action: string; minAmount?: number; maxAmount?: number }[] {
  if (hand.actionOn !== playerIndex) return [];

  const player = hand.players[playerIndex];
  if (!player || player.folded || player.allIn) return [];

  const actions: { action: string; minAmount?: number; maxAmount?: number }[] = [];

  // Can always fold
  actions.push({ action: "fold" });

  // Check if can check
  if (player.currentBet >= hand.currentBet) {
    actions.push({ action: "check" });
  } else {
    // Must call or raise
    const callAmount = hand.currentBet - player.currentBet;
    if (callAmount <= player.stack) {
      actions.push({ action: "call" });
    }
  }

  // Can bet/raise if have chips
  if (player.stack > 0) {
    const lastRaise = hand.lastRaiseAmount ?? bigBlind ?? 1;
    const minRaise = hand.currentBet + lastRaise;
    const minBet = bigBlind ?? 1; // Use BB as minimum bet for no-limit

    if (hand.currentBet === 0) {
      // First bet on this street
      actions.push({ action: "bet", minAmount: minBet, maxAmount: player.stack });
    } else if (player.stack + player.currentBet > hand.currentBet) {
      // Can raise
      actions.push({
        action: "raise",
        minAmount: minRaise,
        maxAmount: player.stack + player.currentBet,
      });
    }
    actions.push({ action: "all-in" });
  }

  return actions;
}
