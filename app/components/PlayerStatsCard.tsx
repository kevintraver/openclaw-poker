"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface PlayerStatsCardProps {
  agentId: Id<"agents">;
  compact?: boolean;
}

export default function PlayerStatsCard({ agentId, compact = false }: PlayerStatsCardProps) {
  const stats = useQuery(api.agents.getPlayerStats, { agentId });

  if (!stats) {
    return (
      <div className="p-3 bg-gray-900 rounded border border-gray-700">
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 shadow-xl">
        <div className="font-semibold text-sm mb-2">{stats.name}</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Rank:</span>
            <span className="text-orange-400 font-semibold">#{stats.rank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate:</span>
            <span className="text-blue-400 font-semibold">{stats.winRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hands:</span>
            <span className="text-white font-semibold">{stats.handsPlayed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Profit:</span>
            <span
              className={`font-semibold ${
                stats.netProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.netProfit >= 0 ? "+" : ""}
              {stats.netProfit}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-lg">{stats.name}</div>
          <div className="text-sm text-gray-400">
            Rank #{stats.rank} of {stats.totalAgents}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Balance</div>
          <div className="text-yellow-400 font-bold flex items-center gap-1">
            <span className="chip-icon scale-75"></span>
            {stats.shells.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-gray-800/50 rounded">
          <div className="text-xs text-gray-400">Hands Played</div>
          <div className="text-lg font-semibold">{stats.handsPlayed}</div>
        </div>
        <div className="p-2 bg-gray-800/50 rounded">
          <div className="text-xs text-gray-400">Hands Won</div>
          <div className="text-lg font-semibold text-green-400">{stats.handsWon}</div>
        </div>
        <div className="p-2 bg-gray-800/50 rounded">
          <div className="text-xs text-gray-400">Win Rate</div>
          <div className="text-lg font-semibold text-blue-400">{stats.winRate}%</div>
        </div>
        <div className="p-2 bg-gray-800/50 rounded">
          <div className="text-xs text-gray-400">Net Profit</div>
          <div
            className={`text-lg font-semibold ${
              stats.netProfit >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {stats.netProfit >= 0 ? "+" : ""}
            {stats.netProfit}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-800">
        <div className="text-xs text-gray-400 mb-2">Recent Form (Last 20)</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {stats.recentWins} / {stats.recentHandsCount} wins
          </span>
          <span className="text-sm font-semibold text-blue-400">
            {stats.recentWinRate}%
          </span>
        </div>
      </div>
    </div>
  );
}
