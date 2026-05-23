"use client";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MalgudiLogo from "./MalgudiLogo";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  outlet_id: string | null;
  manager_phone: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NavHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState("");
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  // Resolve current user email
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setUserEmail(data.user.email);
    })();
  }, []);

  // Fetch notifications and poll every 30 s
  useEffect(() => {
    if (!userEmail) return;

    const fetchNotifs = () => {
      fetch(`/api/notifications?email=${encodeURIComponent(userEmail)}`)
        .then((r) => r.json())
        .then((data: Notification[]) => {
          if (Array.isArray(data)) setNotifications(data);
        })
        .catch(() => {});
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [userEmail]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const handleBellClick = () => {
    setShowDropdown((prev) => !prev);
    // Mark unread as read
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      }).then(() => {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      });
    }
  };

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
        padding: "0 clamp(16px, 4vw, 48px)",
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Live IST clock — hidden on mobile */}
        <div
          className="desktop-only"
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: 1,
          }}
        >
          {time} IST
        </div>

        {/* Nav links — hidden on mobile */}
        {(["Complaints", "Photos"] as const).map((link) => (
          <Link
            key={link}
            className="desktop-only"
            href={`/${link.toLowerCase()}`}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              letterSpacing: 0.3,
              transition: "color 0.2s var(--ease-smooth)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#F05A28";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
            }}
          >
            {link}
          </Link>
        ))}

        {/* Notification bell */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={handleBellClick}
            style={{
              background: showDropdown ? "rgba(240,90,40,0.12)" : "none",
              border: "none",
              cursor: "pointer",
              color: showDropdown ? "#F05A28" : "rgba(255,255,255,0.5)",
              fontSize: 16,
              position: "relative",
              padding: 6,
              borderRadius: 8,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              minWidth: 32,
              minHeight: 44,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(240,90,40,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#F05A28";
            }}
            onMouseLeave={(e) => {
              if (!showDropdown) {
                (e.currentTarget as HTMLElement).style.background = "none";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
              }
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  background: "#EF4444",
                  borderRadius: "50%",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  animation: "pulse-orange 2s infinite",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: mobile ? "calc(100vw - 32px)" : 340,
                maxWidth: 340,
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                zIndex: 2000,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "14px 18px",
                  background: "#2B2F77",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  🔔 Notifications
                  {notifications.length > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        background: "rgba(240,90,40,0.3)",
                        color: "#F05A28",
                        padding: "2px 8px",
                        borderRadius: 100,
                      }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowDropdown(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* List */}
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "32px 18px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom:
                          i < notifications.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                        background: n.is_read ? "#fff" : "#FFF8F5",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            flex: 1,
                          }}
                        >
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          lineHeight: 1.4,
                          marginBottom: n.type === "PHOTO_MISSED" && n.manager_phone ? 8 : 0,
                        }}
                      >
                        {n.message}
                      </div>
                      {n.type === "PHOTO_MISSED" && n.manager_phone && (
                        <a
                          href={`tel:${n.manager_phone}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 12px",
                            minHeight: 36,
                            background: "#F05A28",
                            borderRadius: 100,
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          📞 Call Manager
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
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
