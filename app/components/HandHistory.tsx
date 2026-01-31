"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface HandHistoryProps {
  tableId: Id<"tables">;
}

export default function HandHistory({ tableId }: HandHistoryProps) {
  const history = useQuery(api.tables.getTableHandHistory, { tableId, limit: 10 });
  const [expanded, setExpanded] = useState(true);

  if (!history || history.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Hand History</h3>
        <div className="text-gray-500 text-sm">No completed hands yet</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">Hand History</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-white transition"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((hand, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-800/50 rounded border border-gray-700 hover:border-gray-600 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">Hand #{hand.handNumber}</div>
                <div className="text-xs text-gray-400">
                  {hand.completedAt && new Date(hand.completedAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-2">
                Pot: <span className="text-yellow-400 font-semibold">{hand.pot} 🐚</span>
              </div>

              {hand.winners && hand.winners.length > 0 && (
                <div className="space-y-1">
                  {hand.winners.map((winner: any, widx: number) => (
                    <div key={widx} className="text-xs flex items-center justify-between">
                      <span className="text-green-400">
                        🏆 {winner.agentName || "Unknown"}
                      </span>
                      <span className="text-yellow-400 font-semibold">
                        {winner.amount} 🐚
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
