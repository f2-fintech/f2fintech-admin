"use client";

import * as React from "react";
import RouterLink from "next/link";
import { usePathname } from "next/navigation";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import { useMediaQuery } from "@mui/material";

import type { NavItemConfig } from "@/types/nav";
import { isNavItemActive } from "@/utils/is-nav-item-active";
import { Logo } from "@/app/components/core/logo";
import { navItems } from "./config";
import { navIcons } from "./nav-icons";
import { Utility } from "@/utils";

// Single unified colour for all icons — matches desktop sidebar
const ICON_ACCENT  = "#3949ab";
const ACTIVE_ACCENT = "#303f9f";

const iconColor = (_icon?: string, active = false) =>
  active ? ACTIVE_ACCENT : ICON_ACCENT;

// ─── Role filtering (same rules as side-nav) ──────────────────────────────────
function filterForRole(items: NavItemConfig[], userRole: string): NavItemConfig[] {
  return items
    .filter((item) => {
      if ((item.key === "securedLoans" || item.title === "Secured Loans") && userRole !== "admin") return false;
      if (userRole === "super admin") return ["Company", "Users", "Teams"].includes(item.title ?? "");
      if (userRole === "admin") return !["Company"].includes(item.title ?? "");
      if (userRole === "sales") return ["Dashboard", "Applications"].includes(item.title ?? "");
      if (userRole === "operations") return item.title === "Applications";
      if (userRole === "credit") return item.title === "Applications";
      if (["Users", "Loan Provider", "Archived", "Company", "Teams", "Secured Loans"].includes(item.title ?? "")) return false;
      return true;
    })
    .map((item) => {
      if (item.title === "Applications" && userRole === "credit" && item.items) {
        return { ...item, items: item.items.filter((c) => c.title === "Tickets") };
      }
      return item;
    });
}

export interface MobileNavProps {
  onClose?: () => void;
  open?: boolean;
}

export function MobileNav({ open, onClose }: MobileNavProps): React.JSX.Element {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width:600px)");
  const isTab = useMediaQuery("(min-width:601px) and (max-width:1200px)");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { decodedToken } = Utility();
  const userRole = isMounted ? (decodedToken()?.role ?? "") : "";
  const visibleItems = filterForRole(navItems, userRole);

  return (
    <Drawer
      PaperProps={{
        sx: {
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          maxWidth: "100%",
          scrollbarWidth: "none",
          width: isMobile ? "55vw" : isTab ? "35vw" : "260px",
          "&::-webkit-scrollbar": { display: "none" },
        },
      }}
      onClose={onClose}
      open={open}
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href="/" sx={{ display: "flex", alignItems: "center" }}>
          <Logo color="light" height={32} width={122} />
        </Box>
      </Stack>

      <Divider />

      <Box component="nav" sx={{ flex: "1 1 auto", p: "12px" }}>
        <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {visibleItems.map((item) =>
            item.items?.length ? (
              <MobileNavGroup key={item.key} item={item} pathname={pathname} onClose={onClose} />
            ) : (
              <MobileNavItem key={item.key} item={item} pathname={pathname} onClose={onClose} />
            )
          )}
        </Stack>
      </Box>

      <Divider />
    </Drawer>
  );
}

// ─── Group item ───────────────────────────────────────────────────────────────
function MobileNavGroup({ item, pathname, onClose }: { item: NavItemConfig; pathname: string; onClose?: () => void }) {
  const isAnyChildActive = (item.items ?? []).some((c) =>
    isNavItemActive({ href: c.href, matcher: c.matcher, pathname, disabled: c.disabled })
  );
  const [open, setOpen] = React.useState(isAnyChildActive);
  React.useEffect(() => { if (isAnyChildActive) setOpen(true); }, [isAnyChildActive]);

  const Icon = item.icon ? navIcons[item.icon] : null;
  const accent = iconColor(item.icon, isAnyChildActive);

  return (
    <li style={{ listStyle: "none" }}>
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          p: "8px 12px", borderRadius: "10px", cursor: "pointer",
          bgcolor: isAnyChildActive ? "rgba(12,102,228,0.12)" : "transparent",
          color: isAnyChildActive ? "#0c3d8a" : "#1e3a5f",
          "&:hover": { bgcolor: "rgba(12,102,228,0.07)" },
          transition: "all 0.2s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "7px", bgcolor: `${accent}18`, boxShadow: `0 0 7px 1px ${accent}44` }}>
          {Icon && <Icon sx={{ fontSize: "1.1rem", color: accent }} />}
        </Box>
        <Typography sx={{ flex: 1, fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: isAnyChildActive ? 700 : 500 }}>
          {item.title}
        </Typography>
        {open ? <ExpandMoreRounded sx={{ fontSize: "1rem" }} /> : <ChevronRightRounded sx={{ fontSize: "1rem" }} />}
      </Box>

      <Collapse in={open}>
        <Stack spacing={0.25} sx={{ pl: "2.75rem", pr: 1, pb: 0.5 }}>
          {(item.items ?? []).map((child) => {
            const childActive = isNavItemActive({ href: child.href, matcher: child.matcher, pathname, disabled: child.disabled });
            const ChildIcon = child.icon ? navIcons[child.icon] : null;
            const childAccent = iconColor(child.icon, childActive);
            const isTicketDetail = child.title === "Tickets" && pathname.startsWith("/ticket/");

            return (
              <Box
                key={child.key}
                component={RouterLink}
                href={child.href ?? "#"}
                onClick={onClose}
                sx={{
                  display: "flex", alignItems: "center", gap: 1,
                  px: 1.5, py: "7px", borderRadius: "8px", textDecoration: "none",
                  bgcolor: childActive ? "rgba(12,102,228,0.12)" : "transparent",
                  color: childActive ? "#0c3d8a" : "#1e3a5f",
                  "&:hover": { bgcolor: "rgba(12,102,228,0.07)" },
                  transition: "all 0.2s ease",
                }}
              >
                {ChildIcon && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "6px", bgcolor: `${childAccent}18`, boxShadow: `0 0 5px 1px ${childAccent}33` }}>
                    <ChildIcon sx={{ fontSize: "0.9rem", color: childAccent }} />
                  </Box>
                )}
                <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", fontWeight: childActive ? 700 : 500 }}>
                  {child.title}
                </Typography>
                {isTicketDetail && (
                  <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.3 }}>
                    <ChevronRightRounded sx={{ fontSize: "0.85rem", color: childAccent }} />
                    <ArticleRounded sx={{ fontSize: "0.8rem", color: childAccent, opacity: 0.8 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </li>
  );
}

// ─── Simple nav item ──────────────────────────────────────────────────────────
function MobileNavItem({ item, pathname, onClose }: { item: NavItemConfig; pathname: string; onClose?: () => void }) {
  const active = isNavItemActive({ href: item.href, matcher: item.matcher, pathname, disabled: item.disabled });
  const Icon = item.icon ? navIcons[item.icon] : null;
  const accent = iconColor(item.icon, active);

  return (
    <li style={{ listStyle: "none" }}>
      <Box
        component={item.href ? RouterLink : "div"}
        href={item.href}
        onClick={onClose}
        sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          p: "8px 12px", borderRadius: "10px", cursor: "pointer",
          textDecoration: "none",
          bgcolor: active ? "rgba(12,102,228,0.12)" : "transparent",
          color: active ? "#0c3d8a" : "#1e3a5f",
          "&:hover": { bgcolor: "rgba(12,102,228,0.07)" },
          transition: "all 0.2s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "7px", bgcolor: active ? "rgba(255,255,255,0.7)" : `${accent}18`, boxShadow: active ? `0 0 9px 2px ${accent}77` : `0 0 6px 1px ${accent}44` }}>
          {Icon && <Icon sx={{ fontSize: "1.1rem", color: accent }} />}
        </Box>
        <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: active ? 700 : 500 }}>
          {item.title}
        </Typography>
      </Box>
    </li>
  );
}
