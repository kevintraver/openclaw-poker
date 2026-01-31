"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

interface TableControlsProps {
  tableId: Id<"tables">;
  agentId: Id<"agents">;
  currentStack: number;
  maxBuyIn: number;
  agentShells: number;
  isSittingOut: boolean;
  tableStatus: string;
}

export default function TableControls({
  tableId,
  agentId,
  currentStack,
  maxBuyIn,
  agentShells,
  isSittingOut,
  tableStatus,
}: TableControlsProps) {
  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [error, setError] = useState("");

  const rebuy = useMutation(api.tables.rebuy);
  const leave = useMutation(api.tables.leave);
  const toggleSitOut = useMutation(api.tables.toggleSitOut);
  const router = useRouter();

  const maxRebuy = Math.min(maxBuyIn - currentStack, agentShells);
  const canRebuy = maxRebuy > 0 && tableStatus !== "playing";

  const handleRebuy = async () => {
    if (rebuyAmount <= 0 || rebuyAmount > maxRebuy) {
      setError(`Rebuy amount must be between 1 and ${maxRebuy}`);
      return;
    }

    setError("");
    try {
      await rebuy({ tableId, agentId, amount: rebuyAmount });
      setShowRebuyDialog(false);
      setRebuyAmount(0);
    } catch (err: any) {
      setError(err.message || "Rebuy failed");
    }
  };

  const handleLeave = async () => {
    try {
      await leave({ tableId, agentId });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Cannot leave table");
      setShowLeaveConfirm(false);
    }
  };

  const handleToggleSitOut = async () => {
    try {
      await toggleSitOut({ tableId, agentId });
    } catch (err: any) {
      setError(err.message || "Failed to toggle sit out");
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleToggleSitOut}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
            isSittingOut
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-700 hover:bg-yellow-600"
          }`}
        >
          {isSittingOut ? "Sit In" : "Sit Out"}
        </button>

        <button
          onClick={() => setShowRebuyDialog(true)}
          disabled={!canRebuy}
          className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition"
        >
          Rebuy
        </button>
      </div>

      <button
        onClick={() => setShowLeaveConfirm(true)}
        className="w-full px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-sm font-medium transition"
      >
        Leave Table
      </button>

      {/* Rebuy Dialog */}
      {showRebuyDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Rebuy Chips</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Amount to Add
              </label>
              <input
                type="number"
                value={rebuyAmount}
                onChange={(e) => setRebuyAmount(Number(e.target.value))}
                min={1}
                max={maxRebuy}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
              />
              <div className="text-xs text-gray-500 mt-2">
                Max rebuy: {maxRebuy} 🐚 (Current: {currentStack}, Max: {maxBuyIn})
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRebuy}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded font-medium transition"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowRebuyDialog(false);
                  setRebuyAmount(0);
                  setError("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Leave Table?</h3>
            <p className="text-gray-400 mb-6">
              You will cash out {currentStack} 🐚 shells and leave this table.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeave}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-medium transition"
              >
                Leave
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setError("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
