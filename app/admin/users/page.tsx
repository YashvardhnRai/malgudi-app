"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MailCheck,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import NavHeader from "@/app/components/NavHeader";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { User, Outlet } from "@/lib/types";

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CEO: { bg: "#E7F4F8", text: "#1F696F", label: "CEO" },
  MANAGER: { bg: "#E8F7EF", text: "#087F5B", label: "Manager" },
  STAFF: { bg: "#F7F3EB", text: "#667085", label: "Staff" },
};

interface NewUserForm {
  name: string;
  email: string;
  phone: string;
  role: "MANAGER" | "STAFF";
  outlet_id: string;
}

interface AuditEvent {
  id: string;
  action: string;
  actor_email: string;
  actor_role: string;
  outlet_id: string | null;
  created_at: string;
}

const EMPTY_FORM: NewUserForm = {
  name: "",
  email: "",
  phone: "",
  role: "MANAGER",
  outlet_id: "",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const [usersResponse, outletsResponse, auditResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/outlets"),
        fetch("/api/audit"),
      ]);

      if (usersResponse.status === 401 || usersResponse.status === 403) {
        router.replace("/auth");
        return;
      }

      const usersPayload = await usersResponse.json();
      const outletsPayload = await outletsResponse.json();
      const auditPayload = await auditResponse.json();
      const nextUsers = (usersPayload.users as User[]) ?? [];
      const nextOutlets = (outletsPayload.outlets as Outlet[]) ?? [];
      setUsers(nextUsers);
      setOutlets(nextOutlets);
      setAuditEvents((auditPayload.events as AuditEvent[]) ?? []);
      setForm((current) => ({
        ...current,
        outlet_id: current.outlet_id || nextOutlets[0]?.id || "",
      }));
    } catch {
      // Keep the admin surface available even if a backend call fails.
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setSuccess("");

    if (!form.outlet_id) {
      setFormError("Select an outlet before adding this user.");
      setSubmitting(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const demoUser: User = {
        id: `demo-${Date.now()}`,
        created_at: new Date().toISOString(),
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        outlet_id: form.outlet_id,
      };
      setUsers((current) => [demoUser, ...current]);
      setSuccess(`Demo user ${form.name} added locally.`);
      setForm({ ...EMPTY_FORM, outlet_id: outlets[0]?.id || "" });
      setShowForm(false);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        editingUserId ? `/api/users/${editingUserId}` : "/api/users",
        {
        method: editingUserId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to add user");

      setSuccess(
        editingUserId
          ? `${form.name} updated.`
          : result.inviteWarning
          ? `${form.name} added. Invite warning: ${result.inviteWarning}`
          : `${form.name} added and invite sent to ${form.email}`
      );
      setShowForm(false);
      setEditingUserId(null);
      setForm({ ...EMPTY_FORM, outlet_id: outlets[0]?.id || "" });
      await load();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role === "MANAGER" ? "MANAGER" : "STAFF",
      outlet_id: user.outlet_id || outlets[0]?.id || "",
    });
    setFormError("");
    setSuccess("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function resendInvite(user: User) {
    setActionUserId(user.id);
    setSuccess("");
    try {
      const response = await fetch(`/api/users/${user.id}/invite`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invite failed");
      setSuccess(`Invite sent again to ${user.email}.`);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setActionUserId(null);
    }
  }

  async function removeUser(user: User) {
    setActionUserId(user.id);
    setFormError("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Removal failed");
      setPendingDeleteId(null);
      setSuccess(`${user.name} removed from Malgudi access.`);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Removal failed");
    } finally {
      setActionUserId(null);
    }
  }

  const outletName = (id: string | null) =>
    outlets.find((outlet) => outlet.id === id)?.name ?? "Unassigned";

  const counts = useMemo(() => {
    const managers = users.filter((user) => user.role === "MANAGER").length;
    const staff = users.filter((user) => user.role === "STAFF").length;
    return { managers, staff };
  }, [users]);

  return (
    <div className="admin-page">
      <NavHeader userName="CEO" />

      <main className="admin-main">
        <section className="admin-hero">
          <div>
            <span className="admin-kicker">
              <ShieldCheck size={14} />
              Access control
            </span>
            <h1>User management</h1>
            <p>
              Add managers and staff, connect them to outlets, and send invite links
              from one controlled desk.
            </p>
          </div>

          <div className="admin-stat-grid">
            <div className="admin-stat">
              <UsersRound size={18} />
              <span>Total users</span>
              <strong>{users.length}</strong>
            </div>
            <div className="admin-stat">
              <Store size={18} />
              <span>Managers</span>
              <strong>{counts.managers}</strong>
            </div>
            <div className="admin-stat">
              <UserPlus size={18} />
              <span>Staff</span>
              <strong>{counts.staff}</strong>
            </div>
          </div>
        </section>

        <section className="admin-toolbar">
          <div>
            <span>Team directory</span>
            <strong>{loading ? "Loading users" : `${users.length} active profile${users.length === 1 ? "" : "s"}`}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingUserId(null);
              setForm({ ...EMPTY_FORM, outlet_id: outlets[0]?.id || "" });
              setSuccess("");
              setFormError("");
            }}
          >
            <Plus size={17} />
            Add user
          </button>
        </section>

        {success && (
          <div className="admin-notice success">
            <CheckCircle2 size={17} />
            {success}
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="admin-notice warning">
            <AlertTriangle size={17} />
            Demo mode is active. Added users stay local until Supabase is configured.
          </div>
        )}

        {showForm && (
          <section className="admin-form-card">
            <div className="admin-form-head">
              <div>
                <span>{editingUserId ? "Edit access" : "Add user"}</span>
                <h2>{editingUserId ? "Update team member" : "Invite a team member"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close add user form"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="admin-form-grid">
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ramesh Kumar"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUserId)}
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="ramesh@malgudi.in"
                />
              </label>

              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="+91 98765 43210"
                />
              </label>

              <label>
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as "MANAGER" | "STAFF",
                    }))
                  }
                >
                  <option value="MANAGER">Manager</option>
                  <option value="STAFF">Staff</option>
                </select>
              </label>

              <label className="admin-form-wide">
                <span>Outlet</span>
                <select
                  value={form.outlet_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, outlet_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Select outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.city}
                    </option>
                  ))}
                </select>
              </label>

              {formError && <div className="admin-form-error">{formError}</div>}

              <div className="admin-form-actions">
                <button type="submit" disabled={submitting}>
                  <UserPlus size={17} />
                  {submitting
                    ? "Saving"
                    : editingUserId
                    ? "Save changes"
                    : "Add user and send invite"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <section className="admin-users-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="admin-user-card skeleton" />
            ))}
          </section>
        ) : users.length === 0 ? (
          <section className="admin-empty">
            <UsersRound size={34} />
            <strong>No users yet</strong>
            <span>Add the first manager or staff profile to begin assigning access.</span>
          </section>
        ) : (
          <section className="admin-users-grid">
            {users.map((user) => {
              const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.STAFF;
              return (
                <article key={user.id} className="admin-user-card">
                  <div className="admin-user-avatar">
                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || "M"}
                  </div>
                  <div className="admin-user-main">
                    <div className="admin-user-title">
                      <strong>{user.name}</strong>
                      <span style={{ background: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                    </div>
                    <p>
                      <Mail size={14} />
                      {user.email}
                    </p>
                    <p>
                      <Store size={14} />
                      {outletName(user.outlet_id)}
                    </p>
                    <p>
                      <Phone size={14} />
                      {user.phone || "No phone number"}
                    </p>
                    <div className="admin-user-actions">
                      <button type="button" onClick={() => startEdit(user)} title="Edit user">
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void resendInvite(user)}
                        disabled={actionUserId === user.id}
                        title="Resend invite"
                      >
                        <MailCheck size={15} />
                        Invite
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setPendingDeleteId(user.id)}
                        title="Remove user"
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    </div>
                    {pendingDeleteId === user.id && (
                      <div className="admin-delete-confirm">
                        <span>Remove access for {user.name}?</span>
                        <button
                          type="button"
                          onClick={() => void removeUser(user)}
                          disabled={actionUserId === user.id}
                        >
                          Confirm
                        </button>
                        <button type="button" onClick={() => setPendingDeleteId(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="admin-audit">
          <div className="admin-audit-head">
            <div>
              <span>Accountability</span>
              <h2>Recent access activity</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          {auditEvents.length ? (
            <div className="admin-audit-list">
              {auditEvents.slice(0, 12).map((event) => (
                <div key={event.id}>
                  <strong>{event.action.replaceAll("_", " ").toLowerCase()}</strong>
                  <span>{event.actor_email}</span>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-audit-empty">No recorded changes yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
