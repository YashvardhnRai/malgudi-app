"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo, useRef } from "react";
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
  IndianRupee,
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
import ManagerPresenceHeartbeat from "@/app/components/ManagerPresenceHeartbeat";
import {
  decodeChecklistNotes,
  getIstParts,
  inferLegacySlotKey,
  OPERATIONS_SLOTS,
  type OperationsSlot,
} from "@/lib/operations";
import { submitPhotoUpload } from "@/lib/photo-upload-client";
import type {
  ChecklistSubmission,
  Outlet,
  OutletDetail as OutletDetailData,
  PhotoUpload,
} from "@/lib/types";

type ChecklistTask = Pick<
  ChecklistSubmission,
  "checklist_type" | "notes" | "submission_time"
>;
type UploadCategory = PhotoUpload["category"];
type TaskDefinition = OperationsSlot & {
  time: string;
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

type SalesDraft = {
  total_sales: string;
  covers_count: string;
  swiggy_orders: string;
  zomato_orders: string;
  dine_in_orders: string;
};

const EMPTY_SALES: SalesDraft = {
  total_sales: "",
  covers_count: "",
  swiggy_orders: "",
  zomato_orders: "",
  dine_in_orders: "",
};

const SLOT_ICONS: Record<string, LucideIcon> = {
  OPENING: Sunrise,
  BANMARIE: CookingPot,
  CLEANLINESS: SprayCan,
  CLOSING: Moon,
};

const TASKS: TaskDefinition[] = OPERATIONS_SLOTS.map((slot) => ({
  ...slot,
  time: formatHour(slot.hour),
  Icon:
    slot.key === "cleanliness-20"
      ? Sparkles
      : SLOT_ICONS[slot.checklistType],
}));

const CATEGORIES: CategoryDefinition[] = [
  { id: "FOOD_QUALITY", label: "Food", Icon: Camera },
  { id: "BANMARIE", label: "Banmarie", Icon: CookingPot },
  { id: "CLEANLINESS", label: "Clean", Icon: SprayCan },
  { id: "RAW_MATERIAL", label: "Raw", Icon: Leaf },
  { id: "CLOSING", label: "Closing", Icon: Moon },
];

type TaskTone = "done" | "now" | "overdue" | "upcoming";
const OUTLET_STORAGE_KEY = "malgudi-worker-outlet";
const OUTLET_DATA_STORAGE_KEY = "malgudi-worker-outlet-data";

function formatHour(h: number) {
  const hour = h % 12 || 12;
  return `${hour}:00 ${h >= 12 ? "PM" : "AM"}`;
}

function getGreeting() {
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function getTaskTone(task: TaskDefinition, done: boolean, currentHour: number): TaskTone {
  if (done) return "done";
  if (currentHour === task.hour) return "now";
  if (currentHour > task.hour) return "overdue";
  return "upcoming";
}

function getTaskBadge(tone: TaskTone) {
  if (tone === "done") return "Done";
  if (tone === "now") return "Now";
  if (tone === "overdue") return "Due";
  return "Next";
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

export default function ManagerPageClient({
  actorName,
  actorEmail,
  presenceEnabled,
}: {
  actorName: string
  actorEmail: string
  presenceEnabled: boolean
}) {
  const router = useRouter();
  const params = useParams();
  const outletId = params.outletId as string;
  const uploadRef = useRef<HTMLElement | null>(null);

  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<UploadCategory>("FOOD_QUALITY");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [queued, setQueued] = useState(false);
  const [sales, setSales] = useState<SalesDraft>(EMPTY_SALES);
  const [salesState, setSalesState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const completedSlotKeys = useMemo(
    () =>
      new Set(
        tasks
          .map(
            (task) =>
              decodeChecklistNotes(task.notes).slotKey ??
              inferLegacySlotKey(task)
          )
          .filter((key): key is string => Boolean(key))
      ),
    [tasks]
  );

  function updateUploadStatus(nextTasks: ChecklistTask[]) {
    const completed = new Set(
      nextTasks
        .map(
          (task) =>
            decodeChecklistNotes(task.notes).slotKey ?? inferLegacySlotKey(task)
        )
        .filter((key): key is string => Boolean(key))
    );
    const ist = getIstParts();
    const currentSlot = [...OPERATIONS_SLOTS]
      .reverse()
      .find((slot) => slot.hour <= ist.hour);

    if (!currentSlot) {
      setUploadStatus({ type: "NONE" });
      return;
    }
    if (completed.has(currentSlot.key)) {
      const next = OPERATIONS_SLOTS.find((slot) => slot.hour > ist.hour);
      setUploadStatus({
        type: "DONE",
        nextSlot: next ? formatHour(next.hour) : "tomorrow",
      });
      return;
    }

    const minutesPastSlot =
      (ist.hour - currentSlot.hour) * 60 + ist.minute;
    setSelectedSlotKey(currentSlot.key);
    setSelectedCategory(currentSlot.category);
    setUploadStatus(
      minutesPastSlot <= 30
        ? { type: "DUE", label: currentSlot.label }
        : {
            type: "MISSED",
            label: currentSlot.label,
            hour: currentSlot.hour,
          }
    );
  }

  const loadData = async () => {
    const response = await fetch(`/api/outlets/${outletId}`);
    if (!response.ok) return;

    const detail = (await response.json()) as OutletDetailData;
    setOutlet(detail.outlet);
    setSales({
      total_sales: detail.sales?.total_sales
        ? String(detail.sales.total_sales)
        : "",
      covers_count: detail.sales?.covers_count
        ? String(detail.sales.covers_count)
        : "",
      swiggy_orders: detail.sales?.swiggy_orders
        ? String(detail.sales.swiggy_orders)
        : "",
      zomato_orders: detail.sales?.zomato_orders
        ? String(detail.sales.zomato_orders)
        : "",
      dine_in_orders: detail.sales?.dine_in_orders
        ? String(detail.sales.dine_in_orders)
        : "",
    });
    window.localStorage.setItem(
      OUTLET_DATA_STORAGE_KEY,
      JSON.stringify(detail.outlet)
    );
    const nextTasks = detail.checklists.map((checklist) => ({
      checklist_type: checklist.checklist_type,
      notes: checklist.notes,
      submission_time: checklist.submission_time,
    }));
    setTasks(nextTasks);
    updateUploadStatus(nextTasks);
  };

  useEffect(() => {
    queueMicrotask(() => {
      const cached = window.localStorage.getItem(OUTLET_DATA_STORAGE_KEY);
      if (cached) {
        try {
          const cachedOutlet = JSON.parse(cached) as Outlet;
          if (cachedOutlet.id === outletId) setOutlet(cachedOutlet);
        } catch {}
      }
      void loadData();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  useEffect(() => {
    window.localStorage.setItem(OUTLET_STORAGE_KEY, outletId);
  }, [outletId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  function handleTaskSelect(task: TaskDefinition) {
    setSelectedCategory(task.category);
    setSelectedSlotKey(task.key);
    setUploadError("");
    navigator.vibrate?.(10);
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setQueued(false);

    try {
      const result = await submitPhotoUpload({
        outletId,
        category: selectedCategory,
        caption,
        slotKey: selectedSlotKey,
        files: [file],
      });

      setSuccess(true);
      setQueued(result.queued);
      setFile(null);
      setPreview(null);
      setCaption("");
      if (!result.queued) await loadData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  };

  async function saveSales() {
    setSalesState("saving");
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          total_sales: Number(sales.total_sales || 0),
          covers_count: Number(sales.covers_count || 0),
          swiggy_orders: Number(sales.swiggy_orders || 0),
          zomato_orders: Number(sales.zomato_orders || 0),
          dine_in_orders: Number(sales.dine_in_orders || 0),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save sales");
      setSalesState("saved");
      window.setTimeout(() => setSalesState("idle"), 3000);
    } catch {
      setSalesState("error");
    }
  }

  const completedCount = TASKS.filter((task) =>
    completedSlotKeys.has(task.key)
  ).length;
  const completion = Math.round((completedCount / TASKS.length) * 100);
  const currentHour = getIstParts().hour;
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
            <ManagerPresenceHeartbeat
              enabled={presenceEnabled}
              outletId={outletId}
              outletName={outlet?.name}
              outletCity={outlet?.city}
              managerName={actorName || outlet?.manager_name}
              managerPhone={outlet?.manager_phone}
              userEmail={actorEmail}
            />
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
            const done = completedSlotKeys.has(task.key);
            const tone = getTaskTone(task, done, currentHour);
            const Icon = task.Icon;
            return (
              <button
                type="button"
                key={`${task.key}-${index}`}
                className={`manager-task-item is-${tone}`}
                onClick={() => handleTaskSelect(task)}
              >
                <div className="manager-task-icon">
                  <Icon size={19} />
                </div>
                <div className="manager-task-main">
                  <strong>{task.label}</strong>
                  <span className="manager-task-time">Due {task.time}</span>
                </div>
                <span className={`manager-task-badge ${tone}`}>
                  {getTaskBadge(tone)}
                </span>
                {done ? (
                  <CheckCircle2 className="manager-task-state done" size={24} />
                ) : (
                  <Circle className="manager-task-state" size={24} />
                )}
              </button>
            );
          })}
        </section>

        <section className="manager-section-head">
          <div>
            <span>Close the loop</span>
            <h2>Today&apos;s sales</h2>
          </div>
          <IndianRupee size={20} />
        </section>

        <section className="manager-sales-card">
          <label className="manager-sales-total">
            <span>Total sales</span>
            <div>
              <IndianRupee size={18} />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={sales.total_sales}
                onChange={(event) =>
                  setSales((current) => ({
                    ...current,
                    total_sales: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
          </label>

          <div className="manager-sales-grid">
            {([
              ["covers_count", "Covers"],
              ["dine_in_orders", "Dine-in"],
              ["swiggy_orders", "Swiggy"],
              ["zomato_orders", "Zomato"],
            ] as const).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={sales[key]}
                  onChange={(event) =>
                    setSales((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            className="manager-sales-submit"
            onClick={saveSales}
            disabled={salesState === "saving" || !sales.total_sales}
          >
            {salesState === "saving" ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <IndianRupee size={17} />
            )}
            {salesState === "saving"
              ? "Saving"
              : salesState === "saved"
              ? "Sales saved"
              : "Save today’s sales"}
          </button>

          {salesState === "error" && (
            <div className="manager-upload-error">
              <AlertTriangle size={16} />
              Sales could not be saved. Check the values and try again.
            </div>
          )}
        </section>

        <section className="manager-section-head">
          <div>
            <span>Proof</span>
            <h2>Upload photo</h2>
          </div>
          <Camera size={20} />
        </section>

        <section className="manager-upload-card" ref={uploadRef}>
          <div className="manager-category-grid">
            {CATEGORIES.map((category) => {
              const Icon = category.Icon;
              const selected = selectedCategory === category.id;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedSlotKey(null);
                  }}
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

          {selectedSlotKey && (
            <p className="manager-upload-slot">
              Completing {TASKS.find((task) => task.key === selectedSlotKey)?.label}
            </p>
          )}

          {uploadError && (
            <div className="manager-upload-error">
              <AlertTriangle size={16} />
              {uploadError}
            </div>
          )}

          {success && (
            <div className="manager-success">
              <ClipboardCheck size={17} />
              {queued
                ? "Saved on this phone. It will upload when the connection returns."
                : "Photo uploaded. CEOs have been notified."}
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
