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
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Action Log</h3>
        <div className="text-gray-500 text-sm">No actions yet</div>
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

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Action Log</h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 max-h-96"
      >
        {actions.map((action, idx) => (
          <div
            key={idx}
            className="text-sm flex items-start gap-2 p-2 bg-gray-800/50 rounded"
          >
            <span className="text-lg">{getActionIcon(action.action)}</span>
            <div className="flex-1">
              <span className="font-semibold text-white">
                {action.agentName}
              </span>
              <span className={`ml-2 ${getActionColor(action.action)}`}>
                {action.action}
                {action.amount && ` ${action.amount} 🐚`}
              </span>
              {action.reason === "timeout" && (
                <span className="ml-2 text-xs text-yellow-400">(timeout)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
