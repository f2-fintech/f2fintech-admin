"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Bell as BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { List as ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { Clock as ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { X as CloseIcon } from "@phosphor-icons/react/dist/ssr/X";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { MagnifyingGlass as SearchIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SelectChangeEvent } from "@mui/material/Select";
import SupervisorAccountRounded from "@mui/icons-material/SupervisorAccountRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import { ArrowDropDownRounded } from "@mui/icons-material";
import BusinessRounded from "@mui/icons-material/BusinessRounded";

import { MobileNav } from "./mobile-nav";
import { UserPopover } from "./user-popover";
import { Utility } from "@/utils";
import { usePopover } from "@/hooks/use-popover";
import { CompanyAPI } from "@/apis/CompanyAPI";
import { ApplicationsAPI, NewApplication } from "@/apis/ApplicationsAPI";
import { NotificationsAPI, AdminNotification } from "@/apis/NotificationsAPI";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useGetMySubordinates } from "@/hooks/teams";

const SEEN_APPLICATIONS_KEY = "seenApplicationIds";

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_APPLICATIONS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_APPLICATIONS_KEY, JSON.stringify(Array.from(ids)));
}
export type UnifiedNotification =
  | { type: 'application'; data: NewApplication; id: string; date: number }
  | { type: 'ticket'; data: AdminNotification; id: string; date: number };

export function AppBarNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [companySearchQuery, setCompanySearchQuery] = React.useState<string>("");
  const [teamSearchQuery, setTeamSearchQuery] = React.useState<string>("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = React.useState(false);
  const companySearchRef = React.useRef<HTMLInputElement>(null);
  const teamSearchRef = React.useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("101");
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);

  const { decodedToken, capitalizeEachWord } = Utility();
  const userInfo = isMounted ? decodedToken() : null;
  const role = userInfo?.role || (isMounted && typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : '');
  const isSales = role === "sales";

  const userDesignation = userInfo?.designation?.toLowerCase() || '';
  const isL1OrL2 = ["team leader", "tl", "sales manager", "sm", "l1", "l2"].includes(userDesignation);

  // Refocus search inputs after each keystroke (MUI Select steals focus otherwise)
  React.useEffect(() => {
    if (companyDropdownOpen && companySearchRef.current) {
      companySearchRef.current.focus();
    }
  }, [companySearchQuery, companyDropdownOpen]);

  React.useEffect(() => {
    if (teamDropdownOpen && teamSearchRef.current) {
      teamSearchRef.current.focus();
    }
  }, [teamSearchQuery, teamDropdownOpen]);

  // Notification state
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [notifAnchorEl, setNotifAnchorEl] = useState<HTMLButtonElement | null>(null);
  const notifOpenRef = useRef(false);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);
  const hasLoadedNotifs = useRef<boolean>(false);
  const [page, setPage] = useState(1);

  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedCompanyId");
      if (saved !== null) {
        setSelectedCompany(saved);
      } else {
        setSelectedCompany("101");
        localStorage.setItem("selectedCompanyId", "101");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("companyChanged", { detail: "101" }));
        }, 0);
      }

      const savedTeamMember = localStorage.getItem("selectedTeamMemberId");

      if (role) {
        if (isSales && !isL1OrL2) {
          // Sales executive shouldn't have this in localStorage
          if (savedTeamMember !== null) {
            localStorage.removeItem("selectedTeamMemberId");
          }
        } else {
          if (savedTeamMember !== null) {
            setSelectedTeamMember(savedTeamMember);
          } else {
            setSelectedTeamMember("all");
            localStorage.setItem("selectedTeamMemberId", "all");
          }
        }
      }

      setSeenIds(getSeenIds());
    }
  }, []);

  const pathname = usePathname();
  const userPopover = usePopover<HTMLDivElement>();

  // Disable the Aggregator selector on ticket detail pages or create page
  const isTicketPage = /^\/ticket\/[^/]+/.test(pathname ?? "");
  const isCreatePage = pathname === "/home/create";
  const disableAggregator = isTicketPage || isCreatePage;

  // Fetch subordinates if sales manager / team leader
  const { value: subordinatesData } = useGetMySubordinates(
    isSales ? userInfo?.userId || userInfo?.id : null,
    isSales ? userInfo?.designation : null,
    role
  );
  const subordinates = subordinatesData?.data || [];

  const filteredSubordinates = subordinates.filter((m: any) => m.id !== Number(userInfo?.id));
  const l1Leaders = filteredSubordinates.filter((m: any) => {
    const d = m.designation?.toLowerCase() || '';
    return d === "team leader" || d === "tl";
  });
  const l0Executives = filteredSubordinates.filter((m: any) => {
    const d = m.designation?.toLowerCase() || '';
    return d !== "team leader" && d !== "tl";
  });

  const handleTeamMemberChange = (e: SelectChangeEvent) => {
    const value = e.target.value as string;
    setSelectedTeamMember(value);
    localStorage.setItem("selectedTeamMemberId", value);
    window.dispatchEvent(new CustomEvent("teamMemberChanged", { detail: value }));

    // Store and dispatch the name of the selected member
    let nameToStore = "All Team Members";
    if (String(value) === String(userInfo?.id)) {
      nameToStore = userInfo?.username || userInfo?.name || "My Details";
    } else {
      const member = subordinates.find((m: any) => String(m.id) === String(value));
      if (member) nameToStore = member.username;
    }
    localStorage.setItem("selectedTeamMemberName", nameToStore);
    window.dispatchEvent(new CustomEvent("teamMemberNameChanged", { detail: nameToStore }));
  };

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await CompanyAPI.getAll({ page: 1, limit: 100, isActive: true });
      const results = res.data.results || [];
      // Extra safety: filter only active companies on client side too
      const activeResults = results.filter((c: any) => c.isActive !== false);
      setCompanies(activeResults);
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/login") {
      fetchCompanies();
    }
  }, [fetchCompanies, pathname]);

  // Fetch unified notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true);
      const [apps, tickets] = await Promise.all([
        ApplicationsAPI.getNewApplications(50),
        NotificationsAPI.getAdminNotifications(50)
      ]);

      const unified: UnifiedNotification[] = [
        ...(Array.isArray(apps) ? apps : []).map(app => ({
          type: 'application' as const,
          data: app,
          id: `app_${app.applicationId}`,
          date: new Date(app.applicationDate).getTime()
        })),
        ...(Array.isArray(tickets) ? tickets : []).map(ticket => ({
          type: 'ticket' as const,
          data: ticket,
          id: `ticket_${ticket.id}`,
          date: new Date(ticket.created_at).getTime()
        }))
      ];

      // Sort by date descending
      unified.sort((a, b) => {
        const dateA = isNaN(a.date) ? 0 : a.date;
        const dateB = isNaN(b.date) ? 0 : b.date;
        return dateB - dateA;
      });
      setNotifications(unified);
      hasLoadedNotifs.current = true;
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login" || isSales) return;

    // Connect to the Express server (port 8080) where applications are created
    const webUrl =
      process.env.NEXT_PUBLIC_WEB_URL?.replace("/api/v1", "") || "http://localhost:8080";
    const socket = io(webUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket notifications server on port 8080");
    });

    socket.on("new-application", async (payload: { applicationId: number }) => {
      if (!payload || !payload.applicationId) return;
      try {
        const newApp = await ApplicationsAPI.getApplicationById(payload.applicationId);
        if (newApp) {
          setNotifications((prev) => {
            const newNotif: UnifiedNotification = {
              type: 'application',
              data: newApp,
              id: `app_${newApp.applicationId}`,
              date: new Date(newApp.applicationDate).getTime()
            };
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].sort((a, b) => b.date - a.date);
          });
          setPage(1);
        }
      } catch (error) {
        console.error("Error fetching new application for socket event:", error);
      }
    });

    socket.on("ticket-status-changed", async (payload: { notificationId: number, ticketId: number }) => {
      if (!payload || !payload.notificationId) return;
      try {
        const ticketNotif = await NotificationsAPI.getNotificationById(payload.notificationId);
        if (ticketNotif) {
          setNotifications((prev) => {
            const newNotif: UnifiedNotification = {
              type: 'ticket',
              data: ticketNotif,
              id: `ticket_${ticketNotif.id}`,
              date: new Date(ticketNotif.created_at).getTime()
            };
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].sort((a, b) => b.date - a.date);
          });
          setPage(1);
        }
      } catch (error) {
        console.error("Error fetching ticket notification for socket event:", error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isSales, pathname]);


  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(notifications.length / ITEMS_PER_PAGE));
  const paginatedNotifications = notifications.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleNotifOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNotifAnchorEl(event.currentTarget);
    notifOpenRef.current = true;
    if (!hasLoadedNotifs.current) {
      fetchNotifications();
    }
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
    notifOpenRef.current = false;
  };

  const handleMarkAllRead = () => {
    const updated = new Set(seenIds);
    notifications.forEach((n) => updated.add(n.id));
    setSeenIds(updated);
    saveSeenIds(updated);
  };

  const handleCompanyChange = (e: SelectChangeEvent) => {
    const value = e.target.value as string;
    setSelectedCompany(value);
    localStorage.setItem("selectedCompanyId", value);
    window.dispatchEvent(new CustomEvent("companyChanged", { detail: value }));
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  };

  if (pathname === "/login") return <></>;

  const notifOpen = Boolean(notifAnchorEl);
  const notifId = notifOpen ? "notification-popover" : undefined;

  return (
    <React.Fragment>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          display: "flex",
          justifyContent: "center",
          borderBottom: "1px solid var(--mui-palette-divider)",
          backgroundImage: "linear-gradient(#c4d5eb, #c4d5eb)",
          top: 0,
          zIndex: "6",
          height: "60px",
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ minHeight: "56px !important", height: "56px", alignItems: "center" }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Stack sx={{ alignItems: "center" }} direction="row" spacing={2}>
              <IconButton
                onClick={(): void => {
                  setOpenNav(true);
                }}
                sx={{ display: { lg: "none" } }}
              >
                <ListIcon />
              </IconButton>
            </Stack>

            <Stack sx={{ alignItems: "center" }} direction="row" spacing={2}>
              {/* Team Member Selector for Sales Managers and Team Leaders */}
              {isSales && isL1OrL2 && subordinates.length > 0 && (
                <Tooltip
                  title={disableAggregator ? "Team Member cannot be changed here" : ""}
                  placement="bottom"
                  arrow
                >
                  <FormControl
                    sx={{
                      minWidth: 180,
                      display: { xs: "none", sm: "block" },
                      opacity: disableAggregator ? 0.55 : 1,
                      transition: "opacity 0.2s",
                      mr: 2
                    }}
                    size="small"
                    variant="outlined"
                  >
                    <InputLabel id="team-select-label" shrink>
                      Team Member
                    </InputLabel>
                    <Select
                      labelId="team-select-label"
                      id="team-select"
                      value={selectedTeamMember}
                      label="Team Member"
                      onChange={handleTeamMemberChange}
                      disabled={disableAggregator}
                      displayEmpty
                      notched
                      fullWidth
                      onOpen={() => setTeamDropdownOpen(true)}
                      onClose={() => { setTeamSearchQuery(""); setTeamDropdownOpen(false); }}
                      IconComponent={ArrowDropDownRounded}
                      renderValue={(selected: any) => {
                        if (selected === "all" || !selected) {
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SupervisorAccountRounded fontSize="small" sx={{ color: '#3949ab' }} />
                              <Typography sx={{ fontWeight: 600, color: '#3949ab', fontSize: '0.9rem' }}>All Team Members</Typography>
                            </Box>
                          );
                        }
                        if (String(selected) === String(userInfo?.id)) {
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SupervisorAccountRounded fontSize="small" sx={{ color: '#3949ab' }} />
                              <Typography sx={{ fontWeight: 600, color: '#3949ab', fontSize: '0.9rem' }}>
                                {capitalizeEachWord(userInfo?.username || userInfo?.name || 'My Details')}
                              </Typography>
                            </Box>
                          );
                        }
                        const member = subordinates.find((m: any) => String(m.id) === String(selected));
                        if (member) {
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonRounded fontSize="small" sx={{ color: '#1976d2' }} />
                              <Typography sx={{ fontWeight: 500, color: '#172B4D', fontSize: '0.9rem' }}>
                                {capitalizeEachWord(member.username)}
                              </Typography>
                            </Box>
                          );
                        }
                        return selected;
                      }}
                      sx={{
                        borderRadius: "8px",
                        backgroundColor: "white",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(57, 73, 171, 0.2)",
                          transition: "all 0.2s ease",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(57, 73, 171, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#3949ab",
                          borderWidth: "2px",
                        },
                        "& .MuiSelect-select": {
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          paddingTop: 0,
                          paddingBottom: 0,
                          boxSizing: "border-box",
                        },
                      }}
                    >
                      {/* Team Member Search Box */}
                      <ListSubheader
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ p: 1, bgcolor: 'white', position: 'sticky', top: 0, zIndex: 1 }}
                      >
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Search member..."
                          value={teamSearchQuery}
                          inputRef={teamSearchRef}
                          onChange={(e) => setTeamSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon size={16} color="#94a3b8" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                            }
                          }}
                        />
                      </ListSubheader>

                      <MenuItem
                        value="all"
                        sx={{
                          fontWeight: 600,
                          color: '#3949ab',
                          py: 1.5,
                          borderBottom: selectedTeamMember === "all" ? 'none' : '1px solid #e2e8f0',
                          border: selectedTeamMember === "all" ? '2px solid #3949ab' : 'none',
                          borderRadius: selectedTeamMember === "all" ? '8px' : 0,
                          margin: selectedTeamMember === "all" ? '4px 8px' : 0,
                          display: "all team members".includes(teamSearchQuery.toLowerCase()) ? 'flex' : 'none'
                        }}
                      >
                        All Team Members
                      </MenuItem>

                      {/* Logged in User's own details */}
                      <MenuItem
                        value={userInfo?.id?.toString() || ""}
                        sx={{
                          mb: 1,
                          mt: 1,
                          mx: 1,
                          borderRadius: '8px',
                          backgroundColor: '#3949ab !important', // deep blue background
                          border: selectedTeamMember === (userInfo?.id?.toString() || "") ? '2px solid #1a237e' : '1px solid #3949ab',
                          boxShadow: selectedTeamMember === (userInfo?.id?.toString() || "") ? '0 0 0 2px #ffffff, 0 0 0 4px #1a237e' : 'none',
                          py: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Box sx={{ color: '#3949ab', display: 'flex', bgcolor: 'white', borderRadius: '50%', p: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <SupervisorAccountRounded fontSize="small" />
                          </Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                            {capitalizeEachWord(userInfo?.username || userInfo?.name || 'My Details')}
                          </Typography>
                          <Typography variant="caption" sx={{ ml: 'auto', color: '#3949ab', fontWeight: 700, bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                            {capitalizeEachWord(userInfo?.designation || "Sales Manager")}
                          </Typography>
                        </Box>
                      </MenuItem>

                      {/* L1 Team Leaders Group */}
                      {l1Leaders.filter((m: any) => !teamSearchQuery || m.username?.toLowerCase().includes(teamSearchQuery.toLowerCase()) || m.designation?.toLowerCase().includes(teamSearchQuery.toLowerCase())).length > 0 && (
                        <ListSubheader sx={{ bgcolor: '#f8fafc', lineHeight: '36px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <PersonRounded fontSize="small" /> L1: Team Leader
                        </ListSubheader>
                      )}
                      {l1Leaders.filter((m: any) => !teamSearchQuery || m.username?.toLowerCase().includes(teamSearchQuery.toLowerCase()) || m.designation?.toLowerCase().includes(teamSearchQuery.toLowerCase())).map((member: any) => {
                        const isSelected = selectedTeamMember === member.id.toString();
                        return (
                          <MenuItem
                            key={`member-${member.id}`}
                            value={member.id.toString()}
                            sx={{
                              margin: '4px 8px',
                              borderRadius: '8px',
                              py: 1,
                              backgroundColor: '#e3f2fd !important', // light blue background
                              border: isSelected ? '2px solid #1976d2' : '1px solid #1976d220',
                              boxShadow: isSelected ? '0 2px 8px rgba(25, 118, 210, 0.2)' : 'none',
                              '&:hover': { opacity: 0.9, borderColor: '#1976d2' }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                              <Box sx={{ color: '#1976d2', display: 'flex', bgcolor: 'white', borderRadius: '50%', p: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <PersonRounded fontSize="small" />
                              </Box>
                              <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', color: '#172B4D' }}>
                                {capitalizeEachWord(member.username)}
                              </Typography>
                              <Typography variant="caption" sx={{ ml: 'auto', color: '#1976d2', fontWeight: 600, bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                                {capitalizeEachWord(member.designation)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}

                      {/* L0 Executives Group */}
                      {l0Executives.filter((m: any) => !teamSearchQuery || m.username?.toLowerCase().includes(teamSearchQuery.toLowerCase()) || m.designation?.toLowerCase().includes(teamSearchQuery.toLowerCase())).length > 0 && (
                        <ListSubheader sx={{ bgcolor: '#f8fafc', lineHeight: '36px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: l1Leaders.length > 0 ? '1px solid #e2e8f0' : 'none', mt: l1Leaders.length > 0 ? 1 : 0 }}>
                          <PersonRounded fontSize="small" /> Executives
                        </ListSubheader>
                      )}
                      {l0Executives.filter((m: any) => !teamSearchQuery || m.username?.toLowerCase().includes(teamSearchQuery.toLowerCase()) || m.designation?.toLowerCase().includes(teamSearchQuery.toLowerCase())).map((member: any) => {
                        const isSelected = selectedTeamMember === member.id.toString();
                        return (
                          <MenuItem
                            key={`member-${member.id}`}
                            value={member.id.toString()}
                            sx={{
                              margin: '4px 8px',
                              borderRadius: '8px',
                              py: 1,
                              backgroundColor: '#f5f5f5 !important',
                              border: isSelected ? '2px solid #757575' : '1px solid #9e9e9e20',
                              boxShadow: isSelected ? '0 2px 8px rgba(158, 158, 158, 0.2)' : 'none',
                              '&:hover': { opacity: 0.9, borderColor: '#9e9e9e' }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                              <Box sx={{ color: '#757575', display: 'flex', bgcolor: 'white', borderRadius: '50%', p: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <PersonRounded fontSize="small" />
                              </Box>
                              <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', color: '#172B4D' }}>
                                {capitalizeEachWord(member.username)}
                              </Typography>
                              <Typography variant="caption" sx={{ ml: 'auto', color: '#757575', fontWeight: 600, bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                                {capitalizeEachWord(member.designation)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Tooltip>
              )}

              {/* Company Selector */}
              <Tooltip
                title={disableAggregator ? "Aggregator cannot be changed here" : "Change Aggregator"}
                placement="bottom"
                arrow
              >
                <FormControl
                  sx={{
                    minWidth: 220,
                    display: { xs: "none", sm: "block" },
                    opacity: disableAggregator ? 0.55 : 1,
                    transition: "opacity 0.2s",
                  }}
                  size="small"
                >
                  <InputLabel id="company-select-label" shrink>
                    Aggregator
                  </InputLabel>
                  <Select
                    labelId="company-select-label"
                    id="company-select"
                    value={selectedCompany}
                    label="Aggregator"
                    onChange={handleCompanyChange}
                    disabled={disableAggregator}
                    displayEmpty
                    notched
                    fullWidth
                    onOpen={() => setCompanyDropdownOpen(true)}
                    onClose={() => { setCompanySearchQuery(""); setCompanyDropdownOpen(false); }}
                    IconComponent={ArrowDropDownRounded}
                    renderValue={(selected: any) => {
                      if (!selected) {
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessRounded fontSize="small" sx={{ color: '#3949ab' }} />
                            <Typography sx={{ fontWeight: 600, color: '#3949ab', fontSize: '0.9rem' }}>All Aggregators</Typography>
                          </Box>
                        );
                      }
                      const company = companies.find((c: any) => String(c.companyId) === String(selected));
                      if (company) {
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessRounded fontSize="small" sx={{ color: '#1976d2' }} />
                            <Typography sx={{ fontWeight: 500, color: '#172B4D', fontSize: '0.9rem' }}>
                              {capitalizeEachWord(company.name)}
                            </Typography>
                          </Box>
                        );
                      }
                      return selected;
                    }}
                    sx={{
                      height: "40px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(57, 73, 171, 0.2)",
                        transition: "all 0.2s ease",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(57, 73, 171, 0.5)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#3949ab",
                        borderWidth: "2px",
                      },
                      "& .MuiSelect-select": {
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        paddingTop: 0,
                        paddingBottom: 0,
                        boxSizing: "border-box",
                      },
                    }}
                  >
                    {/* Company Search Box */}
                    <ListSubheader
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{ p: 1, bgcolor: 'white', position: 'sticky', top: 0, zIndex: 1 }}
                    >
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Search aggregator..."
                        value={companySearchQuery}
                        inputRef={companySearchRef}
                        onChange={(e) => setCompanySearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon size={16} color="#94a3b8" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                          }
                        }}
                      />
                    </ListSubheader>

                    <MenuItem
                      value=""
                      sx={{
                        fontWeight: 600,
                        color: '#3949ab',
                        py: 1.5,
                        borderBottom: !selectedCompany ? 'none' : '1px solid #e2e8f0',
                        border: !selectedCompany ? '2px solid #3949ab' : 'none',
                        borderRadius: !selectedCompany ? '8px' : 0,
                        margin: !selectedCompany ? '4px 8px' : 0,
                        display: "all aggregators".includes(companySearchQuery.toLowerCase()) ? 'flex' : 'none'
                      }}
                    >
                      All Aggregators
                    </MenuItem>
                    {companies?.filter((company: any) => !companySearchQuery || company.name?.toLowerCase().includes(companySearchQuery.toLowerCase())).map((company: any, index: number) => {
                      const isSelected = selectedCompany === company.companyId?.toString();
                      return (
                        <MenuItem
                          key={company.id || `company-${index}`}
                          value={company.companyId ? company.companyId.toString() : ""}
                          sx={{
                            margin: '4px 8px',
                            borderRadius: '8px',
                            py: 1,
                            backgroundColor: '#f8fafc !important',
                            border: isSelected ? '2px solid #3949ab' : '1px solid #e2e8f0',
                            boxShadow: isSelected ? '0 2px 8px rgba(57, 73, 171, 0.15)' : 'none',
                            '&:hover': { opacity: 0.9, borderColor: '#3949ab' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                            <Box sx={{ color: isSelected ? '#3949ab' : '#64748b', display: 'flex', bgcolor: 'white', borderRadius: '50%', p: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                              <BusinessRounded fontSize="small" />
                            </Box>
                            <Typography sx={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.9rem', color: isSelected ? '#1e293b' : '#334155' }}>
                              {capitalizeEachWord(company.name)}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Tooltip>

              {/* Notification Bell */}
              {!isSales && (
                <Tooltip title="Notifications" arrow placement="bottom">
                  <IconButton
                    aria-describedby={notifId}
                    onClick={handleNotifOpen}
                    sx={{ height: 40, width: 40, position: "relative" }}
                  >
                    <Badge
                      badgeContent={unreadCount}
                      color="error"
                      max={99}
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          minWidth: "14px",
                          height: "14px",
                          padding: "0 4px",
                          animation: unreadCount > 0 ? "pulse 1.5s ease-in-out infinite" : "none",
                          "@keyframes pulse": {
                            "0%": { transform: "scale(1)" },
                            "50%": { transform: "scale(1.2)" },
                            "100%": { transform: "scale(1)" },
                          },
                        },
                      }}
                    >
                      <BellIcon size={28} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              )}

              {/* Notification Popover */}
              {!isSales && (
                <Popover
                  id={notifId}
                  open={notifOpen}
                  anchorEl={notifAnchorEl}
                  onClose={handleNotifClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: {
                        width: 440,
                        maxHeight: 480,
                        borderRadius: "12px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "white",
                      color: "black",
                      borderTopLeftRadius: "12px",
                      borderTopRightRadius: "12px",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                        }}
                      >
                        <BellIcon size={20} weight="fill" />
                      </Box>
                      <Typography fontWeight={600} fontSize="1.1rem" sx={{ color: "#1e293b" }}>
                        Notifications
                      </Typography>
                      {unreadCount > 0 && (
                        <Chip
                          label={`${unreadCount} new`}
                          size="small"
                          sx={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            height: "22px",
                          }}
                        />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {unreadCount > 0 && (
                        <Button
                          size="small"
                          onClick={handleMarkAllRead}
                          disableRipple
                          sx={{
                            color: "#1e293b",
                            fontSize: "0.85rem",
                            textTransform: "none",
                            fontWeight: 500,
                            p: 0,
                            minWidth: "auto",
                            "&:hover": { background: "transparent", textDecoration: "underline" },
                          }}
                        >
                          ✓ Mark all
                        </Button>
                      )}
                      <IconButton onClick={handleNotifClose} size="small" sx={{ p: 0.5, color: "#64748b" }}>
                        <CloseIcon size={18} />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Application List */}
                  <Box sx={{ overflowY: "auto", flex: 1 }}>
                    {loadingNotifs ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          py: 5,
                          gap: 1.5,
                        }}
                      >
                        <CircularProgress size={28} sx={{ color: "#3949ab" }} />
                        <Typography color="text.secondary" fontSize="0.85rem">
                          Loading notifications...
                        </Typography>
                      </Box>
                    ) : notifications.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          py: 5,
                          gap: 1,
                        }}
                      >
                        <BellIcon size={36} color="#bdbdbd" />
                        <Typography color="text.secondary" fontSize="0.85rem">
                          No new notifications
                        </Typography>
                      </Box>
                    ) : (
                      paginatedNotifications.map((notif, index) => {
                        const isUnread = !seenIds.has(notif.id);

                        if (notif.type === 'application') {
                          const app = notif.data;
                          return (
                            <React.Fragment key={notif.id}>
                              <Box
                                onClick={() => {
                                  // mark this one as seen
                                  const updated = new Set(seenIds);
                                  updated.add(notif.id);
                                  setSeenIds(updated);
                                  saveSeenIds(updated);
                                  handleNotifClose();
                                  router.push(`/?search=${app.applicationNo}`);
                                }}
                                sx={{
                                  px: 3,
                                  py: 2,
                                  cursor: "pointer",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.8,
                                  backgroundColor: isUnread ? "#f4f8fb" : "white",
                                  borderLeft: isUnread ? "4px solid #3b82f6" : "4px solid transparent",
                                  transition: "background 0.15s",
                                  "&:hover": {
                                    backgroundColor: "#f1f5f9",
                                  },
                                }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                  <Typography
                                    fontWeight={isUnread ? 600 : 500}
                                    fontSize="0.9rem"
                                    sx={{ color: "#1e293b" }}
                                  >
                                    New Application Received
                                  </Typography>
                                  {isUnread && (
                                    <Box
                                      sx={{
                                        mt: "4px",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        backgroundColor: "#3b82f6", // Blue dot on right
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                </Box>

                                <Typography fontSize="0.85rem" sx={{ color: "#64748b", lineHeight: 1.4 }}>
                                  Application <strong>#{app.applicationNo}</strong> for <strong>{app.customerName}</strong> has been submitted for a <strong>{formatAmount(app.amount)}</strong> <strong>{app.loanType}</strong> via <strong>{app.provider || "Unknown"}</strong>.
                                </Typography>

                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                  <ClockIcon size={14} color="#94a3b8" />
                                  <Typography fontSize="0.75rem" sx={{ color: "#94a3b8" }}>
                                    {formatDate(app.applicationDate)}
                                  </Typography>
                                </Stack>
                              </Box>
                              {index < paginatedNotifications.length - 1 && <Divider />}
                            </React.Fragment>
                          );
                        } else {
                          // Ticket
                          const ticket = notif.data;
                          return (
                            <React.Fragment key={notif.id}>
                              <Box
                                onClick={() => {
                                  const updated = new Set(seenIds);
                                  updated.add(notif.id);
                                  setSeenIds(updated);
                                  saveSeenIds(updated);
                                  handleNotifClose();
                                  router.push(`/ticket/${ticket.ticket_id}`);
                                }}
                                sx={{
                                  px: 3,
                                  py: 2,
                                  cursor: "pointer",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.8,
                                  backgroundColor: isUnread ? "#f0fdf4" : "white",
                                  borderLeft: isUnread ? "4px solid #22c55e" : "4px solid transparent",
                                  transition: "background 0.15s",
                                  "&:hover": {
                                    backgroundColor: "#dcfce7",
                                  },
                                }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                  <Typography
                                    fontWeight={isUnread ? 600 : 500}
                                    fontSize="0.9rem"
                                    sx={{ color: "#1e293b" }}
                                  >
                                    {ticket.title || 'Ticket Update'}
                                  </Typography>
                                  {isUnread && (
                                    <Box
                                      sx={{
                                        mt: "4px",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        backgroundColor: "#22c55e", // Green dot on right
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                </Box>

                                <Typography fontSize="0.85rem" sx={{ color: "#64748b", lineHeight: 1.4 }}>
                                  {(() => {
                                    const match = ticket.message.match(/Ticket #(\d+) for (.+?) has been updated to (.+?)(?: by (.+))?$/);
                                    if (match) {
                                      const customerName = match[2];
                                      const actor = match[4];
                                      return (
                                        <>
                                          Ticket <strong>#{ticket.ticket_id}</strong> for <strong>{customerName}</strong> was moved from <strong>{ticket.old_status}</strong> to <strong>{ticket.new_status}</strong>
                                          {actor && <span> by <strong>{actor}</strong></span>}.
                                        </>
                                      );
                                    }
                                    return ticket.message;
                                  })()}
                                </Typography>

                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                  <ClockIcon size={14} color="#94a3b8" />
                                  <Typography fontSize="0.75rem" sx={{ color: "#94a3b8" }}>
                                    {formatDateTime(ticket.created_at)}
                                  </Typography>
                                </Stack>
                              </Box>
                              {index < paginatedNotifications.length - 1 && <Divider />}
                            </React.Fragment>
                          );
                        }
                      })
                    )}
                  </Box>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <>
                      <Divider />
                      <Box
                        sx={{
                          px: 2,
                          py: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#f8f9fa",
                        }}
                      >
                        <Button
                          size="small"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                          sx={{ textTransform: "none", fontSize: "0.75rem", minWidth: "auto", px: 1, visibility: totalPages > 1 ? "visible" : "hidden" }}
                        >
                          ← Prev
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            handleNotifClose();
                            // Or go to a unified notifications page
                          }}
                          sx={{ color: "#3b82f6", fontSize: "0.8rem", textTransform: "none", fontWeight: 600, visibility: "hidden" }}
                        >
                          View all notifications →
                        </Button>
                        <Button
                          size="small"
                          disabled={page === totalPages}
                          onClick={() => setPage(p => p + 1)}
                          sx={{ textTransform: "none", fontSize: "0.75rem", minWidth: "auto", px: 1, visibility: totalPages > 1 ? "visible" : "hidden" }}
                        >
                          Next →
                        </Button>
                      </Box>
                    </>
                  )}
                </Popover>
              )}

              <Tooltip title="User Profile" arrow placement="bottom">
                <Avatar
                  onClick={userPopover.handleOpen}
                  ref={userPopover.anchorRef}
                  sx={{
                    cursor: "pointer",
                    height: 40,
                    width: 40,
                    bgcolor: "#3949ab",
                    color: "white",
                    fontWeight: 600,
                    border: "2px solid rgba(255,255,255,0.8)",
                    boxShadow: "0 2px 8px rgba(57,73,171,0.25)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(57,73,171,0.35)",
                      transform: "translateY(-1px)",
                    }
                  }}
                >
                  {userInfo?.username?.charAt(0).toUpperCase() || ""}
                </Avatar>
              </Tooltip>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      <UserPopover
        anchorEl={userPopover.anchorRef.current}
        onClose={userPopover.handleClose}
        open={userPopover.open}
      />

      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}