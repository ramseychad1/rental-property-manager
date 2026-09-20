import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarRange,
  Users,
  Settings,
  MapPinned,
  ListX,
  LayoutTemplate,
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
    label: "Things To Do",
    superAdminOnly: true,
    to: "/things-to-do",
    icon: MapPinned,
    testid: "nav-things-to-do",
  },
  {
    label: "Site Content",
    superAdminOnly: true,
    to: "/site-content",
    icon: LayoutTemplate,
    testid: "nav-site-content",
  },
  {
    label: "Users",
    superAdminOnly: true,
    to: "/users",
    icon: Users,
    testid: "nav-users",
  },
  {
    label: "Error Logs",
    superAdminOnly: true,
    to: "/logs",
    icon: ListX,
    testid: "nav-error-logs",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    testid: "nav-settings",
  },
];
