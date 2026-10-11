import { useRef, useState } from "react";
import { Link, Navigate, NavLink, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import accessModel from "@/help/access-model.html?raw";

// Help topics, in menu order. The first is the landing page. Add a topic by
// dropping an HTML file in src/help and listing it here.
const TOPICS = [
  {
    slug: "access-model",
    label: "Roles and access",
    blurb: "Who can do what, and in which complex",
    icon: ShieldCheck,
    html: accessModel,
  },
];

// Topic HTML is our own bundled file. It renders in a sandboxed iframe so its
// styles stay separate from the app's; the app theme is passed in as data-theme.
function TopicFrame({ html, theme }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(900);
  const doc = html.replace("<html lang=\"en\">", `<html lang="en" data-theme="${theme}">`);

  const fit = () => {
    const d = ref.current?.contentDocument;
    if (d?.documentElement) setHeight(d.documentElement.scrollHeight + 8);
  };

  return (
    <iframe
      ref={ref}
      title="Help topic"
      srcDoc={doc}
      sandbox="allow-same-origin"
      onLoad={() => {
        fit();
        ref.current?.contentWindow?.addEventListener("resize", fit);
      }}
      style={{ height }}
      className="w-full border-0 bg-transparent"
      data-testid="help-frame"
    />
  );
}

export default function HelpPage() {
  const { topic } = useParams();
  const { theme } = useTheme();
  const current = TOPICS.find((t) => t.slug === topic);
  if (!current) return <Navigate to={`/help/${TOPICS[0].slug}`} replace />;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="help-page">
      <header className="border-b px-5 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="" className="h-8 w-auto" />
          <span className="font-display font-bold">Help</span>
        </div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="help-back">
          <ArrowLeft className="w-4 h-4" /> Back to admin
        </Link>
      </header>
      <div className="mx-auto max-w-6xl grid gap-6 p-5 md:p-8 md:grid-cols-[230px_1fr] items-start">
        <nav aria-label="Help topics" className="flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-6">
          {TOPICS.map((t) => (
            <NavLink
              key={t.slug}
              to={`/help/${t.slug}`}
              data-testid={`help-topic-${t.slug}`}
              className={({ isActive }) =>
                cn(
                  "flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
                )
              }
            >
              <t.icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.blurb}</span>
              </span>
            </NavLink>
          ))}
        </nav>
        <TopicFrame key={`${current.slug}-${theme}`} html={current.html} theme={theme} />
      </div>
    </div>
  );
}
