"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type EventStatus = "draft" | "open" | "closed";
type EventFilter = "all" | EventStatus;

type EventItem = {
  id: string;
  name: string;
  status: EventStatus;
};

type EventsResponse = {
  events?: EventItem[];
};

type EventMutationError = {
  error?: string;
};

const EVENT_STATUS_OPTIONS: Array<{
  value: EventStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const EVENT_FILTER_OPTIONS: Array<{
  value: EventFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<
  EventStatus,
  {
    badge: string;
    dot: string;
    label: string;
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
  payload: EventMutationError | null,
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

async function confirmDelete(eventName: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete event?",
    text: `This will permanently remove "${eventName}".`,
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569",
    ...swalBase,
  });

  return result.isConfirmed;
}

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [createName, setCreateName] = useState("");
  const [createStatus, setCreateStatus] = useState<EventStatus>("draft");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = useMemo(() => {
    return createName.trim().length > 0 && !isCreating;
  }, [createName, isCreating]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.id.toLowerCase().includes(normalizedSearch);

      const matchesFilter = filter === "all" || item.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      draft: items.filter((item) => item.status === "draft").length,
      open: items.filter((item) => item.status === "open").length,
      closed: items.filter((item) => item.status === "closed").length,
      visible: filteredItems.length,
    };
  }, [items, filteredItems]);

  async function loadItems(): Promise<void> {
    try {
      setIsLoading(true);

      const response = await fetch("/api/admin/events");
      const payload = await parseJsonSafe<EventsResponse>(response);

      setItems(payload?.events ?? []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleCreate(): Promise<void> {
    if (!canCreate) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createName.trim(),
          status: createStatus,
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonSafe<EventMutationError>(response);

        await showError(
          "Failed to create event",
          getErrorMessage(payload, "Unable to create event."),
        );
        return;
      }

      setCreateName("");
      setCreateStatus("draft");
      await loadItems();
      await showSuccess("Event created", "The event has been added successfully.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(nextItem: EventItem): Promise<void> {
    const response = await fetch("/api/admin/events", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextItem),
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<EventMutationError>(response);

      await showError(
        "Failed to update event",
        getErrorMessage(payload, "Unable to update the selected event."),
      );
      return;
    }

    await loadItems();
    await showSuccess("Event updated", "The event has been updated successfully.");
  }

  async function handleDelete(id: string, eventName: string): Promise<void> {
    const approved = await confirmDelete(eventName);

    if (!approved) return;

    const response = await fetch(`/api/admin/events?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<EventMutationError>(response);

      await showError(
        "Failed to delete event",
        getErrorMessage(payload, "Unable to delete the selected event."),
      );
      return;
    }

    await loadItems();
    await showSuccess("Event deleted", "The event has been removed.");
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
              Back to Dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                <CalendarDays className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Event Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Events
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Create, update, and organize competition events for your
                  tabulation system.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Draft" value={stats.draft} />
              <StatCard label="Open" value={stats.open} />
              <StatCard label="Closed" value={stats.closed} />
              <StatCard label="Visible" value={stats.visible} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Create Event</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add a new event and assign its initial status.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="create-event-name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Event Name
                </label>
                <input
                  id="create-event-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Enter event name"
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="create-event-status"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Initial Status
                </label>
                <select
                  id="create-event-status"
                  value={createStatus}
                  onChange={(event) =>
                    setCreateStatus(event.target.value as EventStatus)
                  }
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {EVENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                    Creating Event...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Event
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Event List</h2>
                <p className="text-sm text-slate-400">
                  Review and update the currently registered events.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by event name or ID"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <FilterTabs
                  value={filter}
                  onChange={setFilter}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading events...
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
                  <ShieldCheck className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  No matching events found
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Try adjusting your search or status filter, or create a new event.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <EventCard
                    key={item.id}
                    item={item}
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

function EventCard({
  item,
  onSave,
  onDelete,
}: {
  item: EventItem;
  onSave: (item: EventItem) => Promise<void>;
  onDelete: (id: string, eventName: string) => Promise<void>;
}) {
  const [draftName, setDraftName] = useState(item.name);
  const [draftStatus, setDraftStatus] = useState<EventStatus>(item.status);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftName(item.name);
    setDraftStatus(item.status);
  }, [item.id, item.name, item.status]);

  const trimmedName = draftName.trim();
  const isNameValid = trimmedName.length > 0;
  const isDirty = trimmedName !== item.name || draftStatus !== item.status;
  const canSave = isDirty && isNameValid && !isSaving;

  async function handleSave(): Promise<void> {
    if (!canSave) return;

    try {
      setIsSaving(true);

      await onSave({
        ...item,
        name: trimmedName,
        status: draftStatus,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20">
            <CalendarDays className="h-5 w-5 text-blue-400" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {item.name}
              </h3>
              <StatusBadge status={draftStatus} />
            </div>

            <p className="mt-1 break-all text-xs text-slate-500">
              Event ID: {item.id}
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Event Name
          </label>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Event name"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Status
          </label>
          <select
            value={draftStatus}
            onChange={(event) =>
              setDraftStatus(event.target.value as EventStatus)
            }
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {EVENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Actions
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
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
              onClick={() => onDelete(item.id, item.name)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-transparent px-4 text-sm font-medium text-red-300 transition hover:border-red-800 hover:bg-red-950/30 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: EventFilter;
  onChange: (value: EventFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {EVENT_FILTER_OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({
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