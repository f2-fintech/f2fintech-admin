"use client";
import React, { useState, useEffect, useCallback } from "react";
import _ from "lodash";
import * as XLSX from "xlsx";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  Person as UserIcon,
  Business as BuildingIcon,
  Phone as PhoneIcon,
  Email as MailIcon,
  Visibility as EyeIcon,
  Cached as RotateIcon,
  FolderOff as FolderOffIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  TableView as TableViewIcon,
  Download as DownloadIcon,
  LocationOnRounded as LocationIcon,
  InfoOutlined as InfoIcon,
  ArrowBackRounded as ArrowBackIcon,
  History as HistoryIcon,
  CommentOutlined as CommentIcon,
  Bolt as BoltIcon,
  AttachFile as AttachFileIcon,
} from "@mui/icons-material";
import {
  IconButton,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  DialogActions,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Pagination,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { format, formatDistanceToNow } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import Toast from "../components/common/Toast";
import { axiosInstance } from "@/apis/config/axiosConfig";
import FilterPanel from "../components/common/FilterPanel";
import { Utility } from "@/utils";
import type { User } from "@/types/user";

const ArchivedTicketsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(min-width:601px) and (max-width:1200px)");

  const dispatch: AppDispatch = useDispatch();
  const { toast } = useSelector((state: RootState) => state.toast);
  const { decodedToken, getCookies, toastAndNavigate } = Utility();
  const cookies = getCookies();
  const userToken = (cookies as any)?.token;
  const currentUser = decodedToken(userToken?.value);
  const userRole = currentUser?.role || "admin";
  const userName = currentUser?.username || currentUser?.name || "Admin";

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<string>("overview");
  const [modalHistory, setModalHistory] = useState<any[]>([]);
  const [modalActivities, setModalActivities] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [toggleListView, setToggleListView] = useState<string>("table");
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Filters State
  const [sortBy, setSortBy] = useState<string>("all");
  const [loanProvider, setLoanProvider] = useState<string>("all");
  const [filter, setFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get("/get-users", {
        params: { page: 1, limit: 500 },
      });
      const data = response.data;
      if (data.statusCode === 200) {
        setUsers(data.data.results || data.data || []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchArchivedTickets = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: page.toString(),
        limit: limit.toString(),
      };

      if (sortBy && sortBy !== "all") params.status = sortBy;
      if (loanProvider && loanProvider !== "all") params.provider = loanProvider;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filter && filter.trim() !== "") params.search = filter.trim();
      if (selectedUser?.id) params.userId = selectedUser.id.toString();

      const response = await axiosInstance.get("/get-all-archived-tickets", { params });
      const data = response.data;

      if (data.statusCode === 200) {
        setTickets(data.data.results || []);
        setTotalPages(data.data.pages || 1);
        setTotalCount(data.data.count || 0);
      } else {
        setError(data.message || "Failed to fetch archived tickets");
      }
    } catch (err: any) {
      setError(err?.message || "Error fetching archived tickets");
      console.error("Error fetching archived tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTickets(currentPage);
  }, [currentPage, sortBy, loanProvider, startDate, endDate, filter, selectedUser]);

  const handleFilterChange = (newFilterState: any) => {
    if (newFilterState.status !== undefined) setSortBy(newFilterState.status);
    if (newFilterState.provider !== undefined) setLoanProvider(newFilterState.provider);
    if (newFilterState.startDate !== undefined) setStartDate(newFilterState.startDate);
    if (newFilterState.endDate !== undefined) setEndDate(newFilterState.endDate);
    if (newFilterState.search !== undefined) setFilter(newFilterState.search);
    if (newFilterState.name !== undefined) setFilter(newFilterState.name);
    if (newFilterState.user !== undefined) setSelectedUser(newFilterState.user);
    if (newFilterState.selectedUser !== undefined) setSelectedUser(newFilterState.selectedUser);
    setCurrentPage(1);
  };

  const handleSortChange = (status: string | null) => {
    setSortBy(status || "all");
    setCurrentPage(1);
  };

  const handleProviderChange = (provider: string | null) => {
    setLoanProvider(provider || "all");
    setCurrentPage(1);
  };

  const getUsernameById = (userId: number | string) => {
    if (!userId) return "System";
    const user = users?.find((u) => u.id === userId || u._id === userId);
    return user ? user.username || user.name || `User ${userId}` : `User ${userId}`;
  };

  const handleViewDetails = async (ticket: any, defaultTab: string = "overview") => {
    setSelectedTicket(ticket);
    setActiveModalTab(defaultTab);
    setOpenModal(true);
    setLoadingModalData(true);
    setModalHistory([]);
    setModalActivities([]);

    const ticketIdToFetch = ticket.originalTicketId || ticket.archiveId;
    try {
      const [historyRes, activityRes] = await Promise.allSettled([
        axiosInstance.get(`get-ticket-histories/${ticketIdToFetch}`),
        axiosInstance.get(`get-ticket-activities/${ticketIdToFetch}`),
      ]);

      if (historyRes.status === "fulfilled" && historyRes.value?.data?.statusCode === 200) {
        setModalHistory(historyRes.value.data.data || []);
      }
      if (activityRes.status === "fulfilled" && activityRes.value?.data?.statusCode === 200) {
        setModalActivities(activityRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching modal history/activity data:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedTicket(null);
    setModalHistory([]);
    setModalActivities([]);
    setActiveModalTab("overview");
  };

  const handleRestore = async (archiveId: number) => {
    try {
      setRestoringId(archiveId);
      const currentUserId = currentUser?.id || decodedToken()?.id;
      const response = await axiosInstance.post(`/restore-original-ticket/${archiveId}`, {
        restoredBy: currentUserId,
      });
      const data = response.data;

      if (data.statusCode === 201 || data.statusCode === 200) {
        toastAndNavigate(
          dispatch,
          true,
          "success",
          "Ticket restored successfully!",
          null,
          null,
          false
        );
        handleCloseModal();
        fetchArchivedTickets(currentPage);
      } else {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          data.message || "Failed to restore ticket",
          null,
          null,
          true
        );
      }
    } catch (err: any) {
      console.error("Error restoring ticket:", err);
      toastAndNavigate(
        dispatch,
        true,
        "error",
        err?.response?.data?.message || err.message || "Error restoring ticket",
        null,
        null,
        true
      );
    } finally {
      setRestoringId(null);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      const response = await axiosInstance.get("/get-all-archived-tickets", {
        params: {
          page: "1",
          limit: "1000",
          ...(sortBy && sortBy !== "all" && { status: sortBy }),
          ...(loanProvider && loanProvider !== "all" && { provider: loanProvider }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          ...(filter && { search: filter }),
          ...(selectedUser?.id && { userId: selectedUser.id.toString() }),
        },
      });

      const exportList = response.data?.data?.results || tickets;

      const formattedData = exportList.map((t: any) => ({
        "Ticket ID": t?.originalTicketId || t?.archiveId || "-",
        "Customer Name": t?.customerName || "-",
        "Email": t?.customerEmail || "-",
        "Contact": t?.customerContact || "-",
        "Amount": t?.applicationAmount || "-",
        "Provider": t?.applicationProvider || "-",
        "Status": t?.ticketStatus || "-",
        "Tenure": t?.applicationTenure ? `${t.applicationTenure} Years` : "-",
        "Location": `${t?.customerLocation || "-"}, ${t?.customerState || "-"}`,
        "Reason for Deletion": t?.reason || "-",
        "Archived/Deleted By": getUsernameById(t?.archiveBy),
        "Archived/Deleted At": t?.archivedAt ? new Date(t.archivedAt).toLocaleDateString() : "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Archived Tickets");

      const fileName = `Archived_Tickets_${userName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Error exporting archived tickets:", err);
      alert("Failed to export archived tickets. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "disbursed") return "success";
    if (s === "rejected" || s === "drop") return "error";
    if (s === "approved") return "info";
    if (s?.includes("banker")) return "primary";
    return "default";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: any) => {
    if (!amount || amount === "No Amount" || isNaN(Number(amount))) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        position: "relative",
        height: "100%",
        width: "100%",
        padding: { xs: "10px", sm: "15px", md: "20px" },
      }}
    >
      {/* Top Header & Filter Controls Matching /ticket Page */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", xl: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", xl: "center" },
          gap: 2,
          width: "100%",
          mb: 2,
        }}
      >
        {/* Filter Panel Container */}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "column-reverse", md: "row" },
              position: "relative",
              width: "100%",
              gap: { xs: 1, sm: 1.5, md: 2 },
            }}
          >
            <FilterPanel
              searchLabel="Search By Name, Number, PAN, Ticket ID"
              sortBy={sortBy}
              loanProvider={loanProvider}
              filter={filter}
              setFilter={setFilter}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              handleSortChange={handleSortChange}
              handleProviderChange={handleProviderChange}
              userData={users}
              userRole={userRole}
              ticketCount={totalCount}
              handleFilterChange={handleFilterChange}
            />
          </Box>
        </Box>

        {/* Right Side Actions Container (Export + View Toggle) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            alignSelf: { xs: "flex-end", xl: "center" },
            flexShrink: 0,
          }}
        >
          {/* Export Button */}
          <Tooltip title="Download Report">
            <span>
              <Button
                variant="outlined"
                onClick={handleExportToExcel}
                disabled={exportLoading}
                startIcon={
                  exportLoading ? (
                    <CircularProgress size={16} sx={{ color: "#3f50b5" }} />
                  ) : (
                    <DownloadIcon fontSize="small" />
                  )
                }
                sx={{
                  height: "48px",
                  borderRadius: "16px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2.5,
                  color: "#3f50b5",
                  borderColor: "#c7d2fe",
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#818cf8",
                    backgroundColor: "#eef2ff",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Export
              </Button>
            </span>
          </Tooltip>

          {/* View Toggle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "4px",
              border: "1px solid #c7d2fe",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <Tooltip title="Grid View">
              <IconButton
                onClick={() => setToggleListView("grid")}
                sx={{
                  color: toggleListView === "grid" ? "#fff" : "#64748b",
                  backgroundColor: toggleListView === "grid" ? "#3f50b5" : "transparent",
                  borderRadius: "12px",
                  padding: "8px",
                  "&:hover": {
                    backgroundColor: toggleListView === "grid" ? "#303f9f" : "#f1f5f9",
                  },
                }}
              >
                <GridViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="List View">
              <IconButton
                onClick={() => setToggleListView("list")}
                sx={{
                  color: toggleListView === "list" ? "#fff" : "#64748b",
                  backgroundColor: toggleListView === "list" ? "#3f50b5" : "transparent",
                  borderRadius: "12px",
                  padding: "8px",
                  "&:hover": {
                    backgroundColor: toggleListView === "list" ? "#303f9f" : "#f1f5f9",
                  },
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Table View">
              <IconButton
                onClick={() => setToggleListView("table")}
                sx={{
                  color: toggleListView === "table" ? "#fff" : "#64748b",
                  backgroundColor: toggleListView === "table" ? "#3f50b5" : "transparent",
                  borderRadius: "12px",
                  padding: "8px",
                  "&:hover": {
                    backgroundColor: toggleListView === "table" ? "#303f9f" : "#f1f5f9",
                  },
                }}
              >
                <TableViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ width: "100%", mt: 1 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={50} thickness={4} sx={{ color: "#3f50b5" }} />
            <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
              Loading archived tickets...
            </Typography>
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: "16px", bgcolor: "#fef2f2", border: "1px solid #fee2e2" }}>
            <Typography sx={{ color: "#dc2626", fontWeight: 600 }}>{error}</Typography>
          </Paper>
        ) : tickets.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 8,
              gap: 2,
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <FolderOffIcon sx={{ fontSize: 60, color: "#94a3b8" }} />
            <Typography variant="h6" sx={{ color: "#334155", fontWeight: 600 }}>
              No Archived Tickets Found
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Tickets that are deleted or archived will appear here.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* VIEW MODE: TABLE VIEW (Compact View) */}
            {toggleListView === "table" && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  overflowX: "auto",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              >
                <Table sx={{ minWidth: 950 }}>
                  <TableHead>
                    <TableRow sx={{ background: "linear-gradient(135deg, #2b3e94 0%, #3f50b5 100%)" }}>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Ticket ID
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Name
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Email
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Amount
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Provider
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Tenure
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Location
                      </TableCell>
                      <TableCell sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                        Archived/Deleted At
                      </TableCell>
                      <TableCell align="center" sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem", py: 1.8 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow
                        key={t.archiveId}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "#f8fafc" },
                          "&:last-child td": { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}>
                          {t.originalTicketId || t.archiveId}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#1e293b", textTransform: "uppercase", fontSize: "0.85rem" }}>
                          {t.customerName || "N/A"}
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                          {t.customerEmail || "N/A"}
                        </TableCell>
                        <TableCell sx={{ color: "#059669", fontWeight: 700, fontSize: "0.88rem" }}>
                          {formatAmount(t.applicationAmount)}
                        </TableCell>
                        <TableCell sx={{ color: "#4f46e5", fontWeight: 600, fontSize: "0.85rem" }}>
                          {t.applicationProvider || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.ticketStatus || "operations"}
                            size="small"
                            sx={{
                              bgcolor: "rgba(63, 81, 181, 0.1)",
                              color: "#3f50b5",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              borderRadius: "6px",
                              textTransform: "capitalize",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                          {t.applicationTenure ? `${t.applicationTenure} yrs` : "N/A"}
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                          {t.customerLocation || "N/A"}
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                          {formatDate(t.archivedAt)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 0.8, justifyContent: "center", alignItems: "center" }}>
                            <Tooltip title="View Ticket History">
                              <Button
                                size="small"
                                startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                                onClick={() => handleViewDetails(t, "history")}
                                sx={{
                                  textTransform: "none",
                                  borderRadius: 2,
                                  px: 1.2,
                                  py: 0.4,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "#667eea",
                                  bgcolor: "rgba(102, 126, 234, 0.08)",
                                  "&:hover": { bgcolor: "rgba(102, 126, 234, 0.18)", color: "#5a6fd8" },
                                }}
                              >
                                History
                              </Button>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <Button
                                size="small"
                                startIcon={<EyeIcon sx={{ fontSize: 16 }} />}
                                onClick={() => handleViewDetails(t, "overview")}
                                sx={{
                                  textTransform: "none",
                                  borderRadius: 2,
                                  px: 1.2,
                                  py: 0.4,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "#1976d2",
                                  bgcolor: "rgba(25, 118, 210, 0.08)",
                                  "&:hover": { bgcolor: "rgba(25, 118, 210, 0.18)", color: "#1565c0" },
                                }}
                              >
                                View
                              </Button>
                            </Tooltip>
                            <Tooltip title="Restore to Active Tickets">
                              <Button
                                size="small"
                                disabled={restoringId === t.archiveId}
                                startIcon={
                                  restoringId === t.archiveId ? (
                                    <CircularProgress size={14} sx={{ color: "#2e7d32" }} />
                                  ) : (
                                    <RotateIcon sx={{ fontSize: 16 }} />
                                  )
                                }
                                onClick={() => handleRestore(t.archiveId)}
                                sx={{
                                  textTransform: "none",
                                  borderRadius: 2,
                                  px: 1.2,
                                  py: 0.4,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "#2e7d32",
                                  bgcolor: "rgba(46, 125, 50, 0.08)",
                                  "&:hover": { bgcolor: "rgba(46, 125, 50, 0.18)", color: "#1b5e20" },
                                  "&:disabled": {
                                    color: "#2e7d32",
                                    opacity: 0.7,
                                  },
                                }}
                              >
                                {restoringId === t.archiveId ? "Restoring..." : "Restore"}
                              </Button>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* VIEW MODE: GRID VIEW */}
            {toggleListView === "grid" && (
              <Grid container spacing={2.5}>
                {tickets.map((t) => (
                  <Grid item xs={12} sm={6} lg={4} key={t.archiveId}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                          <Chip label={`Ticket #${t.originalTicketId || t.archiveId}`} size="small" sx={{ fontWeight: 700, bgcolor: "#f1f5f9", color: "#334155" }} />
                          <Chip
                            label={t.ticketStatus || "archived"}
                            size="small"
                            sx={{ bgcolor: "rgba(63, 81, 181, 0.1)", color: "#3f50b5", fontWeight: 600, fontSize: "0.75rem" }}
                          />
                        </Box>

                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }} noWrap>
                          {t.customerName || "No Name"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1.5 }} noWrap>
                          {t.customerEmail || "No Email"}
                        </Typography>

                        <Box sx={{ bgcolor: "#f8fafc", p: 1.5, borderRadius: "10px", mb: 2 }}>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Amount</Typography>
                              <Typography sx={{ fontWeight: 700, color: "#059669", fontSize: "0.9rem" }}>
                                {formatAmount(t.applicationAmount)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Provider</Typography>
                              <Typography sx={{ fontWeight: 600, color: "#4f46e5", fontSize: "0.85rem" }} noWrap>
                                {t.applicationProvider || "N/A"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Tenure</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {t.applicationTenure ? `${t.applicationTenure} yrs` : "N/A"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Archived/Deleted At</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatDate(t.archivedAt)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                          <Button
                            size="small"
                            startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
                            onClick={() => handleViewDetails(t, "history")}
                            sx={{
                              textTransform: "none",
                              borderRadius: 2,
                              px: 1.2,
                              py: 0.4,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#667eea",
                              bgcolor: "rgba(102, 126, 234, 0.08)",
                              "&:hover": { bgcolor: "rgba(102, 126, 234, 0.18)" },
                            }}
                          >
                            History
                          </Button>
                          <Button
                            size="small"
                            startIcon={<EyeIcon sx={{ fontSize: 15 }} />}
                            onClick={() => handleViewDetails(t, "overview")}
                            sx={{
                              textTransform: "none",
                              borderRadius: 2,
                              px: 1.2,
                              py: 0.4,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#1976d2",
                              bgcolor: "rgba(25, 118, 210, 0.08)",
                              "&:hover": { bgcolor: "rgba(25, 118, 210, 0.18)" },
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            disabled={restoringId === t.archiveId}
                            startIcon={
                              restoringId === t.archiveId ? (
                                <CircularProgress size={13} sx={{ color: "#2e7d32" }} />
                              ) : (
                                <RotateIcon sx={{ fontSize: 15 }} />
                              )
                            }
                            onClick={() => handleRestore(t.archiveId)}
                            sx={{
                              textTransform: "none",
                              borderRadius: 2,
                              px: 1.2,
                              py: 0.4,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#2e7d32",
                              bgcolor: "rgba(46, 125, 50, 0.08)",
                              "&:hover": { bgcolor: "rgba(46, 125, 50, 0.18)" },
                              "&:disabled": {
                                color: "#2e7d32",
                                opacity: 0.7,
                              },
                            }}
                          >
                            {restoringId === t.archiveId ? "Restoring..." : "Restore"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* VIEW MODE: LIST VIEW */}
            {toggleListView === "list" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {tickets.map((t) => (
                  <Paper
                    key={t.archiveId}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                      "&:hover": { bgcolor: "#f8fafc" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar sx={{ bgcolor: "rgba(63, 81, 181, 0.15)", color: "#3f50b5", fontWeight: 700, width: 40, height: 40 }}>
                        {t.customerName?.charAt(0)?.toUpperCase() || "A"}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                            {t.customerName}
                          </Typography>
                          <Chip label={`Ticket #${t.originalTicketId || t.archiveId}`} size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "#f1f5f9" }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          {t.customerEmail} • {t.customerLocation || "Location N/A"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontWeight: 700, color: "#059669", fontSize: "0.95rem" }}>
                          {formatAmount(t.applicationAmount)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#4f46e5", fontWeight: 600 }}>
                          {t.applicationProvider}
                        </Typography>
                      </Box>

                      <Chip
                        label={t.ticketStatus || "archived"}
                        size="small"
                        sx={{ bgcolor: "rgba(63, 81, 181, 0.1)", color: "#3f50b5", fontWeight: 600 }}
                      />

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleViewDetails(t, "history")}
                          sx={{
                            textTransform: "none",
                            borderRadius: 2,
                            px: 1.2,
                            py: 0.4,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#667eea",
                            bgcolor: "rgba(102, 126, 234, 0.08)",
                            "&:hover": { bgcolor: "rgba(102, 126, 234, 0.18)" },
                          }}
                        >
                          History
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EyeIcon sx={{ fontSize: 15 }} />}
                          onClick={() => handleViewDetails(t, "overview")}
                          sx={{
                            textTransform: "none",
                            borderRadius: 2,
                            px: 1.2,
                            py: 0.4,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#1976d2",
                            bgcolor: "rgba(25, 118, 210, 0.08)",
                            "&:hover": { bgcolor: "rgba(25, 118, 210, 0.18)" },
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          disabled={restoringId === t.archiveId}
                          startIcon={
                            restoringId === t.archiveId ? (
                              <CircularProgress size={13} sx={{ color: "#2e7d32" }} />
                            ) : (
                              <RotateIcon sx={{ fontSize: 15 }} />
                            )
                          }
                          onClick={() => handleRestore(t.archiveId)}
                          sx={{
                            textTransform: "none",
                            borderRadius: 2,
                            px: 1.2,
                            py: 0.4,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#2e7d32",
                            bgcolor: "rgba(46, 125, 50, 0.08)",
                            "&:hover": { bgcolor: "rgba(46, 125, 50, 0.18)" },
                            "&:disabled": {
                              color: "#2e7d32",
                              opacity: 0.7,
                            },
                          }}
                        >
                          {restoringId === t.archiveId ? "Restoring..." : "Restore"}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: 3,
                  p: 2,
                  gap: 2,
                  bgcolor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Showing <strong>{(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalCount)}</strong> of <strong>{totalCount}</strong> archived tickets
                </Typography>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => setCurrentPage(page)}
                  color="primary"
                  shape="rounded"
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontWeight: 600,
                      borderRadius: "8px",
                    },
                    "& .Mui-selected": {
                      bgcolor: "#3f50b5 !important",
                      color: "#ffffff",
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Details & Inspection Modal with History and Activities Tabs */}
      {selectedTicket && (
        <Dialog
          open={openModal}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "14px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            },
          }}
        >
          {/* Header */}
          <DialogTitle
            sx={{
              background: "linear-gradient(135deg, #2b3e94 0%, #3f50b5 100%)",
              color: "#ffffff",
              py: 2,
              px: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#ffffff", width: 40, height: 40 }}>
                <BuildingIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                  Ticket #{selectedTicket.originalTicketId || selectedTicket.archiveId}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                  {selectedTicket.customerName}'s Application
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleCloseModal} sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#ffffff" } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, bgcolor: "#ffffff" }}>
            <Tabs
              value={activeModalTab}
              onChange={(_, val) => setActiveModalTab(val)}
              sx={{
                minHeight: 48,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  minHeight: 48,
                  py: 1,
                  color: "#64748b",
                  "&.Mui-selected": {
                    color: "#3f50b5",
                    fontWeight: 700,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#3f50b5",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab
                value="overview"
                label="Overview"
                icon={<InfoIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="history"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <span>Ticket History</span>
                    {modalHistory.length > 0 && (
                      <Chip
                        label={modalHistory.length}
                        size="small"
                        sx={{ height: 18, fontSize: "0.7rem", fontWeight: 700, bgcolor: "rgba(102, 126, 234, 0.15)", color: "#667eea" }}
                      />
                    )}
                  </Box>
                }
                icon={<HistoryIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="activities"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <span>Activities & Comments</span>
                    {modalActivities.length > 0 && (
                      <Chip
                        label={modalActivities.length}
                        size="small"
                        sx={{ height: 18, fontSize: "0.7rem", fontWeight: 700, bgcolor: "rgba(0, 121, 107, 0.15)", color: "#00796B" }}
                      />
                    )}
                  </Box>
                }
                icon={<CommentIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <DialogContent dividers sx={{ p: 3, bgcolor: "#f8fafc" }}>
            {loadingModalData ? (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress size={36} sx={{ color: "#3f50b5" }} />
                <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 500, fontSize: "0.88rem" }}>
                  Loading ticket data...
                </Typography>
              </Box>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeModalTab === "overview" && (
                  <Box>
                    {/* Archival Reason Alert Banner */}
                    {selectedTicket.reason && (
                      <Box
                        sx={{
                          p: 2,
                          mb: 3,
                          borderRadius: "10px",
                          bgcolor: "#fef2f2",
                          border: "1px solid #fee2e2",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                        }}
                      >
                        <InfoIcon sx={{ color: "#dc2626", mt: 0.2 }} fontSize="small" />
                        <Box>
                          <Typography variant="caption" sx={{ color: "#991b1b", fontWeight: 700, textTransform: "uppercase" }}>
                            Reason for Deletion
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#b91c1c", fontWeight: 500, mt: 0.3 }}>
                            {selectedTicket.reason}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Grid container spacing={2.5}>
                      {/* Customer Info Card */}
                      <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#ffffff", height: "100%" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#3f50b5", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                            <UserIcon fontSize="small" /> Customer Details
                          </Typography>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Full Name</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                                {selectedTicket.customerName || "N/A"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Contact Number</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#1e293b" }}>
                                {selectedTicket.customerContact || "N/A"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Email Address</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#1e293b" }}>
                                {selectedTicket.customerEmail || "N/A"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Location</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#1e293b" }}>
                                {selectedTicket.customerLocation || "N/A"}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Loan & Archival Info Card */}
                      <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#ffffff", height: "100%" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#3f50b5", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                            <BuildingIcon fontSize="small" /> Loan & Timeline Info
                          </Typography>
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Loan Amount</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#059669" }}>
                                {formatAmount(selectedTicket.applicationAmount)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Provider</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#4f46e5" }}>
                                {selectedTicket.applicationProvider || "N/A"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Tenure</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {selectedTicket.applicationTenure ? `${selectedTicket.applicationTenure} Years` : "N/A"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Status</Typography>
                              <Box sx={{ mt: 0.3 }}>
                                <Chip
                                  label={selectedTicket.ticketStatus || "archived"}
                                  size="small"
                                  sx={{ bgcolor: "rgba(63, 81, 181, 0.1)", color: "#3f50b5", fontWeight: 600, fontSize: "0.75rem" }}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Archived/Deleted At</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatDate(selectedTicket.archivedAt)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: "#64748b" }}>Archived/Deleted By</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                                {getUsernameById(selectedTicket.archiveBy)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* TAB 2: TICKET HISTORY */}
                {activeModalTab === "history" && (
                  <Box>
                    {modalHistory.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: "55vh", overflowY: "auto", pr: 0.5 }}>
                        {modalHistory.map((item, idx) => {
                          const dateObj = new Date(item.created_at || item.createdAt);
                          const cleanAction = (item.action || "").replace(/<\/?[^>]+(>|$)/g, "");
                          return (
                            <Paper
                              key={item.id || idx}
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1.5,
                                transition: "all 0.2s ease",
                                "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "8px",
                                  bgcolor: "rgba(63, 81, 181, 0.1)",
                                  color: "#3f50b5",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  mt: 0.2,
                                }}
                              >
                                <BoltIcon sx={{ fontSize: 18 }} />
                              </Box>
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.45 }}>
                                  {cleanAction}
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.8, flexWrap: "wrap" }}>
                                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                                    {format(dateObj, "dd MMM yyyy, hh:mm a")} ({formatDistanceToNow(dateObj)} ago)
                                  </Typography>
                                  {item.user_id && (
                                    <Chip
                                      label={`By: ${getUsernameById(item.user_id)}`}
                                      size="small"
                                      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, bgcolor: "#f1f5f9", color: "#475569" }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 6, color: "#94a3b8" }}>
                        <HistoryIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#64748b" }}>
                          No History Records Found
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          There are no historical transitions logged for this ticket.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {/* TAB 3: ACTIVITIES & COMMENTS */}
                {activeModalTab === "activities" && (
                  <Box>
                    {modalActivities.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: "55vh", overflowY: "auto", pr: 0.5 }}>
                        {modalActivities.map((act, idx) => {
                          const actDate = new Date(act.created_at || act.createdAt);
                          const actUserName = act.user?.username || act.user?.name || getUsernameById(act.user_id);
                          return (
                            <Paper
                              key={act.id || idx}
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "#00796B", color: "#fff", fontWeight: 700 }}>
                                    {actUserName?.charAt(0)?.toUpperCase() || "U"}
                                  </Avatar>
                                  <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>
                                    {actUserName}
                                  </Typography>
                                  {act.user?.role && (
                                    <Chip
                                      label={act.user.role}
                                      size="small"
                                      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, textTransform: "capitalize", bgcolor: "#f1f5f9" }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ color: "#64748b" }}>
                                  {format(actDate, "dd MMM yyyy, hh:mm a")} ({formatDistanceToNow(actDate)} ago)
                                </Typography>
                              </Box>

                              <Typography sx={{ fontSize: "0.85rem", color: "#334155", whiteSpace: "pre-wrap", pl: 4.5 }}>
                                {act.activity || act.comment || act.description || "No activity note"}
                              </Typography>

                              {act.attachment && (
                                <Box sx={{ pl: 4.5, mt: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AttachFileIcon fontSize="small" />}
                                    href={act.attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: "6px", py: 0.2 }}
                                  >
                                    View Attachment
                                  </Button>
                                </Box>
                              )}
                            </Paper>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 6, color: "#94a3b8" }}>
                        <CommentIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#64748b" }}>
                          No Activities or Comments
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          There are no activity comments recorded for this ticket.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
            <Button
              onClick={handleCloseModal}
              disabled={restoringId !== null}
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: "8px", color: "#64748b", borderColor: "#cbd5e1" }}
            >
              Close
            </Button>
            <Button
              onClick={() => handleRestore(selectedTicket.archiveId)}
              disabled={restoringId !== null}
              variant="contained"
              startIcon={
                restoringId === selectedTicket.archiveId ? (
                  <CircularProgress size={16} sx={{ color: "#ffffff" }} />
                ) : (
                  <RotateIcon />
                )
              }
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                bgcolor: "#3f50b5",
                "&:hover": { bgcolor: "#303f9f" },
                "&:disabled": {
                  bgcolor: restoringId === selectedTicket.archiveId ? "#3f50b5" : "#94a3b8",
                  color: "#ffffff",
                  opacity: 0.85,
                },
              }}
            >
              {restoringId === selectedTicket.archiveId ? "Restoring..." : "Restore to Active Tickets"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Toast Notification */}
      <Toast
        alerting={toast.toastAlert}
        message={toast.toastMessage}
        severity={toast.toastSeverity}
      />
    </Box>
  );
};

export default ArchivedTicketsPage;
