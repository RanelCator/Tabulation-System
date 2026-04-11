"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Gavel,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  UserCog,
} from "lucide-react";

type EventStatus = "draft" | "open" | "closed";

type EventItem = {
  id: string;
  name: string;
  status: EventStatus;
};

type JudgeItem = {
  id: string;
  displayName: string;
  isActive: boolean;
  eventId: string | null;
};

type JudgeUpdatePayload = {
  id: string;
  displayName: string;
  eventId: string;
  isActive: boolean;
  passcode?: string;
};

type EventsResponse = {
  events?: EventItem[];
};

type JudgesResponse = {
  judges?: JudgeItem[];
};

type MutationErrorResponse = {
  error?: string;
};

const STATUS_STYLES: Record<
  EventStatus,
  {
    label: string;
    badge: string;
    dot: string;
  }
> = {
  draft: {
    label: "Draft",
    badge: "border border-slate-700 bg-slate-800/70 text-slate-300",
    dot: "bg-slate-400",
  },
  open: {
    label: "Open",
    badge: "border border-emerald-900/50 bg-emerald-950/40 text-emerald-300",
    dot: "bg-emerald-400",
  },
  closed: {
    label: "Closed",
    badge: "border border-amber-900/50 bg-amber-950/40 text-amber-300",
    dot: "bg-amber-400",
  },
};

const swalBase = {
  background: "#0f172a",
  color: "#e2e8f0",
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(
  payload: MutationErrorResponse | null,
  fallback: string,
): string {
  return payload?.error ?? fallback;
}

async function showError(title: string, text: string): Promise<void> {
  await Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#2563eb",
    ...swalBase,
  });
}

async function showSuccess(title: string, text: string): Promise<void> {
  await Swal.fire({
    icon: "success",
    title,
    text,
    timer: 1400,
    showConfirmButton: false,
    ...swalBase,
  });
}

async function confirmDeleteJudge(name: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete judge account?",
    text: `This will permanently remove "${name}".`,
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569",
    ...swalBase,
  });

  return result.isConfirmed;
}

export default function JudgesPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [items, setItems] = useState<JudgeItem[]>([]);

  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPasscode, setCreatePasscode] = useState("");
  const [createEventId, setCreateEventId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const stats = useMemo(() => {
    return {
      totalJudges: items.length,
      activeJudges: items.filter((item) => item.isActive).length,
      inactiveJudges: items.filter((item) => !item.isActive).length,
      totalEvents: events.length,
    };
  }, [items, events]);

  const canCreate = useMemo(() => {
    return (
      !isCreating &&
      createDisplayName.trim().length > 0 &&
      createPasscode.trim().length >= 4 &&
      createEventId.trim().length > 0
    );
  }, [createDisplayName, createPasscode, createEventId, isCreating]);

  useEffect(() => {
    void initializePage();
  }, []);

  async function initializePage(): Promise<void> {
    try {
      setIsLoading(true);

      const [eventsResponse, judgesResponse] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/judges"),
      ]);

      const eventsPayload = await parseJsonSafe<EventsResponse>(eventsResponse);
      const judgesPayload = await parseJsonSafe<JudgesResponse>(judgesResponse);

      const eventRows = eventsPayload?.events ?? [];
      setEvents(eventRows);
      setItems(judgesPayload?.judges ?? []);

      if (eventRows.length > 0) {
        setCreateEventId((current) => current || eventRows[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!canCreate) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/judges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: createDisplayName.trim(),
          passcode: createPasscode.trim(),
          eventId: createEventId,
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonSafe<MutationErrorResponse>(response);

        await showError(
          "Failed to add judge",
          getErrorMessage(payload, "Unable to create judge account."),
        );
        return;
      }

      setCreateDisplayName("");
      setCreatePasscode("");

      await initializePage();
      await showSuccess(
        "Judge created",
        "The judge account has been added successfully.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(payload: JudgeUpdatePayload): Promise<void> {
    const response = await fetch("/api/admin/judges", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payloadError = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to update judge",
        getErrorMessage(payloadError, "Unable to update judge account."),
      );
      return;
    }

    await initializePage();
    await showSuccess(
      "Judge updated",
      "The judge account has been updated successfully.",
    );
  }

  async function handleDelete(id: string, displayName: string): Promise<void> {
    const approved = await confirmDeleteJudge(displayName);

    if (!approved) return;

    const response = await fetch(`/api/admin/judges?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to delete judge",
        getErrorMessage(payload, "Unable to delete the selected judge account."),
      );
      return;
    }

    await initializePage();
    await showSuccess(
      "Judge deleted",
      "The judge account has been removed.",
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                <Gavel className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Judge Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Judges
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Manage judge accounts, assign events, update access, and control availability.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Judges" value={stats.totalJudges} />
              <StatCard label="Active" value={stats.activeJudges} />
              <StatCard label="Inactive" value={stats.inactiveJudges} />
              <StatCard label="Events" value={stats.totalEvents} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Create Judge</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add a new judge account and assign its default event.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="judge-name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Judge Name
                </label>
                <input
                  id="judge-name"
                  value={createDisplayName}
                  onChange={(event) => setCreateDisplayName(event.target.value)}
                  placeholder="Enter judge name"
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="judge-passcode"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Passcode
                </label>
                <input
                  id="judge-passcode"
                  value={createPasscode}
                  onChange={(event) => setCreatePasscode(event.target.value)}
                  placeholder="Enter passcode"
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Minimum of 4 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="judge-event"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Assigned Event
                </label>
                <select
                  id="judge-event"
                  value={createEventId}
                  onChange={(event) => setCreateEventId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Judge...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Judge
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Judge Accounts</h2>
              <p className="text-sm text-slate-400">
                Review assigned events, update judge details, and control access status.
              </p>
            </div>

            {isLoading ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading judge accounts...
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<UserCog className="h-6 w-6 text-slate-400" />}
                title="No judge accounts found"
                description="Add your first judge account using the form on the left panel."
              />
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <JudgeCard
                    key={item.id}
                    item={item}
                    events={events}
                    onSave={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function JudgeCard({
  item,
  events,
  onSave,
  onDelete,
}: {
  item: JudgeItem;
  events: EventItem[];
  onSave: (payload: JudgeUpdatePayload) => Promise<void>;
  onDelete: (id: string, displayName: string) => Promise<void>;
}) {
  const [draftDisplayName, setDraftDisplayName] = useState(item.displayName);
  const [draftPasscode, setDraftPasscode] = useState("");
  const [draftEventId, setDraftEventId] = useState(item.eventId ?? "");
  const [draftIsActive, setDraftIsActive] = useState(item.isActive);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftDisplayName(item.displayName);
    setDraftPasscode("");
    setDraftEventId(item.eventId ?? "");
    setDraftIsActive(item.isActive);
  }, [item.id, item.displayName, item.eventId, item.isActive]);

  const selectedEvent = events.find((event) => event.id === draftEventId) ?? null;
  const originalEventId = item.eventId ?? "";

  const trimmedDisplayName = draftDisplayName.trim();
  const trimmedPasscode = draftPasscode.trim();

  const isDirty =
    trimmedDisplayName !== item.displayName ||
    draftEventId !== originalEventId ||
    draftIsActive !== item.isActive ||
    trimmedPasscode.length > 0;

  const isNameValid = trimmedDisplayName.length > 0;
  const isPasscodeValid = trimmedPasscode.length === 0 || trimmedPasscode.length >= 4;

  const canSave =
    isDirty &&
    isNameValid &&
    isPasscodeValid &&
    draftEventId.length > 0 &&
    !isSaving;

  async function handleSave(): Promise<void> {
    if (!canSave) return;

    try {
      setIsSaving(true);

      const payload: JudgeUpdatePayload = {
        id: item.id,
        displayName: trimmedDisplayName,
        eventId: draftEventId,
        isActive: draftIsActive,
      };

      if (trimmedPasscode.length > 0) {
        payload.passcode = trimmedPasscode;
      }

      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20">
            <UserCog className="h-5 w-5 text-blue-400" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {item.displayName}
              </h3>
              <JudgeStatusBadge isActive={draftIsActive} />
              {selectedEvent ? <EventStatusBadge status={selectedEvent.status} /> : null}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Assigned Event:{" "}
              <span className="text-slate-300">
                {selectedEvent?.name ?? "No event assigned"}
              </span>
            </p>

            <p className="mt-1 break-all text-xs text-slate-500">
              Judge ID: {item.id}
            </p>
          </div>
        </div>

        <div className="text-left lg:text-right">
          {isDirty ? (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              No pending changes
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_220px_160px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Judge Name
          </label>
          <input
            value={draftDisplayName}
            onChange={(event) => setDraftDisplayName(event.target.value)}
            placeholder="Judge name"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            New Passcode
          </label>
          <input
            value={draftPasscode}
            onChange={(event) => setDraftPasscode(event.target.value)}
            placeholder="Optional"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {!isPasscodeValid ? (
            <p className="mt-2 text-xs text-amber-400">
              Passcode must be at least 4 characters.
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Assigned Event
          </label>
          <select
            value={draftEventId}
            onChange={(event) => setDraftEventId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Select event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Status
          </label>
          <button
            type="button"
            onClick={() => setDraftIsActive((prev) => !prev)}
            className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
              draftIsActive
                ? "bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-900/50 hover:bg-emerald-950/60"
                : "bg-slate-800 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700"
            }`}
          >
            {draftIsActive ? "Active" : "Inactive"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Actions
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <PencilLine className="h-4 w-4" />
                Save
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.id, item.displayName)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-transparent px-4 text-sm font-medium text-red-300 transition hover:border-red-800 hover:bg-red-950/30 hover:text-red-200"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function EventStatusBadge({
  status,
}: {
  status: EventStatus;
}) {
  const meta = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function JudgeStatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive
          ? "border border-emerald-900/50 bg-emerald-950/40 text-emerald-300"
          : "border border-slate-700 bg-slate-800/70 text-slate-300"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}