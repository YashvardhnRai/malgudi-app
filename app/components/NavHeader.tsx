"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
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

function cleanOperationalMessage(message: string) {
  return message.replace(/\s*\[slot:[^\]]+\]\[date:[^\]]+\]\s*$/, "");
}

export default function NavHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">(() =>
      typeof window !== "undefined" && "Notification" in window
        ? window.Notification.permission
        : "unsupported"
    );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenNotificationIds = useRef<Set<string> | null>(null);

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
    const showSystemNotification = async (notification: Notification) => {
      if (!("Notification" in window) || window.Notification.permission !== "granted") return;
      const registration = await navigator.serviceWorker?.ready.catch(() => null);
      if (registration) {
        await registration.showNotification(notification.title, {
          body: notification.message.replace(/\s*\[slot:[^\]]+\]\[date:[^\]]+\]\s*$/, ""),
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: notification.id,
          data: {
            url: notification.outlet_id
              ? `/outlet/${notification.outlet_id}`
              : "/dashboard",
          },
        });
      }
    };

    const fetchNotifs = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data: Notification[]) => {
          if (!Array.isArray(data)) return;
          if (seenNotificationIds.current) {
            const fresh = data.filter(
              (notification) =>
                !notification.is_read &&
                !seenNotificationIds.current?.has(notification.id)
            );
            fresh.slice(0, 3).forEach((notification) => {
              void showSystemNotification(notification);
            });
          }
          seenNotificationIds.current = new Set(data.map((item) => item.id));
          setNotifications(data);
        })
        .catch(() => {});
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const enableBrowserAlerts = async () => {
    if (!("Notification" in window)) return;
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
  };

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

              {notificationPermission === "default" && (
                <button
                  type="button"
                  className="premium-enable-alerts"
                  onClick={enableBrowserAlerts}
                >
                  <BellRing size={15} />
                  Enable phone alerts
                </button>
              )}

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
                      <p>{cleanOperationalMessage(notification.message)}</p>
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
