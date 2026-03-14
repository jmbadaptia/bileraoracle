import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, Shield } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_SECTIONS } from "@/lib/constants";

interface MobileNavProps {
  userRole: string;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { pathname } = useLocation();

  const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) return false;
    return !allHrefs.some(
      (other) =>
        other !== href &&
        other.length > href.length &&
        (pathname === other || pathname.startsWith(other + "/"))
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navegación</SheetTitle>
        <div className="flex items-center h-16 px-6 border-b shrink-0">
          {logoError ? (
            <Shield className="h-6 w-6 shrink-0 text-primary mr-2" />
          ) : (
            <img
              src={`${API_BASE}/admin/logo`}
              alt="Logo"
              className="h-6 w-6 shrink-0 object-contain mr-2"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="font-semibold text-sm leading-tight truncate">{APP_NAME}</span>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={cn("px-3", sIdx === 0 ? "pt-4" : "pt-2")}>
              {section.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:bg-accent"
                    )}
                  >
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

      </SheetContent>
    </Sheet>
  );
}
