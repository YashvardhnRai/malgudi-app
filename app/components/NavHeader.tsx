"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Clock3,
  Images,
  LogOut,
  MessageSquareWarning,
  PhoneCall,
  QrCode,
  UserRound,
  X,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
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
  const [time, setTime] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setUserEmail(data.user.email);
    })();
  }, []);

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
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/auth");
  };

  return (
    <nav className="premium-nav">
      <button
        type="button"
        className="premium-brand"
        onClick={() => router.push("/dashboard")}
        aria-label="Open dashboard"
      >
        <MalgudiLogo size={38} />
        <span>
          <strong>MALGUDI</strong>
          <small>Operations</small>
        </span>
      </button>

      <div className="premium-nav-center">
        <Link href="/launch">
          <QrCode size={15} />
          Launch
        </Link>
        <Link href="/complaints">
          <MessageSquareWarning size={15} />
          Complaints
        </Link>
        <Link href="/upload">
          <Images size={15} />
          Photos
        </Link>
        <span>
          <Clock3 size={15} />
          {time} IST
        </span>
      </div>

      <div className="premium-nav-actions">
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="premium-icon-button"
            onClick={handleBellClick}
            aria-label="Open notifications"
            aria-expanded={showDropdown}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="premium-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="premium-dropdown">
              <div className="premium-dropdown-head">
                <div>
                  <strong>Notifications</strong>
                  <span>{notifications.length || "No"} recent updates</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="premium-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="premium-empty-notifications">
                    <BellOff size={24} />
                    <strong>No notifications yet</strong>
                    <span>Operational alerts will appear here.</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`premium-notification ${
                        notification.is_read ? "" : "is-unread"
                      }`}
                    >
                      <div>
                        <strong>{notification.title}</strong>
                        <small>{timeAgo(notification.created_at)}</small>
                      </div>
                      <p>{notification.message}</p>
                      {notification.type === "PHOTO_MISSED" &&
                        notification.manager_phone && (
                          <a href={`tel:${notification.manager_phone}`}>
                            <PhoneCall size={13} />
                            Call manager
                          </a>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="premium-user-chip">
          <span>
            <UserRound size={16} />
          </span>
          <strong>{userName?.[0]?.toUpperCase() || "M"}</strong>
        </div>

        <button
          type="button"
          className="premium-logout"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  );
}
