import { useCommandStore } from "@/stores/command";

export const commands = [
  {
    id: "add-student",
    trigger: "/addstudent",
    description: "Open Add Student form",
    run: ({ router, close }) => {
      router.push("/students/create");
      close();
    },
  },
  {
    id: "add-student-short",
    trigger: "/ads",
    description: "Open Add Student form",
    run: ({ router, close }) => {
      router.push("/students/create");
      close();
    },
  },
  {
    id: "goto-dashboard",
    trigger: "/dashboard",
    description: "Go to Dashboard",
    run: ({ router, close }) => {
      router.push("/dashboard");
      close();
    },
  },
  {
    id: "goto-dashboard-short",
    trigger: "/db",
    description: "Go to Dashboard",
    run: ({ router, close }) => {
      router.push("/dashboard");
      close();
    },
  },
  {
    id: "goto-interviews",
    trigger: "/interviews",
    description: "Open Interviews list",
    run: ({ router, close }) => {
      router.push("/interviews");
      close();
    },
  },
  {
    id: "goto-interviews-short",
    trigger: "/in",
    description: "Open Interviews list",
    run: ({ router, close }) => {
      router.push("/interviews");
      close();
    },
  },
  {
    id: "goto-companies",
    trigger: "/companies",
    description: "Open Companies list",
    run: ({ router, close }) => {
      router.push("/companies");
      close();
    },
  },
  {
    id: "goto-companies-short",
    trigger: "/co",
    description: "Open Companies list",
    run: ({ router, close }) => {
      router.push("/companies");
      close();
    },
  },
  {
    id: "goto-candidates",
    trigger: "/candidates",
    description: "Open Candidates list",
    run: ({ router, close }) => {
      router.push("/candidates");
      close();
    },
  },
  {
    id: "goto-candidates-short",
    trigger: "/ca",
    description: "Open Candidates list",
    run: ({ router, close }) => {
      router.push("/candidates");
      close();
    },
  },
  {
    id: "goto-jobs",
    trigger: "/jobs",
    description: "Open Jobs list",
    run: ({ router, close }) => {
      router.push("/jobs");
      close();
    },
  },
  {
    id: "goto-jobs-short",
    trigger: "/jo",
    description: "Open Jobs list",
    run: ({ router, close }) => {
      router.push("/jobs");
      close();
    },
  },
  {
    id: "goto-payments",
    trigger: "/payments",
    description: "Open Payments ledger",
    run: ({ router, close }) => {
      router.push("/payments");
      close();
    },
  },
  {
    id: "goto-payments-short",
    trigger: "/pay",
    description: "Open Payments ledger",
    run: ({ router, close }) => {
      router.push("/payments");
      close();
    },
  },
  {
    id: "goto-settings",
    trigger: "/settings",
    description: "Open Settings",
    run: ({ router, close }) => {
      router.push("/settings");
      close();
    },
  },
  {
    id: "goto-settings-short",
    trigger: "/se",
    description: "Open Settings",
    run: ({ router, close }) => {
      router.push("/settings");
      close();
    },
  },
  {
    id: "goto-reports",
    trigger: "/reports",
    description: "Open Reports",
    run: ({ router, close }) => {
      router.push("/reports");
      close();
    },
  },
  {
    id: "goto-reports-short",
    trigger: "/re",
    description: "Open Reports",
    run: ({ router, close }) => {
      router.push("/reports");
      close();
    },
  },
  {
    id: "goto-reports-jobs",
    trigger: "/reportsjobs",
    description: "Open Jobs summary report",
    run: ({ router, close }) => {
      router.push("/reports/jobs-summary");
      close();
    },
  },
  {
    id: "goto-reports-placements",
    trigger: "/reportsplacements",
    description: "Open Placements report",
    run: ({ router, close }) => {
      router.push("/reports/placements");
      close();
    },
  },
  {
    id: "add-candidate",
    trigger: "/addcandidate",
    description: "Open Add Candidate form",
    run: ({ router, close }) => {
      router.push("/candidates/create");
      close();
    },
  },
  {
    id: "add-candidate-short",
    trigger: "/adc",
    description: "Open Add Candidate form",
    run: ({ router, close }) => {
      router.push("/candidates/create");
      close();
    },
  },
  {
    id: "add-company",
    trigger: "/addcompany",
    description: "Open Add Company form",
    run: ({ router, close }) => {
      router.push("/companies/create");
      close();
    },
  },
  {
    id: "add-company-short",
    trigger: "/adco",
    description: "Open Add Company form",
    run: ({ router, close }) => {
      router.push("/companies/create");
      close();
    },
  },
  {
    id: "add-job",
    trigger: "/addjob",
    description: "Open Add Job form",
    run: ({ router, close }) => {
      router.push("/jobs/new");
      close();
    },
  },
  {
    id: "add-job-short",
    trigger: "/adj",
    description: "Open Add Job form",
    run: ({ router, close }) => {
      router.push("/jobs/new");
      close();
    },
  },
  {
    id: "add-interview",
    trigger: "/addinterview",
    description: "Open Add Interview form",
    run: ({ router, close }) => {
      router.push("/interviews/new");
      close();
    },
  },
  {
    id: "add-interview-short",
    trigger: "/adi",
    description: "Open Add Interview form",
    run: ({ router, close }) => {
      router.push("/interviews/new");
      close();
    },
  },
  {
    id: "add-payment",
    trigger: "/adp",
    description: "Open Add Payment modal",
    run: ({ router, close }) => {
      const existing = (() => {
        try {
          if (typeof window === "undefined") return new URLSearchParams();
          return new URLSearchParams(window.location.search);
        } catch {
          return new URLSearchParams();
        }
      })();

      const params = new URLSearchParams();
      const keys = [
        "company_id",
        "candidate_id",
        "job_id",
        "include_inactive",
        "start_date",
        "end_date",
        "min_amount",
        "max_amount",
        "limit",
      ];

      keys.forEach((key) => {
        const value = existing.get(key);
        if (value != null && value !== "") params.set(key, value);
      });

      existing.getAll("source").forEach((value) => {
        if (value != null && value !== "") params.append("source", value);
      });

      params.set("add_payment", "1");

      const qs = params.toString();
      router.push(qs ? `/payments?${qs}` : "/payments?add_payment=1");
      close();
    },
  },
  {
    id: "search",
    trigger: "/search",
    description: "Search with a query, e.g. /search python developer",
    run: ({ query, router, close }) => {
      const raw = query || "";
      const withoutTrigger = raw.slice("/search".length).trim();
      const searchQuery = withoutTrigger || "";

      const params = new URLSearchParams();
      if (searchQuery) {
        params.set("q", searchQuery);
      }

      const url = params.toString() ? `/search?${params.toString()}` : "/search";
      router.push(url);
      close();
    },
  },
];

export function getCommandForInput(input) {
  const value = (input || "").trim();
  if (!value) return null;

  const exact = commands.find((cmd) => value.toLowerCase() === cmd.trigger.toLowerCase());
  if (exact) return { command: exact };

  if (value.toLowerCase().startsWith("/search")) {
    const searchCommand = commands.find((cmd) => cmd.id === "search");
    if (searchCommand) return { command: searchCommand };
  }

  return null;
}

export function resetCommandState() {
  const { close } = useCommandStore.getState();
  close();
}
