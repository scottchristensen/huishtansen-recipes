"use client";

import { useState, useEffect } from "react";
import { isAuthenticated, authenticate } from "@/lib/recipes-store";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(pin)) {
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🍳</div>
        <h2 className="text-xl font-bold text-stone-900 mb-1">
          Huish Family Recipes
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          Enter the family PIN to access recipes
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="Family PIN"
            autoFocus
            className={`w-full px-4 py-3 text-center text-lg tracking-widest bg-amber-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              error ? "border-red-300 bg-red-50" : "border-amber-200"
            }`}
          />
          {error && (
            <p className="text-red-500 text-sm">
              Hmm, that&apos;s not it. Try again!
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
          >
            Enter Kitchen
          </button>
        </form>
      </div>
    </div>
  );
}
