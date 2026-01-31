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
import ActionLog from "../../components/ActionLog";
import HandHistory from "../../components/HandHistory";
import TableControls from "../../components/TableControls";
import PlayerStatsCard from "../../components/PlayerStatsCard";

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tableId = id as Id<"tables">;
  const { isAuthenticated, agentId, agentData, isLoading: authLoading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [hoveredPlayer, setHoveredPlayer] = useState<Id<"agents"> | null>(null);

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
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Logged in as</div>
                  <div className="font-semibold">{agentData.name}</div>
                  <div className="text-sm text-yellow-400">{agentData.shells} 🐚</div>
                </div>
                <Link
                  href="/dashboard"
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded transition text-sm"
                >
                  Dashboard
                </Link>
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

      {/* Three-Column Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Player Stats & Controls */}
        <div className="lg:col-span-3 space-y-4">
          {isAuthenticated && agentData && (
            <>
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Your Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hands Played:</span>
                    <span className="text-white font-semibold">{agentData.handsPlayed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hands Won:</span>
                    <span className="text-green-400 font-semibold">{agentData.handsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-blue-400 font-semibold">
                      {agentData.handsPlayed > 0
                        ? ((agentData.handsWon / agentData.handsPlayed) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Controls (if seated at table) */}
              {myHand && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Table Controls</h3>
                  <TableControls
                    tableId={tableId}
                    agentId={agentData._id}
                    currentStack={myHand.yourStack}
                    maxBuyIn={tableState?.blinds ? tableState.blinds.big * 100 : 1000}
                    agentShells={agentData.shells}
                    isSittingOut={false}
                    tableStatus={tableState?.status || "waiting"}
                  />
                </div>
              )}
            </>
          )}

          {/* Hand History */}
          <HandHistory tableId={tableId} />
        </div>

        {/* Center - Poker Table */}
        <div className="lg:col-span-6">
          <div className="felt p-8 aspect-[16/10] relative">
            {/* Pot */}
            {currentHand && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                <div className="pot-display">
                  <div className="text-xs text-blue-300 mb-1 font-semibold uppercase tracking-wide">Pot</div>
                  <div className="text-4xl font-bold text-yellow-400 flex items-center gap-2">
                    <span className="chip-icon"></span>
                    {currentHand.pot}
                  </div>
                </div>
                {/* Community Cards */}
                {currentHand.communityCards && currentHand.communityCards.length > 0 && (
                  <div className="flex gap-3 mt-6 justify-center">
                    {currentHand.communityCards.map((card, i) => (
                      <Card key={i} card={card} size="medium" animate={true} />
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

              const isActive = currentHand?.actionOn === currentHand?.players.findIndex(
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
                  <div
                    className={`player-seat bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] cursor-pointer relative ${
                      isActive
                        ? "border-green-500 animate-glow"
                        : handPlayer?.folded
                        ? "border-gray-800 opacity-60"
                        : "border-gray-700"
                    }`}
                    onMouseEnter={() => setHoveredPlayer(seat.agentId)}
                    onMouseLeave={() => setHoveredPlayer(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm truncate">{seat.name}</div>
                      {dealerSeat === index && (
                        <div className="dealer-button animate-dealer-rotate">
                          D
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                      <span className="chip-icon scale-75"></span>
                      <span>{handPlayer?.stack ?? seat.stack}</span>
                    </div>
                    {handPlayer && (
                      <>
                        {handPlayer.currentBet > 0 && !handPlayer.folded && (
                          <div className="text-xs text-yellow-400 flex items-center gap-1">
                            <span>Bet:</span>
                            <span className="font-semibold">{handPlayer.currentBet}</span>
                          </div>
                        )}
                        {handPlayer.folded && (
                          <div className="text-xs text-red-400 font-semibold">❌ Folded</div>
                        )}
                        {handPlayer.allIn && !handPlayer.folded && (
                          <div className="text-xs text-purple-400 font-bold animate-pulse">
                            🚀 ALL IN!
                          </div>
                        )}
                        {isActive && (
                          <div className="text-xs text-green-400 animate-pulse-slow font-semibold">
                            ⏰ Thinking...
                          </div>
                        )}
                      </>
                    )}

                    {/* Hover Stats Card */}
                    {hoveredPlayer === seat.agentId && (
                      <div className="absolute left-full ml-2 top-0 z-50">
                        <PlayerStatsCard agentId={seat.agentId} compact />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Player's Cards and Actions */}
          {isAuthenticated && myHand && (
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {/* Your Cards */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="text-sm text-gray-400 mb-3 font-semibold">Your Cards</div>
                <div className="flex gap-3 justify-center">
                  {myHand.yourCards && myHand.yourCards.length > 0 ? (
                    myHand.yourCards.map((card: string, i: number) => (
                      <Card key={i} card={card} size="large" animate={true} />
                    ))
                  ) : (
                    <div className="text-gray-500">Waiting for cards...</div>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Stack:</span>
                    <span className="text-yellow-400 font-semibold flex items-center gap-1">
                      <span className="chip-icon scale-75"></span>
                      {myHand.yourStack}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Bet:</span>
                    <span className="text-white font-semibold">{myHand.yourCurrentBet} 🐚</span>
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
        </div>

        {/* Right Sidebar - Action Log */}
        <div className="lg:col-span-3">
          {currentHand && <ActionLog handId={currentHand.handId} />}
        </div>
      </div>

      {/* Hand Status - Full Width Below */}
      <div className="max-w-7xl mx-auto mt-6">
        {currentHand && (
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Hand #{currentHand.handNumber}</div>
                <div className="text-2xl font-bold capitalize flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    currentHand.status === "complete" ? "bg-gray-500" :
                    currentHand.status === "showdown" ? "bg-yellow-500 animate-pulse" :
                    "bg-green-500 animate-pulse"
                  }`}></span>
                  {currentHand.status}
                </div>
              </div>
              {currentHand.lastAction && (
                <div className="text-sm">
                  <span className="text-gray-400">Last action:</span>
                  <div className="text-white font-semibold mt-1">
                    {typeof currentHand.lastAction === 'object'
                      ? `${(currentHand.lastAction as any).action}${(currentHand.lastAction as any).amount ? ` ${(currentHand.lastAction as any).amount} 🐚` : ''}`
                      : currentHand.lastAction}
                  </div>
                </div>
              )}
            </div>
            {currentHand.winners && currentHand.winners.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-600 rounded-lg">
                <div className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2">
                  🏆 Winner{currentHand.winners.length > 1 ? "s" : ""}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {currentHand.winners.map((w: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded">
                      <div>
                        <div className="font-semibold text-white">{w.agentName || "Unknown"}</div>
                        <div className="text-sm text-gray-400">{w.hand || "N/A"}</div>
                      </div>
                      <div className="text-yellow-400 font-bold text-xl flex items-center gap-1">
                        <span className="chip-icon"></span>
                        {w.amount}
                      </div>
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
