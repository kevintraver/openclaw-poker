"use client";

interface CardProps {
  card: string; // "As", "Kh", etc.
  hidden?: boolean;
  size?: "small" | "medium" | "large";
}

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-black",
  h: "text-red-600",
  d: "text-red-600",
  c: "text-black",
};

export default function Card({ card, hidden = false, size = "medium" }: CardProps) {
  if (hidden) {
    return (
      <div
        className={`card-back ${
          size === "small"
            ? "w-12 h-16"
            : size === "large"
            ? "w-20 h-28"
            : "w-14 h-20"
        }`}
      >
        <div className="w-full h-full rounded bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-400 flex items-center justify-center">
          <div className="text-white opacity-50 text-xs">🦞</div>
        </div>
      </div>
    );
  }

  if (!card || card.length < 2) {
    return null;
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1).toLowerCase();
  const symbol = SUIT_SYMBOLS[suit] || suit;
  const colorClass = SUIT_COLORS[suit] || "text-black";

  return (
    <div
      className={`card bg-white rounded border-2 border-gray-300 shadow-md flex flex-col items-center justify-center font-bold ${colorClass} ${
        size === "small"
          ? "w-12 h-16 text-lg"
          : size === "large"
          ? "w-20 h-28 text-3xl"
          : "w-14 h-20 text-2xl"
      }`}
    >
      <div>{rank}</div>
      <div className="text-sm">{symbol}</div>
    </div>
  );
}
