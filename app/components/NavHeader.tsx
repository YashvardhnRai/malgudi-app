"use client";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase";
import { useState, useEffect } from "react";
import Link from "next/link";
import MalgudiLogo from "./MalgudiLogo";

export default function NavHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    router.push("/auth");
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: mobile ? "0 16px" : "0 48px",
        background: scrolled ? "rgba(43,47,119,0.95)" : "#2B2F77",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: `1px solid ${
          scrolled ? "rgba(240,90,40,0.15)" : "rgba(240,90,40,0.08)"
        }`,
        transition:
          "background 0.4s var(--ease-smooth), border-color 0.4s var(--ease-smooth)",
        animation: "slideInLeft 0.6s var(--ease-out-expo) both",
      }}
    >
      {/* Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => router.push("/")}
      >
        <MalgudiLogo size={36} color="#F05A28" />
        <div>
          <div
            style={{
              fontSize: 16,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "#F05A28",
              letterSpacing: 3,
              lineHeight: 1,
            }}
          >
            MALGUDI
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(240,90,40,0.5)",
              letterSpacing: 2,
              marginTop: 2,
            }}
          >
            मालगुडी
          </div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: mobile ? 12 : 24 }}>
        {/* Live IST clock — hidden on mobile */}
        {!mobile && (
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 1,
            }}
          >
            {time} IST
          </div>
        )}

        {/* Nav links — hide Photos on mobile */}
        {(["Complaints", "Photos"] as const)
          .filter((link) => !(mobile && link === "Photos"))
          .map((link) => (
            <Link
              key={link}
              href={`/${link.toLowerCase()}`}
              style={{
                fontSize: mobile ? 12 : 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none",
                letterSpacing: 0.3,
                transition: "color 0.2s var(--ease-smooth)",
                display: mobile ? "none" : undefined,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#F05A28";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.55)";
              }}
            >
              {link}
            </Link>
          ))}

        {/* Notification bell — hidden on mobile */}
        {!mobile && (
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              fontSize: 16,
              position: "relative",
              padding: 6,
              borderRadius: 8,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(240,90,40,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#F05A28";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.5)";
            }}
          >
            🔔
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 14,
                height: 14,
                background: "#F05A28",
                borderRadius: "50%",
                fontSize: 8,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse-orange 2s infinite",
              }}
            >
              1
            </span>
          </button>
        )}

        {/* Avatar — hidden on mobile */}
        {!mobile && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F05A28, #F47350)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 0 0 2px rgba(240,90,40,0.3)",
              transition: "box-shadow 0.2s var(--ease-smooth)",
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 3px rgba(240,90,40,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 2px rgba(240,90,40,0.3)";
            }}
          >
            {userName?.[0]?.toUpperCase() || "Y"}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "10px 16px",
            minHeight: 44,
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            transition: "all 0.2s var(--ease-smooth)",
            letterSpacing: 0.3,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(240,90,40,0.4)";
            e.currentTarget.style.color = "#F05A28";
            e.currentTarget.style.background = "rgba(240,90,40,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
