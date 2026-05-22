"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MalgudiLogo from "./components/MalgudiLogo";

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      fontFamily: "var(--font-body)",
      background: "#0F1240",
      color: "#fff",
      overflowX: "hidden",
      width: "100%",
      maxWidth: "100vw",
    }}>

      {/* NAV */}
      <nav
        className="landing-nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrollY > 20 ? "rgba(15,18,64,0.95)" : "transparent",
          backdropFilter: scrollY > 20 ? "blur(20px)" : "none",
          borderBottom: scrollY > 20 ? "1px solid rgba(240,90,40,0.15)" : "none",
          transition: "all 0.4s ease",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <MalgudiLogo size={32} color="#F05A28" />
          <div>
            <div style={{
              fontSize: 15,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "#F05A28",
              letterSpacing: 3,
            }}>
              MALGUDI
            </div>
            <div style={{ fontSize: 8, color: "rgba(240,90,40,0.5)", letterSpacing: 2 }}>
              मालगुडी
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Nav links — hidden on mobile */}
          <div className="desktop-only" style={{ alignItems: "center", gap: 32 }}>
            {["Features", "How it works", "Contact"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F05A28"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Login button — always visible */}
          <button
            onClick={() => router.push("/auth")}
            style={{
              background: "#F05A28",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 22px",
              minHeight: 44,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "all 0.2s",
              boxShadow: "0 0 20px rgba(240,90,40,0.3)",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(240,90,40,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(240,90,40,0.3)";
            }}
          >
            Login →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="landing-hero"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center" as const,
          position: "relative",
          background: "linear-gradient(180deg, #0F1240 0%, #1E2260 50%, #2B2F77 100%)",
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Animated background orbs */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(240,90,40,0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(240,90,40,0.08) 0%, transparent 50%)
          `,
          animation: "gradient-shift 8s ease infinite",
          backgroundSize: "200% 200%",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(240,90,40,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,90,40,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />

        {/* Live badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 20px",
          background: "rgba(240,90,40,0.1)",
          border: "1px solid rgba(240,90,40,0.3)",
          borderRadius: 100,
          fontSize: 12,
          fontWeight: 600,
          color: "#F05A28",
          marginBottom: 32,
          letterSpacing: 0.5,
          animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both",
          position: "relative",
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22C55E",
            animation: "pulse-orange 2s infinite",
          }} />
          Now live at Malgudi by Shankar Mahadevan
        </div>

        {/* Logo */}
        <div style={{
          marginBottom: 24,
          animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both",
          filter: "drop-shadow(0 0 40px rgba(240,90,40,0.4))",
          position: "relative",
        }}>
          <MalgudiLogo size={100} color="#F05A28" />
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(40px, 7vw, 80px)",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: -2,
          marginBottom: 24,
          animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both",
          maxWidth: 900,
          position: "relative",
        }}>
          Every outlet.{" "}
          <span style={{ color: "#F05A28" }}>One screen.</span>
          <br />
          Zero guesswork.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: "clamp(16px, 2vw, 20px)",
          color: "rgba(255,255,255,0.55)",
          maxWidth: 560,
          lineHeight: 1.7,
          marginBottom: 48,
          animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both",
          position: "relative",
        }}>
          Replace WhatsApp chaos with structured photo audits, live outlet
          monitoring, and instant complaint alerts — built for Malgudi&apos;s
          13 outlets.
        </p>

        {/* CTA buttons */}
        <div style={{
          display: "flex",
          gap: 12,
          animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s both",
          position: "relative",
        }}>
          <button
            onClick={() => router.push("/auth")}
            style={{
              background: "#F05A28",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 36px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              boxShadow: "0 0 40px rgba(240,90,40,0.4)",
              transition: "all 0.3s ease",
              letterSpacing: 0.3,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 48px rgba(240,90,40,0.6)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 0 40px rgba(240,90,40,0.4)";
            }}
          >
            Open Dashboard →
          </button>
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "16px 36px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(240,90,40,0.4)";
              e.currentTarget.style.color = "#F05A28";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.color = "rgba(255,255,255,0.8)";
            }}
          >
            See how it works
          </button>
        </div>

        {/* Stats bar */}
        <div
          className="landing-stats-bar"
          style={{
            marginTop: 80,
            paddingTop: 48,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s both",
            position: "relative",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { value: "13", label: "Outlets monitored" },
            { value: "3",  label: "Cities covered" },
            { value: "10x", label: "Faster than WhatsApp" },
            { value: "24/7", label: "Live monitoring" },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" as const }}>
              <div style={{
                fontSize: 32,
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                color: "#F05A28",
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-section" style={{ background: "#F5F4F0" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 64 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#F05A28",
            textTransform: "uppercase" as const,
            marginBottom: 16,
          }}>
            Features
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            color: "#2B2F77",
            letterSpacing: -1,
            marginBottom: 16,
          }}>
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </h2>
          <p style={{
            fontSize: 16,
            color: "#6B7280",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.7,
          }}>
            Built specifically for multi-outlet restaurant chains that want real
            accountability.
          </p>
        </div>

        {/* Bento grid */}
        <div
          className="bento-grid"
          style={{ gridTemplateRows: "auto auto" }}
        >
          {/* Big card — CEO Dashboard */}
          <div className="bento-big-left" style={{
            gridColumn: "1 / 3",
            background: "#2B2F77",
            borderRadius: 24,
            padding: "48px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(240,90,40,0.1)",
            }} />
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
            <h3 style={{
              fontSize: 28,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              marginBottom: 12,
              letterSpacing: -0.5,
            }}>
              CEO Dashboard
            </h3>
            <p style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.7,
              maxWidth: 400,
            }}>
              See all 13 outlets in one glance. Green means good. Red means
              call now. No more morning phone rounds.
            </p>
          </div>

          {/* Photo Audits */}
          <div style={{
            background: "#F05A28",
            borderRadius: 24,
            padding: "40px",
            color: "#fff",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📸</div>
            <h3 style={{
              fontSize: 22,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              marginBottom: 8,
            }}>
              Photo Audits
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              Every 2 hours. No photo = task incomplete. AI flags problems
              instantly.
            </p>
          </div>

          {/* Instant Alerts */}
          <div style={{
            background: "#fff",
            borderRadius: 24,
            padding: "40px",
            border: "1px solid #E8E7E3",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div>
            <h3 style={{
              fontSize: 22,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "#2B2F77",
              marginBottom: 8,
            }}>
              Instant Alerts
            </h3>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
              Missed banmarie update? You know in 30 minutes, not 3 hours.
            </p>
          </div>

          {/* One-tap Calls */}
          <div style={{
            background: "#fff",
            borderRadius: 24,
            padding: "40px",
            border: "1px solid #E8E7E3",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📞</div>
            <h3 style={{
              fontSize: 22,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "#2B2F77",
              marginBottom: 8,
            }}>
              One-tap Calls
            </h3>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
              See a complaint? Call the outlet manager directly from the app.
            </p>
          </div>

          {/* Sales & Compliance — big */}
          <div className="bento-big-right" style={{
            gridColumn: "2 / 4",
            background: "linear-gradient(135deg, #1E2260, #2B2F77)",
            borderRadius: 24,
            padding: "48px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              right: 40,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 80,
              opacity: 0.1,
              fontFamily: "var(--font-display)",
              fontWeight: 900,
            }}>
              M
            </div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
            <h3 style={{
              fontSize: 28,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              marginBottom: 12,
            }}>
              Sales &amp; Compliance
            </h3>
            <p style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.7,
              maxWidth: 400,
            }}>
              Daily sales per outlet, compliance rates, photo counts —
              everything in one place. No spreadsheets needed.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="landing-section" style={{ background: "#2B2F77" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 64 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#F05A28",
            textTransform: "uppercase" as const,
            marginBottom: 16,
          }}>
            How it works
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: -1,
          }}>
            Simple for everyone.
          </h2>
        </div>

        <div className="how-it-works-grid">
          {/* CEO flow */}
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#F05A28",
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              marginBottom: 24,
            }}>
              For the CEO
            </div>
            {[
              { step: "01", title: "Open app",    desc: "See all outlets — green, amber or red" },
              { step: "02", title: "Spot issues",  desc: "Red outlet = tap to see what's wrong" },
              { step: "03", title: "Act instantly", desc: "Call manager directly from the complaint" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 20, marginBottom: 28, alignItems: "flex-start" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "#F05A28",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                  fontFamily: "var(--font-display)",
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 4,
                    fontFamily: "var(--font-display)",
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Manager flow */}
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              marginBottom: 24,
            }}>
              For the Manager
            </div>
            {[
              { step: "01", title: "See today's tasks", desc: "8AM opening, 10AM banmarie, and more" },
              { step: "02", title: "Upload photos",     desc: "Take photo → submit → task complete" },
              { step: "03", title: "Log complaints",    desc: "Customer unhappy? Log it immediately" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 20, marginBottom: 28, alignItems: "flex-start" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.6)",
                  flexShrink: 0,
                  fontFamily: "var(--font-display)",
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 4,
                    fontFamily: "var(--font-display)",
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="landing-section"
        style={{
          background: "#0F1240",
          textAlign: "center" as const,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(240,90,40,0.1) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "relative",
          marginBottom: 24,
          filter: "drop-shadow(0 0 60px rgba(240,90,40,0.5))",
        }}>
          <MalgudiLogo size={80} color="#F05A28" />
        </div>
        <h2 style={{
          fontSize: "clamp(36px, 5vw, 64px)",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          marginBottom: 20,
          letterSpacing: -1.5,
          position: "relative",
        }}>
          Ready to see every outlet
          <br />
          <span style={{ color: "#F05A28" }}>in one screen?</span>
        </h2>
        <p style={{
          fontSize: 16,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 48,
          position: "relative",
        }}>
          Built for Malgudi by Shankar Mahadevan.
          <br />
          The future of restaurant operations.
        </p>
        <button
          onClick={() => router.push("/auth")}
          style={{
            background: "#F05A28",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "18px 48px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            boxShadow: "0 0 60px rgba(240,90,40,0.4)",
            transition: "all 0.3s ease",
            position: "relative",
            letterSpacing: 0.5,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 12px 60px rgba(240,90,40,0.6)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 0 60px rgba(240,90,40,0.4)";
          }}
        >
          Open Dashboard →
        </button>
      </section>

      {/* FOOTER */}
      <footer
        className="landing-footer"
        style={{
          background: "#0A0D33",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(240,90,40,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MalgudiLogo size={24} color="#F05A28" />
          <span style={{
            fontSize: 13,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            color: "#F05A28",
            letterSpacing: 2,
          }}>
            MALGUDI
          </span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          Built for Malgudi by Shankar Mahadevan · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
