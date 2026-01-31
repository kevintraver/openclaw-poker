"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

interface JoinTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: Id<"tables">;
  tableName: string;
  minBuyIn: number;
  maxBuyIn: number;
  seats: (any | null)[];
  agentId: Id<"agents"> | null;
  agentShells: number;
}

export default function JoinTableDialog({
  isOpen,
  onClose,
  tableId,
  tableName,
  minBuyIn,
  maxBuyIn,
  seats,
  agentId,
  agentShells,
}: JoinTableDialogProps) {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [buyInAmount, setBuyInAmount] = useState(minBuyIn);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const join = useMutation(api.tables.join);
  const router = useRouter();

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!agentId) {
      setError("You must be logged in to join");
      return;
    }

    if (selectedSeat === null) {
      setError("Please select a seat");
      return;
    }

    if (buyInAmount < minBuyIn || buyInAmount > maxBuyIn) {
      setError(`Buy-in must be between ${minBuyIn} and ${maxBuyIn}`);
      return;
    }

    if (buyInAmount > agentShells) {
      setError("Insufficient shells");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      await join({
        tableId,
        agentId,
        buyIn: buyInAmount,
        seatIndex: selectedSeat,
      });
      onClose();
      router.push(`/table/${tableId}`);
    } catch (err: any) {
      setError(err.message || "Failed to join table");
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Join {tableName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Seat Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-400 mb-3">
            Select a Seat
          </label>
          <div className="grid grid-cols-3 gap-3">
            {seats.map((seat, index) => (
              <button
                key={index}
                onClick={() => seat === null && setSelectedSeat(index)}
                disabled={seat !== null}
                className={`p-4 rounded border-2 transition ${
                  seat === null
                    ? selectedSeat === index
                      ? "border-orange-500 bg-orange-900/20"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    : "border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="font-semibold text-sm">Seat {index + 1}</div>
                {seat === null ? (
                  <div className="text-xs text-green-400 mt-1">Available</div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">
                    Occupied by {seat.name}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Buy-in Amount */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-400 mb-2">
            Buy-in Amount
          </label>
          <input
            type="number"
            value={buyInAmount}
            onChange={(e) => setBuyInAmount(Number(e.target.value))}
            min={minBuyIn}
            max={Math.min(maxBuyIn, agentShells)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
          />
          <div className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>Min: {minBuyIn} 🐚</span>
            <span>Max: {maxBuyIn} 🐚</span>
            <span>Available: {agentShells} 🐚</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setBuyInAmount(minBuyIn)}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition"
            >
              Min
            </button>
            <button
              onClick={() => setBuyInAmount(Math.floor((minBuyIn + maxBuyIn) / 2))}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition"
            >
              Half
            </button>
            <button
              onClick={() => setBuyInAmount(Math.min(maxBuyIn, agentShells))}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition"
            >
              Max
            </button>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={isJoining || selectedSeat === null}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition"
        >
          {isJoining ? "Joining..." : "Join Table"}
        </button>
      </div>
    </div>
  );
}
