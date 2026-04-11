"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  PencilLine,
  Plus,
  Scale,
  Trash2,
  ListOrdered,
} from "lucide-react";

type EventStatus = "draft" | "open" | "closed";

type EventItem = {
  id: string;
  name: string;
  status: EventStatus;
};

type CriterionItem = {
  id: string;
  name: string;
  maxScore: string;
  sortOrder: number;
};

type EventsResponse = {
  events?: EventItem[];
};

type CriteriaResponse = {
  criteria?: CriterionItem[];
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

async function confirmDeleteCriterion(name: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete criterion?",
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

export default function CriteriaPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState<CriterionItem[]>([]);

  const [createName, setCreateName] = useState("");
  const [createMaxScore, setCreateMaxScore] = useState("");
  const [createSortOrder, setCreateSortOrder] = useState("0");

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedEvent = useMemo(() => {
    return events.find((event) => event.id === eventId) ?? null;
  }, [events, eventId]);

  const canCreate = useMemo(() => {
    const parsedMaxScore = Number(createMaxScore);
    const parsedSortOrder = Number(createSortOrder);

    return (
      !isCreating &&
      eventId.trim().length > 0 &&
      createName.trim().length > 0 &&
      Number.isFinite(parsedMaxScore) &&
      parsedMaxScore > 0 &&
      Number.isFinite(parsedSortOrder)
    );
  }, [createMaxScore, createName, createSortOrder, eventId, isCreating]);

  const stats = useMemo(() => {
    const totalMaxScore = items.reduce((sum, item) => {
      const value = Number(item.maxScore);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return {
      totalEvents: events.length,
      totalCriteria: items.length,
      totalMaxScore,
      isOverLimit: totalMaxScore > 100,
      selectedEventName: selectedEvent?.name ?? "None",
      selectedEventStatus: selectedEvent?.status ?? null,
    };
  }, [events.length, items, selectedEvent]);

  useEffect(() => {
    void loadEvents();
  }, []);

  useEffect(() => {
    if (eventId) {
      void loadItems(eventId);
    } else {
      setItems([]);
    }
  }, [eventId]);

  async function loadEvents(): Promise<void> {
    try {
      setIsLoadingEvents(true);

      const response = await fetch("/api/admin/events");
      const payload = await parseJsonSafe<EventsResponse>(response);
      const rows = payload?.events ?? [];

      setEvents(rows);

      if (rows.length > 0) {
        setEventId((current) => current || rows[0].id);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }

  async function loadItems(selectedEventId: string): Promise<void> {
    try {
      setIsLoadingItems(true);

      const response = await fetch(
        `/api/admin/criteria?eventId=${selectedEventId}`,
      );
      const payload = await parseJsonSafe<CriteriaResponse>(response);

      setItems(payload?.criteria ?? []);
    } finally {
      setIsLoadingItems(false);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!canCreate) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/criteria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          name: createName.trim(),
          maxScore: createMaxScore,
          sortOrder: Number(createSortOrder),
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonSafe<MutationErrorResponse>(response);

        await showError(
          "Failed to add criterion",
          getErrorMessage(payload, "Unable to add criterion."),
        );
        return;
      }

      setCreateName("");
      setCreateMaxScore("");
      setCreateSortOrder("0");

      await loadItems(eventId);
      await showSuccess(
        "Criterion added",
        "The criterion has been registered successfully.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(item: CriterionItem): Promise<void> {
    const response = await fetch("/api/admin/criteria", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to update criterion",
        getErrorMessage(payload, "Unable to update the selected criterion."),
      );
      return;
    }

    await loadItems(eventId);
    await showSuccess(
      "Criterion updated",
      "The criterion has been updated successfully.",
    );
  }

  async function handleDelete(id: string, criterionName: string): Promise<void> {
    const approved = await confirmDeleteCriterion(criterionName);

    if (!approved) return;

    const response = await fetch(`/api/admin/criteria?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to delete criterion",
        getErrorMessage(payload, "Unable to delete the selected criterion."),
      );
      return;
    }

    await loadItems(eventId);
    await showSuccess(
      "Criterion deleted",
      "The criterion has been removed.",
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
              Back to Dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                <ClipboardList className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Criteria Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Criteria
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Define scoring criteria, maximum scores, and evaluation order.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Events" value={stats.totalEvents} />
              <StatCard label="Criteria" value={stats.totalCriteria} />
              <StatCard
                label="Total Score"
                value={stats.totalMaxScore}
                highlight={stats.isOverLimit}
              />
              <InfoCard label="Selected Event" value={stats.selectedEventName} />
              <StatusInfoCard
                label="Event Status"
                status={stats.selectedEventStatus}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Select Event</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose which event you want to manage criteria for.
                </p>
              </div>

              <div>
                <label
                  htmlFor="eventId"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Event
                </label>

                <select
                  id="eventId"
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  disabled={isLoadingEvents || events.length === 0}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20">
                      <ClipboardList className="h-4 w-4 text-blue-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {selectedEvent.name}
                        </p>
                        <StatusBadge status={selectedEvent.status} />
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Event ID: {selectedEvent.id}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Add Criterion</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Register a scoring criterion under the selected event.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="criterion-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Criterion Name
                  </label>
                  <input
                    id="criterion-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Enter criterion name"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="criterion-max-score"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Maximum Score
                  </label>
                  <input
                    id="criterion-max-score"
                    type="number"
                    min="1"
                    value={createMaxScore}
                    onChange={(event) => setCreateMaxScore(event.target.value)}
                    placeholder="Enter maximum score"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="criterion-sort-order"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Sort Order
                  </label>
                  <input
                    id="criterion-sort-order"
                    type="number"
                    value={createSortOrder}
                    onChange={(event) => setCreateSortOrder(event.target.value)}
                    placeholder="Enter sort order"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
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
                      Adding Criterion...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Criterion
                    </>
                  )}
                </button>
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Criteria List</h2>
              <p className="text-sm text-slate-400">
                Review and update the registered criteria for the selected event.
              </p>
            </div>

            {!eventId ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6 text-slate-400" />}
                title="No event selected"
                description="Select an event first before viewing or adding criteria."
              />
            ) : isLoadingItems ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading criteria...
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Scale className="h-6 w-6 text-slate-400" />}
                title="No criteria found"
                description="Add your first scoring criterion using the form on the left panel."
              />
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <CriterionCard
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

function CriterionCard({
  item,
  onSave,
  onDelete,
}: {
  item: CriterionItem;
  onSave: (item: CriterionItem) => Promise<void>;
  onDelete: (id: string, criterionName: string) => Promise<void>;
}) {
  const [draftName, setDraftName] = useState(item.name);
  const [draftMaxScore, setDraftMaxScore] = useState(item.maxScore);
  const [draftSortOrder, setDraftSortOrder] = useState(String(item.sortOrder));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftName(item.name);
    setDraftMaxScore(item.maxScore);
    setDraftSortOrder(String(item.sortOrder));
  }, [item.id, item.name, item.maxScore, item.sortOrder]);

  const trimmedName = draftName.trim();
  const parsedMaxScore = Number(draftMaxScore);
  const parsedSortOrder = Number(draftSortOrder);

  const isNameValid = trimmedName.length > 0;
  const isMaxScoreValid = Number.isFinite(parsedMaxScore) && parsedMaxScore > 0;
  const isSortOrderValid = Number.isFinite(parsedSortOrder);

  const isDirty =
    trimmedName !== item.name ||
    draftMaxScore !== item.maxScore ||
    parsedSortOrder !== item.sortOrder;

  const canSave =
    isDirty &&
    isNameValid &&
    isMaxScoreValid &&
    isSortOrderValid &&
    !isSaving;

  async function handleSave(): Promise<void> {
    if (!canSave) return;

    try {
      setIsSaving(true);

      await onSave({
        ...item,
        name: trimmedName,
        maxScore: draftMaxScore,
        sortOrder: parsedSortOrder,
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
            <ClipboardList className="h-5 w-5 text-blue-400" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">
              {item.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                Max Score:{" "}
                <span className="font-medium text-slate-300">{item.maxScore}</span>
              </span>
              <span>
                Sort Order:{" "}
                <span className="font-medium text-slate-300">{item.sortOrder}</span>
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-slate-500">
              Criterion ID: {item.id}
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_160px_160px_220px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Criterion Name
          </label>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Criterion name"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Max Score
          </label>
          <input
            type="number"
            min="1"
            value={draftMaxScore}
            onChange={(event) => setDraftMaxScore(event.target.value)}
            placeholder="Max score"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Sort Order
          </label>
          <div className="relative">
            <ListOrdered className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="number"
              value={draftSortOrder}
              onChange={(event) => setDraftSortOrder(event.target.value)}
              placeholder="Sort order"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
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
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        highlight
          ? "border-amber-900/50 bg-amber-950/40"
          : "border-slate-800 bg-slate-950/60"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>

      <p
        className={`mt-1 text-lg font-semibold ${
          highlight ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </p>

      {highlight && (
        <p className="mt-1 text-xs text-amber-400">
          Exceeds recommended max (100)
        </p>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusInfoCard({
  label,
  status,
}: {
  label: string;
  status: EventStatus | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-2">
        {status ? (
          <StatusBadge status={status} />
        ) : (
          <span className="text-sm font-semibold text-slate-400">None</span>
        )}
      </div>
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