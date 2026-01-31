"use client";

import { useState } from "react";

interface ValidAction {
  action: string;
  minAmount?: number;
  maxAmount?: number;
}

interface ActionButtonsProps {
  validActions: ValidAction[];
  yourTurn: boolean;
  onAction: (action: string, amount?: number) => void;
  disabled?: boolean;
}

export default function ActionButtons({
  validActions,
  yourTurn,
  onAction,
  disabled = false,
}: ActionButtonsProps) {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [showBetSlider, setShowBetSlider] = useState(false);

  if (!yourTurn || validActions.length === 0) {
    return null;
  }

  const betAction = validActions.find((a) => a.action === "bet" || a.action === "raise");

  const handleBetRaise = () => {
    if (betAction) {
      const min = betAction.minAmount || 0;
      setBetAmount(min);
      setShowBetSlider(true);
    }
  };

  const handleConfirmBet = () => {
    if (betAction) {
      onAction(betAction.action, betAmount);
      setShowBetSlider(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="mb-2 text-sm text-green-400 font-semibold animate-pulse">
        ⏰ Your Turn
      </div>

      {showBetSlider && betAction ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              {betAction.action === "bet" ? "Bet Amount" : "Raise To"}
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={betAction.minAmount || 0}
              max={betAction.maxAmount || 0}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              Min: {betAction.minAmount} · Max: {betAction.maxAmount}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirmBet}
              disabled={disabled || betAmount < (betAction.minAmount || 0) || betAmount > (betAction.maxAmount || 0)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowBetSlider(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {validActions.map((action) => {
            let label = action.action;
            let colorClass = "bg-gray-700 hover:bg-gray-600";

            if (action.action === "fold") {
              label = "Fold";
              colorClass = "bg-red-700 hover:bg-red-600";
            } else if (action.action === "check") {
              label = "Check";
              colorClass = "bg-blue-700 hover:bg-blue-600";
            } else if (action.action === "call") {
              label = "Call";
              colorClass = "bg-green-700 hover:bg-green-600";
            } else if (action.action === "bet") {
              label = "Bet";
              colorClass = "bg-orange-700 hover:bg-orange-600";
            } else if (action.action === "raise") {
              label = "Raise";
              colorClass = "bg-orange-700 hover:bg-orange-600";
            } else if (action.action === "all-in") {
              label = "All-In";
              colorClass = "bg-purple-700 hover:bg-purple-600";
            }

            if (action.action === "bet" || action.action === "raise") {
              return (
                <button
                  key={action.action}
                  onClick={handleBetRaise}
                  disabled={disabled}
                  className={`px-4 py-2 ${colorClass} disabled:bg-gray-800 disabled:cursor-not-allowed rounded font-medium transition`}
                >
                  {label}
                </button>
              );
            }

            return (
              <button
                key={action.action}
                onClick={() => onAction(action.action)}
                disabled={disabled}
                className={`px-4 py-2 ${colorClass} disabled:bg-gray-800 disabled:cursor-not-allowed rounded font-medium transition`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
