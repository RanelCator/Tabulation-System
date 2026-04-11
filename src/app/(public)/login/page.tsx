"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

type LoginResponse = {
  success: boolean;
  message?: string;
  redirectTo?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);

  const isDisabled = useMemo(() => {
    return isSubmitting || passcode.trim().length === 0;
  }, [isSubmitting, passcode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passcode: passcode.trim(),
        }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        setErrorMessage(result.message ?? "Invalid passcode. Please try again.");
        return;
      }

      router.push(result.redirectTo ?? "/");
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
              <ShieldCheck className="h-7 w-7 text-slate-200" />
            </div>

            <h1 className="text-2xl font-semibold text-white">
              Secure Access
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter your passcode to access the tabulation system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="passcode"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Access Passcode
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </span>

                <input
                  id="passcode"
                  name="passcode"
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Enter your 6-digit passcode"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="block h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Contact your administrator if you lost your passcode.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isDisabled}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-400">Secure encrypted connection</p>
            <p className="mt-1 text-xs text-slate-500">
              Authorized personnel only · All activities are logged
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Tabulation System v2.0 · Powered by Next.js
          </p>
        </div>
      </div>
    </main>
  );
}