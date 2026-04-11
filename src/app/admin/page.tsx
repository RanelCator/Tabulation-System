import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  LogOut,
  Medal,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/session";

const adminModules = [
  {
    title: "Events",
    description: "Create and manage event schedules, categories, and settings.",
    href: "/admin/events",
    icon: CalendarDays,
  },
  {
    title: "Participants",
    description: "Register, organize, and manage event participants.",
    href: "/admin/participants",
    icon: Users,
  },
  {
    title: "Criteria",
    description: "Define scoring criteria, weights, and judging structure.",
    href: "/admin/criteria",
    icon: ClipboardList,
  },
  {
    title: "Judges",
    description: "Create judge accounts and assign them to specific events.",
    href: "/admin/judges",
    icon: Gavel,
  },
  {
    title: "Deductions",
    description: "Manage penalties, deductions, and rule-based adjustments.",
    href: "/admin/deductions",
    icon: ShieldCheck,
  },
  {
    title: "Rankings",
    description: "Review final scores, rankings, and generated results.",
    href: "/admin/rankings",
    icon: Medal,
  },
];

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/judge");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                <LayoutDashboard className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Administration Panel
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Admin Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Manage events, judges, participants, criteria, deductions, and rankings
                  from one centralized tabulation system.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:min-w-[240px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Administrator
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Full access to all management modules
                </p>
              </div>

              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Role"
              value="Admin"
              helper="Full system administration access"
            />
            <StatCard
              label="Modules"
              value={String(adminModules.length)}
              helper="Core management sections available"
            />
            <StatCard
              label="Session"
              value="Secure"
              helper="Authenticated administrative session"
            />
            <StatCard
              label="Workspace"
              value="Live"
              helper="Active tabulation management environment"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Management Modules</h2>
              <p className="text-sm text-slate-400">
                Access and maintain all major administrative functions.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-blue-500/40 hover:bg-slate-900 hover:shadow-lg"
                >
                  <div className="flex h-full flex-col justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20 transition group-hover:bg-blue-600/15">
                        <Icon className="h-5 w-5 text-blue-400" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white transition group-hover:text-blue-400">
                          {module.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-400">
                      Open module
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}