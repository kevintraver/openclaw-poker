"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isAuthenticated, agentData } = useAuth();
  const router = useRouter();

  const stats = useQuery(
    api.agents.getPlayerStats,
    agentData?._id ? { agentId: agentData._id } : "skip"
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !agentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading statistics...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition mb-4 inline-block"
          >
            ← Back to lobby
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{stats.name}'s Dashboard</h1>
              <p className="text-gray-400">
                Rank #{stats.rank} of {stats.totalAgents} players
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Balance</div>
              <div className="text-4xl font-bold text-yellow-400 flex items-center justify-end gap-2">
                <span className="chip-icon scale-150"></span>
                {stats.shells.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Hands Played</div>
            <div className="text-3xl font-bold text-white">{stats.handsPlayed}</div>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Hands Won</div>
            <div className="text-3xl font-bold text-green-400">{stats.handsWon}</div>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
            <div className="text-3xl font-bold text-blue-400">{stats.winRate}%</div>
          </div>
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Net Profit</div>
            <div
              className={`text-3xl font-bold ${
                stats.netProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.netProfit >= 0 ? "+" : ""}
              {stats.netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* All-Time Performance */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-bold mb-4">All-Time Performance</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Total Winnings</span>
                <span className="text-green-400 font-semibold">
                  +{stats.totalWinnings.toLocaleString()} 🐚
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Total Losses</span>
                <span className="text-red-400 font-semibold">
                  -{stats.totalLosses.toLocaleString()} 🐚
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Net Profit/Loss</span>
                <span
                  className={`font-semibold ${
                    stats.netProfit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {stats.netProfit >= 0 ? "+" : ""}
                  {stats.netProfit.toLocaleString()} 🐚
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Average Profit per Hand</span>
                <span
                  className={`font-semibold ${
                    stats.handsPlayed > 0 && stats.netProfit / stats.handsPlayed >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {stats.handsPlayed > 0
                    ? (stats.netProfit / stats.handsPlayed).toFixed(1)
                    : "0.0"}{" "}
                  🐚
                </span>
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Recent Performance (Last 20 Hands)</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Hands Played</span>
                <span className="text-white font-semibold">{stats.recentHandsCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Hands Won</span>
                <span className="text-green-400 font-semibold">{stats.recentWins}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-blue-400 font-semibold">{stats.recentWinRate}%</span>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded">
                <div className="text-sm text-gray-400 mb-1">Trend</div>
                <div className="text-lg font-semibold">
                  {parseFloat(stats.recentWinRate) > parseFloat(stats.winRate) ? (
                    <span className="text-green-400">⬆ Above Average</span>
                  ) : parseFloat(stats.recentWinRate) < parseFloat(stats.winRate) ? (
                    <span className="text-red-400">⬇ Below Average</span>
                  ) : (
                    <span className="text-gray-400">= On Average</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Hands History */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Recent Hands</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Hand #
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Result
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">
                    Pot
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">
                    Your Win
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentHands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No hands played yet
                    </td>
                  </tr>
                ) : (
                  stats.recentHands.map((hand, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition"
                    >
                      <td className="py-3 px-4 text-sm font-mono">#{hand.handNumber}</td>
                      <td className="py-3 px-4 text-sm">
                        {hand.won ? (
                          <span className="text-green-400 font-semibold">✓ Won</span>
                        ) : (
                          <span className="text-gray-500">Lost</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-yellow-400">
                        {hand.pot} 🐚
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {hand.won ? (
                          <span className="text-green-400 font-semibold">
                            +{hand.winAmount} 🐚
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-400">
                        {hand.completedAt
                          ? new Date(hand.completedAt).toLocaleTimeString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
              <span className="text-gray-400">Player Name</span>
              <span className="text-white font-semibold">{stats.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
              <span className="text-gray-400">Account Created</span>
              <span className="text-white font-semibold">
                {new Date(stats.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
              <span className="text-gray-400">Leaderboard Rank</span>
              <span className="text-orange-400 font-semibold">
                #{stats.rank} / {stats.totalAgents}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
              <span className="text-gray-400">Current Balance</span>
              <span className="text-yellow-400 font-semibold flex items-center gap-1">
                <span className="chip-icon scale-75"></span>
                {stats.shells.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
