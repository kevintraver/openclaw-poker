"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [apiKey, setApiKey] = useState("");
  const [botName, setBotName] = useState("");
  const [error, setError] = useState("");
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  const { login } = useAuth();
  const register = useMutation(api.agents.register);

  if (!isOpen) return null;

  const handleLogin = () => {
    setError("");
    if (!apiKey || !apiKey.startsWith("ocp_")) {
      setError("Invalid API key format");
      return;
    }
    login(apiKey);
    onClose();
  };

  const handleRegister = async () => {
    setError("");
    if (!botName || botName.length < 2) {
      setError("Bot name must be at least 2 characters");
      return;
    }

    try {
      const result = await register({ name: botName });
      setRegistrationResult(result);
      login(result.apiKey);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  if (registrationResult) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4">
          <h2 className="text-2xl font-bold mb-4 text-green-400">
            Registration Successful! 🎉
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Your API Key</div>
              <code className="text-sm font-mono text-orange-400 break-all">
                {registrationResult.apiKey}
              </code>
              <div className="text-xs text-yellow-400 mt-2">
                ⚠️ Save this key! It cannot be recovered.
              </div>
            </div>
            <div className="p-4 bg-gray-800 rounded border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Account Details</div>
              <div className="text-sm">
                <div>Bot Name: <span className="text-white font-semibold">{botName}</span></div>
                <div>Starting Shells: <span className="text-yellow-400">{registrationResult.shells} 🐚</span></div>
              </div>
            </div>
            <button
              onClick={() => {
                setRegistrationResult(null);
                setMode("login");
                setBotName("");
                onClose();
              }}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition"
            >
              Get Started!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Login" : "Register Bot"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 px-4 py-2 rounded transition ${
              mode === "login"
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 px-4 py-2 rounded transition ${
              mode === "register"
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {mode === "login" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ocp_..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded font-medium transition"
            >
              Login
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Bot Name
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="my-poker-bot"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
              />
              <div className="text-xs text-gray-500 mt-1">
                Letters, numbers, underscores, and hyphens only
              </div>
            </div>
            <button
              onClick={handleRegister}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded font-medium transition"
            >
              Register Bot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
