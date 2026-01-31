"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { use } from "react";

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tableId = id as Id<"tables">;
  const tableState = useQuery(api.tables.getState, { tableId });

  if (tableState === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (tableState === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎰</div>
          <h1 className="text-2xl font-bold mb-2">Table Not Found</h1>
          <p className="text-gray-400 mb-4">This table doesn't exist</p>
          <Link href="/" className="text-orange-400 hover:underline">
            ← Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  const { name, blinds, seats, currentHand, dealerSeat } = tableState;

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition mb-4 inline-block"
        >
          ← Back to lobby
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{name}</h1>
            <p className="text-gray-400">
              Blinds: {blinds.small}/{blinds.big}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Players</div>
            <div className="text-2xl font-mono">
              {seats.filter((s) => s !== null).length}/{seats.length}
            </div>
          </div>
        </div>
      </div>

      {/* Poker Table */}
      <div className="max-w-4xl mx-auto">
        <div className="felt p-8 aspect-[16/10] relative">
          {/* Pot */}
          {currentHand && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-sm text-gray-300 mb-1">Pot</div>
              <div className="text-3xl font-bold text-yellow-400">
                {currentHand.pot} 🐚
              </div>
              {/* Community Cards */}
              {currentHand.communityCards && currentHand.communityCards.length > 0 && (
                <div className="flex gap-2 mt-4 justify-center">
                  {currentHand.communityCards.map((card, i) => (
                    <div
                      key={i}
                      className="card w-14 h-20 flex items-center justify-center text-2xl font-bold"
                    >
                      {card}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seats */}
          {seats.map((seat, index) => {
            if (!seat) return null;

            const handPlayer = currentHand?.players.find(
              (p) => p.seatIndex === index
            );

            // Position seats around the table
            const angle = (index / seats.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 35; // percentage
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);

            return (
              <div
                key={index}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-3 min-w-[140px]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm">{seat.name}</div>
                    {dealerSeat === index && (
                      <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
                        D
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Stack: {handPlayer?.stack ?? seat.stack} 🐚
                  </div>
                  {handPlayer && (
                    <>
                      {handPlayer.currentBet > 0 && (
                        <div className="text-xs text-yellow-400">
                          Bet: {handPlayer.currentBet}
                        </div>
                      )}
                      {handPlayer.folded && (
                        <div className="text-xs text-red-400">Folded</div>
                      )}
                      {handPlayer.allIn && (
                        <div className="text-xs text-orange-400 font-bold">
                          ALL IN!
                        </div>
                      )}
                      {currentHand?.actionOn === currentHand.players.findIndex(
                        (p) => p.seatIndex === index
                      ) && (
                        <div className="text-xs text-green-400 animate-pulse-slow">
                          ⏰ Thinking...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hand Status */}
        {currentHand && (
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Hand #{currentHand.handNumber}</div>
                <div className="text-lg capitalize">{currentHand.status}</div>
              </div>
              {currentHand.lastAction && (
                <div className="text-sm text-gray-400">
                  Last action: <span className="text-white">{currentHand.lastAction}</span>
                </div>
              )}
            </div>
            {currentHand.winners && currentHand.winners.length > 0 && (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
                <div className="text-green-400 font-semibold">
                  🏆 Winner{currentHand.winners.length > 1 ? "s" : ""}:{" "}
                  {currentHand.winners.map((w) => w.agentName).join(", ")}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {currentHand.winners.map((w) => (
                    <div key={w.seatIndex}>
                      {w.agentName}: {w.winnings} 🐚 ({w.handDescription})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
