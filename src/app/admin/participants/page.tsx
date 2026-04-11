"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

type EventStatus = "draft" | "open" | "closed";
type EventItem = {
  id: string;
  name: string;
  status: EventStatus;
};

type ParticipantItem = {
  id: string;
  number: number;
  name: string;
};

type EventsResponse = {
  events?: EventItem[];
};

type ParticipantsResponse = {
  participants?: ParticipantItem[];
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

async function confirmDeleteParticipant(name: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete participant?",
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

export default function ParticipantsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState<ParticipantItem[]>([]);
  const [createNumber, setCreateNumber] = useState("");
  const [createName, setCreateName] = useState("");

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedEvent = useMemo(() => {
    return events.find((event) => event.id === eventId) ?? null;
  }, [events, eventId]);

  const canCreate = useMemo(() => {
    const parsedNumber = Number(createNumber);

    return (
      !isCreating &&
      eventId.trim().length > 0 &&
      createName.trim().length > 0 &&
      Number.isFinite(parsedNumber) &&
      parsedNumber > 0
    );
  }, [createNumber, createName, eventId, isCreating]);

  const stats = useMemo(() => {
    return {
      totalEvents: events.length,
      selectedParticipants: items.length,
      selectedEventName: selectedEvent?.name ?? "None",
      selectedEventStatus: selectedEvent?.status ?? null,
    };
  }, [events.length, items.length, selectedEvent]);

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
        `/api/admin/participants?eventId=${selectedEventId}`,
      );
      const payload = await parseJsonSafe<ParticipantsResponse>(response);

      setItems(payload?.participants ?? []);
    } finally {
      setIsLoadingItems(false);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!canCreate) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          number: Number(createNumber),
          name: createName.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonSafe<MutationErrorResponse>(response);

        await showError(
          "Failed to add participant",
          getErrorMessage(payload, "Unable to add participant."),
        );
        return;
      }

      setCreateNumber("");
      setCreateName("");
      await loadItems(eventId);
      await showSuccess(
        "Participant added",
        "The participant has been registered successfully.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(item: ParticipantItem): Promise<void> {
    const response = await fetch("/api/admin/participants", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to update participant",
        getErrorMessage(payload, "Unable to update the selected participant."),
      );
      return;
    }

    await loadItems(eventId);
    await showSuccess(
      "Participant updated",
      "The participant has been updated successfully.",
    );
  }

  async function handleDelete(id: string, participantName: string): Promise<void> {
    const approved = await confirmDeleteParticipant(participantName);

    if (!approved) return;

    const response = await fetch(`/api/admin/participants?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await parseJsonSafe<MutationErrorResponse>(response);

      await showError(
        "Failed to delete participant",
        getErrorMessage(payload, "Unable to delete the selected participant."),
      );
      return;
    }

    await loadItems(eventId);
    await showSuccess(
      "Participant deleted",
      "The participant has been removed.",
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
                <Users className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Participant Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Participants
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Manage participant entries, contestant numbers, and event
                  assignments in one place.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Events" value={stats.totalEvents} />
              <StatCard label="Participants" value={stats.selectedParticipants} />
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
                  Choose which event you want to manage participants for.
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
                      <CalendarDays className="h-4 w-4 text-blue-400" />
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
                <h2 className="text-lg font-semibold">Add Participant</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Register a participant under the selected event.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="participant-number"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Participant Number
                  </label>
                  <input
                    id="participant-number"
                    type="number"
                    min="1"
                    value={createNumber}
                    onChange={(event) => setCreateNumber(event.target.value)}
                    placeholder="Enter participant number"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participant-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Participant Name
                  </label>
                  <input
                    id="participant-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Enter participant name"
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
                      Adding Participant...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Participant
                    </>
                  )}
                </button>
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Participant List</h2>
              <p className="text-sm text-slate-400">
                Review and update the registered participants for the selected
                event.
              </p>
            </div>

            {!eventId ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6 text-slate-400" />}
                title="No event selected"
                description="Select an event first before viewing or adding participants."
              />
            ) : isLoadingItems ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading participants...
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<UserRound className="h-6 w-6 text-slate-400" />}
                title="No participants found"
                description="Add your first participant using the form on the left panel."
              />
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <ParticipantCard
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

function ParticipantCard({
  item,
  onSave,
  onDelete,
}: {
  item: ParticipantItem;
  onSave: (item: ParticipantItem) => Promise<void>;
  onDelete: (id: string, participantName: string) => Promise<void>;
}) {
  const [draftNumber, setDraftNumber] = useState(String(item.number));
  const [draftName, setDraftName] = useState(item.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftNumber(String(item.number));
    setDraftName(item.name);
  }, [item.id, item.number, item.name]);

  const trimmedName = draftName.trim();
  const parsedNumber = Number(draftNumber);

  const isNumberValid = Number.isFinite(parsedNumber) && parsedNumber > 0;
  const isNameValid = trimmedName.length > 0;
  const isDirty =
    parsedNumber !== item.number || trimmedName !== item.name;
  const canSave = isDirty && isNumberValid && isNameValid && !isSaving;

  async function handleSave(): Promise<void> {
    if (!canSave) return;

    try {
      setIsSaving(true);

      await onSave({
        ...item,
        number: parsedNumber,
        name: trimmedName,
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
            <UserRound className="h-5 w-5 text-blue-400" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">
              {item.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Participant No.{" "}
              <span className="font-medium text-slate-300">{item.number}</span>
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              Participant ID: {item.id}
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[160px_minmax(0,1fr)_220px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Number
          </label>
          <input
            type="number"
            min="1"
            value={draftNumber}
            onChange={(event) => setDraftNumber(event.target.value)}
            placeholder="Number"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Participant Name
          </label>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Participant name"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
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