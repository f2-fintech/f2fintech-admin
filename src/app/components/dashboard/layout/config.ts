import type { NavItemConfig } from "@/types/nav";

export const navItems: NavItemConfig[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: "chart-pie",
  },
  {
    key: "applications",
    title: "Applications",
    icon: "folder-open",
    // No top-level href — this is a collapsible group
    items: [
      {
        key: "fresh-applications",
        title: "Fresh",
        href: "/home",
        icon: "fiber-new",
      },
      {
        key: "tickets",
        title: "Tickets",
        href: "/ticket",
        icon: "ticket",
        // Matches /ticket and /ticket/* (detail pages)
        matcher: { type: "startsWith", href: "/ticket" },
      },
    ],
  },
  {
    key: "securedLoans",
    title: "Secured Loans",
    href: "/secured-loans",
    icon: "security",
  },
  {
    key: "users",
    title: "Users",
    href: "/users",
    icon: "users",
  },
  {
    key: "loanProvider",
    title: "Loan Provider",
    href: "/loan-provider",
    icon: "bank",
  },
  {
    key: "archived",
    title: "Archived",
    href: "/tickets-archive",
    icon: "file-archive",
  },
  {
    key: "company",
    title: "Company",
    href: "/company",
    icon: "business",
  },
  {
    key: "leadType",
    title: "Leads",
    href: "/leads",
    icon: "plugs-connected",
  },
  {
    key: "sendQuery",
    title: "Query",
    href: "/send-query",
    icon: "list-magnifying-glass",
  },
  {
    key: "teams",
    title: "Teams",
    href: "/teams",
    icon: "people",
  },
];
