"use client";

import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { axiosInstance } from "@/apis/config/axiosConfig";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Stack,
  Avatar,
} from "@mui/material";
import {
  ArrowClockwise as RefreshIcon,
  FileText as DocumentIcon,
  MagnifyingGlass as SearchIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  X as CloseIcon,
  CaretDown as ExpandMoreIcon,
  ShieldCheck as ShieldIcon,
  CurrencyInr as CurrencyIcon,
  PaperPlaneTilt as SendIcon,
  User as UserIcon,
} from "@phosphor-icons/react";

// Sammaan Capital / Server base URL
const WEB_BASE_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:8080/api/v1";

const SWR_KEY = "admin/secured-loans-list";

// Custom fetcher that hits f2fintech-server with fallback
const loansFetcher = async () => {
  try {
    const res = await axiosInstance.get(`${WEB_BASE_URL}/admin/secured-loans`, {
      timeout: 15000,
    });
    if (res.data?.status === "Success" && Array.isArray(res.data?.data)) {
      return res.data;
    }
  } catch (e) {
    // If WEB_BASE_URL fails, try fallback on default baseURL
  }

  const fallback = await axiosInstance.get("/admin/secured-loans", {
    timeout: 15000,
  });
  return fallback.data;
};

// Formatter for Indian Rupees
const formatINR = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper for status badge colors and labels
const getStatusBadge = (status: string | null | undefined) => {
  if (!status) {
    return {
      label: "Not Checked",
      color: "default" as const,
      bg: "#f1f5f9",
      text: "#64748b",
      border: "#cbd5e1",
    };
  }
  const s = status.toLowerCase();
  if (
    s.includes("sanction") ||
    s.includes("disburs") ||
    s.includes("approv") ||
    s.includes("success")
  ) {
    return {
      label: status,
      color: "success" as const,
      bg: "#ecfdf5",
      text: "#059669",
      border: "#a7f3d0",
    };
  }
  if (
    s.includes("reject") ||
    s.includes("drop") ||
    s.includes("fail") ||
    s.includes("error")
  ) {
    return {
      label: status,
      color: "error" as const,
      bg: "#fef2f2",
      text: "#dc2626",
      border: "#fecaca",
    };
  }
  if (
    s.includes("login") ||
    s.includes("pending") ||
    s.includes("progress") ||
    s.includes("process")
  ) {
    return {
      label: status,
      color: "warning" as const,
      bg: "#fffbeb",
      text: "#d97706",
      border: "#fde68a",
    };
  }
  return {
    label: status,
    color: "primary" as const,
    bg: "#eff6ff",
    text: "#2563eb",
    border: "#bfdbfe",
  };
};

interface StatusResult {
  httpStatus: number;
  isSuccess: boolean;
  message: string;
  leadNo?: string;
  currentStatus?: string;
  sammaanLiveResponse?: any;
  fullDecryptedResponse?: any;
  emailReadySummary?: string;
  elapsedMs?: number;
  error?: string;
  rawResponse?: any;
  timestamp: string;
  targetLoan?: any;
}

const SecuredLoansPage = () => {
  const { data, error, isLoading, isValidating } = useSWR<any>(
    SWR_KEY,
    loansFetcher,
    { revalidateOnFocus: false }
  );

  const loans = useMemo(() => data?.data || [], [data]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Status check state & modal
  const [refreshingId, setRefreshingId] = useState<number | string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [activeLeadInfo, setActiveLeadInfo] = useState<{
    id: number | string;
    leadNo: string;
    name: string;
    salesforceUniqueId?: string;
  } | null>(null);

  // Manual check dialog state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualLeadId, setManualLeadId] = useState("");
  const [manualSalesforceId, setManualSalesforceId] = useState("");

  // Copy feedback state
  const [snackbarText, setSnackbarText] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Stats calculations
  const stats = useMemo(() => {
    let totalSanctioned = 0;
    let totalDisbursed = 0;
    let checkedCount = 0;
    let sanctionedCount = 0;

    loans.forEach((l: any) => {
      if (l.currentStatus) checkedCount++;
      if (l.sanctionAmount) {
        totalSanctioned += Number(l.sanctionAmount) || 0;
        sanctionedCount++;
      }
      if (l.disbursalAmount) {
        totalDisbursed += Number(l.disbursalAmount) || 0;
      }
    });

    return {
      total: loans.length,
      checkedCount,
      sanctionedCount,
      totalSanctioned,
      totalDisbursed,
    };
  }, [loans]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter((l: any) => {
      const q = searchQuery.trim().toLowerCase();
      const fullName = `${l.firstName || ""} ${l.lastName || ""}`.toLowerCase();
      const leadNo = (l.externalLeadId || "").toLowerCase();
      const mobile = (l.mobileNo || "").toLowerCase();
      const email = (l.emailId || "").toLowerCase();
      const idStr = String(l.id);

      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        leadNo.includes(q) ||
        mobile.includes(q) ||
        email.includes(q) ||
        idStr.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "CHECKED") return Boolean(l.currentStatus);
      if (statusFilter === "NOT_CHECKED") return !l.currentStatus;

      const curr = (l.currentStatus || "").toLowerCase();
      if (statusFilter === "SANCTIONED")
        return curr.includes("sanction") || curr.includes("disburs");
      if (statusFilter === "REJECTED")
        return curr.includes("reject") || curr.includes("fail") || curr.includes("drop");
      if (statusFilter === "LOGIN")
        return curr.includes("login") || curr.includes("pending") || curr.includes("progress");

      return true;
    });
  }, [loans, searchQuery, statusFilter]);

  // Execute reverse status check API call
  const executeStatusCheck = async (
    targetIdentifier: string | number,
    salesforceUniqueId?: string | null,
    loanData?: any
  ) => {
    const startTime = Date.now();
    setRefreshingId(targetIdentifier);
    setStatusLoading(true);
    setStatusResult(null);
    setStatusModalOpen(true);

    const leadNo = loanData?.externalLeadId || String(targetIdentifier);
    const applicantName = loanData
      ? `${loanData.firstName || ""} ${loanData.lastName || ""}`.trim()
      : `Lead: ${leadNo}`;

    setActiveLeadInfo({
      id: targetIdentifier,
      leadNo,
      name: applicantName || leadNo,
      salesforceUniqueId: salesforceUniqueId || loanData?.salesforceUniqueId,
    });

    try {
      let url = `${WEB_BASE_URL}/admin/secured-loans/${encodeURIComponent(
        String(targetIdentifier)
      )}/status?consumerSystemName=F2Fintech`;

      const sfId =
        salesforceUniqueId ||
        loanData?.salesforceUniqueId ||
        (targetIdentifier === manualLeadId?.trim() ? manualSalesforceId?.trim() : null);

      if (sfId) {
        url += `&salesforceUniqueId=${encodeURIComponent(sfId.trim())}`;
      }

      const response = await axiosInstance.get(url, {
        timeout: 35000,
        validateStatus: () => true, // capture 4xx/5xx responses gracefully
      });

      const elapsed = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;
      const resData = response.data || {};

      setStatusResult({
        httpStatus: response.status,
        isSuccess,
        message:
          resData.message ||
          (isSuccess ? "Status fetched successfully" : "Failed to fetch status"),
        leadNo: resData.leadNo || leadNo,
        currentStatus: resData.currentStatus || resData.sammaanLiveResponse?.Status,
        sammaanLiveResponse: resData.sammaanLiveResponse,
        fullDecryptedResponse: resData.fullDecryptedResponse,
        emailReadySummary: resData.emailReadySummary,
        rawResponse: resData.rawResponse,
        elapsedMs: resData.timeElapsedMs || elapsed,
        timestamp: new Date().toLocaleTimeString(),
        targetLoan: resData.data || loanData,
      });

      // If successful, refresh the list in background so table row reflects updated status
      if (isSuccess) {
        mutate(SWR_KEY);
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      setStatusResult({
        httpStatus: err.response?.status || 500,
        isSuccess: false,
        message: err.response?.data?.message || err.message || "Network error occurred",
        error: err.message,
        emailReadySummary: err.response?.data?.emailReadySummary,
        rawResponse: err.response?.data,
        fullDecryptedResponse: err.response?.data?.fullDecryptedResponse,
        elapsedMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        targetLoan: loanData,
      });
    } finally {
      setStatusLoading(false);
      setRefreshingId(null);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, type: "report" | "json") => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (type === "report") {
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2500);
        setSnackbarText("Email-ready Sammaan report copied to clipboard!");
      } else {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2500);
        setSnackbarText("Decrypted JSON copied to clipboard!");
      }
    } catch (e) {
      setSnackbarText("Failed to copy text.");
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* ─── Top Header Section ─── */}
      <Box
        sx={{
          mb: 3.5,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                backgroundColor: "#3949ab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(57, 73, 171, 0.25)",
              }}
            >
              <ShieldIcon size={26} weight="duotone" />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: "-0.01em" }}>
                  Secured Loans
                </Typography>
                <Chip
                  label={`${loans.length} Applications`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Live Sammaan Capital integration tracking & Reverse Status Check.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<SendIcon size={18} />}
            onClick={() => {
              setManualLeadId("");
              setManualSalesforceId("");
              setManualModalOpen(true);
            }}
            sx={{
              borderColor: "#3949ab",
              color: "#3949ab",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              "&:hover": {
                borderColor: "#303f9f",
                backgroundColor: "rgba(57, 73, 171, 0.05)",
              },
            }}
          >
            Direct Status Check
          </Button>

          <Button
            variant="contained"
            startIcon={
              isValidating ? (
                <CircularProgress size={16} sx={{ color: "#ffffff" }} />
              ) : (
                <RefreshIcon size={18} />
              )
            }
            onClick={() => mutate(SWR_KEY)}
            disabled={isValidating}
            sx={{
              backgroundColor: "#3949ab",
              color: "#ffffff",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
              boxShadow: "0 4px 10px rgba(57, 73, 171, 0.25)",
              "&:hover": { backgroundColor: "#303f9f" },
            }}
          >
            Refresh List
          </Button>
        </Stack>
      </Box>

      {/* ─── Metric Summary Cards ─── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(57, 73, 171, 0.1)",
                color: "#3949ab",
                width: 48,
                height: 48,
                borderRadius: 2,
              }}
            >
              <UserIcon size={24} weight="bold" />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Leads
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>
                {stats.total}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                width: 48,
                height: 48,
                borderRadius: 2,
              }}
            >
              <CheckCircleIcon size={24} weight="bold" />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Status Checked
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#10b981" }}>
                {stats.checkedCount}{" "}
                <Typography component="span" variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
                  / {stats.total}
                </Typography>
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(14, 165, 233, 0.1)",
                color: "#0ea5e9",
                width: 48,
                height: 48,
                borderRadius: 2,
              }}
            >
              <CurrencyIcon size={24} weight="bold" />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Sanctioned
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0ea5e9" }}>
                {formatINR(stats.totalSanctioned)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(168, 85, 247, 0.1)",
                color: "#a855f7",
                width: 48,
                height: 48,
                borderRadius: 2,
              }}
            >
              <CurrencyIcon size={24} weight="bold" />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Disbursed
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#a855f7" }}>
                {formatINR(stats.totalDisbursed)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Search & Filters Bar ─── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by customer name, mobile, email, lead ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon size={18} color="#94a3b8" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, backgroundColor: "#f8fafc", width: { xs: 260, md: 380 } },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
            Filter by Status:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2, backgroundColor: "#f8fafc" }}
            >
              <MenuItem value="ALL">All Applications</MenuItem>
              <MenuItem value="CHECKED">Checked with Sammaan</MenuItem>
              <MenuItem value="SANCTIONED">Sanctioned / Disbursed</MenuItem>
              <MenuItem value="LOGIN">Underwriting / Login</MenuItem>
              <MenuItem value="REJECTED">Rejected / Dropped</MenuItem>
              <MenuItem value="NOT_CHECKED">Not Checked</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* ─── Main Applications Table ─── */}
      {isLoading ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          <CircularProgress size={36} sx={{ color: "#3949ab", mb: 2 }} />
          <Typography variant="body1" sx={{ color: "#64748b", fontWeight: 600 }}>
            Loading secured loan applications...
          </Typography>
        </Paper>
      ) : filteredLoans.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              color: "#94a3b8",
            }}
          >
            <ShieldIcon size={32} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
            No secured loan records found
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search criteria or filter options."
              : "No applications have been submitted to Sammaan Capital yet."}
          </Typography>
          {(searchQuery || statusFilter !== "ALL") && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Clear Filters
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <Table sx={{ minWidth: 950 }}>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#3949ab",
                  "& th": { color: "#ffffff", fontWeight: 700, fontSize: "0.82rem", py: 1.8 },
                }}
              >
                <TableCell>ID</TableCell>
                <TableCell>Applicant Name</TableCell>
                <TableCell>Contact Details</TableCell>
                <TableCell>Expected Loan</TableCell>
                <TableCell>Salesforce Lead ID</TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Sammaan Live Status</TableCell>
                <TableCell>Sanction / Disbursal</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLoans.map((loan: any) => {
                const statusBadge = getStatusBadge(loan.currentStatus);
                const isChecking = refreshingId === loan.id;

                return (
                  <TableRow
                    key={loan.id}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>
                      #{loan.id}
                    </TableCell>

                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                        {loan.firstName} {loan.lastName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {loan.loanType || "Home Loan"} {loan.city ? `• ${loan.city}` : ""}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                        {loan.mobileNo}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        {loan.emailId || "No email"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>
                      {formatINR(loan.expectedLoanAmount)}
                    </TableCell>

                    <TableCell>
                      {loan.externalLeadId ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip
                            label={loan.externalLeadId}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontFamily: "monospace",
                              backgroundColor: "#e0e7ff",
                              color: "#3730a3",
                              borderRadius: 1.5,
                            }}
                          />
                          <Tooltip title="Copy Lead Number">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(loan.externalLeadId, "report")}
                              sx={{ p: 0.5, color: "#94a3b8", "&:hover": { color: "#3949ab" } }}
                            >
                              <CopyIcon size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Chip
                          label={loan.status === "Failed" ? "Failed" : "Pending"}
                          color={loan.status === "Failed" ? "error" : "warning"}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {loan.documentUploaded ? (
                        <Tooltip title={`Document ID: ${loan.documentId || "Uploaded"}`}>
                          <Chip
                            icon={<DocumentIcon size={14} />}
                            label="Uploaded"
                            size="small"
                            sx={{
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              fontWeight: 600,
                              border: "1px solid #a7f3d0",
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Missing"
                          size="small"
                          sx={{
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            fontWeight: 500,
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Chip
                          label={statusBadge.label}
                          size="small"
                          sx={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.text,
                            fontWeight: 700,
                            border: `1px solid ${statusBadge.border}`,
                            width: "fit-content",
                          }}
                        />
                        {loan.rejectReason && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#ef4444",
                              fontWeight: 600,
                              maxWidth: 160,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={loan.rejectReason}
                          >
                            Reason: {loan.rejectReason}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      {loan.sanctionAmount || loan.disbursalAmount ? (
                        <Box>
                          {loan.sanctionAmount && (
                            <Typography variant="caption" sx={{ display: "block", color: "#059669", fontWeight: 700 }}>
                              Sanction: {formatINR(loan.sanctionAmount)}
                            </Typography>
                          )}
                          {loan.disbursalAmount && (
                            <Typography variant="caption" sx={{ display: "block", color: "#7c3aed", fontWeight: 700 }}>
                              Disbursed: {formatINR(loan.disbursalAmount)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          —
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                      {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : "—"}
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        variant={loan.currentStatus ? "outlined" : "contained"}
                        size="small"
                        startIcon={
                          isChecking ? (
                            <CircularProgress size={14} sx={{ color: loan.currentStatus ? "#3949ab" : "#ffffff" }} />
                          ) : (
                            <RefreshIcon size={14} />
                          )
                        }
                        onClick={() => executeStatusCheck(loan.id, loan.salesforceUniqueId, loan)}
                        disabled={isChecking || !loan.externalLeadId}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          borderRadius: 2,
                          px: 1.8,
                          py: 0.6,
                          ...(loan.currentStatus
                            ? {
                                borderColor: "#cbd5e1",
                                color: "#3949ab",
                                "&:hover": { borderColor: "#3949ab", backgroundColor: "rgba(57, 73, 171, 0.04)" },
                              }
                            : {
                                backgroundColor: "#3949ab",
                                color: "#ffffff",
                                "&:hover": { backgroundColor: "#303f9f" },
                              }),
                        }}
                      >
                        {isChecking ? "Checking..." : loan.currentStatus ? "Re-check" : "Check Status"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Dialog: Live Status Check Response Inspector ─── */}
      <Dialog
        open={statusModalOpen}
        onClose={() => !statusLoading && setStatusModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            overflow: "hidden",
            boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 3,
            backgroundColor: "#1e293b",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
            >
              <ShieldIcon size={22} weight="bold" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#ffffff", fontSize: "1.1rem" }}>
                Sammaan Capital Reverse Status Check
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Lead Number:{" "}
                <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>
                  {activeLeadInfo?.leadNo || "N/A"}
                </strong>{" "}
                • {activeLeadInfo?.name}
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={() => setStatusModalOpen(false)}
            disabled={statusLoading}
            sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff", backgroundColor: "#334155" } }}
          >
            <CloseIcon size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2.5, md: 3.5 }, backgroundColor: "#f8fafc" }}>
          {/* Loading View */}
          {statusLoading ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress size={50} thickness={4} sx={{ color: "#3949ab", mb: 2.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
                Querying Sammaan Capital ESB Gateway...
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Encrypting request with AES-256-CBC, requesting reverse status update, and decrypting payload...
              </Typography>
            </Box>
          ) : statusResult ? (
            <Box>
              {/* Status Header Banner */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 2.5,
                  backgroundColor: statusResult.isSuccess ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${statusResult.isSuccess ? "#a7f3d0" : "#fecaca"}`,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {statusResult.isSuccess ? (
                    <CheckCircleIcon size={32} weight="fill" color="#059669" />
                  ) : (
                    <XCircleIcon size={32} weight="fill" color="#dc2626" />
                  )}
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        color: statusResult.isSuccess ? "#065f46" : "#991b1b",
                      }}
                    >
                      {statusResult.isSuccess
                        ? "Live Status Response: SUCCESS"
                        : "Reverse Status Check FAILED"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: statusResult.isSuccess ? "#047857" : "#b91c1c",
                        fontSize: "0.85rem",
                      }}
                    >
                      {statusResult.message}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`HTTP ${statusResult.httpStatus}`}
                    size="small"
                    color={statusResult.isSuccess ? "success" : "error"}
                    sx={{ fontWeight: 800 }}
                  />
                  {statusResult.elapsedMs && (
                    <Chip
                      label={`${statusResult.elapsedMs} ms`}
                      size="small"
                      sx={{ backgroundColor: "#e2e8f0", color: "#334155", fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Paper>

              {/* 4 Highlight Metric Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Current Status
                      </Typography>
                      <Box sx={{ mt: 0.8 }}>
                        {statusResult.sammaanLiveResponse?.Status || statusResult.currentStatus ? (
                          <Chip
                            label={statusResult.sammaanLiveResponse?.Status || statusResult.currentStatus}
                            sx={{
                              ...getStatusBadge(
                                statusResult.sammaanLiveResponse?.Status || statusResult.currentStatus
                              ),
                              fontWeight: 800,
                              fontSize: "0.85rem",
                            }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            N/A
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Sanction Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#059669", mt: 0.5 }}>
                        {statusResult.sammaanLiveResponse?.Sanction_Amount
                          ? formatINR(statusResult.sammaanLiveResponse.Sanction_Amount)
                          : "None"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Disbursal Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#7c3aed", mt: 0.5 }}>
                        {statusResult.sammaanLiveResponse?.Disbursal_Amount
                          ? formatINR(statusResult.sammaanLiveResponse.Disbursal_Amount)
                          : "None"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0", boxShadow: "none" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Login / Applied
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#2563eb", mt: 0.5 }}>
                        {statusResult.sammaanLiveResponse?.Login_Amount
                          ? formatINR(statusResult.sammaanLiveResponse.Login_Amount)
                          : statusResult.targetLoan?.expectedLoanAmount
                          ? formatINR(statusResult.targetLoan.expectedLoanAmount)
                          : "—"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Rejection Reason Alert if any */}
              {statusResult.sammaanLiveResponse?.Reject_Reason && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  <AlertTitle sx={{ fontWeight: 800 }}>Rejection Reason (from Sammaan Capital):</AlertTitle>
                  {statusResult.sammaanLiveResponse.Reject_Reason}
                </Alert>
              )}

              {/* Applicant & Salesforce Identifier Box */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                      Target Lead No:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>
                      {statusResult.leadNo || activeLeadInfo?.leadNo || "N/A"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                      Salesforce Unique ID (18-Digit):
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "#3949ab",
                          wordBreak: "break-all",
                        }}
                      >
                        {statusResult.targetLoan?.salesforceUniqueId ||
                          activeLeadInfo?.salesforceUniqueId ||
                          "Auto-resolved from session"}
                      </Typography>
                      {activeLeadInfo?.salesforceUniqueId && (
                        <Tooltip title="Copy Salesforce ID">
                          <IconButton
                            size="small"
                            onClick={() =>
                              copyToClipboard(activeLeadInfo.salesforceUniqueId || "", "report")
                            }
                            sx={{ p: 0.3 }}
                          >
                            <CopyIcon size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Email-Ready Sammaan Report Section */}
              {statusResult.emailReadySummary && (
                <Accordion
                  defaultExpanded
                  sx={{
                    mb: 2,
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "10px !important",
                    border: "1px solid #334155",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon size={20} color="#38bdf8" />}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        pr: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#60a5fa" }}>
                          📧 Ready-to-Mail Report for Sammaan Team
                        </Typography>
                        <Chip
                          size="small"
                          label="1-Click Copy"
                          sx={{
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                            color: "#93c5fd",
                            height: 20,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={copiedReport ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(statusResult.emailReadySummary || "", "report");
                        }}
                        sx={{
                          backgroundColor: copiedReport ? "#10b981" : "#2563eb",
                          "&:hover": { backgroundColor: copiedReport ? "#059669" : "#1d4ed8" },
                          textTransform: "none",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          px: 2,
                          py: 0.4,
                        }}
                      >
                        {copiedReport ? "Copied!" : "Copy Email Report"}
                      </Button>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 1 }}>
                      Contains plaintext request, encrypted envelope, raw gateway status, and decrypted response:
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: "#020617",
                        color: "#e2e8f0",
                        p: 2,
                        borderRadius: 1.5,
                        fontSize: "0.78rem",
                        overflowX: "auto",
                        fontFamily: "monospace",
                        maxHeight: "320px",
                        border: "1px solid #1e293b",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        m: 0,
                      }}
                    >
                      {statusResult.emailReadySummary}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Decrypted JSON Inspector */}
              <Accordion
                sx={{
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  borderRadius: "10px !important",
                  border: "1px solid #334155",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon size={20} color="#94a3b8" />}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      pr: 2,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#38bdf8" }}>
                      Decrypted Response Payload (JSON)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={copiedJson ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          JSON.stringify(
                            statusResult.fullDecryptedResponse ||
                              statusResult.sammaanLiveResponse ||
                              statusResult,
                            null,
                            2
                          ),
                          "json"
                        );
                      }}
                      sx={{
                        color: copiedJson ? "#10b981" : "#94a3b8",
                        textTransform: "none",
                        fontSize: "0.75rem",
                      }}
                    >
                      {copiedJson ? "Copied!" : "Copy JSON"}
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 1.5,
                      backgroundColor: "#020617",
                      color: "#a5f3fc",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      overflowX: "auto",
                      maxHeight: 350,
                      border: "1px solid #1e293b",
                    }}
                  >
                    {JSON.stringify(
                      statusResult.fullDecryptedResponse ||
                        statusResult.sammaanLiveResponse ||
                        statusResult,
                      null,
                      2
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            {statusResult?.timestamp ? `Last checked at: ${statusResult.timestamp}` : ""}
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            {activeLeadInfo && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon size={16} />}
                disabled={statusLoading}
                onClick={() =>
                  executeStatusCheck(
                    activeLeadInfo.id,
                    activeLeadInfo.salesforceUniqueId,
                    statusResult?.targetLoan
                  )
                }
                sx={{
                  borderRadius: 2,
                  borderColor: "#3949ab",
                  color: "#3949ab",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Re-check Status
              </Button>
            )}

            <Button
              variant="contained"
              size="small"
              onClick={() => setStatusModalOpen(false)}
              disabled={statusLoading}
              sx={{
                borderRadius: 2,
                backgroundColor: "#1e293b",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 600,
                px: 2.5,
                "&:hover": { backgroundColor: "#0f172a" },
              }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Direct Manual Lead Check ─── */}
      <Dialog
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", pb: 1 }}>
          Direct Sammaan Lead Status Check
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
            Enter any Sammaan Capital Lead Number (e.g. <code>SF000005531</code>) along with its 18-digit Salesforce Unique ID to query live status immediately.
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              size="small"
              label="Sammaan Lead Number"
              placeholder="e.g. SF000005531"
              value={manualLeadId}
              onChange={(e) => setManualLeadId(e.target.value)}
              InputProps={{ sx: { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              size="small"
              label="Salesforce Unique ID (18-Digit)"
              placeholder="e.g. 00Q9I00000L8MGzUAN"
              value={manualSalesforceId}
              onChange={(e) => setManualSalesforceId(e.target.value)}
              helperText="18-digit Unique ID from Lead Push creation response (optional if saved in DB)"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            variant="text"
            onClick={() => setManualModalOpen(false)}
            sx={{ color: "#64748b", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!manualLeadId.trim()}
            onClick={() => {
              setManualModalOpen(false);
              executeStatusCheck(manualLeadId.trim(), manualSalesforceId.trim() || null);
            }}
            sx={{
              backgroundColor: "#3949ab",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              "&:hover": { backgroundColor: "#303f9f" },
            }}
          >
            Check Status Live
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar Notification ─── */}
      <Snackbar
        open={Boolean(snackbarText)}
        autoHideDuration={2500}
        onClose={() => setSnackbarText(null)}
        message={snackbarText}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default SecuredLoansPage;
