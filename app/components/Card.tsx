"use client";

import SvgCard from "@heruka_urgyen/react-playing-cards/lib/TcN";

interface CardProps {
  card: string; // "As", "Kh", etc.
  hidden?: boolean;
  size?: "small" | "medium" | "large";
  animate?: boolean;
}

export default function Card({ card, hidden = false, size = "medium", animate = false }: CardProps) {
  // Size mapping: convert size names to pixel heights for SVG cards
  const heights = {
    small: "64px",
    medium: "96px",
    large: "112px",
  };

  const widths = {
    small: "48px",
    medium: "64px",
    large: "80px",
  };

  // Hidden card: keep custom lobster pattern card back
  if (hidden) {
    return (
      <div
        className={animate ? "animate-card-deal" : ""}
        style={{
          width: widths[size],
          height: heights[size],
          display: "inline-block"
        }}
      >
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

  // Render SVG card with animation and hover effects
  return (
    <div
      className={`${animate ? "animate-card-deal" : ""} transition-transform hover:scale-105 inline-block`}
      style={{ lineHeight: 0 }}
    >
      <SvgCard
        card={card}
        height={heights[size]}
        style={{
          display: "block",
          borderRadius: "0.5rem",
          filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2))"
        }}
        className="hover:drop-shadow-2xl transition-all"
      />
    </div>
  );
}
