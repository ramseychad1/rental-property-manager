import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navConfig } from "@/config/nav";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const isUnder = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

// A menu entry with children: click to expand/collapse; opens itself when you
// are on one of its pages. In the collapsed (icon-only) sidebar it becomes one
// icon that goes to the first child.
function NavGroup({ item, collapsed }) {
  const { pathname } = useLocation();
  const childActive = item.children.some((c) => isUnder(pathname, c.to));
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const rowClass = cn(
    "group relative overflow-hidden flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors w-full",
    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
    childActive && "text-sidebar-foreground",
    collapsed && "justify-center px-0",
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink to={item.children[0].to} data-testid={item.testid}>
            <div className={cn(rowClass, childActive && "bg-sidebar-accent")}>
              <item.icon className="w-[18px] h-[18px] shrink-0" />
            </div>
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}: {item.children.map((c) => c.label).join(", ")}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid={item.testid}
        className={rowClass}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border pl-2">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} data-testid={c.testid}>
              {({ isActive }) => (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 h-9 text-sm font-medium transition-colors",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    isActive && "bg-sidebar-accent text-sidebar-foreground",
                  )}
                >
                  <c.icon className="w-4 h-4 shrink-0" />
                  {c.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { isSuperAdmin } = useAuth();
  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "hidden md:flex sticky top-0 h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center  gap-2.5 h-16 px-4 border-b border-sidebar-border",
          collapsed && "justify-center px-0",
        )}
      >
        <img
          src={collapsed ? "/logo-mark.png" : "/logo.png"}
          className={collapsed ? "h-10 w-auto" : "h-14 w-auto"}
          alt="Rental Property Manager"
        />
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navConfig.filter((item) => isSuperAdmin || !item.superAdminOnly).map((item) => {
            if (item.children) return <NavGroup key={item.testid} item={item} collapsed={collapsed} />;
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testid}
              >
                {({ isActive }) => (
                  <div
                    className={cn(
                      "group relative overflow-hidden flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      isActive && "bg-sidebar-accent text-sidebar-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {/* ✅ Left active indicator */}
                    <span
                      className={cn(
                        "absolute left-0 top-0 h-full w-1 rounded-r-md transition-all",
                        isActive ? "bg-sidebar-primary" : "bg-transparent",
                      )}
                    />

                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                )}
              </NavLink>
            );
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>
      </TooltipProvider>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          data-testid="sidebar-collapse-btn"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg h-9 px-3 text-xs font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4" /> <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onOpenChange }) {
  // Sheet wrapper used in AppShell.
  return null && [open, onOpenChange]; // placeholder export — real one in AppShell.
}

export function _useSidebarState() {
  return useState(false);
}
