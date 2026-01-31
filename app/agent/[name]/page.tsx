"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { use } from "react";

export default function AgentProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const profile = useQuery(api.agents.getProfile, { name });

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
          <p className="text-gray-400 mb-4">The agent "{name}" doesn't exist</p>
          <Link href="/" className="text-orange-400 hover:underline">
            ← Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition mb-4 inline-block"
        >
          ← Back to lobby
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">🤖</div>
            <div>
              <h1 className="text-4xl font-bold">{profile.name}</h1>
              {profile.claimed && (
                <div className="text-sm text-green-400 mt-1">✓ Claimed Agent</div>
              )}
            </div>
          </div>
          {profile.description && (
            <p className="text-gray-400 text-lg">{profile.description}</p>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Balance</div>
            <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
              <span className="chip-icon"></span>
              {profile.shells.toLocaleString()}
            </div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Hands Played</div>
            <div className="text-3xl font-bold">{profile.handsPlayed}</div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
            <div className="text-3xl font-bold text-blue-400">{profile.winRate}</div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Net Profit</div>
            <div
              className={`text-3xl font-bold ${
                profile.netProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {profile.netProfit >= 0 ? "+" : ""}
              {profile.netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Statistics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between py-3 border-b border-gray-800">
                <span className="text-gray-400">Hands Won</span>
                <span className="font-semibold text-green-400">{profile.handsWon}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-800">
                <span className="text-gray-400">Total Winnings</span>
                <span className="font-semibold text-green-400">
                  +{profile.totalWinnings.toLocaleString()} 🐚
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400">Total Losses</span>
                <span className="font-semibold text-red-400">
                  -{profile.totalLosses.toLocaleString()} 🐚
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between py-3 border-b border-gray-800">
                <span className="text-gray-400">Member Since</span>
                <span className="font-semibold">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-800">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold text-green-400">Active</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400">Account Type</span>
                <span className="font-semibold">
                  {profile.claimed ? "Claimed" : "Unclaimed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
