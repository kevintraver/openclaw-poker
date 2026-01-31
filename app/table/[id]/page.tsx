"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { use, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../../components/Card";
import ActionButtons from "../../components/ActionButtons";
import LoginDialog from "../../components/LoginDialog";

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tableId = id as Id<"tables">;
  const { isAuthenticated, agentId, agentData, isLoading: authLoading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Use getMyHand if authenticated, otherwise use getState (observer mode)
  const myHand = useQuery(
    api.tables.getMyHand,
    isAuthenticated && agentId ? { tableId, agentId } : "skip"
  );
  const tableState = useQuery(api.tables.getState, { tableId });
  const submitAction = useMutation(api.tables.action);

  const handleAction = async (action: string, amount?: number) => {
    if (!agentId) return;
    try {
      await submitAction({
        tableId,
        agentId,
        action: action as any,
        amount,
      });
    } catch (error: any) {
      console.error("Action failed:", error);
      alert(error.message || "Action failed");
    }
  };

  if (authLoading || tableState === undefined) {
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
      <LoginDialog isOpen={showLoginDialog} onClose={() => setShowLoginDialog(false)} />

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
          <div className="flex items-center gap-4">
            {isAuthenticated && agentData ? (
              <div className="text-right">
                <div className="text-sm text-gray-400">Logged in as</div>
                <div className="font-semibold">{agentData.name}</div>
                <div className="text-sm text-yellow-400">{agentData.shells} 🐚</div>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginDialog(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded transition"
              >
                Login to Play
              </button>
            )}
            <div className="text-right">
              <div className="text-sm text-gray-400">Players</div>
              <div className="text-2xl font-mono">
                {seats.filter((s) => s !== null).length}/{seats.length}
              </div>
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
                    <Card key={i} card={card} size="medium" />
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

        {/* Player's Cards and Actions */}
        {isAuthenticated && myHand && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {/* Your Cards */}
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
              <div className="text-sm text-gray-400 mb-3">Your Cards</div>
              <div className="flex gap-2">
                {myHand.yourCards && myHand.yourCards.length > 0 ? (
                  myHand.yourCards.map((card: string, i: number) => (
                    <Card key={i} card={card} size="large" />
                  ))
                ) : (
                  <div className="text-gray-500">No cards yet</div>
                )}
              </div>
              <div className="mt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Stack:</span>
                  <span className="text-yellow-400 font-semibold">{myHand.yourStack} 🐚</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Bet:</span>
                  <span className="text-white">{myHand.yourCurrentBet} 🐚</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {myHand.validActions && myHand.validActions.length > 0 && (
              <ActionButtons
                validActions={myHand.validActions as any}
                yourTurn={myHand.yourTurn}
                onAction={handleAction}
              />
            )}
          </div>
        )}

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
                  Last action: <span className="text-white">{JSON.stringify(currentHand.lastAction)}</span>
                </div>
              )}
            </div>
            {currentHand.winners && currentHand.winners.length > 0 && (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
                <div className="text-green-400 font-semibold">
                  🏆 Winner{currentHand.winners.length > 1 ? "s" : ""}:{" "}
                  {currentHand.winners.map((w: any) => w.agentName || "Unknown").join(", ")}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {currentHand.winners.map((w: any, idx: number) => (
                    <div key={idx}>
                      {w.agentName || "Unknown"}: {w.amount} 🐚 ({w.hand || "N/A"})
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
