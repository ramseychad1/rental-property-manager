import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { vertical } from "@/config/vertical";
import { navConfig } from "@/config/nav";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-foreground text-background">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold">{vertical.brand.name}</span>
              <span className="overline !text-[9px]">{vertical.brand.tagline}</span>
            </div>
          </div>
          <nav className="py-3 px-3 space-y-0.5">
            {navConfig.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`mobile-${item.testid}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    isActive && "bg-sidebar-accent text-sidebar-foreground",
                  )
                }
              >
                <item.icon className="w-5 h-5" /> {item.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMobileMenu={() => setMobileOpen(true)} />
        <motion.main
          data-testid="app-main"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 p-5 md:p-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
