"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useRef } from "react";

interface ActionLogProps {
  handId: Id<"hands">;
}

export default function ActionLog({ handId }: ActionLogProps) {
  const actions = useQuery(api.tables.getHandActions, { handId });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest action
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  if (!actions || actions.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <span>📜</span> Hand History
        </h3>
        <div className="text-gray-500 text-sm text-center py-8">
          Waiting for players to act...
        </div>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "fold":
        return "❌";
      case "check":
        return "✓";
      case "call":
        return "📞";
      case "bet":
        return "💰";
      case "raise":
        return "⬆️";
      case "all-in":
        return "🚀";
      default:
        return "•";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "fold":
        return "text-red-400";
      case "check":
        return "text-blue-400";
      case "call":
        return "text-green-400";
      case "bet":
      case "raise":
        return "text-orange-400";
      case "all-in":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getActionBg = (action: string) => {
    switch (action) {
      case "fold":
        return "bg-red-900/20 border-red-800/30";
      case "check":
        return "bg-blue-900/20 border-blue-800/30";
      case "call":
        return "bg-green-900/20 border-green-800/30";
      case "bet":
      case "raise":
        return "bg-orange-900/20 border-orange-800/30";
      case "all-in":
        return "bg-purple-900/20 border-purple-800/30";
      default:
        return "bg-gray-800/50 border-gray-700/30";
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const getStreetLabel = (street: string) => {
    const labels: Record<string, { text: string; color: string; icon: string }> = {
      preflop: { text: "Pre-flop", color: "text-cyan-400", icon: "🎴" },
      flop: { text: "Flop", color: "text-blue-400", icon: "🃏" },
      turn: { text: "Turn", color: "text-yellow-400", icon: "🎯" },
      river: { text: "River", color: "text-red-400", icon: "🌊" },
    };
    return labels[street] || { text: street, color: "text-gray-400", icon: "•" };
  };

  // Group actions by street
  let lastStreet = "";
  const groupedActions = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.street && action.street !== lastStreet) {
      groupedActions.push({ type: "street", street: action.street });
      lastStreet = action.street;
    }
    groupedActions.push({ type: "action", data: action });
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <span>📜</span> Hand History
        <span className="ml-auto text-xs text-gray-500">
          {actions.length} {actions.length === 1 ? "action" : "actions"}
        </span>
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 max-h-96 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {groupedActions.map((item, idx) => {
          if (item.type === "street") {
            const streetInfo = getStreetLabel(item.street);
            return (
              <div
                key={`street-${idx}`}
                className="sticky top-0 z-10 bg-gray-900 py-2 border-b border-gray-700"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span>{streetInfo.icon}</span>
                  <span className={streetInfo.color}>{streetInfo.text}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                </div>
              </div>
            );
          }

          const action = item.data;
          return (
            <div
              key={`action-${idx}`}
              className={`text-sm flex items-start gap-2.5 p-2.5 rounded border ${getActionBg(action.action)} transition-all hover:scale-[1.02]`}
            >
              <span className="text-lg mt-0.5">{getActionIcon(action.action)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-bold text-white truncate">
                    {action.agentName}
                  </span>
                  <span className={`font-semibold ${getActionColor(action.action)}`}>
                    {action.action}
                  </span>
                  {action.amount && (
                    <span className="font-mono text-yellow-400 font-semibold">
                      {formatAmount(action.amount)} 🐚
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {action.potAfter && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-60">Pot:</span>
                      <span className="font-mono text-gray-300">{formatAmount(action.potAfter)} 🐚</span>
                    </span>
                  )}
                  {action.reason === "timeout" && (
                    <span className="text-yellow-400 flex items-center gap-1">
                      <span>⏱️</span> timeout
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
