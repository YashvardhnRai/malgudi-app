"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  CookingPot,
  Home,
  ImageUp,
  Leaf,
  ListChecks,
  Loader2,
  Moon,
  Send,
  Sparkles,
  SprayCan,
  Sunrise,
  Upload,
  type LucideIcon,
} from "lucide-react";
import WorkerDock from "@/app/components/WorkerDock";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getCeoEmails } from "@/lib/auth";
import type {
  ChecklistSubmission,
  Outlet,
  OutletDetail as OutletDetailData,
  PhotoUpload,
} from "@/lib/types";

type ChecklistTask = Pick<ChecklistSubmission, "checklist_type">;
type UploadCategory = PhotoUpload["category"];
type UploadScheduleSlot = {
  hour: number;
  label: string;
};
type TaskDefinition = {
  time: string;
  label: string;
  type: ChecklistSubmission["checklist_type"];
  Icon: LucideIcon;
};
type CategoryDefinition = {
  id: UploadCategory;
  label: string;
  Icon: LucideIcon;
};

type UploadStatus =
  | { type: "DUE"; label: string }
  | { type: "MISSED"; label: string; hour: number }
  | { type: "DONE"; nextSlot: string }
  | { type: "NONE" };

const TASKS: TaskDefinition[] = [
  { time: "8:00 AM", label: "Opening Checklist", type: "OPENING", Icon: Sunrise },
  { time: "10:00 AM", label: "Banmarie Update", type: "BANMARIE", Icon: CookingPot },
  { time: "12:00 PM", label: "Banmarie Update", type: "BANMARIE", Icon: CookingPot },
  { time: "2:00 PM", label: "Banmarie Update", type: "BANMARIE", Icon: CookingPot },
  { time: "3:00 PM", label: "Afternoon Clean", type: "CLEANLINESS", Icon: SprayCan },
  { time: "6:00 PM", label: "Banmarie Update", type: "BANMARIE", Icon: CookingPot },
  { time: "8:00 PM", label: "Evening Clean", type: "CLEANLINESS", Icon: Sparkles },
  { time: "11:00 PM", label: "Closing Checklist", type: "CLOSING", Icon: Moon },
];

const CATEGORIES: CategoryDefinition[] = [
  { id: "FOOD_QUALITY", label: "Food", Icon: Camera },
  { id: "BANMARIE", label: "Banmarie", Icon: CookingPot },
  { id: "CLEANLINESS", label: "Clean", Icon: SprayCan },
  { id: "RAW_MATERIAL", label: "Raw", Icon: Leaf },
  { id: "CLOSING", label: "Closing", Icon: Moon },
];

const CATEGORY_TO_CHECKLIST_TYPE: Partial<
  Record<UploadCategory, ChecklistSubmission["checklist_type"]>
> = {
  BANMARIE: "BANMARIE",
  CLEANLINESS: "CLEANLINESS",
  RAW_MATERIAL: "CLEANLINESS",
  CLOSING: "CLOSING",
};

function formatHour(h: number) {
  const hour = h % 12 || 12;
  return `${hour}:00 ${h >= 12 ? "PM" : "AM"}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function UploadNowButton({
  onFileChange,
}: {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="manager-inline-upload">
      <ImageUp size={15} />
      Upload now
      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </label>
  );
}

export default function ManagerPage() {
  const router = useRouter();
  const params = useParams();
  const outletId = params.outletId as string;

  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<UploadCategory>("FOOD_QUALITY");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

  const loadData = async () => {
    const response = await fetch(`/api/outlets/${outletId}`);
    if (!response.ok) return;

    const detail = (await response.json()) as OutletDetailData;
    setOutlet(detail.outlet);
    setTasks(
      detail.checklists.map((checklist) => ({
        checklist_type: checklist.checklist_type,
      }))
    );
  };

  const checkUploadStatus = async () => {
    if (!isSupabaseConfigured || !outletId) return;
    try {
      const supabase = createClient();
      const istNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const currentHour = istNow.getHours();

      const { data: allSlots } = await supabase
        .from("upload_schedule")
        .select("hour, label")
        .eq("outlet_id", outletId)
        .eq("is_active", true)
        .order("hour", { ascending: true });

      if (!allSlots?.length) {
        setUploadStatus({ type: "NONE" });
        return;
      }

      const pastSlots = (allSlots as UploadScheduleSlot[]).filter(
        (s) => s.hour <= currentHour
      );
      const currentSlot = pastSlots[pastSlots.length - 1];

      if (!currentSlot) {
        setUploadStatus({ type: "NONE" });
        return;
      }

      const slotStart = new Date(istNow);
      slotStart.setHours(currentSlot.hour, 0, 0, 0);
      const { data: recentPhotos } = await supabase
        .from("photo_uploads")
        .select("id")
        .eq("outlet_id", outletId)
        .gte("created_at", slotStart.toISOString());

      if (recentPhotos?.length) {
        const nextSlots = (allSlots as UploadScheduleSlot[]).filter(
          (s) => s.hour > currentHour
        );
        const next = nextSlots[0];
        setUploadStatus({
          type: "DONE",
          nextSlot: next ? formatHour(next.hour) : "tomorrow",
        });
        return;
      }

      const minutesPastSlot = (currentHour - currentSlot.hour) * 60 + istNow.getMinutes();
      setUploadStatus(
        minutesPastSlot <= 30
          ? { type: "DUE", label: currentSlot.label }
          : { type: "MISSED", label: currentSlot.label, hour: currentSlot.hour }
      );
    } catch {
      setUploadStatus({ type: "NONE" });
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
      void checkUploadStatus();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  useEffect(() => {
    window.localStorage.setItem("malgudi-worker-outlet", outletId);
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

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

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

      const checklistType = CATEGORY_TO_CHECKLIST_TYPE[selectedCategory];
      if (checklistType) {
        await supabase.from("checklist_submissions").insert({
          outlet_id: outletId,
          submitted_by: user?.id,
          checklist_type: checklistType,
          submission_time: new Date().toISOString(),
          status: "SUBMITTED",
        });
      }

      const managerName = outlet?.manager_name || user?.email || "Manager";
      const outletName = outlet?.name || "Outlet";
      const notifRows = getCeoEmails().map((email) => ({
        recipient_email: email,
        recipient_role: "CEO",
        type: "PHOTO_UPLOADED",
        title: "Photo uploaded",
        message: `Photo uploaded by ${managerName} - ${outletName} Outlet`,
        outlet_id: outletId,
        manager_phone: outlet?.manager_phone ?? null,
        is_read: false,
      }));

      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifRows),
      }).catch(() => {});

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
      await loadData();
      await checkUploadStatus();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error(err);
    }
    setUploading(false);
  };

  const completedCount = TASKS.filter((task) =>
    tasks.some((t) => t.checklist_type === task.type)
  ).length;
  const completion = Math.round((completedCount / TASKS.length) * 100);
  const statusTone =
    uploadStatus?.type === "MISSED" ? "danger" :
    uploadStatus?.type === "DUE" ? "warning" :
    uploadStatus?.type === "DONE" ? "success" :
    "neutral";

  return (
    <main className="manager-page">
      <section className="manager-phone-shell">
        <header className="manager-hero">
          <button
            type="button"
            aria-label="Back to worker home"
            onClick={() => router.push("/worker")}
          >
            <Home size={17} />
          </button>
          <div>
            <span>{getGreeting()}</span>
            <h1>{outlet?.name || "Opening shift"}</h1>
            <p>{outlet ? `${outlet.city} - Manager view` : "Manager view"}</p>
          </div>
        </header>

        <section className="manager-progress">
          <div>
            <span>Shift completion</span>
            <strong>{completion}%</strong>
          </div>
          <div className="manager-progress-track">
            <span style={{ width: `${completion}%` }} />
          </div>
          <p>{completedCount} of {TASKS.length} scheduled checks completed.</p>
        </section>

        {uploadStatus && uploadStatus.type !== "NONE" && (
          <section className={`manager-alert ${statusTone}`}>
            <div>
              {uploadStatus.type === "DONE" && <CheckCircle2 size={20} />}
              {uploadStatus.type === "DUE" && <Upload size={20} />}
              {uploadStatus.type === "MISSED" && <AlertTriangle size={20} />}
            </div>
            <span>
              <strong>
                {uploadStatus.type === "DONE" && "Photo uploaded for this slot"}
                {uploadStatus.type === "DUE" && "Time to upload your photo"}
                {uploadStatus.type === "MISSED" && `Missed ${formatHour(uploadStatus.hour)} upload`}
              </strong>
              <small>
                {uploadStatus.type === "DONE" && `Next upload at ${uploadStatus.nextSlot}`}
                {uploadStatus.type === "DUE" && `${uploadStatus.label} check is due now.`}
                {uploadStatus.type === "MISSED" && "Please upload now so the CEO has proof."}
              </small>
            </span>
            {(uploadStatus.type === "DUE" || uploadStatus.type === "MISSED") && (
              <UploadNowButton onFileChange={handleFileChange} />
            )}
          </section>
        )}

        <section className="manager-section-head">
          <div>
            <span>Today</span>
            <h2>Scheduled checks</h2>
          </div>
          <ListChecks size={20} />
        </section>

        <section className="manager-task-list">
          {TASKS.map((task, index) => {
            const done = tasks.some((t) => t.checklist_type === task.type);
            const Icon = task.Icon;
            return (
              <article key={`${task.type}-${index}`} className={done ? "is-done" : ""}>
                <div className="manager-task-icon">
                  <Icon size={19} />
                </div>
                <div>
                  <strong>{task.label}</strong>
                  <span>Due {task.time}</span>
                </div>
                {done ? (
                  <CheckCircle2 className="manager-task-state done" size={24} />
                ) : (
                  <Circle className="manager-task-state" size={24} />
                )}
              </article>
            );
          })}
        </section>

        <section className="manager-section-head">
          <div>
            <span>Proof</span>
            <h2>Upload photo</h2>
          </div>
          <Camera size={20} />
        </section>

        <section className="manager-upload-card">
          <div className="manager-category-grid">
            {CATEGORIES.map((category) => {
              const Icon = category.Icon;
              const selected = selectedCategory === category.id;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={selected ? "selected" : ""}
                >
                  <Icon size={16} />
                  {category.label}
                </button>
              );
            })}
          </div>

          <label className={`manager-dropzone ${preview ? "has-preview" : ""}`}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {preview ? (
              <img src={preview} alt="Preview" />
            ) : (
              <>
                <div>
                  <ImageUp size={28} />
                </div>
                <strong>Take a fresh photo</strong>
                <span>Camera opens on tap</span>
              </>
            )}
          </label>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short note for the CEO..."
            rows={3}
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="manager-submit"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="spin" />
                Uploading
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={18} />
                Uploaded
              </>
            ) : (
              <>
                <Send size={18} />
                Submit photo
              </>
            )}
          </button>

          {success && (
            <div className="manager-success">
              <ClipboardCheck size={17} />
              Photo uploaded. CEOs have been notified.
            </div>
          )}
        </section>

        <div className="worker-dock-spacer" />
      </section>

      <WorkerDock
        outletId={outletId}
        managerPhone={outlet?.manager_phone}
      />
    </main>
  );
}
