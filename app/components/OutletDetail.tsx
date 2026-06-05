"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavHeader from "./NavHeader";
import PhotoUpload from "./PhotoUpload";
import type {
  ChecklistSubmission,
  Complaint,
  DailySales,
  Outlet,
  PhotoUpload as PhotoUploadRow,
  User,
} from "@/lib/types";

interface Props {
  outlet: Outlet;
  photos: PhotoUploadRow[];
  complaints: Complaint[];
  sales: DailySales | null;
  checklists: ChecklistSubmission[];
  manager: Pick<User, "name" | "phone" | "email"> | null;
}

export default function OutletDetail({
  outlet, photos, complaints,
  sales, checklists, manager,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "photos", label: "Photos", icon: "📸" },
    { id: "checklists", label: "Checklists", icon: "✅" },
    { id: "complaints", label: "Complaints", icon: "⚠️" },
    { id: "sales", label: "Sales", icon: "💰" },
  ];

  const openComplaints = complaints.filter(c => c.status === "OPEN").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--warm-white)",
      fontFamily: "var(--font-body)",
    }}>
      <NavHeader userName="Yash" />

      {/* Header */}
      <div
        className="outlet-header-padding"
        style={{
          background: "linear-gradient(135deg, #1E2260, #2B2F77)",
          padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px) 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="btn-secondary"
          style={{
            padding: "8px 16px",
            fontSize: 13,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 8,
          }}
        >
          ← Back to Dashboard
        </button>

        {/* Outlet info */}
        <div style={{
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: mobile ? "flex-start" : "flex-end",
          gap: mobile ? 16 : 0,
          marginBottom: 32,
        }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3,
              color: "rgba(240,90,40,0.7)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              {outlet.city} · Outlet
            </div>
            <h1 style={{
              fontSize: "clamp(24px, 6vw, 40px)",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -1,
              marginBottom: 8,
            }}>
              {outlet.name}
            </h1>
            {manager && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                  Manager: {manager.name}
                </span>
                {manager.phone && (
                  <a
                    href={`tel:${manager.phone}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 14px",
                      minHeight: 44,
                      background: "#F05A28",
                      borderRadius: 100,
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    📞 {manager.phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="outlet-quick-stats" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              {
                label: "Sales",
                value: sales?.total_sales
                  ? `₹${(sales.total_sales / 1000).toFixed(0)}K`
                  : "₹0",
                color: "#F05A28",
              },
              {
                label: "Complaints",
                value: openComplaints,
                color: openComplaints > 0 ? "#EF4444" : "#22C55E",
              },
              {
                label: "Photos",
                value: photos.length,
                color: "#fff",
              },
            ].map(stat => (
              <div key={stat.label} style={{
                textAlign: "center",
                padding: "12px 20px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{
                  fontSize: 24,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: 4,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: mobile ? "12px 16px" : "12px 24px",
                minHeight: 44,
                border: "none",
                background: "none",
                color: activeTab === tab.id ? "#F05A28" : "rgba(255,255,255,0.4)",
                fontSize: 18,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                borderBottom: activeTab === tab.id
                  ? "2px solid #F05A28"
                  : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {tab.icon}<span className="tab-label"> {tab.label}</span>
              {tab.id === "complaints" && openComplaints > 0 && (
                <span style={{
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 100,
                  marginLeft: mobile ? 0 : 4,
                }}>
                  {openComplaints}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="outlet-content-padding" style={{ padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)" }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="overview-grid">
            {/* Checklist status */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 2px 12px rgba(43,47,119,0.08)",
            }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 20,
              }}>
                Today&apos;s Checklist Status
              </h3>
              {[
                { label: "Opening Checklist", time: "8:00 AM", type: "OPENING" },
                { label: "Banmarie Update", time: "10:00 AM", type: "BANMARIE" },
                { label: "Afternoon Clean", time: "3:00 PM", type: "CLEANLINESS" },
                { label: "Closing Checklist", time: "11:00 PM", type: "CLOSING" },
              ].map(item => {
                const done = checklists.some(c => c.checklist_type === item.type);
                return (
                  <div key={item.label} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Due: {item.time}
                      </div>
                    </div>
                    <div style={{
                      padding: "4px 12px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      background: done ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: done ? "#22C55E" : "#EF4444",
                    }}>
                      {done ? "✓ Done" : "✗ Pending"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent photos */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 2px 12px rgba(43,47,119,0.08)",
            }}>
              <h3 style={{
                fontSize: 16,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 20,
              }}>
                Recent Photos
              </h3>
              {photos.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}>
                  {photos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--warm-white)",
                        position: "relative",
                      }}
                    >
                      {photo.photo_url ? (
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                        }}>
                          📸
                        </div>
                      )}
                      {photo.ai_status === "FLAGGED" && (
                        <div style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "#EF4444",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}>
                          ⚠ AI FLAG
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                  No photos uploaded today
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === "photos" && (
          <div>
            <PhotoUpload
              outletId={outlet.id}
              outletName={outlet.name}
              managerName={manager?.name ?? outlet.manager_name}
              managerPhone={manager?.phone ?? outlet.manager_phone}
            />
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, marginTop: 24 }}>
              {photos.length} photos uploaded today
            </div>
            {photos.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12,
              }}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      overflow: "hidden",
                      border: photo.ai_status === "FLAGGED"
                        ? "2px solid #EF4444"
                        : "1px solid var(--border)",
                      boxShadow: "0 2px 8px rgba(43,47,119,0.06)",
                    }}
                  >
                    <div style={{
                      aspectRatio: "1",
                      background: "var(--warm-white)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 40,
                      position: "relative",
                    }}>
                      {photo.photo_url ? (
                        <img
                          src={photo.photo_url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : "📸"}
                    </div>
                    <div style={{ padding: "12px" }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: photo.ai_status === "FLAGGED" ? "#EF4444" : "#22C55E",
                        marginBottom: 4,
                      }}>
                        {photo.ai_status === "FLAGGED" ? "⚠ AI Flagged" : "✓ Approved"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {photo.category}
                      </div>
                      {photo.ai_notes && (
                        <div style={{
                          fontSize: 11,
                          color: "#EF4444",
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}>
                          {photo.ai_notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "80px 0",
                color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No photos today</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Manager hasn&apos;t uploaded yet</div>
              </div>
            )}
          </div>
        )}

        {/* COMPLAINTS TAB */}
        {activeTab === "complaints" && (
          <div>
            {complaints.length > 0 ? (
              complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "24px",
                    borderLeft: `4px solid ${
                      complaint.severity === "HIGH"
                        ? "#EF4444"
                        : complaint.severity === "MEDIUM"
                        ? "#F59E0B"
                        : "#9CA3AF"
                    }`,
                    marginBottom: 12,
                    boxShadow: "0 2px 12px rgba(43,47,119,0.06)",
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}>
                    <div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 100,
                        background: complaint.severity === "HIGH"
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(245,158,11,0.1)",
                        color: complaint.severity === "HIGH" ? "#EF4444" : "#F59E0B",
                        letterSpacing: 1,
                      }}>
                        {complaint.severity}
                      </span>
                      <span style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginLeft: 10,
                      }}>
                        via {complaint.source}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 100,
                      background: complaint.status === "OPEN"
                        ? "rgba(239,68,68,0.1)"
                        : "rgba(34,197,94,0.1)",
                      color: complaint.status === "OPEN" ? "#EF4444" : "#22C55E",
                      fontWeight: 700,
                    }}>
                      {complaint.status}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 15,
                    color: "var(--text-primary)",
                    fontStyle: "italic",
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}>
                    &ldquo;{complaint.complaint_text}&rdquo;
                  </div>
                  {manager && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--warm-white)",
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        👤 {manager.name}
                      </div>
                      <a
                        href={`tel:${manager.phone}`}
                        className="btn-primary"
                        style={{
                          padding: "10px 18px",
                          minHeight: 44,
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        📞 Call Manager
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{
                textAlign: "center",
                padding: "80px 0",
                color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#22C55E" }}>
                  No complaints today!
                </div>
              </div>
            )}
          </div>
        )}

        {/* SALES TAB */}
        {activeTab === "sales" && (
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px",
            maxWidth: 600,
            boxShadow: "0 2px 12px rgba(43,47,119,0.08)",
          }}>
            <h3 style={{
              fontSize: 20,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "var(--navy)",
              marginBottom: 24,
            }}>
              Today&apos;s Sales
            </h3>
            {sales ? (
              <div>
                <div style={{
                  fontSize: 48,
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  color: "#F05A28",
                  marginBottom: 8,
                }}>
                  ₹{sales.total_sales?.toLocaleString("en-IN")}
                </div>
                <div style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 32,
                }}>
                  {sales.covers_count} covers today
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}>
                  {[
                    { label: "Dine-in", value: sales.dine_in_orders, icon: "🍽️" },
                    { label: "Swiggy", value: sales.swiggy_orders, icon: "🛵" },
                    { label: "Zomato", value: sales.zomato_orders, icon: "🔴" },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: "var(--warm-white)",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--navy)",
                        fontFamily: "var(--font-display)",
                      }}>
                        {item.value || 0}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {item.label} orders
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--text-muted)",
              }}>
                No sales data for today yet
              </div>
            )}
          </div>
        )}

        {/* CHECKLISTS TAB */}
        {activeTab === "checklists" && (
          <div>
            {checklists.length > 0 ? (
              checklists.map((cl) => (
                <div key={cl.id} style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 12,
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--navy)",
                      marginBottom: 4,
                    }}>
                      {cl.checklist_type}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(cl.submission_time).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      })}
                    </div>
                  </div>
                  <div style={{
                    padding: "6px 16px",
                    borderRadius: 100,
                    background: "rgba(34,197,94,0.1)",
                    color: "#22C55E",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    ✓ Submitted
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                textAlign: "center",
                padding: "80px 0",
                color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  No checklists submitted today
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
