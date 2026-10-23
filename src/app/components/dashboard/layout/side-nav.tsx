"use client";

import * as React from "react";
import RouterLink from "next/link";
import { usePathname } from "next/navigation";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";

import type { NavItemConfig } from "@/types/nav";
import { isNavItemActive } from "@/utils/is-nav-item-active";
import { navItems } from "./config";
import { navIcons } from "./nav-icons";
import { Utility } from "@/utils";
import { Logo } from "../../core/logo";

// ─── Single unified colour for every icon ────────────────────────────────────
// Matches the app's primary indigo — same as Dashboard and Teams in collapsed mode
const ICON_ACCENT  = "#3949ab";
const ACTIVE_ACCENT = "#303f9f";

const SIDEBAR_BG   = "#c4d5eb";
const ACTIVE_BG    = "rgba(57, 73, 171, 0.18)";
const HOVER_BG     = "rgba(57, 73, 171, 0.09)";
const ACTIVE_COLOR = "#303f9f";
const BASE_COLOR   = "#1e3a5f";

// ─── Role filtering ───────────────────────────────────────────────────────────
function filterForRole(items: NavItemConfig[], userRole: string): NavItemConfig[] {
  return items
    .filter((item) => {
      if ((item.key === "securedLoans" || item.title === "Secured Loans") && userRole !== "admin") return false;
      if (userRole === "super admin") return ["Company", "Users", "Teams"].includes(item.title ?? "");
      if (userRole === "admin")       return !["Company"].includes(item.title ?? "");
      if (userRole === "sales")       return ["Dashboard", "Applications"].includes(item.title ?? "");
      if (userRole === "operations")  return item.title === "Applications";
      if (userRole === "credit")      return item.title === "Applications";
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

// ─── Main SideNav ─────────────────────────────────────────────────────────────
export function SideNav(): React.JSX.Element {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { decodedToken } = Utility();
  const userRole = isMounted ? (decodedToken()?.role ?? "") : "";

  const handleSignOut = React.useCallback(() => {
    document.cookie = "oms_cookie=; path=/; max-age=0; secure; samesite=strict";
    document.cookie = "userId=; path=/; max-age=0; secure; samesite=strict";
    document.cookie = "userRole=; path=/; max-age=0; secure; samesite=strict";
    document.cookie = "companyId=; path=/; max-age=0; secure; samesite=strict";
    document.cookie = "companyName=; path=/; max-age=0; secure; samesite=strict";
    localStorage.removeItem("oms_cookie");
    localStorage.removeItem("userId");
    localStorage.removeItem("companyId");
    localStorage.removeItem("selectedCompanyId");
    localStorage.removeItem("companyName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("email");
    location.reload();
  }, []);

  if (pathname === "/login") return <></>;

  const visibleItems = filterForRole(navItems, userRole);

  return (
    <Box
      sx={{
        bgcolor: SIDEBAR_BG,
        borderRight: "1px solid rgba(57,73,171,0.14)",
        boxShadow: "2px 0 10px rgba(57,73,171,0.08)",
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        height: "100vh",
        left: 0,
        position: "sticky",
        top: 0,
        width: collapsed ? "5vw" : "15vw",
        zIndex: "var(--SideNav-zIndex)",
        transition: "width 0.3s ease",
        scrollbarWidth: "none",
        "@media only screen and (min-width:1300px) and (max-width:1366px) and (orientation:landscape)": {
          width: collapsed ? "100px" : "220px",
        },
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {/* Logo + hamburger */}
      <Stack spacing={1} sx={{ p: "0.75rem" }}>
        <IconButton
          onClick={() => setCollapsed((p) => !p)}
          sx={{ width: "2rem", height: "2rem", color: ACTIVE_COLOR, alignSelf: collapsed ? "center" : "end" }}
        >
          <MenuIcon />
        </IconButton>
        <Box component={RouterLink} href="/" sx={{ display: "inline-flex" }}>
          <Logo collapsed={collapsed} />
        </Box>
      </Stack>

      <Divider sx={{ borderColor: "rgba(57,73,171,0.15)" }} />

      {/* Nav items */}
      <Box component="nav" sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
        <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", mt: 4, p: 0, px: "6px" }}>
          {visibleItems.map((item) =>
            item.items?.length ? (
              <NavGroupItem key={item.key} item={item} pathname={pathname} collapsed={collapsed} />
            ) : (
              <NavItem key={item.key} {...item} pathname={pathname} collapsed={collapsed} />
            )
          )}
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(57,73,171,0.15)" }} />

      {/* Sign out */}
      <Box sx={{ p: "0.75rem" }}>
        <Tooltip title={collapsed ? "Sign out" : ""} arrow placement="right">
          <Box
            onClick={handleSignOut}
            sx={{
              display: "flex", alignItems: "center", gap: 1.5,
              px: 2, py: 1, borderRadius: "8px", cursor: "pointer",
              color: "#b71c1c",
              transition: "all 0.2s ease",
              justifyContent: collapsed ? "center" : "flex-start",
              "&:hover": { bgcolor: "rgba(183,28,28,0.08)" },
            }}
          >
            <LogoutIcon sx={{ fontSize: "1.3rem" }} />
            <Collapse in={!collapsed} orientation="horizontal">
              <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                Sign out
              </Typography>
            </Collapse>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ─── Collapsible group (Applications) ────────────────────────────────────────
interface NavGroupItemProps {
  item: NavItemConfig;
  pathname: string;
  collapsed: boolean;
}

function NavGroupItem({ item, pathname, collapsed }: NavGroupItemProps) {
  const isAnyChildActive = (item.items ?? []).some((c) =>
    isNavItemActive({ href: c.href, matcher: c.matcher, pathname, disabled: c.disabled })
  );

  // Expand/collapse when sidebar is open
  const [open, setOpen] = React.useState(isAnyChildActive);
  React.useEffect(() => { if (isAnyChildActive) setOpen(true); }, [isAnyChildActive]);

  // Popover anchor — used when sidebar is collapsed
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(anchorEl);

  const Icon = item.icon ? navIcons[item.icon] : null;
  const accent = isAnyChildActive ? ACTIVE_ACCENT : ICON_ACCENT;

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (collapsed) {
      setAnchorEl(anchorEl ? null : e.currentTarget);
    } else {
      setOpen((p) => !p);
    }
  };

  return (
    <li style={{ listStyle: "none" }}>
      {/* Group header row */}
      <Box
        onClick={handleClick}
        sx={{
          display: "flex", alignItems: "center",
          gap: 1.5, px: 2, py: "9px",
          borderRadius: "0px 24px 24px 0px",
          cursor: "pointer",
          bgcolor: isAnyChildActive ? ACTIVE_BG : "transparent",
          color: isAnyChildActive ? ACTIVE_COLOR : BASE_COLOR,
          transition: "all 0.2s ease",
          justifyContent: collapsed ? "center" : "flex-start",
          "&:hover": { bgcolor: isAnyChildActive ? ACTIVE_BG : HOVER_BG },
        }}
      >
        {/* Icon box */}
        <Box
          sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: "8px",
            bgcolor: isAnyChildActive ? "rgba(255,255,255,0.6)" : `${ICON_ACCENT}18`,
            boxShadow: `0 0 8px 1px ${accent}44`,
            transition: "all 0.2s ease",
            "&:hover": { boxShadow: `0 0 12px 3px ${accent}66` },
          }}
        >
          {Icon && (
            <Tooltip title={collapsed ? item.title : ""} arrow placement="right">
              <Icon sx={{ fontSize: "1.25rem", color: accent }} />
            </Tooltip>
          )}
        </Box>

        {/* Label + chevron — only visible when expanded */}
        <Collapse in={!collapsed} orientation="horizontal">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}>
            <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: isAnyChildActive ? 700 : 500, color: "inherit" }}>
              {item.title}
            </Typography>
            {open
              ? <ExpandMoreRounded sx={{ fontSize: "1rem", color: "inherit" }} />
              : <ChevronRightRounded sx={{ fontSize: "1rem", color: "inherit" }} />}
          </Box>
        </Collapse>
      </Box>

      {/* Sub-items when sidebar is OPEN */}
      {!collapsed && (
        <Collapse in={open}>
          <SubItemList items={item.items ?? []} pathname={pathname} />
        </Collapse>
      )}

      {/* Dot indicator in collapsed mode when a child is active */}
      {collapsed && isAnyChildActive && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 0.25 }}>
          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: ACTIVE_COLOR }} />
        </Box>
      )}

      {/* Popover — appears to the right when sidebar is COLLAPSED */}
      <Popover
        open={popoverOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "center", horizontal: "left" }}
        PaperProps={{
          sx: {
            ml: 1, borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(57,73,171,0.18)",
            border: "1px solid rgba(57,73,171,0.15)",
            bgcolor: "#fff",
            minWidth: 160,
            p: 0.75,
          },
        }}
        disableScrollLock
      >
        {/* Popover title */}
        <Typography sx={{ px: 1.5, py: 0.75, fontFamily: "'Inter',sans-serif", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {item.title}
        </Typography>
        <Divider sx={{ mb: 0.5 }} />
        <SubItemList items={item.items ?? []} pathname={pathname} onNavigate={() => setAnchorEl(null)} />
      </Popover>
    </li>
  );
}

// ─── Shared sub-item list renderer ───────────────────────────────────────────
function SubItemList({ items, pathname, onNavigate }: { items: NavItemConfig[]; pathname: string; onNavigate?: () => void }) {
  return (
    <Stack spacing={0.25} sx={{ pl: onNavigate ? 0 : "2.75rem", pr: 1, pb: 0.5 }}>
      {items.map((child) => {
        const childActive = isNavItemActive({ href: child.href, matcher: child.matcher, pathname, disabled: child.disabled });
        const ChildIcon = child.icon ? navIcons[child.icon] : null;
        const accent = childActive ? ACTIVE_ACCENT : ICON_ACCENT;
        const isTicketDetail = child.title === "Tickets" && pathname.startsWith("/ticket/");

        return (
          <Box
            key={child.key}
            component={RouterLink}
            href={child.href ?? "#"}
            onClick={onNavigate}
            sx={{
              display: "flex", alignItems: "center", gap: 1,
              px: 1.5, py: "7px", borderRadius: "8px", textDecoration: "none",
              bgcolor: childActive ? ACTIVE_BG : "transparent",
              color: childActive ? ACTIVE_COLOR : BASE_COLOR,
              transition: "all 0.2s ease",
              "&:hover": { bgcolor: childActive ? ACTIVE_BG : HOVER_BG },
            }}
          >
            {ChildIcon && (
              <Box
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: "6px",
                  bgcolor: childActive ? "rgba(255,255,255,0.7)" : `${ICON_ACCENT}18`,
                  boxShadow: childActive ? `0 0 8px 2px ${accent}55` : `0 0 4px 1px ${ICON_ACCENT}30`,
                }}
              >
                <ChildIcon sx={{ fontSize: "0.95rem", color: accent }} />
              </Box>
            )}
            <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: "0.875rem", fontWeight: childActive ? 700 : 500, color: "inherit", whiteSpace: "nowrap" }}>
              {child.title}
            </Typography>
            {isTicketDetail && (
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.25 }}>
                <ChevronRightRounded sx={{ fontSize: "0.9rem", color: accent }} />
                <ArticleRounded sx={{ fontSize: "0.85rem", color: accent, opacity: 0.75 }} />
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

// ─── Simple nav item ──────────────────────────────────────────────────────────
interface NavItemProps extends Omit<NavItemConfig, "items"> {
  pathname: string;
  collapsed: boolean;
}

function NavItem({ disabled, external, href, icon, matcher, pathname, title, collapsed }: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const Icon = icon ? navIcons[icon] : null;
  const accent = active ? ACTIVE_ACCENT : ICON_ACCENT;

  return (
    <li style={{ listStyle: "none" }}>
      <Box
        {...(href
          ? { component: external ? "a" : RouterLink, href, target: external ? "_blank" : undefined, rel: external ? "noreferrer" : undefined }
          : { role: "button" })}
        sx={{
          textDecoration: "none !important",
          alignItems: "center",
          borderRadius: "0px 24px 24px 0px",
          color: active ? `${ACTIVE_COLOR} !important` : `${BASE_COLOR} !important`,
          cursor: "pointer",
          display: "flex",
          flexDirection: "row",
          gap: 1.5,
          width: "92% !important",
          padding: "8px 16px",
          position: "relative",
          justifyContent: collapsed ? "center" : "flex-start",
          backgroundColor: active ? ACTIVE_BG : "transparent",
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: active ? ACTIVE_BG : HOVER_BG },
        }}
      >
        {/* Glowing icon box — unified colour for all */}
        <Box
          sx={{
            bgcolor: active ? "rgba(255,255,255,0.6)" : `${ICON_ACCENT}18`,
            alignItems: "center", display: "flex", justifyContent: "center",
            flex: "0 0 auto", height: "32px", width: "32px", borderRadius: "8px",
            transition: "all 0.2s ease",
            boxShadow: active ? `0 0 10px 2px ${accent}77` : `0 0 6px 1px ${ICON_ACCENT}40`,
            "&:hover": { boxShadow: `0 0 12px 3px ${accent}77` },
          }}
        >
          {Icon ? (
            <Tooltip title={collapsed ? title : ""} arrow placement="right">
              <Icon sx={{ fontSize: "1.25rem", color: accent }} />
            </Tooltip>
          ) : null}
        </Box>

        <Collapse in={!collapsed} orientation="horizontal">
          <Box component="span" sx={{ color: "inherit", fontFamily: "'Inter',sans-serif", fontSize: "0.95rem", fontWeight: active ? 700 : 500, lineHeight: 1.5, whiteSpace: "nowrap" }}>
            {title}
          </Box>
        </Collapse>
      </Box>
    </li>
  );
}