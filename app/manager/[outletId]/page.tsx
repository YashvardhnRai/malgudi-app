"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export default function ManagerPage() {
  const router = useRouter();
  const params = useParams();
  const outletId = params.outletId as string;

  const [outlet, setOutlet] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("FOOD_QUALITY");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const TASKS = [
    { time: "8:00 AM", label: "Opening Checklist", type: "OPENING", icon: "🌅" },
    { time: "10:00 AM", label: "Banmarie Update", type: "BANMARIE", icon: "🍲" },
    { time: "12:00 PM", label: "Banmarie Update", type: "BANMARIE", icon: "🍲" },
    { time: "2:00 PM", label: "Banmarie Update", type: "BANMARIE", icon: "🍲" },
    { time: "3:00 PM", label: "Afternoon Clean", type: "CLEANLINESS", icon: "🧹" },
    { time: "6:00 PM", label: "Banmarie Update", type: "BANMARIE", icon: "🍲" },
    { time: "8:00 PM", label: "Evening Clean", type: "CLEANLINESS", icon: "🧹" },
    { time: "11:00 PM", label: "Closing Checklist", type: "CLOSING", icon: "🌙" },
  ];

  const CATEGORIES = [
    "FOOD_QUALITY",
    "BANMARIE",
    "CLEANLINESS",
    "RAW_MATERIAL",
    "CLOSING",
  ];

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) return;
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("outlets")
        .select("*")
        .eq("id", outletId)
        .single();
      setOutlet(data);

      const today = new Date().toISOString().split("T")[0];
      const { data: cl } = await supabase
        .from("checklist_submissions")
        .select("checklist_type")
        .eq("outlet_id", outletId)
        .gte("created_at", today + "T00:00:00");
      setTasks(cl || []);
    };
    load();
  }, [outletId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      if (!isSupabaseConfigured) {
        setSuccess(true);
        setFile(null);
        setPreview(null);
        setCaption("");
        setTimeout(() => setSuccess(false), 3000);
        setUploading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Upload to Supabase storage
      const fileName = `${outletId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, file);

      let photoUrl = "";
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      // Save to database
      const { data: photoRecord } = await supabase
        .from("photo_uploads")
        .insert({
          outlet_id: outletId,
          submitted_by: user?.id,
          category: selectedCategory,
          photo_url: photoUrl,
          caption,
          ai_status: "PENDING",
        })
        .select()
        .single();

      // Mark checklist done
      await supabase.from("checklist_submissions").insert({
        outlet_id: outletId,
        submitted_by: user?.id,
        checklist_type: selectedCategory,
        submission_time: new Date().toISOString(),
        status: "SUBMITTED",
      });

      // Trigger AI review in background (fire-and-forget)
      if (photoUrl && photoRecord?.id) {
        fetch("/api/review-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoId: photoRecord.id,
            photoUrl,
            category: selectedCategory,
          }),
        }).catch(() => {});
      }

      setSuccess(true);
      setFile(null);
      setPreview(null);
      setCaption("");
      // Refresh tasks
      const today = new Date().toISOString().split("T")[0];
      const { data: cl } = await supabase
        .from("checklist_submissions")
        .select("checklist_type")
        .eq("outlet_id", outletId)
        .gte("created_at", today + "T00:00:00");
      setTasks(cl || []);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--warm-white)",
      fontFamily: "var(--font-body)",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      {/* Mobile header */}
      <div style={{
        background: "#2B2F77",
        padding: "24px 24px 20px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          fontSize: 11,
          color: "rgba(240,90,40,0.7)",
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 4,
        }}>
          {greeting}
        </div>
        <div style={{
          fontSize: 22,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: 2,
        }}>
          {outlet?.name || "Loading..."}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {outlet?.city} · Manager View
        </div>
      </div>

      <div style={{ padding: "24px", paddingBottom: 100 }}>

        {/* Today's tasks */}
        <h2 style={{
          fontSize: 18,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          color: "var(--navy)",
          marginBottom: 16,
        }}>
          Today&apos;s Tasks
        </h2>

        <div style={{ marginBottom: 32 }}>
          {TASKS.map((task, i) => {
            const done = tasks.some(t => t.checklist_type === task.type);
            return (
              <div key={i} style={{
                background: "#fff",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 8,
                border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{task.icon}</span>
                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: done ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: done ? "line-through" : "none",
                    }}>
                      {task.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Due: {task.time}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done ? "#22C55E" : "var(--warm-white)",
                  border: `2px solid ${done ? "#22C55E" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 700,
                }}>
                  {done ? "✓" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload section */}
        <h2 style={{
          fontSize: 18,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          color: "var(--navy)",
          marginBottom: 16,
        }}>
          Upload Photo
        </h2>

        {/* Category selector */}
        <div style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "8px 14px",
                borderRadius: 100,
                border: `1px solid ${selectedCategory === cat ? "#F05A28" : "var(--border)"}`,
                background: selectedCategory === cat ? "rgba(240,90,40,0.1)" : "#fff",
                color: selectedCategory === cat ? "#F05A28" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* File upload */}
        <label style={{
          display: "block",
          background: preview ? "transparent" : "#fff",
          border: `2px dashed ${preview ? "transparent" : "var(--border)"}`,
          borderRadius: 16,
          padding: preview ? "0" : "40px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 16,
          transition: "all 0.2s",
          overflow: "hidden",
        }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              style={{
                width: "100%",
                borderRadius: 16,
                maxHeight: 300,
                objectFit: "cover",
              }}
            />
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}>
                Take a photo
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Tap to open camera
              </div>
            </div>
          )}
        </label>

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a note (optional)..."
          rows={2}
          style={{
            width: "100%",
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            resize: "none",
            outline: "none",
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            width: "100%",
            padding: "18px",
            background: !file || uploading ? "rgba(240,90,40,0.4)" : "#F05A28",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: !file || uploading ? "not-allowed" : "pointer",
            fontFamily: "var(--font-display)",
            transition: "all 0.2s",
            boxShadow: file && !uploading ? "0 4px 24px rgba(240,90,40,0.4)" : "none",
          }}
        >
          {uploading ? "Uploading..." : success ? "✓ Uploaded!" : "Submit Photo →"}
        </button>

        {success && (
          <div style={{
            marginTop: 12,
            padding: "12px",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 12,
            textAlign: "center",
            color: "#22C55E",
            fontSize: 13,
            fontWeight: 600,
          }}>
            ✓ Photo uploaded successfully!
          </div>
        )}
      </div>

      {/* Bottom nav for mobile */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: "#fff",
        borderTop: "1px solid var(--border)",
        display: "flex",
        padding: "12px 0 20px",
        boxShadow: "0 -4px 20px rgba(43,47,119,0.08)",
      }}>
        {[
          { icon: "🏠", label: "Home", path: "/" },
          { icon: "📸", label: "Upload", path: `/manager/${outletId}` },
          { icon: "📋", label: "Tasks", path: `/manager/${outletId}` },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px",
              color: "var(--text-muted)",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
