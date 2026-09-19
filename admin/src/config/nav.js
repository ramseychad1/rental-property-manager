import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarRange,
  Users,
  Settings,
  NotebookPen,
  MapPinned,
  ListX,
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
    label: "Blogs",
    to: "/blogs",
    icon: NotebookPen,
    testid: "nav-blogs",
  },
  {
    label: "Things To Do",
    to: "/things-to-do",
    icon: MapPinned,
    testid: "nav-things-to-do",
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    testid: "nav-users",
  },
  {
    label: "Error Logs",
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
