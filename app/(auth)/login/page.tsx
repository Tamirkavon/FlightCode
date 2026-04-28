"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--bob-cream)" }}
    >
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-12"
        style={{ background: "var(--bob-charcoal)" }}
      >
        <HiBobLogo size="lg" light />

        <div>
          <p
            className="text-4xl font-bold leading-tight mb-4"
            style={{ fontFamily: "var(--font-serif)", color: "#fff" }}
          >
            Commission management,{" "}
            <span style={{ color: "var(--bob-pink)" }}>simplified.</span>
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem" }}>
            Track quota attainment, calculate commissions, and run approvals —
            all in one place.
          </p>
        </div>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
          © {new Date().getFullYear()} hibob · BobComm
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <HiBobLogo size="md" />
          </div>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--bob-charcoal)", fontFamily: "var(--font-serif)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--bob-gray)" }}>
            Sign in to BobComm
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--bob-charcoal)" }}
              >
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hibob.com"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid var(--bob-border)",
                  background: "#fff",
                  color: "var(--bob-charcoal)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--bob-pink)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--bob-border)")
                }
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--bob-charcoal)" }}
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid var(--bob-border)",
                  background: "#fff",
                  color: "var(--bob-charcoal)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--bob-pink)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--bob-border)")
                }
              />
            </div>

            {error && (
              <div
                className="text-sm px-3.5 py-2.5 rounded-lg"
                style={{
                  background: "var(--bob-pink-light)",
                  color: "var(--bob-burgundy)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{
                background: loading ? "var(--bob-pink-hover)" : "var(--bob-pink)",
              }}
              onMouseEnter={(e) =>
                !loading &&
                (e.currentTarget.style.background = "var(--bob-pink-hover)")
              }
              onMouseLeave={(e) =>
                !loading &&
                (e.currentTarget.style.background = "var(--bob-pink)")
              }
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function HiBobLogo({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const sizes = {
    sm: { bubble: "text-sm px-1.5 py-0.5 rounded-md", bob: "text-lg", gap: "gap-1" },
    md: { bubble: "text-base px-2 py-1 rounded-lg", bob: "text-2xl", gap: "gap-1" },
    lg: { bubble: "text-lg px-2.5 py-1.5 rounded-xl", bob: "text-3xl", gap: "gap-1.5" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap} font-bold`}>
      <span
        className={`${s.bubble} text-white font-bold leading-none`}
        style={{ background: "var(--bob-pink)" }}
      >
        Hi
      </span>
      <span
        className={`${s.bob} leading-none`}
        style={{ color: light ? "#fff" : "var(--bob-charcoal)" }}
      >
        Bob
      </span>
    </div>
  );
}
