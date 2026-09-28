"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Grid,
  Button,
  Typography,
  Avatar,
  Box,
  Checkbox,
  Fade,
  Chip,
  useMediaQuery,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Dialog,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Collapse,
  Paper,
  CardContent,
  Card,
  TextField,
  TableCell,
  TableRow,
  Modal,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import {
  MailRounded,
  PhoneRounded,
  AccessTimeRounded,
  LocationOnRounded,
  Close,
  DeleteForever,
  DeleteOutline,
  ExpandMore,
  ExpandLess,
  DeleteOutlined,
  History,
  OpenInNew,
  CommentOutlined,
  WarningAmber,
} from "@mui/icons-material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BusinessIcon from '@mui/icons-material/Business';
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import { useCreateTicket } from "@/hooks/ticket";
import { useCreateTicketHistory } from "@/hooks/tickethistory";
import { Utility } from "@/utils";
import { useModifyCustomerApplication } from "@/hooks/customerApplication";
import { fetcher } from "@/apis/apiClient";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { resetCustomerApplications } from "@/redux/features/customerApplicationSlice";
import { resetTickets } from "@/redux/features/ticketSlice";
import { axiosInstance } from "@/apis/config/axiosConfig";

interface ApplicationCardProps {
  customerApplication: {
    customerId: number;
    customerName: string;
    customerEmail: string;
    customerContact?: string;
    customerProfileImage?: string;
    customerLocation?: string;
    customerState?: string;
    state?: string;
    applicationAmount: string;
    loanType: string;
    leadType?: string;
    applicationTenure: number;
    applicationDate: string;
    applicationId: number;
    ticketId?: number;
    ticketStatus?: string;
    loanStatus?: string;
    userRole?: string;
    applicationProvider?: string;
    showDeleteButton?: boolean;
    disbursed_At?: string;
    disbursed_Amount?: number;
    approved_At?: string;
    approved_Amount?: number;
    due_date?: string;
    source?: string;
    applicationSource?: string;
    existing_loans?: string;
    existingLoans?: string;
    is_picked?: number;
    appliedBy?: number | null;
    onDelete: (applicationId: string, customerName: string) => void;
  };
  handleStartClick?: (ticketId: number) => void;
  showDeleteButton?: boolean;
  refetch?: () => Promise<void>;
  userRole?: string;
  handleDeleteTicket?: (ticketId: number) => void;
  isApplication?: boolean;
  toggleListView?: string;
  mainIndex?: number;
  validateCompanyForCheckbox?: () => boolean;
}

function InfoRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string | undefined;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          color: "#6E44FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(110, 68, 255, 0.1)",
          borderRadius: "50%",
          padding: "8px",
        }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          fontSize: "small",
        })}
      </Box>
      <Typography variant="body2" sx={{ color: "#333", fontWeight: "medium" }}>
        {text}
      </Typography>
    </Box>
  );
}

function InfoChip({
  icon,
  text,
  color = "#6E44FF",
}: {
  icon: React.ReactNode;
  text: string | undefined;
  color?: string;
}) {
  return (
    <Chip
      icon={React.cloneElement(icon as React.ReactElement, {
        fontSize: "small",
        sx: { color: color },
      })}
      label={text}
      variant="outlined"
      size="small"
      sx={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}10`,
        fontWeight: "medium",
        "& .MuiChip-icon": {
          color: color,
        },
      }}
    />
  );
}

function CardField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: '#4b5563',
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 400,
          color: '#1e293b',
          fontSize: '0.78rem',
          mt: 0.2,
          wordBreak: 'break-word',
          lineHeight: 1.3,
        }}
      >
        {value || "N/A"}
      </Typography>
    </Box>
  );
}

function CardGroup({
  title,
  bgColor,
  borderColor,
  children,
}: {
  title: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  const greyBorder = "rgba(0, 0, 0, 0.08)";
  return (
    <Box
      sx={{
        bgcolor: "transparent",
        border: `1px solid ${greyBorder}`,
        borderRadius: "8px",
        p: 1.25,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 850,
          color: "#475569",
          fontSize: "0.62rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderBottom: `1px dashed ${greyBorder}`,
          pb: 0.5,
          mb: 0.25,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {children}
      </Box>
    </Box>
  );
}

const getSourcePill = (source?: string) => {
  const s = source?.toLowerCase()?.trim() || "";
  let config = {
    gradient: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
    bg: "rgba(100, 116, 139, 0.08)",
    border: "rgba(100, 116, 139, 0.25)",
    label: source ? source.toUpperCase() : "N/A",
  };

  if (s === "website") {
    config = {
      gradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      bg: "rgba(59, 130, 246, 0.09)",
      border: "rgba(59, 130, 246, 0.3)",
      label: "WEBSITE",
    };
  } else if (s === "oms") {
    config = {
      gradient: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.3)",
      label: "OMS",
    };
  } else if (s === "lendgrid") {
    config = {
      gradient: "linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)",
      bg: "rgba(168, 85, 247, 0.09)",
      border: "rgba(168, 85, 247, 0.3)",
      label: "LENDGRID",
    };
  }

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: "4px",
        px: 0.6,
        py: 0.15,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        component="span"
        sx={{
          background: config.gradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {config.label}
      </Box>
    </Box>
  );
};

const getSourceColor = (source?: string): string => {
  const s = source?.toLowerCase()?.trim() || "";
  if (s === "website") return "#1e40af";
  if (s === "oms") return "#047857";
  if (s === "lendgrid") return "#7e22ce";
  return "#475569";
};

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  customerApplication,
  handleStartClick = null,
  showDeleteButton = false,
  refetch = null,
  onDelete,
  userRole,
  handleDeleteTicket,
  handleDeleteApplication,
  isApplication = false,
  toggleListView,
  mainIndex,
  validateCompanyForCheckbox
}) => {
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showComment, setShowComment] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [commentData, setCommentData] = useState<any[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const [isPickingUp, setIsPickingUp] = useState<boolean>(false);
  const isPickingUpRef = useRef<boolean>(false);
  const [appliedByName, setAppliedByName] = useState<string | null>(null);

  useEffect(() => {
    if (!customerApplication.appliedBy) {
      setAppliedByName(null);
      return;
    }
    let isMounted = true;
    axiosInstance
      .get(`get-user-name/${customerApplication.appliedBy}`)
      .then((res) => {
        if (!isMounted) return;
        const username = res.data?.data?.username;
        if (username) setAppliedByName(username);
        else setAppliedByName(null);
      })
      .catch(() => {
        if (isMounted) setAppliedByName(null);
      });
    return () => {
      isMounted = false;
    };
  }, [customerApplication.appliedBy]);

  const dispatch: AppDispatch = useDispatch();
  const { toastAndNavigate } = Utility();
  const {
    calculateDaysAgo,
    capitalizeEachWord,
    decodedToken,
    formatTenure,
  } = Utility();

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTab = useMediaQuery("(min-width:601px) and (max-width:1200px)");
  const isIpad = useMediaQuery("(min-width:1000px) and (max-width:1300px)");
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const deleteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (openDeleteDialog) {
      const timer = setTimeout(() => {
        deleteTextareaRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [openDeleteDialog]);

  const isOverdue = React.useMemo(() => {
    if (!customerApplication.due_date || customerApplication.approved_At) return false;
    return dayjs().isAfter(dayjs(customerApplication.due_date), 'day');
  }, [customerApplication.due_date, customerApplication.approved_At]);


  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(
      customerApplication.applicationId,
      customerApplication.customerName
    );
  };

  const { createTicket } = useCreateTicket("create-ticket");
  const { modifyCustomerApplication: modifyiedCustomerApplication } =
    useModifyCustomerApplication("update-loan-application");
  const { createTicketHistory } = useCreateTicketHistory("create-ticket-history");

  const toggleHistory = () => setShowHistory((prev) => !prev);
  const toggleExpanded = () => setExpanded((prev) => !prev);
  const toggleComment = () => setShowComment((prev) => !prev);

  const formattedCreatedAt = customerApplication?.applicationDate
    ? `Application At: ${new Date(customerApplication.applicationDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`
    : "Created At: N/A";

  const openConfirmDialog = (e) => {
    e.stopPropagation();
    setOpenDeleteDialog(true);
  };

  const closeConfirmDialog = () => {
    if (isDeleting) return;
    setOpenDeleteDialog(false);
    setDeleteReason("");
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      toastAndNavigate(
        dispatch,
        true,
        "error",
        "Please provide a reason for deletion",
        null,
        null,
        true
      );
      return;
    }

    if (handleDeleteTicket && !isApplication) {
      try {
        setIsDeleting(true);
        await handleDeleteTicket(customerApplication.ticketId, deleteReason);
        toastAndNavigate(
          dispatch,
          true,
          "success",
          "Ticket deleted successfully",
          null,
          null,
          false
        );
        closeConfirmDialog();
      } catch (error) {
        console.log("Error deleting ticket:", error);
        toastAndNavigate(
          dispatch,
          true,
          "error",
          "Failed to delete ticket. Please try again.",
          null,
          null,
          true
        );
      } finally {
        setIsDeleting(false);
      }
    }
    if (isApplication && handleDeleteApplication) {
      handleDeleteApplication(customerApplication.applicationId);
    }
  };

  useEffect(() => {
    if (showHistory && customerApplication?.ticketId) {
      const fetchHistoryData = async () => {
        try {
          const response = await axiosInstance.get(
            `get-ticket-histories/${customerApplication.ticketId}`
          );
          const data = response.data;

          if (data.statusCode === 200) {
            setHistoryData(data.data);
          } else {
            console.error("Failed to fetch history data:", data.message);
          }
        } catch (error) {
          console.error("Error fetching history data:", error);
        }
      };
      fetchHistoryData();
    }
  }, [showHistory, customerApplication?.ticketId]);

  useEffect(() => {
    if (showComment && customerApplication?.ticketId) {
      const fetchCommentData = async () => {
        try {
          const response = await axiosInstance.get(
            `get-ticket-activities/${customerApplication.ticketId}`
          );
          const data = response.data;

          if (data.statusCode === 200) {
            setCommentData(data.data);
          } else {
            console.error("Failed to fetch comment data:", data.message);
          }
        } catch (error) {
          console.error("Error fetching comment data:", error);
        }
      };
      fetchCommentData();
    }
  }, [showComment, customerApplication?.ticketId]);

  const confirmPickup = async () => {
    isPickingUpRef.current = true;
    setIsPickingUp(true);
    try {
      const ticketResponse = await createTicket({
        customer_application_id: customerApplication.applicationId,
        user_id: decodedToken()?.id,
        status: "operations",
      });

      if (ticketResponse?.statusCode === 409) {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          ticketResponse?.message || "This Application Is Already Picked By Another User. Please Pick Another Application.",
          null,
          null,
          false,
          true
        );

        dispatch(resetCustomerApplications(customerApplication.applicationId));
      } else if (ticketResponse?.statusCode === 201 || ticketResponse?.data) {
        dispatch(resetTickets());
        await modifyiedCustomerApplication(customerApplication.applicationId, {
          is_picked: 1,
        });
        const newTicketId = ticketResponse?.data?.id;
        const loggedInUser = decodedToken()?.username;
        await createTicketHistory({
          ticket_id: newTicketId,
          action: `${loggedInUser} picked the loan application`,
        });
        dispatch(resetCustomerApplications(customerApplication.applicationId));
      } else {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          ticketResponse?.message || "Failed to pick application",
          null,
          null,
          false,
          true
        );
      }
    } catch (error) {
      console.log("Error in checkbox change:", error);
    } finally {
      isPickingUpRef.current = false;
      setIsPickingUp(false);
    }
  };

  const handleCheckboxClick = (e?: React.MouseEvent) => {
    // Prevent multiple clicks while picking or if already picked (synchronous check via ref)
    if (isPickingUpRef.current || isPickingUp || customerApplication.is_picked === 1) {
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }
    // Validate company selection
    if (validateCompanyForCheckbox && !validateCompanyForCheckbox()) {
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }
    isPickingUpRef.current = true;
    setIsPickingUp(true);
    confirmPickup();
  };

  useEffect(() => {
    // Collapse when it's an application
    if (isApplication) {
      setExpanded(false);
    }
  }, [isApplication]);

  const formatRupees = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const ListView = () => {
    const [showAttachment, setShowAttachment] = useState({});

    const getFileExtensionFromUrl = (url: string) => {
      try {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const extension = filename.split(".").pop()?.toLowerCase();
        return extension || "";
      } catch (error) {
        return "";
      }
    };

    const isPdfAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      return extension === "pdf";
    };

    const isExcelAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const excelExtensions = ["xlsx", "xls", "csv", "xlsm", "xlsb"];
      return excelExtensions.includes(extension);
    };

    const isImageAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];
      return imageExtensions.includes(extension);
    };

    const toggleAttachment = (commentId: number | string, attachmentUrl: string) => {
      if (isExcelAttachment(attachmentUrl)) {
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          attachmentUrl
        )}`;

        const newWindow = window.open(officeViewerUrl, "_blank");

        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === "undefined"
        ) {
          const shouldDownload = window.confirm(
            "Unable to open file in viewer. Would you like to download it instead?"
          );

          if (shouldDownload) {
            const link = document.createElement("a");
            link.href = attachmentUrl;
            link.download = "";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } else if (isPdfAttachment(attachmentUrl)) {
        window.open(attachmentUrl, "_blank");
      } else {
        setShowAttachment((prev) => ({
          ...prev,
          [commentId]: !prev[commentId],
        }));
      }
    };

    return (
      <>
        <Grid item xs={12} key={customerApplication.customerId}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 2,
              py: 1.2,
              gap: 2,
              backgroundColor: "#fff",
              borderBottom: "1px solid #edf0f7",
              borderLeft: "3px solid #3f50b5",
              transition: "background-color 0.15s ease",
              "&:hover": { backgroundColor: "#f8f9fd" },
              minHeight: "56px",
            }}
          >
            {/* Avatar */}
            <Avatar
              alt={capitalizeEachWord(
                customerApplication.customerName.split(".")[1]?.trim() ||
                customerApplication.customerName.split(" ").slice(1).join(" ")
              )}
              src={customerApplication.customerProfileImage}
              sx={{
                width: 38,
                height: 38,
                background: "#3f50b5",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
              }}
            />

            {/* Name + Email + T.ID block */}
            <Box sx={{ minWidth: "160px", maxWidth: "200px", flexShrink: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#1a2340",
                  lineHeight: 1.2,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  flexWrap: "wrap",
                }}
              >
                {customerApplication.customerName?.toUpperCase()}
              </Typography>

              {userRole !== "sales" && (
                <Typography sx={{ fontSize: "0.72rem", color: "#8892a4", mt: 0.2, lineHeight: 1 }}>
                  {userRole === "admin" || customerApplication.ticketStatus !== "disbursed"
                    ? customerApplication.customerEmail
                    : "N/A"}
                </Typography>
              )}

              <Typography sx={{ fontSize: "0.72rem", color: "#8892a4", mt: 0.2, lineHeight: 1, fontWeight: 600 }}>
                {isApplication ? `S.No: ${mainIndex}` : `T.ID: ${customerApplication.ticketId || mainIndex}`}
              </Typography>
            </Box>

            {/* Divider */}
            <Box sx={{ width: "1px", height: "32px", bgcolor: "#e8edf5", flexShrink: 0 }} />

            {/* Data fields — inline, compact */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flex: 1, flexWrap: "wrap" }}>

              {/* Amount */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Amount</Typography>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#00796B", lineHeight: 1 }}>
                  {formatRupees(parseFloat(customerApplication.applicationAmount))}
                </Typography>
              </Box>

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Provider */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Provider</Typography>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#6A0DAD", lineHeight: 1 }}>
                  {customerApplication.applicationProvider || "N/A"}
                </Typography>
              </Box>

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Loan Type */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Loan Type</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#1a2340", lineHeight: 1 }}>
                  {capitalizeEachWord(customerApplication.loanType || "N/A")}
                </Typography>
              </Box>

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Lead Type */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Lead Type</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#1a2340", lineHeight: 1 }}>
                  {capitalizeEachWord(customerApplication.leadType || "N/A")}
                </Typography>
              </Box>

              {/* Source */}
              {(customerApplication.source || customerApplication.applicationSource) && (
                <>
                  <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1 }}>Source</Typography>
                    {getSourcePill(customerApplication.source || customerApplication.applicationSource)}
                    {appliedByName && (
                      <Typography sx={{ fontSize: "0.6rem", color: getSourceColor(customerApplication.source || customerApplication.applicationSource), fontWeight: 600, lineHeight: 1 }}>
                        {capitalizeEachWord(appliedByName)}
                      </Typography>
                    )}
                  </Box>
                </>
              )}

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Tenure */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Tenure</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#1a2340", lineHeight: 1 }}>
                  {formatTenure(customerApplication.applicationTenure)}
                </Typography>
              </Box>

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Location */}
              {(customerApplication.customerLocation || customerApplication.customerState) && (
                <Box>
                  <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Location</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "#1a2340", lineHeight: 1 }}>
                    {capitalizeEachWord(customerApplication.customerLocation || "")}
                    {customerApplication.customerLocation && customerApplication.customerState ? ", " : ""}
                    {capitalizeEachWord(customerApplication.customerState || "")}
                  </Typography>
                </Box>
              )}

              <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />

              {/* Created At */}
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Created At</Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#1a2340", lineHeight: 1 }}>
                  {customerApplication?.createdAt || customerApplication?.applicationDate
                    ? new Date(customerApplication.createdAt || customerApplication.applicationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "N/A"}
                </Typography>
              </Box>

              {/* Ticket status — only for ticket view */}
              {!isApplication && (
                <>
                  <Box sx={{ width: "1px", height: "28px", bgcolor: "#e8edf5", flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 600, lineHeight: 1, mb: 0.3 }}>Status</Typography>
                    <Chip
                      label={customerApplication?.ticketStatus ? capitalizeEachWord(customerApplication.ticketStatus) : "N/A"}
                      size="small"
                      sx={{ bgcolor: "rgba(12, 102, 228, 0.08)", color: "#0c66e4", fontWeight: 700, height: "20px", fontSize: "0.68rem" }}
                    />

                    {/* Status Sub-details (Date & Amount) */}
                    {customerApplication?.ticketStatus === 'approved' && ((customerApplication as any)?.approvedAt || customerApplication?.approved_At) && (
                      <Typography sx={{ fontSize: "0.6rem", color: "#8892a4", mt: 0.4, fontWeight: 600, lineHeight: 1 }}>
                        {new Date(((customerApplication as any).approvedAt || customerApplication.approved_At)!).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {((customerApplication as any)?.approvedAmount || customerApplication?.approved_Amount) && ` • ${formatRupees(((customerApplication as any).approvedAmount || customerApplication.approved_Amount) as number)}`}
                      </Typography>
                    )}

                    {customerApplication?.ticketStatus === 'disbursed' && ((customerApplication as any)?.disbursedAt || customerApplication?.disbursed_At) && (
                      <Typography sx={{ fontSize: "0.6rem", color: "#8892a4", mt: 0.4, fontWeight: 600, lineHeight: 1 }}>
                        {new Date(((customerApplication as any).disbursedAt || customerApplication.disbursed_At)!).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {((customerApplication as any)?.disbursedAmount || customerApplication?.disbursed_Amount) && ` • ${formatRupees(((customerApplication as any).disbursedAmount || customerApplication.disbursed_Amount) as number)}`}
                      </Typography>
                    )}
                  </Box>
                </>
              )}
            </Box>

            {/* Action Buttons — vertical stack with dividers, pinned right */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, ml: "auto" }}>

              {/* Delete Button */}
              {!isApplication && (showDeleteButton || (userRole === "admin" && handleDeleteTicket)) && (
                <Tooltip title="Delete Ticket" arrow>
                  <Button
                    size="small"
                    onClick={openConfirmDialog}
                    startIcon={<DeleteOutline fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: "#f44336",
                      bgcolor: "rgba(244, 67, 54, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(244, 67, 54, 0.15)",
                        color: "#d32f2f",
                      },
                      boxShadow: "none",
                    }}
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}

              {/* History Button */}
              {handleStartClick && customerApplication.ticketId && (
                <Tooltip title={showHistory ? "Close History" : "View History"} arrow>
                  <Button
                    size="small"
                    onClick={toggleHistory}
                    startIcon={userRole === "admin" ? undefined : <History fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: "#667eea",
                      bgcolor: "rgba(102, 126, 234, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.15)",
                        color: "#5a6fd8",
                      },
                      boxShadow: "none",
                    }}
                  >
                    {showHistory ? "Close" : "History"}
                  </Button>
                </Tooltip>
              )}

              {/* Comments Button */}
              {handleStartClick && customerApplication.ticketId && (
                <Tooltip title={showComment ? "Close Comments" : "View Comments"} arrow>
                  <Button
                    size="small"
                    onClick={toggleComment}
                    startIcon={userRole === "admin" ? undefined : <CommentOutlined fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: "#667eea",
                      bgcolor: "rgba(102, 126, 234, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.15)",
                        color: "#5a6fd8",
                      },
                      boxShadow: "none",
                    }}
                  >
                    {showComment ? "Close" : "Comments"}
                  </Button>
                </Tooltip>
              )}

              {/* Visit Button */}
              {handleStartClick && decodedToken()?.role !== "sales" && (
                <Tooltip title="Visit Ticket" arrow>
                  <Button
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleStartClick(customerApplication.ticketId); }}
                    startIcon={userRole === "admin" ? undefined : <OpenInNew fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: "#1976D2",
                      bgcolor: "rgba(25, 118, 210, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.15)",
                        color: "#1565C0",
                      },
                      boxShadow: "none",
                    }}
                  >
                    Visit
                  </Button>
                </Tooltip>
              )}

              {/* Pick Pill (application only) */}
              {decodedToken()?.role !== "sales" && !handleStartClick && (
                <Tooltip
                  title={isPickingUp || customerApplication.is_picked === 1 ? "Already picked" : "Assign to yourself"} arrow placement="top"
                  slotProps={{
                    tooltip: { sx: { bgcolor: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5", fontSize: "0.72rem", fontWeight: 600, px: 1.5, py: 0.5, borderRadius: "8px", boxShadow: "0 4px 12px rgba(63,80,181,0.35)" } },
                    arrow: { sx: { color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5" } },
                  }}
                >
                  <Box
                    onClick={(e) => { e.stopPropagation(); handleCheckboxClick(e); }}
                    sx={{
                      display: "inline-flex", alignItems: "center", gap: 0.5,
                      px: 1.4, py: 0.5, borderRadius: "20px",
                      border: `1.5px solid ${isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5"}`,
                      backgroundColor: isPickingUp || customerApplication.is_picked === 1 ? "rgba(0,0,0,0.04)" : "rgba(63, 80, 181, 0.06)",
                      cursor: isPickingUp || customerApplication.is_picked === 1 ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease", userSelect: "none",
                      pointerEvents: isPickingUp || customerApplication.is_picked === 1 ? "none" : "auto",
                      opacity: isPickingUp || customerApplication.is_picked === 1 ? 0.5 : 1,
                      "&:hover": !isPickingUp && customerApplication.is_picked !== 1 ? { backgroundColor: "rgba(63, 80, 181, 0.14)", boxShadow: "0 0 0 3px rgba(63,80,181,0.18)" } : {},
                      "&:active": !isPickingUp && customerApplication.is_picked !== 1 ? { transform: "scale(0.96)" } : {},
                    }}
                  >
                    <Checkbox
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); handleCheckboxClick(e as any); }}
                      size="small"
                      disabled={isPickingUp || customerApplication.is_picked === 1}
                      checked={customerApplication.is_picked === 1}
                      sx={{ p: 0, color: isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5", "&.Mui-checked": { color: "#bdbdbd" } }}
                    />
                    <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5", letterSpacing: "0.03em" }}>
                      {isPickingUp ? "Picking..." : customerApplication.is_picked === 1 ? "Picked" : "Pick"}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>



          {/* Expanded Details */}
          <Collapse in={showHistory || showComment} timeout="auto" unmountOnExit>
            <Box sx={{ p: 1, bgcolor: "#ffffff" }}>
              {!showHistory && !showComment ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                ></Box>
              ) : (
                <Grid container spacing={2}>
                  {showHistory && (
                    <Grid item xs={12} md={showComment ? 6 : 12}>
                      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#334155", mb: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}
                        >
                          Ticket History
                        </Typography>
                        <Box
                          sx={{
                            maxHeight: "80px",
                            overflowY: "auto",
                            width: "100%",
                            pr: 1,
                            "&::-webkit-scrollbar": {
                              width: "4px",
                            },
                            "&::-webkit-scrollbar-track": {
                              background: "#f1f5f9",
                              borderRadius: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              background: "#cbd5e1",
                              borderRadius: "4px",
                            },
                          }}
                        >
                          {historyData.length > 0 ? (
                            historyData.map((history, index) => (
                              <Box
                                key={index}
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  mb: 1.5,
                                  p: 1.2,
                                  bgcolor: "#f8fafc",
                                  borderRadius: 1.5,
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: "#1e293b",
                                    fontSize: "0.8rem",
                                    mb: 0.5,
                                  }}
                                >
                                  <strong>
                                    {capitalizeEachWord(history.action.split(" ")[0])}
                                  </strong>
                                  {` ${history.action.substring(
                                    history.action.indexOf(" ") + 1
                                  )}`}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                                  {new Date(history.created_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}{" "}
                                  • {calculateDaysAgo(history.created_at)}
                                </Typography>
                              </Box>
                            ))
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "#94a3b8", textAlign: "center", py: 2 }}
                            >
                              No history data available.
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  )}

                  {showComment && (
                    <Grid item xs={12} md={showHistory ? 6 : 12}>
                      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: "#334155", mb: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}
                        >
                          Comments
                        </Typography>
                        <Box
                          sx={{
                            maxHeight: "80px",
                            overflowY: "auto",
                            width: "100%",
                            pr: 1,
                            "&::-webkit-scrollbar": {
                              width: "4px",
                            },
                            "&::-webkit-scrollbar-track": {
                              background: "#f1f5f9",
                              borderRadius: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                              background: "#cbd5e1",
                              borderRadius: "4px",
                            },
                          }}
                        >
                          {commentData?.length > 0 ? (
                            commentData.map((comment, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  mb: 1.5,
                                  p: 1.2,
                                  bgcolor: "#f8fafc",
                                  borderRadius: 1.5,
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {/* User Name */}
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 700, color: "#1e293b", mb: 0.2, fontSize: "0.8rem" }}
                                >
                                  {capitalizeEachWord(
                                    comment?.user?.username || "Anonymous"
                                  )}
                                </Typography>

                                {/* Comment Text */}
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#334155", fontStyle: "normal", mb: 0.8, fontSize: "0.8rem" }}
                                >
                                  {capitalizeEachWord(comment.comment)}
                                </Typography>

                                {/* Attachment Section */}
                                {comment.attachment && (
                                  <Box sx={{ mb: 0.8 }}>
                                    <Button
                                      onClick={() =>
                                        toggleAttachment(
                                          comment.id,
                                          comment.attachment
                                        )
                                      }
                                      variant="outlined"
                                      size="small"
                                      sx={{
                                        textTransform: "none",
                                        borderColor: "#cbd5e1",
                                        color: "#3b82f6",
                                        fontSize: "0.7rem",
                                        padding: "2px 8px",
                                        minHeight: "auto",
                                        fontWeight: 600,
                                        "&:hover": {
                                          bgcolor: "#eff6ff",
                                          borderColor: "#bfdbfe",
                                        },
                                      }}
                                    >
                                      {isExcelAttachment(comment.attachment)
                                        ? "Open Excel"
                                        : isPdfAttachment(comment.attachment)
                                          ? "Open PDF"
                                          : showAttachment[comment.id]
                                            ? "Hide Attachment"
                                            : "View Attachment"}
                                    </Button>
                                  </Box>
                                )}

                                {/* Meta Info */}
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                                  {new Date(comment.created_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}{" "}
                                  • {calculateDaysAgo(comment.created_at)}
                                </Typography>
                              </Box>
                            ))
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "#94a3b8", textAlign: "center", py: 2 }}
                            >
                              No comments available.
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              )}


            </Box>
          </Collapse>
        </Grid>

        {Object.keys(showAttachment).some((key) => showAttachment[key]) &&
          (() => {
            const activeCommentId = Object.keys(showAttachment).find(
              (key) => showAttachment[key]
            );
            const activeComment = commentData.find(
              (comment) => comment.id.toString() === activeCommentId
            );

            if (!activeComment || !activeComment.attachment) return null;

            return (
              <>
                <Box
                  sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    zIndex: 999,
                  }}
                  onClick={() =>
                    toggleAttachment(activeComment.id, activeComment.attachment)
                  }
                />

                {/* Modal Content */}
                <Box
                  sx={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000,
                    backgroundColor: "white",
                    borderRadius: "8px",
                    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.3)",
                    padding: 2,
                    textAlign: "center",
                    height: isMobile ? "80vh" : isTab ? "80vh" : "85vh",
                    width: isMobile ? "95vw" : isTab ? "85vw" : "80vw",
                    maxHeight: "90vh",
                    maxWidth: "90vw",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Header with close button */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                      borderBottom: "1px solid #eee",
                      pb: 1,
                    }}
                  >
                    <Typography variant="h6" sx={{ color: "black" }}>
                      Attachment Preview
                    </Typography>
                    <Button
                      onClick={() =>
                        toggleAttachment(
                          activeComment.id,
                          activeComment.attachment
                        )
                      }
                      variant="contained"
                      size="small"
                      sx={{
                        minWidth: "auto",
                        padding: "4px 8px",
                        bgcolor: "#f06292",
                        color: "white",
                        "&:hover": {
                          bgcolor: "red",
                        },
                      }}
                    >
                      ✕
                    </Button>
                  </Box>

                  {/* Image Display */}
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                      borderRadius: "4px",
                    }}
                  >
                    <img
                      src={activeComment.attachment}
                      alt="Attachment Preview"
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                        borderRadius: "4px",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "block";
                      }}
                    />
                    <Box
                      sx={{
                        display: "none",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "200px",
                        color: "#666",
                        flexDirection: "column",
                      }}
                    >
                      <Typography>Unable to preview this file</Typography>
                      <Button
                        href={activeComment.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1 }}
                      >
                        Download File
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </>
            );
          })()}
      </>
    );
  };

  const GridView = () => {
    const isSalesUser =
      userRole === "sales" || decodedToken()?.role === "sales";
    const [showAttachment, setShowAttachment] = useState({});

    // Helper functions for file handling
    const getFileExtensionFromUrl = (url: string) => {
      try {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const extension = filename.split(".").pop()?.toLowerCase();
        return extension || "";
      } catch (error) {
        return "";
      }
    };

    const isPdfAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      return extension === "pdf";
    };

    const isExcelAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const excelExtensions = ["xlsx", "xls", "csv", "xlsm", "xlsb"];
      return excelExtensions.includes(extension);
    };

    const isImageAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];
      return imageExtensions.includes(extension);
    };

    const toggleAttachment = (commentId: number | string, attachmentUrl: string) => {
      if (isExcelAttachment(attachmentUrl)) {
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          attachmentUrl
        )}`;

        const newWindow = window.open(officeViewerUrl, "_blank");

        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === "undefined"
        ) {
          const shouldDownload = window.confirm(
            "Unable to open file in viewer. Would you like to download it instead?"
          );

          if (shouldDownload) {
            const link = document.createElement("a");
            link.href = attachmentUrl;
            link.download = "";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } else if (isPdfAttachment(attachmentUrl)) {
        window.open(attachmentUrl, "_blank");
      } else {
        // For images and other files, use modal behavior
        setShowAttachment((prev) => ({
          ...prev,
          [commentId]: !prev[commentId],
        }));
      }
    };

    return (
      <Grid
        sx={{
          display: "flex",
          justifyContent: "center",
        }}
        item
        xs={12}
        sm={6}
        md={4}
        key={customerApplication.customerId}
      >
        <Card
          sx={{
            width: "100%",
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid #e8edf5",
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            height: "auto",
            mt: 5,
            transition: "all 0.2s ease",
            "&:hover": { boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
          }}
        >
          {/* Header Banner */}
          <Box sx={{ height: "40px", bgcolor: "#3f50b5", position: "relative", borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />

          <Box sx={{ px: 2.5, pb: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            {/* Avatar */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: "-40px", mb: 1.5, zIndex: 2 }}>
              <Avatar
                alt={capitalizeEachWord(
                  customerApplication.customerName.split(".")[1]?.trim() ||
                  customerApplication.customerName.split(" ").slice(1).join(" ")
                )}
                src={customerApplication.customerProfileImage}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "#1e3a5f",
                  color: "white",
                  fontSize: 32,
                  fontWeight: "bold",
                  border: "4px solid #fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
            </Box>

            {/* Profile Info */}
            <Box sx={{ textAlign: "center", mb: 2.5 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "#1a2340",
                  lineHeight: 1.2,
                  mb: 0.5,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 0.5,
                  flexWrap: "wrap",
                }}
              >
                {customerApplication.customerName?.toUpperCase()}
              </Typography>

              {userRole !== "sales" && (
                <Typography sx={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500, mb: 1 }}>
                  {userRole === "admin" || customerApplication.ticketStatus !== "disbursed" ? customerApplication.customerEmail : "N/A"}
                </Typography>
              )}

              {isApplication ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 0.5 }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#475569", fontWeight: 700 }}>
                    S.No: {mainIndex}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, mt: 0.5 }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#475569", fontWeight: 700 }}>
                    T.ID: {customerApplication.ticketId || mainIndex}
                  </Typography>
                  <Chip
                    label={customerApplication?.ticketStatus ? capitalizeEachWord(customerApplication.ticketStatus) : 'N/A'}
                    size="small"
                    sx={{
                      bgcolor: "rgba(12, 102, 228, 0.08)",
                      color: "#0c66e4",
                      fontWeight: 700,
                      height: "22px",
                      fontSize: "0.72rem",
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Smooth Transition Panels (using Collapse for dynamic height) */}
            <Box sx={{ mb: 2, display: "flex", flexDirection: "column" }}>

              {/* DETAILS PANEL */}
              <Collapse in={!showHistory && !showComment} unmountOnExit>
                <Box
                  sx={{
                    bgcolor: "#f8fafc", borderRadius: 2, p: 2, border: "1px solid #f1f5f9"
                  }}
                >
                  <Grid container spacing={2}>
                    {/* Financials Row */}
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em" }}>AMOUNT</Typography>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#00796B" }}>
                        {formatRupees(customerApplication.applicationAmount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em" }}>PROVIDER</Typography>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#6A0DAD" }}>
                        {customerApplication.applicationProvider || "N/A"}
                      </Typography>
                    </Grid>

                    {/* Specs Row */}
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em", mt: 1 }}>LOAN TYPE</Typography>
                      <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                        {capitalizeEachWord(customerApplication.loanType || "N/A")}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em", mt: 1 }}>LEAD TYPE</Typography>
                      <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                        {capitalizeEachWord(customerApplication.leadType || "N/A")}
                      </Typography>
                    </Grid>

                    {(customerApplication.source || customerApplication.applicationSource) && (
                      <Grid item xs={6}>
                        <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.5, letterSpacing: "0.03em", mt: 1 }}>SOURCE</Typography>
                        {getSourcePill(customerApplication.source || customerApplication.applicationSource)}
                        {appliedByName && (
                          <Typography sx={{ fontSize: "0.6rem", color: getSourceColor(customerApplication.source || customerApplication.applicationSource), fontWeight: 600, mt: 0.4, lineHeight: 1 }}>
                            {capitalizeEachWord(appliedByName)}
                          </Typography>
                        )}
                      </Grid>
                    )}

                    {/* Location Row */}
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em", mt: 1 }}>TENURE</Typography>
                      <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                        {formatTenure(customerApplication.applicationTenure)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.3, letterSpacing: "0.03em", mt: 1 }}>LOCATION</Typography>
                      <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600, lineHeight: 1.2 }}>
                        {customerApplication.customerLocation || customerApplication.customerState
                          ? `${capitalizeEachWord(customerApplication.customerLocation || "")}${customerApplication.customerLocation && customerApplication.customerState ? ", " : ""}${capitalizeEachWord(customerApplication.customerState || "")}`
                          : "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Timeline / Dates */}
                  <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "space-between", alignItems: "flex-end" }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.2 }}>CREATED AT</Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600 }}>
                          {customerApplication?.createdAt || customerApplication?.applicationDate
                            ? new Date(customerApplication.createdAt || customerApplication.applicationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : "N/A"}
                        </Typography>
                      </Box>
                      {customerApplication?.ticketStatus === 'approved' && ((customerApplication as any)?.approvedAt || customerApplication?.approved_At) && (
                        <Box>
                          <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.2 }}>APPROVED</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600 }}>
                            {new Date(((customerApplication as any).approvedAt || customerApplication.approved_At)!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {((customerApplication as any)?.approvedAmount || customerApplication?.approved_Amount) && ` • ${formatRupees(((customerApplication as any).approvedAmount || customerApplication.approved_Amount) as number)}`}
                          </Typography>
                        </Box>
                      )}
                      {customerApplication?.ticketStatus === 'disbursed' && ((customerApplication as any)?.disbursedAt || customerApplication?.disbursed_At) && (
                        <Box>
                          <Typography sx={{ fontSize: "0.68rem", color: "#8892a4", fontWeight: 700, mb: 0.2 }}>DISBURSED</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600 }}>
                            {new Date(((customerApplication as any).disbursedAt || customerApplication.disbursed_At)!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {((customerApplication as any)?.disbursedAmount || customerApplication?.disbursed_Amount) && ` • ${formatRupees(((customerApplication as any).disbursedAmount || customerApplication.disbursed_Amount) as number)}`}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Pick Application Button in Timeline Row */}
                    {isApplication && decodedToken()?.role !== "sales" && (
                      <Tooltip
                        title={isPickingUp || customerApplication.is_picked === 1 ? "Already picked" : "Assign to yourself"} arrow placement="top"
                        slotProps={{
                          tooltip: { sx: { bgcolor: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5", fontSize: "0.72rem", fontWeight: 600, px: 1.5, py: 0.5, borderRadius: "8px", boxShadow: "0 4px 12px rgba(63,80,181,0.35)" } },
                          arrow: { sx: { color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5" } },
                        }}
                      >
                        <Box
                          onClick={(e) => { e.stopPropagation(); handleCheckboxClick(e); }}
                          sx={{
                            display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "20px",
                            border: `1.5px solid ${isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5"}`,
                            backgroundColor: isPickingUp || customerApplication.is_picked === 1 ? "rgba(0,0,0,0.04)" : "rgba(63, 80, 181, 0.06)",
                            cursor: isPickingUp || customerApplication.is_picked === 1 ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease", userSelect: "none",
                            pointerEvents: isPickingUp || customerApplication.is_picked === 1 ? "none" : "auto",
                            opacity: isPickingUp || customerApplication.is_picked === 1 ? 0.5 : 1,
                            "&:hover": !isPickingUp && customerApplication.is_picked !== 1 ? { backgroundColor: "rgba(63, 80, 181, 0.14)", boxShadow: "0 0 0 3px rgba(63,80,181,0.18)" } : {},
                            "&:active": !isPickingUp && customerApplication.is_picked !== 1 ? { transform: "scale(0.96)" } : {},
                          }}
                        >
                          <Checkbox
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); handleCheckboxClick(e as any); }}
                            size="small"
                            disabled={isPickingUp || customerApplication.is_picked === 1}
                            checked={customerApplication.is_picked === 1}
                            sx={{ p: 0, color: isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5", "&.Mui-checked": { color: "#bdbdbd" } }}
                          />
                          <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5", letterSpacing: "0.03em" }}>
                            {isPickingUp ? "Picking..." : customerApplication.is_picked === 1 ? "Picked" : "Pick"}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Collapse>

              {/* HISTORY PANEL */}
              <Collapse in={showHistory} unmountOnExit>
                <Box
                  sx={{
                    bgcolor: "#f8fafc", borderRadius: 2, p: 2, border: "1px solid #e8edf5", maxHeight: "300px", overflowY: "auto", mt: showHistory ? 1 : 0
                  }}
                >
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#667eea", mb: 2, letterSpacing: "0.05em" }}>TICKET HISTORY</Typography>
                  {historyData.length > 0 ? (
                    historyData.map((history, index) => (
                      <Box key={index} sx={{ display: "flex", flexDirection: "column", mb: 1, pb: 1, borderBottom: index < historyData.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <Typography variant="body2" sx={{ color: "#1a2340", fontWeight: 500, mb: 0.5, lineHeight: 1.3 }}>
                          <strong>{capitalizeEachWord(history.action.split(" ")[0])}</strong>
                          {` ${history.action.substring(history.action.indexOf(" ") + 1)}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                          {new Date(history.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: '2-digit', minute: '2-digit' })}
                          {" • "}{calculateDaysAgo(history.created_at)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: "#64748b" }}>No history data available.</Typography>
                  )}
                </Box>
              </Collapse>

              {/* COMMENTS PANEL */}
              <Collapse in={showComment} unmountOnExit>
                <Box
                  sx={{
                    bgcolor: "#f8fafc", borderRadius: 2, p: 2, border: "1px solid #e8edf5", maxHeight: "300px", overflowY: "auto", mt: showComment ? 1 : 0
                  }}
                >
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#00796B", mb: 2, letterSpacing: "0.05em" }}>COMMENTS</Typography>
                  {commentData?.length > 0 ? (
                    commentData.map((comment, idx) => (
                      <Box key={idx} sx={{ display: "flex", flexDirection: "column", mb: 1, pb: 1, borderBottom: idx < commentData.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1a2340", mb: 0.5 }}>
                          {capitalizeEachWord(comment?.user?.username || "Anonymous")}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#334155", mb: 1, lineHeight: 1.4 }}>
                          {capitalizeEachWord(comment.comment)}
                        </Typography>

                        {/* Condensed Meta/Attachment view */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                            {new Date(comment.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </Typography>

                          {comment.attachment && (
                            <Button
                              onClick={() => toggleAttachment(comment.id, comment.attachment)}
                              size="small"
                              sx={{ textTransform: "none", fontSize: "0.7rem", fontWeight: 600, bgcolor: "rgba(12, 102, 228, 0.1)", color: "#0c66e4", py: 0.2, px: 1, borderRadius: 1 }}
                            >
                              {isExcelAttachment(comment.attachment) ? "View Excel" : isPdfAttachment(comment.attachment) ? "View PDF" : "View File"}
                            </Button>
                          )}
                        </Box>

                        {/* Image/PDF Preview Modal (Kept unchanged) */}
                        {!isExcelAttachment(comment.attachment) && !isPdfAttachment(comment.attachment) && showAttachment[comment.id] && (
                          <>
                            <Box sx={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: 999 }} onClick={() => toggleAttachment(comment.id, comment.attachment)} />
                            <Box sx={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, backgroundColor: "white", borderRadius: "8px", boxShadow: "0px 4px 20px rgba(0,0,0,0.3)", padding: 2, textAlign: "center", height: isMobile ? "80vh" : "85vh", width: isMobile ? "95vw" : "80vw", maxHeight: "90vh", maxWidth: "90vw", display: "flex", flexDirection: "column" }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, borderBottom: "1px solid #eee", pb: 1 }}>
                                <Typography variant="h6" sx={{ color: "black" }}>Attachment Preview</Typography>
                                <Button onClick={() => toggleAttachment(comment.id, comment.attachment)} variant="contained" size="small" sx={{ minWidth: "auto", padding: "4px 8px", bgcolor: "#f06292", color: "white", "&:hover": { bgcolor: "red" } }}>✕</Button>
                              </Box>
                              <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", borderRadius: "4px" }}>
                                <img src={comment.attachment} alt="Attachment Preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
                                <Box sx={{ display: "none", alignItems: "center", justifyContent: "center", height: "200px", color: "#666", flexDirection: "column" }}>
                                  <Typography>Unable to preview this file</Typography>
                                  <Button href={comment.attachment} target="_blank" rel="noopener noreferrer" sx={{ mt: 1 }}>Download File</Button>
                                </Box>
                              </Box>
                            </Box>
                          </>
                        )}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: "#64748b" }}>No comments available.</Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          </Box>

          {/* Unified Action Footer - Hidden for Applications */}
          {!isApplication && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                borderTop: "1px solid #e8edf5",
                bgcolor: "#ffffff",
                flexWrap: "wrap",
              }}
            >
              {/* Delete Button inside Footer */}
              {(showDeleteButton || (userRole === "admin" && handleDeleteTicket)) && (
                <Button
                  size="small"
                  startIcon={<DeleteOutline fontSize="small" />}
                  sx={{
                    flex: 1, textTransform: "none", borderRadius: 2, py: 0.8, fontSize: "0.8rem", fontWeight: 700,
                    color: "#f44336", bgcolor: "rgba(244, 67, 54, 0.08)", "&:hover": { bgcolor: "rgba(244, 67, 54, 0.15)", color: "#d32f2f" },
                  }}
                  onClick={openConfirmDialog}
                >
                  Delete
                </Button>
              )}

              {handleStartClick && customerApplication.ticketId && (
                <>
                  {userRole !== "sales" && (
                    <Button
                      size="small"
                      startIcon={<OpenInNew fontSize="small" />}
                      sx={{
                        flex: 1, textTransform: "none", borderRadius: 2, py: 0.8, fontSize: "0.8rem", fontWeight: 700,
                        color: "#1976D2", bgcolor: "rgba(25, 118, 210, 0.08)", "&:hover": { bgcolor: "rgba(25, 118, 210, 0.15)", color: "#1565C0" },
                      }}
                      onClick={(e) => { e.stopPropagation(); handleStartClick(customerApplication.ticketId); }}
                    >
                      Visit
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<History fontSize="small" />}
                    sx={{
                      flex: 1, textTransform: "none", borderRadius: 2, py: 0.8, fontSize: "0.8rem", fontWeight: 700,
                      color: showHistory ? "#fff" : "#667eea", bgcolor: showHistory ? "#667eea" : "rgba(102, 126, 234, 0.08)",
                      "&:hover": { bgcolor: showHistory ? "#5a6fd8" : "rgba(102, 126, 234, 0.15)" },
                    }}
                    onClick={toggleHistory}
                  >
                    {showHistory ? "Close" : "History"}
                  </Button>
                  {userRole === "sales" && (
                    <Button
                      size="small"
                      startIcon={<CommentOutlined fontSize="small" />}
                      sx={{
                        flex: 1, textTransform: "none", borderRadius: 2, py: 0.8, fontSize: "0.8rem", fontWeight: 700,
                        color: showComment ? "#fff" : "#00796B", bgcolor: showComment ? "#00796B" : "rgba(0, 121, 107, 0.08)",
                        "&:hover": { bgcolor: showComment ? "#004d40" : "rgba(0, 121, 107, 0.15)" },
                      }}
                      onClick={toggleComment}
                    >
                      {showComment ? "Close" : "Comments"}
                    </Button>
                  )}
                </>
              )}
            </Box>
          )}
        </Card>
      </Grid>
    );
  };
  const TableView = ({ index }: { index: any }) => {
    const [showAttachment, setShowAttachment] = useState({});
    const [currentAttachment, setCurrentAttachment] = useState(null);

    // Helper functions for file handling
    const getFileExtensionFromUrl = (url: string) => {
      try {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const extension = filename.split(".").pop()?.toLowerCase();
        return extension || "";
      } catch (error) {
        return "";
      }
    };

    const isPdfAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      return extension === "pdf";
    };

    const isExcelAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const excelExtensions = ["xlsx", "xls", "csv", "xlsm", "xlsb"];
      return excelExtensions.includes(extension);
    };

    const isImageAttachment = (attachmentUrl: string) => {
      const extension = getFileExtensionFromUrl(attachmentUrl);
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];
      return imageExtensions.includes(extension);
    };

    const handleOpenAttachment = (commentId: number | string, attachmentUrl: string) => {
      if (isExcelAttachment(attachmentUrl)) {
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          attachmentUrl
        )}`;

        const newWindow = window.open(officeViewerUrl, "_blank");

        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === "undefined"
        ) {
          const shouldDownload = window.confirm(
            "Unable to open file in viewer. Would you like to download it instead?"
          );

          if (shouldDownload) {
            const link = document.createElement("a");
            link.href = attachmentUrl;
            link.download = "";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } else if (isPdfAttachment(attachmentUrl)) {
        window.open(attachmentUrl, "_blank");
      } else {
        setCurrentAttachment({ commentId, url: attachmentUrl });
        setShowAttachment((prev) => ({ ...prev, [commentId]: true }));
      }
    };

    const handleCloseAttachment = () => {
      if (currentAttachment) {
        setShowAttachment((prev) => ({
          ...prev,
          [currentAttachment.commentId]: false,
        }));
        setCurrentAttachment(null);
      }
    };
    return (
      <>
        <TableRow
          key={customerApplication.customerId}
          sx={{
            "&:nth-of-type(odd)": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
            "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.08)" },
          }}
        >
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: "bold", whiteSpace: isTab ? "normal" : "", }}>
              {customerApplication.ticketId || index}
            </Typography>
          </TableCell>

          {/* Source */}
          <TableCell align="center" sx={{ width: "70px", whiteSpace: "nowrap", px: 1 }}>
            {getSourcePill(customerApplication.source || customerApplication.applicationSource)}
            {appliedByName && (
              <Typography sx={{ fontSize: "0.6rem", color: getSourceColor(customerApplication.source || customerApplication.applicationSource), fontWeight: 600, mt: 0.3, lineHeight: 1 }}>
                {capitalizeEachWord(appliedByName)}
              </Typography>
            )}
          </TableCell>

          {/* Name */}
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: "bold", whiteSpace: isTab ? "normal" : "normal", minWidth: isTab ? "15vw" : "", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              {customerApplication.customerName?.toUpperCase()}
            </Typography>
          </TableCell>

          {/* Email */}
          {userRole !== "sales" && (
            <TableCell align="center" sx={{ minWidth: isMobile ? "45vw" : isTab ? "15vw" : "10vw", maxWidth: "15vw" }}>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",   // breaks inside long words
                  overflowWrap: "anywhere", // ensures even long emails wrap
                }}
              >
                {userRole === "admin" || customerApplication.ticketStatus !== "disbursed"
                  ? customerApplication.customerEmail
                  : "N/A"}
              </Typography>
            </TableCell>

          )
          }

          {/* Amount */}
          <TableCell>
            <Typography
              variant="body2"
              sx={{
                fontWeight: "medium",
                color: "#00796B",
                fontSize: ".9rem",
                "&:hover": {
                  color: "#004D40",
                  cursor: "pointer",
                },
              }}
              className="amount-link"
            >
              {formatRupees(customerApplication.applicationAmount)}
            </Typography>
          </TableCell>

          {/* Provider */}
          <TableCell>
            <Typography
              variant="body2"
              sx={{
                color: "#6A0DAD",
                fontWeight: 600,
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: isTab ? "8vw" : "8vw",
              }}
            >
              {customerApplication.applicationProvider || "N/A"}
            </Typography>
          </TableCell>

          {/* Ticket Status */}
          {!isApplication && (
            <TableCell sx={{ minWidth: "130px", maxWidth: "160px" }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Chip
                  label={customerApplication?.ticketStatus ? capitalizeEachWord(customerApplication.ticketStatus) : 'N/A'}
                  size="small"
                  sx={{
                    bgcolor: "rgba(12, 102, 228, 0.1)",
                    color: "#0c66e4",
                    fontWeight: "bold",
                    width: 'fit-content',
                    height: 'auto',
                    whiteSpace: 'normal',
                    "& .MuiChip-label": {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      py: 0.5,
                    }
                  }}
                />

                {customerApplication?.ticketStatus === 'approved' && ((customerApplication as any)?.approvedAt || customerApplication?.approved_At) && (
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, fontWeight: 'medium' }}>
                    {new Date(((customerApplication as any).approvedAt || customerApplication.approved_At)!).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {((customerApplication as any)?.approvedAmount || customerApplication?.approved_Amount) && ` • ${formatRupees(((customerApplication as any).approvedAmount || customerApplication.approved_Amount) as number)}`}
                  </Typography>
                )}

                {customerApplication?.ticketStatus === 'disbursed' && ((customerApplication as any)?.disbursedAt || customerApplication?.disbursed_At) && (
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, fontWeight: 'medium' }}>
                    {new Date(((customerApplication as any).disbursedAt || customerApplication.disbursed_At)!).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {((customerApplication as any)?.disbursedAmount || customerApplication?.disbursed_Amount) && ` • ${formatRupees(((customerApplication as any).disbursedAmount || customerApplication.disbursed_Amount) as number)}`}
                  </Typography>
                )}
              </Box>
            </TableCell>
          )}

          {/* Loan Category */}
          <TableCell>
            <Typography variant="body2">
              {capitalizeEachWord(customerApplication.loanType)}
            </Typography>
          </TableCell>

          {/* Lead Type */}
          <TableCell>
            <Typography
              variant="body2"
              sx={{
                wordWrap: 'break-word',
                whiteSpace: 'normal',
                maxWidth: '10vw',
              }}
            >
              {capitalizeEachWord(customerApplication.leadType || "Null")}
            </Typography>
          </TableCell>

          {/* Tenure */}
          <TableCell>
            <Typography variant="body2">
              {formatTenure(customerApplication.applicationTenure)}
            </Typography>
          </TableCell>

          {/* Location */}
          <TableCell>
            <Typography variant="body2">
              {customerApplication.customerLocation
                ? capitalizeEachWord(customerApplication.customerLocation)
                : "N/A"}
              ,<br></br>
              {customerApplication.customerState
                ? capitalizeEachWord(customerApplication.customerState)
                : "N/A"}
            </Typography>
          </TableCell>


          {/* Created At */}
          <TableCell>
            <Typography variant="body2">
              {customerApplication?.createdAt || customerApplication?.applicationDate
                ? new Date(customerApplication.createdAt || customerApplication.applicationDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
                : "N/A"}
            </Typography>
          </TableCell>


          {/* Actions */}
          <TableCell>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {/* Delete Button */}
              {!isApplication && (showDeleteButton ||
                (userRole === "admin" && handleDeleteTicket)) && (
                  <Tooltip title="Delete">
                    <Button
                      onClick={openConfirmDialog}
                      startIcon={userRole === "admin" ? undefined : <DeleteOutline sx={{ fontSize: 18 }} />}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: "#f44336",
                        bgcolor: "rgba(244, 67, 54, 0.08)",
                        "&:hover": {
                          backgroundColor: "rgba(244, 67, 54, 0.15)",
                          color: "#d32f2f",
                        },
                      }}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                )}

              {/* History Button (only for tickets) */}
              {handleStartClick && customerApplication.ticketId && (
                <Tooltip title={showHistory ? "Close History" : "View History"}>
                  <Button
                    size="small"
                    onClick={toggleHistory}
                    startIcon={userRole === "admin" ? undefined : <History fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: "#667eea",
                      bgcolor: "rgba(102, 126, 234, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.15)",
                        color: "#5a6fd8",
                      },
                    }}
                  >
                    {showHistory ? "Close" : "History"}
                  </Button>
                </Tooltip>
              )}

              {/* Comments Button (only for tickets) */}
              {handleStartClick &&
                customerApplication.ticketId &&
                userRole === "sales" && (
                  <Button
                    size="small"
                    onClick={toggleComment}
                    startIcon={userRole === "admin" ? undefined : <CommentOutlined fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: "#667eea",
                      bgcolor: "rgba(102, 126, 234, 0.08)",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.15)",
                        color: "#5a6fd8",
                      },
                    }}
                  >
                    {showComment ? "Close" : "Comments"}
                  </Button>
                )}

              {/* Pick Checkbox — elegant pill button */}
              {decodedToken()?.role !== "sales" && !handleStartClick && (
                <Tooltip
                  title={isPickingUp || customerApplication.is_picked === 1 ? "Already picked" : "Assign to yourself"}
                  arrow
                  placement="top"
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        px: 1.5,
                        py: 0.6,
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(63, 80, 181, 0.4)",
                      },
                    },
                    arrow: {
                      sx: { color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5" },
                    },
                  }}
                >
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckboxClick(e);
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1.5,
                      py: 0.6,
                      borderRadius: "20px",
                      border: `1.5px solid ${isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5"}`,
                      backgroundColor: isPickingUp || customerApplication.is_picked === 1 ? "rgba(0,0,0,0.04)" : "rgba(63, 80, 181, 0.06)",
                      cursor: isPickingUp || customerApplication.is_picked === 1 ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                      pointerEvents: isPickingUp || customerApplication.is_picked === 1 ? "none" : "auto",
                      opacity: isPickingUp || customerApplication.is_picked === 1 ? 0.5 : 1,
                      "&:hover": !isPickingUp && customerApplication.is_picked !== 1 ? {
                        backgroundColor: "rgba(63, 80, 181, 0.15)",
                        boxShadow: "0 0 0 3px rgba(63, 80, 181, 0.2)",
                        borderColor: "#3f50b5",
                      } : {},
                      "&:active": !isPickingUp && customerApplication.is_picked !== 1 ? {
                        transform: "scale(0.96)",
                      } : {},
                    }}
                  >
                    <Checkbox
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxClick(e as any);
                      }}
                      size="small"
                      disabled={isPickingUp || customerApplication.is_picked === 1}
                      checked={customerApplication.is_picked === 1}
                      sx={{
                        p: 0,
                        color: isPickingUp || customerApplication.is_picked === 1 ? "#bdbdbd" : "#3f50b5",
                        "&.Mui-checked": {
                          color: "#bdbdbd",
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        color: isPickingUp || customerApplication.is_picked === 1 ? "#9e9e9e" : "#3f50b5",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {isPickingUp ? "Picking..." : customerApplication.is_picked === 1 ? "Picked" : "Pick"}
                    </Typography>
                  </Box>
                </Tooltip>
              )}


              {/* Visit Ticket Button (if applicable) */}
              {handleStartClick &&
                customerApplication.ticketId &&
                userRole !== "sales" && (
                  <Tooltip title="Visit Ticket">
                    <Button
                      size="small"
                      onClick={() =>
                        handleStartClick(customerApplication.ticketId)
                      }
                      startIcon={userRole === "admin" ? undefined : <OpenInNew fontSize="small" />}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: "#1976D2",
                        bgcolor: "rgba(25, 118, 210, 0.08)",
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.15)",
                          color: "#1565C0",
                        },
                      }}
                    >
                      Visit
                    </Button>
                  </Tooltip>
                )}
            </Box>
          </TableCell>
        </TableRow >

        {/* History & Comments Row - combined to save space */}
        {
          (showHistory || showComment) && customerApplication.ticketId && (
            <TableRow>
              <TableCell colSpan={20} sx={{ bgcolor: "#f8fafc", p: { xs: 2, md: 3 }, borderBottom: "none" }}>
                <Box sx={{ mx: 0 }}>
                  <Grid container spacing={3}>
                    {showHistory && (
                      <Grid item xs={12} md={showComment ? 6 : 12}>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#334155", mb: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}
                          >
                            Ticket History
                          </Typography>
                          <Box
                            sx={{
                              maxHeight: "80px",
                              overflowY: "auto",
                              width: "100%",
                              pr: 1,
                              "&::-webkit-scrollbar": {
                                width: "4px",
                              },
                              "&::-webkit-scrollbar-track": {
                                background: "#f1f5f9",
                                borderRadius: "4px",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                background: "#cbd5e1",
                                borderRadius: "4px",
                              },
                            }}
                          >
                            {historyData.length > 0 ? (
                              historyData.map((history, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    mb: 0.8,
                                    py: 0.6,
                                    px: 1,
                                    bgcolor: "#f8fafc",
                                    borderRadius: 1.5,
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: "#1e293b",
                                      fontSize: "0.8rem",
                                      mb: 0.5,
                                    }}
                                  >
                                    <strong>
                                      {capitalizeEachWord(history.action.split(" ")[0])}
                                    </strong>
                                    {` ${history.action.substring(
                                      history.action.indexOf(" ") + 1
                                    )}`}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                                    {new Date(history.created_at).toLocaleDateString(
                                      "en-IN",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}{" "}
                                    • {calculateDaysAgo(history.created_at)}
                                  </Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ color: "#94a3b8", textAlign: "center", py: 2 }}
                              >
                                No history data available.
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                    {showComment && (
                      <Grid item xs={12} md={showHistory ? 6 : 12}>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#334155", mb: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}
                          >
                            Comments
                          </Typography>
                          <Box
                            sx={{
                              maxHeight: "80px",
                              overflowY: "auto",
                              width: "100%",
                              pr: 1,
                              "&::-webkit-scrollbar": {
                                width: "4px",
                              },
                              "&::-webkit-scrollbar-track": {
                                background: "#f1f5f9",
                                borderRadius: "4px",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                background: "#cbd5e1",
                                borderRadius: "4px",
                              },
                            }}
                          >
                            {commentData?.length > 0 ? (
                              commentData.map((comment, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    mb: 0.8,
                                    py: 0.6,
                                    px: 1,
                                    bgcolor: "#f8fafc",
                                    borderRadius: 1.5,
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  {/* User Name */}
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: "#1e293b", mb: 0.2, fontSize: "0.8rem" }}
                                  >
                                    {capitalizeEachWord(
                                      comment?.user.username || "Anonymous"
                                    )}
                                  </Typography>

                                  {/* Comment Text */}
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "#334155", fontStyle: "normal", mb: 0.8, fontSize: "0.8rem" }}
                                  >
                                    {capitalizeEachWord(comment.comment)}
                                  </Typography>

                                  {/* Attachment Section */}
                                  {comment.attachment && (
                                    <Box sx={{ mb: 0.8 }}>
                                      <Button
                                        onClick={() =>
                                          handleOpenAttachment(
                                            comment.id,
                                            comment.attachment
                                          )
                                        }
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                          textTransform: "none",
                                          borderColor: "#cbd5e1",
                                          color: "#3b82f6",
                                          fontSize: "0.7rem",
                                          padding: "2px 8px",
                                          minHeight: "auto",
                                          fontWeight: 600,
                                          "&:hover": {
                                            bgcolor: "#eff6ff",
                                            borderColor: "#bfdbfe",
                                          },
                                        }}
                                      >
                                        {isExcelAttachment(comment.attachment)
                                          ? "Open Excel"
                                          : isPdfAttachment(comment.attachment)
                                            ? "Open PDF"
                                            : "View Attachment"}
                                      </Button>
                                    </Box>
                                  )}

                                  {/* Meta Info */}
                                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                                    {new Date(comment.created_at).toLocaleDateString(
                                      "en-IN",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}{" "}
                                    • {calculateDaysAgo(comment.created_at)}
                                  </Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ color: "#94a3b8", textAlign: "center", py: 2 }}
                              >
                                No comments available.
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </TableCell>
            </TableRow>
          )
        }

        {/* Image Preview Modal */}
        {
          currentAttachment && showAttachment[currentAttachment.commentId] && (
            <Modal
              open={showAttachment[currentAttachment.commentId]}
              onClose={handleCloseAttachment}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  bgcolor: "white",
                  borderRadius: "8px",
                  boxShadow: 24,
                  p: 2,
                  width: isMobile ? "95vw" : "80vw",
                  height: isMobile ? "80vh" : "85vh",
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  outline: "none",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    borderBottom: "1px solid #eee",
                    pb: 1,
                  }}
                >
                  <Typography variant="h6">Attachment Preview</Typography>
                  <IconButton
                    onClick={handleCloseAttachment}
                    sx={{
                      color: "red",
                    }}
                  >
                    <Close />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    height: "calc(100% - 56px)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  {isImageAttachment(currentAttachment.url) ? (
                    <img
                      src={currentAttachment.url}
                      alt="Attachment Preview"
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#666",
                      }}
                    >
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        File cannot be previewed
                      </Typography>
                      <Button
                        href={currentAttachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                      >
                        Download File
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            </Modal>
          )
        }
      </>
    );
  };

  return (
    <>
      {toggleListView === "list" ? (
        <ListView />
      ) : toggleListView === "grid" ? (
        <GridView />
      ) : (
        <TableView index={mainIndex} />
      )}

      <Modal
        closeAfterTransition
        open={openDeleteDialog}
        onClose={closeConfirmDialog}
        aria-labelledby="delete-ticket-modal"
      >
        <Fade in={openDeleteDialog}>
          <Paper
            elevation={0}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '92%',
              maxWidth: 440,
              borderRadius: '12px',
              boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 0.9)',
              bgcolor: '#ffffff',
              outline: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2.5,
                py: 2,
                background: 'linear-gradient(135deg, #2b3e94 0%, #3f50b5 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <DeleteOutline sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#ffffff',
                      lineHeight: 1.2,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Delete Ticket
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.85)',
                      mt: 0.3,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Ticket #{customerApplication?.ticketId || '—'} • {customerApplication?.customerName || 'Customer'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={closeConfirmDialog}
                disabled={isDeleting}
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: '6px',
                  p: 0.6,
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: 'rgba(255, 255, 255, 0.18)',
                  },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: 2.5, bgcolor: '#ffffff' }}>
              {/* Notice Banner */}
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: '8px',
                  bgcolor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.2,
                }}
              >
                <WarningAmber sx={{ color: '#d97706', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: '#92400e',
                    lineHeight: 1.45,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  This ticket will be safely moved to archives. Active operations will stop, while all customer documents and histories remain preserved.
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#334155',
                  mb: 0.8,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Reason for deletion{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>
                  * (Mandatory)
                </span>
              </Typography>
              <TextField
                inputRef={deleteTextareaRef}
                autoFocus
                fullWidth
                multiline
                minRows={3}
                maxRows={5}
                variant="outlined"
                placeholder="Enter a reason (e.g. Customer requested cancellation, duplicate application)..."
                value={deleteReason}
                disabled={isDeleting}
                onChange={(e) => setDeleteReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#f8fafc',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    fontFamily: "'Inter', sans-serif",
                    color: '#1e293b',
                    alignItems: 'flex-start',
                    '& fieldset': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#cbd5e1',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3f50b5',
                      borderWidth: '1.5px',
                    },
                  },
                  '& .MuiInputBase-inputMultiline': {
                    padding: '0 !important',
                    lineHeight: 1.5,
                  },
                }}
              />

              {/* Action Buttons */}
              <Box
                sx={{
                  mt: 2.5,
                  pt: 2,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 1.2,
                }}
              >
                <Button
                  size="small"
                  disabled={isDeleting}
                  onClick={closeConfirmDialog}
                  sx={{
                    px: 2,
                    py: 0.6,
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    fontFamily: "'Inter', sans-serif",
                    '&:hover': {
                      bgcolor: '#f8fafc',
                      borderColor: '#cbd5e1',
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={confirmDelete}
                  disabled={!deleteReason.trim() || isDeleting}
                  startIcon={
                    isDeleting ? (
                      <CircularProgress size={14} sx={{ color: '#ffffff' }} />
                    ) : (
                      <DeleteOutline sx={{ fontSize: 16 }} />
                    )
                  }
                  sx={{
                    px: 2.2,
                    py: 0.6,
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    bgcolor: '#dc2626',
                    color: '#ffffff',
                    boxShadow: '0 1px 2px 0 rgba(220, 38, 38, 0.2)',
                    '&:hover': {
                      bgcolor: '#b91c1c',
                      boxShadow: '0 2px 4px 0 rgba(220, 38, 38, 0.3)',
                    },
                    '&:disabled': {
                      bgcolor: isDeleting ? '#dc2626' : '#fca5a5',
                      color: '#ffffff',
                      opacity: isDeleting ? 0.85 : 0.6,
                    },
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Modal>
    </>
  );
};

export default ApplicationCard;
