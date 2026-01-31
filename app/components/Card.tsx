"use client";

interface CardProps {
  card: string; // "As", "Kh", etc.
  hidden?: boolean;
  size?: "small" | "medium" | "large";
  animate?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-gray-800",
  h: "text-red-600",
  d: "text-red-600",
  c: "text-gray-800",
};

export default function Card({ card, hidden = false, size = "medium", animate = false }: CardProps) {
  const sizeClasses = {
    small: "w-12 h-16 text-sm",
    medium: "w-16 h-24 text-xl",
    large: "w-20 h-28 text-2xl",
  };

  if (hidden) {
    return (
      <div className={`${sizeClasses[size]} ${animate ? "animate-card-deal" : ""}`}>
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 border-2 border-purple-500 shadow-xl flex items-center justify-center relative overflow-hidden">
          {/* Card back pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-3 grid-rows-4 h-full w-full">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex items-center justify-center text-white text-xs">
                  🦞
                </div>
              ))}
            </div>
          </div>
          <div className="text-white opacity-70 text-2xl z-10">🦞</div>
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
  const colorClass = SUIT_COLORS[suit] || "text-gray-800";

  const rankSizeClass = {
    small: "text-lg",
    medium: "text-2xl",
    large: "text-3xl",
  };

  const suitSizeClass = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-4xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${animate ? "animate-card-deal" : ""} transition-transform hover:scale-105`}
    >
      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-xl hover:shadow-2xl transition-shadow relative">
        {/* Top-left rank and suit */}
        <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${colorClass}`}>
          <div className={`font-bold ${rankSizeClass[size]}`}>{rank}</div>
          <div className={suitSizeClass[size]}>{symbol}</div>
        </div>

        {/* Center suit */}
        <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
          <div className={suitSizeClass[size]} style={{ fontSize: size === "large" ? "4rem" : size === "medium" ? "3rem" : "2rem" }}>
            {symbol}
          </div>
        </div>

        {/* Bottom-right rank and suit (rotated) */}
        <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none ${colorClass} rotate-180`}>
          <div className={`font-bold ${rankSizeClass[size]}`}>{rank}</div>
          <div className={suitSizeClass[size]}>{symbol}</div>
        </div>
      </div>
    </div>
  );
}
