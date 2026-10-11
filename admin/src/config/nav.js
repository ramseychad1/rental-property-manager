import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarRange,
  Users,
  Settings,
  MapPinned,
  UserCheck,
  Building2,
  LayoutTemplate,
  CircleHelp,
} from "lucide-react";
import { vertical } from "@/config/vertical";

export const navConfig = [
  {
    label: "Dashboard",
    to: "/",
    icon: LayoutDashboard,
    end: true,
    testid: "nav-dashboard",
  },
  {
    label: vertical.item.plural,
    to: `/${vertical.item.slug}`,
    icon: vertical.item.icon,
    testid: "nav-items",
  },
  {
    label: vertical.copy.bookings,
    to: "/bookings",
    icon: CalendarCheck2,
    testid: "nav-bookings",
  },
  {
    label: "Trusted Renters",
    to: "/trusted-renters",
    icon: UserCheck,
    testid: "nav-trusted-renters",
  },
  // A group: expands in the sidebar to show its children.
  {
    label: "Site Content",
    complexAdminOnly: true,
    icon: LayoutTemplate,
    testid: "nav-site-content",
    children: [
      { label: "Page content", to: "/site-content", icon: LayoutTemplate, testid: "nav-site-content-pages" },
      { label: "Things To Do", to: "/things-to-do", icon: MapPinned, testid: "nav-things-to-do" },
    ],
  },
  {
    label: "Complexes",
    superAdminOnly: true,
    to: "/complexes",
    icon: Building2,
    testid: "nav-complexes",
  },
  {
    label: "Users",
    complexAdminOnly: true,
    to: "/users",
    icon: Users,
    testid: "nav-users",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    testid: "nav-settings",
  },
  // Opens in a new tab (staff only, like everything else here).
  {
    label: "Help",
    to: "/help",
    icon: CircleHelp,
    newTab: true,
    testid: "nav-help",
  },
];
