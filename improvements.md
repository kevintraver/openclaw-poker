# Gameplay Review Improvements

## Findings
- Critical: Betting rounds can end early because `findNextToAct` only checks whether everyone’s `currentBet` matches and does not track who has acted. This means (a) post-flop a single check can advance the street immediately, and (b) preflop the big blind can lose its option once other players call. See `convex/model/game.ts:347` and `convex/model/game.ts:369`.
- Critical: Side pots are computed using only non-folded players, so folded chips are excluded from pot amounts. This makes winners underpaid (especially in fold-to-win scenarios where the winner can receive only their own bet back). See `convex/model/game.ts:471` and `convex/model/game.ts:595`.
- Critical: Timeout auto-actions call `processAction` after the deadline, but `processAction` rejects any expired action regardless of reason. When this happens, the timeout handler marks the hand complete without awarding pot or updating the table, which can leave tables stuck in `playing` with no payouts. See `convex/model/game.ts:203` and `convex/timeouts.ts:37`.
- High: Hole cards are revealed for any completed hand with 3+ community cards, even if it ended by folds. That leaks hidden info on flop/turn/river folds. See `convex/model/game.ts:697` and `convex/tables.ts:63`.
- Medium: Min-raise logic tracks `lastRaiseAmount` even for short all-ins, which can incorrectly allow too-small raises and reopen betting when it should not under standard no-limit rules. See `convex/model/game.ts:254` and `convex/model/game.ts:280`.
- Medium: `startHand` does not guard against tables already in `playing` status. Under retries/concurrent cron runs, it can overwrite an in-progress hand. See `convex/autoplay.ts:10` and `convex/model/game.ts:13`.
- Low: Split pots use `Math.floor`, so odd chips are silently dropped instead of being awarded by position. See `convex/model/game.ts:552`.
- Low: Schema comments say `actionOn` is a seat index, but the implementation uses a player-array index. This can confuse consumers of the API. See `convex/schema.ts:94` and `convex/model/game.ts:166`.
- Low: No automated tests cover betting-round progression, side-pot allocation, or timeout handling; these are high-risk areas for regressions.

## Questions / Assumptions
- Do you want hole cards hidden unless the hand actually goes to showdown (even if the board is dealt), or is the current reveal-on-flop behavior intentional?
- Do you want strict no-limit short-all-in rules (i.e., non-full raises do not reopen betting), or is a simplified raise model acceptable?
- Should `actionOn` be exposed to clients as a seat index or a player-array index?

## Next Steps
1. Propose concrete fixes for betting-round tracking, side-pot calculation, and timeout handling (plus minimal tests).
2. Implement the fixes directly and add a small simulation/test harness to validate core flows.
