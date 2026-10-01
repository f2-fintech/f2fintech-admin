"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { axiosInstance } from "@/apis/config/axiosConfig";
import {
  Container,
  Box,
  Grid,
  Typography,
  Chip,
  Divider,
  Paper,
  Avatar,
  useMediaQuery,
  Button,
  TextField,
  Tooltip,
  Collapse,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ArrowForwardRounded } from "@mui/icons-material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useTheme } from "@mui/material/styles";

import Loader from "../../components/common/Loader";
import Comments from "./Comments";
import OriginalEstimateField from "./OriginalEstimate";
import History from "./History";
import ProgressBar from "../../components/common/ProgressBar";
import WorkLogList from "./Worklog";
import TrackingForm from "./trackingForm";
import TicketDetail from "./TicketDetail";
import TicketDocuments from "./TicketDocuments";
import TicketVoiceNotes from "./TicketVoiceNotes";
import Toast from "../../components/common/Toast";
import UserAutocomplete from "../../components/common/UserAutocomplete";

import type { AppDispatch, RootState } from "@/redux/store";
import { useCreateTicketHistory } from "@/hooks/tickethistory";
import { useModifyTicket } from "@/hooks/ticket";
import { useGetUsers } from "@/hooks/user";
import { useCreateTicketActivity } from "@/hooks/ticketActivities";
import { Utility } from "@/utils";

import { DropdownComponent } from "../../components/common/DropdownComponent";
import { User } from "@/types/user";
import { fetcher } from "@/apis/apiClient";
import { useGetTicketLogs } from "@/hooks/ticketLogs";
import useIntersectionObserver from "@/hooks/IntersectionObserver";
import { TicketLogs } from "@/types/ticketLogs";

const employeeStatusObj = [
  { value: "under credit review", label: "Under Credit Review" },
  { value: "operations", label: "Operations" },
  { value: "pendency in file", label: "Pendency In File" },
  { value: "file send to banker", label: "File Send To Banker" },
  { value: "file sent to banker - awaiting response", label: "File Sent To Banker - Awaiting Response" },
  { value: "to be approved", label: "To Be Approved" },
  { value: "to be disbursed", label: "To Be Disbursed" },
  { value: "approved", label: "Approved" },
  { value: "disbursed", label: "Disbursed" },
  { value: "carry forward", label: "Carry Forward" },
  { value: "rejected", label: "Rejected" },
  { value: "drop", label: "Drop" },
  { value: "hold", label: "Hold" },
];

const loanStatusOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "under credit review", label: "Under Credit Review" },
  { value: "login", label: "Login" },
  { value: "approved", label: "Approved" },
  { value: "disbursed", label: "Disbursed" },
  { value: "carry forward", label: "Carry Forward" },
  { value: "hold", label: "Hold" },
  { value: "drop", label: "Drop" },
  { value: "rejected", label: "Rejected" },
  { value: "relook", label: "Relook" },
];

export const getStatusColor = (status: string) => {
  if (!status) return { bg: "#f4f5f7", border: "#dfe1e6", text: "#42526e" };
  const s = status.toLowerCase().trim();
  const colors: { [key: string]: { bg: string, border: string, text: string } } = {
    "under credit review": { bg: "rgba(255, 152, 0, 0.1)", border: "#ff9800", text: "#e65100" },
    operations: { bg: "rgba(33, 150, 243, 0.1)", border: "#2196f3", text: "#0d47a1" },
    "pendency in file": { bg: "rgba(244, 67, 54, 0.1)", border: "#f44336", text: "#b71c1c" },
    "file send to banker": { bg: "rgba(63, 81, 181, 0.1)", border: "#3f51b5", text: "#1a237e" },
    "file sent to banker - awaiting response": { bg: "rgba(0, 150, 136, 0.1)", border: "#009688", text: "#004d40" },
    hold: { bg: "rgba(255, 235, 59, 0.15)", border: "#fbc02d", text: "#f57f17" },
    "to be approved": { bg: "rgba(76, 175, 80, 0.1)", border: "#4caf50", text: "#1b5e20" },
    "to be disbursed": { bg: "rgba(156, 39, 176, 0.1)", border: "#9c27b0", text: "#4a148c" },
    approved: { bg: "rgba(139, 195, 74, 0.15)", border: "#8bc34a", text: "#33691e" },
    disbursed: { bg: "rgba(0, 188, 212, 0.1)", border: "#00bcd4", text: "#006064" },
    "carry forward": { bg: "rgba(158, 158, 158, 0.1)", border: "#9e9e9e", text: "#424242" },
    rejected: { bg: "rgba(244, 67, 54, 0.1)", border: "#f44336", text: "#b71c1c" },
    drop: { bg: "rgba(255, 87, 34, 0.1)", border: "#ff5722", text: "#bf360c" },
    forwarded: { bg: "rgba(255, 193, 7, 0.15)", border: "#ffb300", text: "#ff6f00" },
    "forwarded to me": { bg: "rgba(255, 112, 67, 0.1)", border: "#ff7043", text: "#bf360c" },
    "forwarded by me": { bg: "rgba(38, 198, 218, 0.1)", border: "#26c6da", text: "#006064" },
  };
  return colors[s] || { bg: "rgba(149, 117, 205, 0.1)", border: "#9575cd", text: "#512da8" };
};

const panelFieldStyles = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#ffffff',
    borderRadius: '10px',
    fontSize: { xs: '0.85rem', sm: '0.9rem' },
    minHeight: '44px',
    '& fieldset': {
      borderColor: '#cbd5e1',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#94a3b8',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#3949ab',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: { xs: '0.85rem', sm: '0.9rem' },
    color: '#475569',
    '&.Mui-focused': {
      color: '#3949ab',
    },
  },
};

export interface TicketDetail {
  ticketId: number | string;
  userId: number | string;
  employeeStatus: string;
  voiceNoteUrl: string;
  forwardedTo: number | string;
  forwardedBy: number | string;
  isForwarded: number | null;
  originalEstimate: string;
  provider: string;
  applicationAmount: string | number;
  applicationTenure: number | string;
  applicationDate: Date | string;
  applicationId: number | string;
  customerId: number | string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  customerDocuments: string[];
  customerDesignation: string;
  customerLocation: string;
  customerState: string;
  loanStatus: string;
  loanCategory: string;
  userRole: string;
  approved_at?: string | Date;
  approved_amount?: number | string;
  disbursed_at?: string | Date;
  disbursed_amount?: number | string;
  cashback_amount?: number | string;
  case_type?: string;
  fixed_commission_percentage?: number | string;
  due_date?: string | Date;
  companyId?: number | string;
  applicationSource?: string;
  source?: string;
  appliedByName?: string | null;
  appliedBy?: number | string | null;
  applied_by?: number | string | null;
  managerName?: string | null;
}

interface TicketDetailResponse {
  statusCode: string | number;
  message: string;
  data: TicketDetail;
}

const MainPage = () => {
  const [ticketDetailData, setTicketDetailData] = useState<TicketDetail>();
  const [loading, setLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("Comments");

  // Expected Decision Date
  const [expectedDecisionDate, setExpectedDecisionDate] = useState<string>("");
  const [isExpectedDateSaved, setIsExpectedDateSaved] = useState<boolean>(false);
  const [isSavingExpectedDate, setIsSavingExpectedDate] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User>();
  const getTodayLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [disbursedDate, setDisbursedDate] = useState(() => {
    // Only set saved date if ticket already has disbursed_at date
    return ticketDetailData?.disbursed_at
      ? new Date(ticketDetailData.disbursed_at).toISOString().split('T')[0]
      : "";
  });

  const [isDisbursedDateSaved, setIsDisbursedDateSaved] = useState(() => {
    // If ticket already has disbursed_at date, consider it as saved
    return !!ticketDetailData?.disbursed_at;
  });

  // Disbursed Amount States
  const [disbursedAmount, setDisbursedAmount] = useState(() => {
    return ticketDetailData?.disbursed_amount
      ? ticketDetailData.disbursed_amount.toString()
      : "";
  });

  const [isDisbursedAmountSaved, setIsDisbursedAmountSaved] = useState(() => {
    return !!ticketDetailData?.disbursed_amount;
  });


  // Add these state variables near your existing disbursed states
  const [approvedDate, setApprovedDate] = useState(() => {
    return ticketDetailData?.approved_at
      ? new Date(ticketDetailData.approved_at).toISOString().split('T')[0]
      : "";
  });

  const [isApprovedDateSaved, setIsApprovedDateSaved] = useState(() => {
    return !!ticketDetailData?.approved_at;
  });

  const [cashbackAmount, setCashbackAmount] = useState(() => {
    return ticketDetailData?.cashback_amount
      ? ticketDetailData.cashback_amount.toString()
      : "";
  });

  const [isCashbackAmountSaved, setIsCashbackAmountSaved] = useState(() => {
    return !!ticketDetailData?.cashback_amount;
  });

  const [caseType, setCaseType] = useState<string>("");

  const [fixedCommissionPercentage, setFixedCommissionPercentage] = useState(() => {
    return ticketDetailData?.fixed_commission_percentage
      ? ticketDetailData.fixed_commission_percentage.toString()
      : "";
  });

  const [isFixedCommissionPercentageSaved, setIsFixedCommissionPercentageSaved] = useState(() => {
    return !!ticketDetailData?.fixed_commission_percentage;
  });

  // Format amount for display (removes unnecessary decimals)
  const formatDisplayAmount = (amount: string): string => {
    if (!amount) return "";

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;

    // If it's a whole number, return without decimals
    if (numAmount % 1 === 0) {
      return numAmount.toString();
    }

    // Otherwise return with 2 decimal places
    return numAmount.toFixed(2);
  };

  // Format amount for storage (ensures proper number format)
  const formatDecimalAmount = (amount: string): string => {
    if (!amount) return "";

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "";

    // Always return as number, letting toFixed handle the formatting
    return numAmount.toString();
  };

  const [approvedAmount, setApprovedAmount] = useState(() => {
    return ticketDetailData?.approved_amount
      ? ticketDetailData.approved_amount.toString()
      : "";
  });

  const [isApprovedAmountSaved, setIsApprovedAmountSaved] = useState(() => {
    return !!ticketDetailData?.approved_amount;
  });

  const [progress, setProgress] = useState(0);
  const [overage, setOverage] = useState(0);
  const [newLoanStatus, setNewLoanStatus] = useState("");
  const [newEmployeeStatus, setNewEmployeeStatus] = useState("");

  // Pending status change — held until user provides mandatory comment
  const [pendingNewStatus, setPendingNewStatus] = useState<string>("");
  const [carryForwardMonth, setCarryForwardMonth] = useState<string>("");
  const [showStatusCommentBox, setShowStatusCommentBox] = useState<boolean>(false);
  const [statusChangeComment, setStatusChangeComment] = useState<string>("");
  const [statusChangeAttachment, setStatusChangeAttachment] = useState<File | null>(null);
  const [statusChangeAttachmentPreview, setStatusChangeAttachmentPreview] = useState<string>("");
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [isSavingForward, setIsSavingForward] = useState<boolean>(false);
  const [isSavingApproval, setIsSavingApproval] = useState<boolean>(false);
  const [isSavingDisbursement, setIsSavingDisbursement] = useState<boolean>(false);

  // Calculate left-over months in the current year for carry forward
  const remainingMonths = React.useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const upcoming = monthNames.slice(currentMonthIdx).map((m, idx) => ({
      label: m,
      value: m,
      year: currentYear,
      monthIndex: currentMonthIdx + idx,
    }));

    if (upcoming.length === 0) {
      upcoming.push({
        label: `January (${currentYear + 1})`,
        value: "January",
        year: currentYear + 1,
        monthIndex: 0,
      });
    }
    return upcoming;
  }, []);

  // Forward-specific comment box state
  const [pendingForwardUser, setPendingForwardUser] = useState<any>(null);
  const [showForwardCommentBox, setShowForwardCommentBox] = useState<boolean>(false);
  const [forwardComment, setForwardComment] = useState<string>("");
  const [forwardAttachment, setForwardAttachment] = useState<File | null>(null);
  const [forwardAttachmentPreview, setForwardAttachmentPreview] = useState<string>("");
  const [timeLoggingEstimate, setTimeLoggingEstimate] = useState({
    originalEstimate: "",
    timeSpent: "0",
  });
  const { toast } = useSelector((state: RootState) => state.toast);
  const [hasFetched, setHasFetched] = useState(false);
  const workLogRef = useRef(null);
  const isVisible = useIntersectionObserver(workLogRef);
  const muiTheme = useTheme();

  const dispatch: AppDispatch = useDispatch();
  const params = useParams();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm')); // 0-599px
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md')); // 600-899px
  const isTab = useMediaQuery(muiTheme.breakpoints.between('sm', 'md')); // 600-899px
  const isIpad = useMediaQuery(muiTheme.breakpoints.between('md', 'lg')); // 900-1199px
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg')); // 1200px+
  const ticketId = params?.ticketId;
  const {
    capitalizeFirstLetter,
    convertHoursToDaysAndHours,
    decodedToken,
    parseTimeSpent,
    toastAndNavigate,
  } = Utility();

  const { createTicketHistory } = useCreateTicketHistory(
    "create-ticket-history"
  );
  const { modifyTicket } = useModifyTicket("update-ticket");
  const { createTicketActivity } = useCreateTicketActivity("create-ticket-activity");
  const { value: userData } = useGetUsers("get-users", 1, 200, "active");
  const { value: workLog, refetch } = useGetTicketLogs(
    {} as TicketLogs,
    hasFetched ? `get-ticket-logs/${ticketId}` : ""
  );

  useEffect(() => {
    if (isVisible && !hasFetched) {
      refetch();
      setHasFetched(true);
    }
  }, [isVisible, hasFetched]);

  const fetchTicketDetails = async () => {
    if (ticketId) {
      setLoading(true);
      try {
        const response = (await fetcher(
          `get-ticket-with-detail/${ticketId}`
        )) as TicketDetailResponse;
        if (response.statusCode === 200) {
          const data = response.data;
          setTicketDetailData(data);
          setTimeLoggingEstimate((prev) => ({
            ...prev,
            originalEstimate: data.originalEstimate,
          }));
          setNewLoanStatus(data.loanStatus);
          setNewEmployeeStatus(data.employeeStatus);

          // Auto-store companyId for credit/ops users who haven't selected an aggregator.
          // The ticket already knows which company it belongs to — no manual selection needed.
          if (data.companyId && typeof window !== "undefined" && !localStorage.getItem("selectedCompanyId")) {
            localStorage.setItem("selectedCompanyId", data.companyId.toString());
          }

          // Set disbursed date/amount if ticket has them
          if (data.disbursed_at) {
            setDisbursedDate(
              new Date(data.disbursed_at).toISOString().split("T")[0]
            );
            setIsDisbursedDateSaved(true);
          } else if (data.employeeStatus === "disbursed") {
            setDisbursedDate(getTodayLocalDate());
            setIsDisbursedDateSaved(false);
          }

          if (data.disbursed_amount) {
            setDisbursedAmount(data.disbursed_amount.toString());
            setIsDisbursedAmountSaved(true);
          } else if (data.employeeStatus === "disbursed") {
            setDisbursedAmount(data.applicationAmount?.toString() || "");
            setIsDisbursedAmountSaved(false);
          }

          // Set approved date/amount if ticket has them
          if (data.approved_at) {
            setApprovedDate(
              new Date(data.approved_at).toISOString().split("T")[0]
            );
            setIsApprovedDateSaved(true);
          } else if (data.employeeStatus === "approved") {
            setApprovedDate(getTodayLocalDate());
            setIsApprovedDateSaved(false);
          }

          if (data.approved_amount) {
            setApprovedAmount(data.approved_amount.toString());
            setIsApprovedAmountSaved(true);
          } else if (data.employeeStatus === "approved") {
            setApprovedAmount(data.applicationAmount?.toString() || "");
            setIsApprovedAmountSaved(false);
          }

          // Set cashback amount if ticket has it
          if (data.cashback_amount) {
            setCashbackAmount(data.cashback_amount.toString());
            setIsCashbackAmountSaved(true);
          }

          // Set fixed commission percentage if ticket has it
          if (data.fixed_commission_percentage) {
            setFixedCommissionPercentage(data.fixed_commission_percentage.toString());
            setIsFixedCommissionPercentageSaved(true);
          }

          if (data.case_type) {
            const normalized = data.case_type.toLowerCase().trim();
            if (normalized === "fresh") setCaseType("fresh");
            else if (normalized === "top_up" || normalized === "top up") setCaseType("top_up");
            else setCaseType(data.case_type);
          } else {
            setCaseType("");
          }

          // Set expected decision date
          if (data.due_date) {
            setExpectedDecisionDate(
              new Date(data.due_date).toISOString().split("T")[0]
            );
            setIsExpectedDateSaved(true);
          } else {
            setExpectedDecisionDate("");
            setIsExpectedDateSaved(false);
          }

          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
        console.log("Error fetching ticket details:", error);
      }
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  useEffect(() => {
    if (ticketDetailData?.case_type) {
      const normalized = ticketDetailData.case_type.toLowerCase().trim();
      if (normalized === "fresh") setCaseType("fresh");
      else if (normalized === "top_up" || normalized === "top up") setCaseType("top_up");
      else setCaseType(ticketDetailData.case_type);
    } else {
      setCaseType("");
    }
  }, [ticketDetailData]);


  useEffect(() => {
    const logs = workLog as any;
    if (logs?.data) {
      const totalHours = logs.data.reduce((acc: number, ticket: any) => {
        return acc + parseTimeSpent(ticket.time_spent ?? 0);
      }, 0);

      const finalTime = convertHoursToDaysAndHours(totalHours);
      setTimeLoggingEstimate({
        ...timeLoggingEstimate,
        timeSpent: finalTime,
      });
      // } );
      const originalEstimate = parseTimeSpent(
        timeLoggingEstimate.originalEstimate
      );

      if (originalEstimate > 0) {
        const calculatedProgress = Math.min(
          (totalHours / originalEstimate) * 100,
          100
        );
        const calculatedOverage =
          totalHours > originalEstimate
            ? ((totalHours - originalEstimate) / originalEstimate) * 100
            : 0;

        setProgress(calculatedProgress);
        setOverage(calculatedOverage);
      }
    }
  }, [workLog?.data, timeLoggingEstimate.originalEstimate]);

  useEffect(() => {
    if (ticketDetailData?.disbursed_amount) {
      setDisbursedAmount(
        Number(ticketDetailData.disbursed_amount) % 1 === 0
          ? parseInt(ticketDetailData.disbursed_amount, 10).toString()
          : ticketDetailData.disbursed_amount.toString()
      );
    } else if (ticketDetailData?.applicationAmount) {
      setDisbursedAmount(
        Number(ticketDetailData.applicationAmount) % 1 === 0
          ? parseInt(ticketDetailData.applicationAmount, 10).toString()
          : ticketDetailData.applicationAmount.toString()
      );
    }
  }, [ticketDetailData]);

  /** Saves the expected decision date to the ticket. */
  const handleSaveExpectedDecisionDate = async () => {
    if (!expectedDecisionDate) {
      toastAndNavigate(dispatch, true, "error", "Please select an expected decision date");
      return;
    }
    setIsSavingExpectedDate(true);
    try {
      await modifyTicket(+ticketId, { due_date: expectedDecisionDate });
      const loggedInUser = decodedToken()?.username;
      await createTicketHistory({
        ticket_id: ticketId,
        action: `${loggedInUser} set the expected decision date to ${new Date(expectedDecisionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      });
      setIsExpectedDateSaved(true);
      toastAndNavigate(dispatch, true, "info", "Expected decision date saved successfully");
    } catch {
      toastAndNavigate(dispatch, true, "error", "Failed to save expected decision date");
    } finally {
      setIsSavingExpectedDate(false);
    }
  };

  /** Cancels editing expected decision date and restores the previous saved state. */
  const handleCancelExpectedDecisionDate = () => {
    if (ticketDetailData?.due_date) {
      setExpectedDecisionDate(
        new Date(ticketDetailData.due_date).toISOString().split("T")[0]
      );
      setIsExpectedDateSaved(true);
    } else {
      setExpectedDecisionDate("");
    }
  };

  /** Guard: returns true if due_date is set, else shows a toast and returns false. */
  const requireExpectedDate = (): boolean => {
    if (!isExpectedDateSaved || !expectedDecisionDate) {
      toastAndNavigate(
        dispatch, true, "error",
        "Please set an Expected Decision Date before performing any activity"
      );
      return false;
    }
    return true;
  };

  // Compute overdue flag for the expected decision date
  const isExpectedDateOverdue = React.useMemo(() => {
    if (!expectedDecisionDate || !isExpectedDateSaved) return false;
    if (ticketDetailData?.approved_at) return false;
    return new Date() > new Date(expectedDecisionDate);
  }, [expectedDecisionDate, isExpectedDateSaved, ticketDetailData?.approved_at]);

  /** Called by the File Status Dropdown onChange. Only sets pending state — no API calls yet. */
  const handleFileStatusChange = (valOrEvent: string | React.ChangeEvent<{ value: unknown }>) => {
    if (!requireExpectedDate()) return;
    const newStatus = typeof valOrEvent === "string" ? valOrEvent : (valOrEvent.target.value as string);
    setPendingNewStatus(newStatus);
    setShowStatusCommentBox(true);
    setStatusChangeComment("");
    setStatusChangeAttachment(null);
    setStatusChangeAttachmentPreview("");

    if (newStatus === "carry forward" && remainingMonths.length > 0) {
      setCarryForwardMonth(remainingMonths[0].label);
    } else {
      setCarryForwardMonth("");
    }

    // Pre-fill date/amount defaults for approved / disbursed panels
    if (newStatus === "disbursed") {
      if (!disbursedDate) setDisbursedDate(getTodayLocalDate());
      if (!disbursedAmount && ticketDetailData?.applicationAmount)
        setDisbursedAmount(ticketDetailData.applicationAmount.toString());
    }
    if (newStatus === "approved") {
      if (!approvedDate) setApprovedDate(getTodayLocalDate());
      if (!approvedAmount && ticketDetailData?.applicationAmount)
        setApprovedAmount(ticketDetailData.applicationAmount.toString());
    }
    // Clear unrelated date/amount fields
    if (newStatus !== "disbursed") { setDisbursedDate(""); setDisbursedAmount(""); }
    if (newStatus !== "approved") { setApprovedDate(""); setApprovedAmount(""); }
  };

  /** Cancels a pending status change and restores the dropdown to the last saved status. */
  const handleCancelStatusChange = () => {
    setPendingNewStatus("");
    setCarryForwardMonth("");
    setShowStatusCommentBox(false);
    setStatusChangeComment("");
    setStatusChangeAttachment(null);
    setStatusChangeAttachmentPreview("");
    // Restore date/amount fields to what the ticket currently has
    if (ticketDetailData?.disbursed_at) {
      setDisbursedDate(new Date(ticketDetailData.disbursed_at).toISOString().split("T")[0]);
      setIsDisbursedDateSaved(true);
    } else { setDisbursedDate(""); }
    if (ticketDetailData?.disbursed_amount) {
      setDisbursedAmount(ticketDetailData.disbursed_amount.toString());
      setIsDisbursedAmountSaved(true);
    } else { setDisbursedAmount(""); }
    if (ticketDetailData?.approved_at) {
      setApprovedDate(new Date(ticketDetailData.approved_at).toISOString().split("T")[0]);
      setIsApprovedDateSaved(true);
    } else { setApprovedDate(""); }
    if (ticketDetailData?.approved_amount) {
      setApprovedAmount(ticketDetailData.approved_amount.toString());
      setIsApprovedAmountSaved(true);
    } else { setApprovedAmount(""); }
  };

  /** Handles file input for the status-change mandatory attachment. */
  const handleStatusAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusChangeAttachment(file);
    setStatusChangeAttachmentPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  /**
   * Uploads the optional attachment and saves the status + history + mandatory comment
   * for all statuses OTHER than "approved" and "disbursed" (those are handled by their
   * own submit handlers below).
   */
  const handleConfirmStatusChange = async () => {
    if (!requireExpectedDate()) return;
    if (!statusChangeComment.trim()) {
      toastAndNavigate(dispatch, true, "error", "A comment is required to change the file status");
      return;
    }
    if (pendingNewStatus === "carry forward" && !carryForwardMonth) {
      toastAndNavigate(dispatch, true, "error", "Please select a target month to carry forward this ticket");
      return;
    }
    setIsSavingStatus(true);
    const oldStatus = newEmployeeStatus;
    const newStatus = pendingNewStatus;
    try {
      // 1. Optional attachment upload
      let attachmentUrl: string | null = null;
      if (statusChangeAttachment) {
        try {
          const formData = new FormData();
          formData.append("document", statusChangeAttachment);
          formData.append("folder", `comment/${statusChangeAttachment.name}`);
          const res = await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          attachmentUrl = res.data.data as string;
        } catch {
          toastAndNavigate(dispatch, true, "error", "Error uploading attachment");
          return;
        }
      }
      // 2. Update ticket status and created_at if carry forward
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        actorName: decodedToken()?.username || 'A user'
      };
      if (newStatus === "carry forward") {
        const selectedTarget = remainingMonths.find(m => m.label === carryForwardMonth);
        if (selectedTarget) {
          const pad = (n: number) => String(n).padStart(2, "0");
          const targetDateStr = `${selectedTarget.year}-${pad(selectedTarget.monthIndex + 1)}-01T00:00:00.000Z`;
          updatePayload.created_at = targetDateStr;
        }
      }
      if (caseType) updatePayload.case_type = caseType;
      await modifyTicket(+ticketId, updatePayload);
      // 3. Ticket history
      const loggedInUser = decodedToken()?.username;
      const historyAction = newStatus === "carry forward"
        ? `${loggedInUser} changed File Status from ${oldStatus} to Carry Forward (Target Month: ${carryForwardMonth})`
        : `${loggedInUser} changed File Status from ${oldStatus} to ${newStatus}`;

      await createTicketHistory({
        ticket_id: ticketId,
        action: historyAction,
      });
      // 4. Save mandatory comment to ticket_activities (same table as bottom Comments)
      await createTicketActivity({
        ticket_id: ticketId,
        user_id: decodedToken()?.id,
        comment: statusChangeComment,
        attachment: attachmentUrl,
      });
      // 5. Confirm state
      setNewEmployeeStatus(newStatus);
      setPendingNewStatus("");
      setCarryForwardMonth("");
      setShowStatusCommentBox(false);
      setStatusChangeComment("");
      setStatusChangeAttachment(null);
      setStatusChangeAttachmentPreview("");
      toastAndNavigate(dispatch, true, "info", "Status Changed Successfully");
      await refetch();
    } catch {
      toastAndNavigate(dispatch, true, "error", "Error Changing Status");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Combined handler for disbursed date, amount, and mandatory comment
  const handleCombinedDisbursementSubmit = async () => {
    if (!requireExpectedDate()) return;
    if (!statusChangeComment.trim()) {
      toastAndNavigate(dispatch, true, "error", "A comment is required to change the file status");
      return;
    }
    if (!disbursedDate) {
      toastAndNavigate(dispatch, true, "error", "Please enter disbursement date");
      return;
    }
    if (!disbursedAmount || parseInt(disbursedAmount, 10) <= 0) {
      toastAndNavigate(dispatch, true, "error", "Please enter a valid disbursement amount");
      return;
    }
    setIsSavingDisbursement(true);
    try {
      // 1. Optional attachment upload
      let attachmentUrl: string | null = null;
      if (statusChangeAttachment) {
        try {
          const formData = new FormData();
          formData.append("document", statusChangeAttachment);
          formData.append("folder", `comment/${statusChangeAttachment.name}`);
          const res = await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          attachmentUrl = res.data.data as string;
        } catch {
          toastAndNavigate(dispatch, true, "error", "Error uploading attachment");
          return;
        }
      }

      // 2. Update ticket
      const updatePayload: Record<string, unknown> = {
        status: "disbursed",
        disbursed_at: disbursedDate,
        disbursed_amount: parseFloat(disbursedAmount),
        actorName: decodedToken()?.username || 'A user'
      };
      if (cashbackAmount && parseFloat(cashbackAmount) >= 0)
        updatePayload.cashback_amount = parseFloat(cashbackAmount);
      if (caseType) updatePayload.case_type = caseType;
      if (fixedCommissionPercentage && parseFloat(fixedCommissionPercentage) >= 0)
        updatePayload.fixed_commission_percentage = parseFloat(fixedCommissionPercentage);
      await modifyTicket(+ticketId, updatePayload);

      // 3. Trigger commission
      try {
        const commissionResponse = await axiosInstance.post(
          `${process.env.NEXT_PUBLIC_API_URL}/trigger-commission/${ticketId}`
        );
        if (commissionResponse.data?.success) console.log("Commission triggered successfully");
      } catch (commErr) {
        console.error("[COMMISSION] Failed to trigger commission:", commErr);
      }

      // 4. Ticket history
      const loggedInUser = decodedToken()?.username;
      let historyMessage = `${loggedInUser} set disbursement details - Date: ${disbursedDate}, Amount: ${disbursedAmount}`;
      if (cashbackAmount && parseFloat(cashbackAmount) >= 0) historyMessage += `, Cashback: ${cashbackAmount}`;
      if (caseType) historyMessage += `, Case Type: ${caseType}`;
      if (fixedCommissionPercentage && parseFloat(fixedCommissionPercentage) >= 0)
        historyMessage += `, Fixed Commission: ${fixedCommissionPercentage}%`;
      await createTicketHistory({ ticket_id: ticketId, action: historyMessage });

      // 5. Save mandatory comment to ticket_activities
      await createTicketActivity({
        ticket_id: ticketId,
        user_id: decodedToken()?.id,
        comment: statusChangeComment,
        attachment: attachmentUrl,
      });

      // 6. Update saved flags and reset comment state
      setIsDisbursedDateSaved(true);
      setIsDisbursedAmountSaved(true);
      if (cashbackAmount && parseFloat(cashbackAmount) >= 0) setIsCashbackAmountSaved(true);
      if (fixedCommissionPercentage && parseFloat(fixedCommissionPercentage) >= 0)
        setIsFixedCommissionPercentageSaved(true);
      setNewEmployeeStatus("disbursed");
      setPendingNewStatus("");
      setShowStatusCommentBox(false);
      setStatusChangeComment("");
      setStatusChangeAttachment(null);
      setStatusChangeAttachmentPreview("");

      toastAndNavigate(dispatch, true, "info", "Disbursement details saved successfully");
      await refetch();
      await fetchTicketDetails();
    } catch {
      toastAndNavigate(dispatch, true, "error", "Error saving disbursement details");
    } finally {
      setIsSavingDisbursement(false);
    }
  };

  // Handler for approved date, amount, and mandatory comment
  const handleCombinedApprovalSubmit = async () => {
    if (!requireExpectedDate()) return;
    if (!statusChangeComment.trim()) {
      toastAndNavigate(dispatch, true, "error", "A comment is required to change the file status");
      return;
    }
    if (!approvedDate) {
      toastAndNavigate(dispatch, true, "error", "Please enter approval date");
      return;
    }
    if (!approvedAmount || parseInt(approvedAmount, 10) <= 0) {
      toastAndNavigate(dispatch, true, "error", "Please enter a valid approval amount");
      return;
    }
    setIsSavingApproval(true);
    try {
      // 1. Optional attachment upload
      let attachmentUrl: string | null = null;
      if (statusChangeAttachment) {
        try {
          const formData = new FormData();
          formData.append("document", statusChangeAttachment);
          formData.append("folder", `comment/${statusChangeAttachment.name}`);
          const res = await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          attachmentUrl = res.data.data as string;
        } catch {
          toastAndNavigate(dispatch, true, "error", "Error uploading attachment");
          return;
        }
      }

      // 2. Update ticket
      const updatePayload: Record<string, unknown> = {
        status: "approved",
        approved_at: approvedDate,
        approved_amount: parseFloat(approvedAmount),
        actorName: decodedToken()?.username || 'A user'
      };
      if (caseType) updatePayload.case_type = caseType;
      if (fixedCommissionPercentage && parseFloat(fixedCommissionPercentage) >= 0)
        updatePayload.fixed_commission_percentage = parseFloat(fixedCommissionPercentage);
      await modifyTicket(+ticketId, updatePayload);

      // 3. Ticket history
      const loggedInUser = decodedToken()?.username;
      let historyMessage = `${loggedInUser} set approval details - Date: ${approvedDate}, Amount: ${approvedAmount}`;
      if (caseType) historyMessage += `, Case Type: ${caseType}`;
      if (fixedCommissionPercentage && parseFloat(fixedCommissionPercentage) >= 0)
        historyMessage += `, Fixed Commission: ${fixedCommissionPercentage}%`;
      await createTicketHistory({ ticket_id: ticketId, action: historyMessage });

      // 4. Save mandatory comment to ticket_activities
      await createTicketActivity({
        ticket_id: ticketId,
        user_id: decodedToken()?.id,
        comment: statusChangeComment,
        attachment: attachmentUrl,
      });

      // 5. Update saved flags and reset comment state
      setIsApprovedDateSaved(true);
      setIsApprovedAmountSaved(true);
      setNewEmployeeStatus("approved");
      setPendingNewStatus("");
      setShowStatusCommentBox(false);
      setStatusChangeComment("");
      setStatusChangeAttachment(null);
      setStatusChangeAttachmentPreview("");

      toastAndNavigate(dispatch, true, "info", "Approval details saved successfully");
      await refetch();
      await fetchTicketDetails();
    } catch {
      toastAndNavigate(dispatch, true, "error", "Error saving approval details");
    } finally {
      setIsSavingApproval(false);
    }
  };

  const handleChangeLoanStatus = async (valOrEvent: any) => {
    if (!requireExpectedDate()) return;
    const oldStatus = newLoanStatus;
    const newStatus = typeof valOrEvent === "string" ? valOrEvent : valOrEvent?.target?.value;
    if (!newStatus) return;
    setNewLoanStatus(newStatus);

    try {
      await axiosInstance.patch(
        `${process.env.NEXT_PUBLIC_WEB_URL}/update-loan-tracking`,
        {
          customer_application_id: ticketDetailData?.applicationId,
          status: newStatus,
        }
      );
      const loggedInUser = decodedToken()?.username;
      const historyMessage = `${loggedInUser} changed Loan Status from ${oldStatus} to ${newStatus}`;

      await createTicketHistory({
        ticket_id: ticketId,
        action: historyMessage,
      });

      toastAndNavigate(dispatch, true, "info", "Status Changed Successfully");
      await refetch();
    } catch (error) {
      toastAndNavigate(dispatch, true, "error", "Error Changing Status");
    }
  };

  /** Called when a user is selected in the forward autocomplete. Stores the pending user and shows the comment box. */
  const handleForwardAutocomplete = (value: any) => {
    if (!value) return;
    setSelectedUser(value);
    setPendingForwardUser(value);
    setShowForwardCommentBox(true);
    setForwardComment("");
    setForwardAttachment(null);
    setForwardAttachmentPreview("");
  };

  /** Handles file input for the forward mandatory attachment. */
  const handleForwardAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForwardAttachment(file);
    setForwardAttachmentPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  /** Cancels the forward — resets all forward state and closes the comment box. */
  const handleCancelForward = () => {
    setPendingForwardUser(null);
    setShowForwardCommentBox(false);
    setForwardComment("");
    setForwardAttachment(null);
    setForwardAttachmentPreview("");
    setSelectedUser(null);
    setNewEmployeeStatus("");
  };

  /** Confirms the forward — runs the API calls then saves the comment to ticket_activities. */
  const handleConfirmForward = async () => {
    if (!requireExpectedDate()) return;
    if (!forwardComment.trim()) {
      toastAndNavigate(dispatch, true, "error", "A reason is required to forward the ticket");
      return;
    }
    if (!pendingForwardUser) return;
    setIsSavingForward(true);
    try {
      const employeeRole = decodedToken()?.role;
      const loggedInUser = decodedToken()?.username;
      const userId = decodedToken()?.id;

      // 1. Optional attachment upload
      let attachmentUrl: string | null = null;
      if (forwardAttachment) {
        try {
          const formData = new FormData();
          formData.append("document", forwardAttachment);
          formData.append("folder", `comment/${forwardAttachment.name}`);
          const res = await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          attachmentUrl = res.data.data as string;
        } catch {
          toastAndNavigate(dispatch, true, "error", "Error uploading attachment");
          return;
        }
      }

      // 2. Update ticket — forwarded fields + status
      const updatePayload: any = {
        forwarded_to: pendingForwardUser.id,
        forwarded_by: userId,
        is_forwarded: 1,
      };
      let historyMessage = `${loggedInUser} forwarded the ticket to ${pendingForwardUser.username}`;
      if (employeeRole === "credit") {
        updatePayload.status = "operations";
        historyMessage += " and status is set to operations";
      } else if (employeeRole === "operations") {
        updatePayload.status = "under credit review";
        historyMessage += " and status is set to under credit review";
      }
      await modifyTicket(+ticketId, updatePayload);

      // 3. Ticket history
      await createTicketHistory({ ticket_id: ticketId, action: historyMessage });

      // 4. Save forward reason as a comment in ticket_activities
      await createTicketActivity({
        ticket_id: ticketId,
        user_id: userId,
        comment: forwardComment,
        attachment: attachmentUrl,
      });

      // 5. Reset all forward state
      setPendingForwardUser(null);
      setShowForwardCommentBox(false);
      setForwardComment("");
      setForwardAttachment(null);
      setForwardAttachmentPreview("");
      setNewEmployeeStatus("");

      toastAndNavigate(dispatch, true, "info", "File Forwarded Successfully");
      await refetch();
      await fetchTicketDetails();
    } catch {
      toastAndNavigate(dispatch, true, "error", "Error Forwarding File");
    } finally {
      setIsSavingForward(false);
    }
  };

  const showComments = () => setActiveSection("Comments");
  const showHistory = () => setActiveSection("History");
  const showWorkLog = () => setActiveSection("WorkLog");

  return (
    <>
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 1, sm: 2, lg: 3 },
          py: { xs: 1, sm: 2 },
          minHeight: '100vh',
          maxWidth: '1800px',
          margin: '0 auto',
        }}
      >
        <Grid
          container
          spacing={{ xs: 1, sm: 1.5, md: 2 }}
          sx={{
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          {/* Main Content Section */}
          <Grid
            item
            xs={12}
            md={8}
            lg={8}
            xl={8}
            sx={{
              order: { xs: 1, lg: 1 },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                width: '100%',
              }}
            >
              <TicketDetail
                ticketDetailData={ticketDetailData}
                isMobile={isMobile}
                isTab={isTablet}
                isIpad={isIpad}
              />

              <Divider sx={{ my: 3, opacity: 0.6 }} />

              <Box sx={{ mt: 2 }}>
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  <Grid item xs={12} lg={6}>
                    <TicketDocuments
                      isMobile={isMobile}
                      isTab={isTablet}
                      isIpad={isIpad}
                      documents={ticketDetailData?.customerDocuments ?? []}
                      customerId={
                        ticketDetailData?.customer_id ||
                        ticketDetailData?.customerId
                      }
                      ticketId={ticketId}
                      onRequireExpectedDate={requireExpectedDate}
                      onCreateHistory={createTicketHistory}
                    />
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <TicketVoiceNotes
                      isMobile={isMobile}
                      isTab={isTablet}
                      isIpad={isIpad}
                      ticketDetailData={ticketDetailData}
                      onRequireExpectedDate={requireExpectedDate}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Activity Section */}
              <Box
                sx={{
                  mt: 4,
                  mb: 2.5,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e2e8f0',
                  pb: 1.5,
                  gap: { xs: 1.5, sm: 0 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#1e293b",
                      fontWeight: 700,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Activity
                  </Typography>
                </Box>

                {/* Segmented Tab Control */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    bgcolor: "#f1f5f9",
                    p: "3px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    gap: "2px",
                  }}
                >
                  <Tooltip title="View comments and updates">
                    <Button
                      size="small"
                      startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: "15px !important" }} />}
                      onClick={showComments}
                      disableRipple
                      sx={{
                        textTransform: "none",
                        fontWeight: activeSection === "Comments" ? 700 : 500,
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        px: 1.6,
                        py: 0.45,
                        bgcolor: activeSection === "Comments" ? "#ffffff" : "transparent",
                        color: activeSection === "Comments" ? "#3949ab" : "#64748b",
                        boxShadow: activeSection === "Comments" ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                        border: activeSection === "Comments" ? "1px solid rgba(0,0,0,0.04)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: activeSection === "Comments" ? "#ffffff" : "rgba(255,255,255,0.6)",
                          color: activeSection === "Comments" ? "#3949ab" : "#0f172a",
                          boxShadow: activeSection === "Comments" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        },
                      }}
                    >
                      Comments
                    </Button>
                  </Tooltip>
                  <Tooltip title="View ticket history">
                    <Button
                      size="small"
                      startIcon={<HistoryRoundedIcon sx={{ fontSize: "16px !important" }} />}
                      onClick={showHistory}
                      disableRipple
                      sx={{
                        textTransform: "none",
                        fontWeight: activeSection === "History" ? 700 : 500,
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        px: 1.6,
                        py: 0.45,
                        bgcolor: activeSection === "History" ? "#ffffff" : "transparent",
                        color: activeSection === "History" ? "#3949ab" : "#64748b",
                        boxShadow: activeSection === "History" ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                        border: activeSection === "History" ? "1px solid rgba(0,0,0,0.04)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: activeSection === "History" ? "#ffffff" : "rgba(255,255,255,0.6)",
                          color: activeSection === "History" ? "#3949ab" : "#0f172a",
                          boxShadow: activeSection === "History" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        },
                      }}
                    >
                      History
                    </Button>
                  </Tooltip>
                  <Tooltip title="View operational work logs">
                    <Button
                      size="small"
                      startIcon={<AccessTimeRoundedIcon sx={{ fontSize: "15px !important" }} />}
                      onClick={showWorkLog}
                      disableRipple
                      sx={{
                        textTransform: "none",
                        fontWeight: activeSection === "WorkLog" ? 700 : 500,
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        px: 1.6,
                        py: 0.45,
                        bgcolor: activeSection === "WorkLog" ? "#ffffff" : "transparent",
                        color: activeSection === "WorkLog" ? "#3949ab" : "#64748b",
                        boxShadow: activeSection === "WorkLog" ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                        border: activeSection === "WorkLog" ? "1px solid rgba(0,0,0,0.04)" : "1px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: activeSection === "WorkLog" ? "#ffffff" : "rgba(255,255,255,0.6)",
                          color: activeSection === "WorkLog" ? "#3949ab" : "#0f172a",
                          boxShadow: activeSection === "WorkLog" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        },
                      }}
                    >
                      Work Log
                    </Button>
                  </Tooltip>
                </Box>
              </Box>

              {/* Content Sections */}
              {activeSection === "Comments" && (
                <Comments storedTicketId={ticketId} userData={userData} isExpectedDateSaved={isExpectedDateSaved} onRequireExpectedDate={requireExpectedDate} />
              )}

              {activeSection === "History" && (
                <History ticketId={ticketId} activeSection={activeSection} />
              )}

              {activeSection === "WorkLog" && (
                <WorkLogList userData={userData} workLog={(workLog as any)?.data} />
              )}
            </Paper>
          </Grid>

          {/* Sidebar Section */}
          <Grid
            item
            xs={12}
            md={4}
            lg={4}
            xl={4}
            sx={{
              order: { xs: 2, lg: 2 },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                position: { xs: 'static', lg: 'sticky' },
                top: { lg: "calc(var(--MainNav-height, 64px) + 24px)" },
                zIndex: 10,
                width: '100%',
                pb: { xs: "5vh", lg: "10vh" },
                height: {
                  xs: "auto",
                  lg: "calc(100vh - 8rem)"
                },
                maxHeight: {
                  lg: "calc(100vh - 8rem)"
                },
                overflowY: 'auto',
                overflowX: 'hidden',
                backgroundColor: "#fff",
                // Custom scrollbar styles for webkit browsers
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(149, 117, 205, 0.3)",
                  borderRadius: "3px",
                  "&:hover": {
                    background: "rgba(149, 117, 205, 0.5)",
                  },
                },
                // Hide scrollbar for Firefox
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(149, 117, 205, 0.3) transparent",
                // Smooth scrolling
                scrollBehavior: 'smooth',
              }}
            >
              {/* Expected Decision Date Section */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  bgcolor: isExpectedDateOverdue
                    ? 'rgba(211, 47, 47, 0.04)'
                    : isExpectedDateSaved
                      ? 'rgba(21, 95, 204, 0.04)'
                      : 'rgba(255, 152, 0, 0.06)',
                  border: isExpectedDateOverdue
                    ? '1px solid rgba(211, 47, 47, 0.3)'
                    : isExpectedDateSaved
                      ? '1px solid rgba(21, 95, 204, 0.2)'
                      : '1.5px dashed rgba(255, 152, 0, 0.5)',
                  mb: { xs: 1.5, sm: 2 },
                  transition: 'all 0.3s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: isExpectedDateOverdue ? 'error.main' : isExpectedDateSaved ? '#155fcc' : '#e65100',
                      fontSize: '0.72rem',
                    }}
                  >
                    Expected Decision
                    {!isExpectedDateSaved && (
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: '0.85rem', ml: 0.3 }}
                      >
                        *
                      </Typography>
                    )}
                  </Typography>
                  {isExpectedDateSaved && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditRoundedIcon sx={{ fontSize: '13px !important' }} />}
                      onClick={() => setIsExpectedDateSaved(false)}
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        borderColor: '#cbd5e1',
                        bgcolor: '#ffffff',
                        textTransform: 'none',
                        borderRadius: '5px',
                        px: 1.2,
                        py: 0.25,
                        minWidth: 0,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        '&:hover': {
                          bgcolor: '#f8fafc',
                          borderColor: '#3949ab',
                          color: '#3949ab',
                        },
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </Box>

                {isExpectedDateSaved ? (
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: isExpectedDateOverdue ? 'error.main' : 'text.primary',
                    }}
                  >
                    {expectedDecisionDate
                      ? new Date(expectedDecisionDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                      : '—'}
                    {isExpectedDateOverdue && (
                      <Typography
                        component="span"
                        sx={{ fontSize: '0.72rem', color: 'error.main', ml: 1, fontWeight: 600 }}
                      >
                        (Overdue)
                      </Typography>
                    )}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      type="date"
                      size="small"
                      value={expectedDecisionDate}
                      onChange={(e) => setExpectedDecisionDate(e.target.value)}
                      inputProps={{ min: new Date().toISOString().split('T')[0] }}
                      sx={{
                        flex: 1,
                        minWidth: '130px',
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#fff',
                          fontSize: '0.82rem',
                          borderRadius: 1.5,
                        },
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                    {ticketDetailData?.due_date && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleCancelExpectedDecisionDate}
                        sx={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          textTransform: 'none',
                          color: '#64748b',
                          borderColor: '#cbd5e1',
                          bgcolor: '#ffffff',
                          borderRadius: '6px',
                          px: 1.6,
                          py: 0.45,
                          '&:hover': {
                            bgcolor: '#f1f5f9',
                            borderColor: '#94a3b8',
                            color: '#0f172a',
                          },
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!expectedDecisionDate || isSavingExpectedDate}
                      onClick={handleSaveExpectedDecisionDate}
                      sx={{
                        bgcolor: '#3949ab',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '6px',
                        px: 1.8,
                        py: 0.45,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#303f9f', boxShadow: 'none' },
                        '&:disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
                      }}
                    >
                      {isSavingExpectedDate ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                )}

                {!isExpectedDateSaved && (
                  <Typography
                    variant="caption"
                    sx={{ color: '#e65100', fontSize: '0.7rem', fontStyle: 'italic' }}
                  >
                    Required before any activity (commenting, status change)
                  </Typography>
                )}
              </Box>

              {/* Forward Button */}
              <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                <Tooltip title="Forward this ticket to another user">
                  <span>
                    <Button
                      endIcon={<ArrowForwardRounded sx={{ fontSize: '16px !important' }} />}
                      size="small"
                      variant="contained"
                      onClick={() => setNewEmployeeStatus("forwarded")}
                      sx={{
                        bgcolor: '#3949ab',
                        color: '#ffffff',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '6px',
                        py: 0.45,
                        px: 1.8,
                        fontSize: '0.8rem',
                        boxShadow: 'none',
                        '&:hover': {
                          bgcolor: '#303f9f',
                          boxShadow: '0 2px 4px rgba(57, 73, 171, 0.2)',
                        },
                      }}
                    >
                      Forward
                    </Button>
                  </span>
                </Tooltip>
              </Box>



              {/* User Autocomplete */}
              {newEmployeeStatus === "forwarded" && (
                <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <UserAutocomplete
                    isMobile={isMobile}
                    isTab={isTablet}
                    newEmployeeStatus={newEmployeeStatus}
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    handleForwardAutocomplete={handleForwardAutocomplete}
                    userData={userData}
                    ticketId={ticketId}
                    userId={ticketDetailData?.userId}
                    isForwarded={ticketDetailData?.isForwarded}
                    ticketDetailData={ticketDetailData}
                    currentUserRole={decodedToken()?.role}
                  />
                </Box>
              )}

              {/* Forward Reason Comment Box — slides in after a user is selected */}
              <Collapse in={showForwardCommentBox} timeout={300} unmountOnExit>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    bgcolor: 'rgba(21, 95, 204, 0.04)',
                    border: '1px solid rgba(21, 95, 204, 0.2)',
                    mb: { xs: 1.5, sm: 2 },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                  >
                    Reason for Forwarding{' '}
                    <Typography component="span" sx={{ color: 'error.main', fontSize: '0.85rem' }}>*</Typography>
                  </Typography>

                  {/* Comment input with attachment icon */}
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder={`Add a reason for forwarding to ${pendingForwardUser?.username || 'user'}...`}
                      value={forwardComment}
                      onChange={(e) => setForwardComment(e.target.value)}
                      variant="outlined"
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', pr: '40px' } }}
                    />
                    <Tooltip title="Add attachment">
                      <IconButton
                        component="label"
                        size="small"
                        sx={{ position: 'absolute', bottom: 6, right: 4 }}
                      >
                        <AttachFileIcon fontSize="small" />
                        <input type="file" hidden onChange={handleForwardAttachmentChange} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Attachment preview */}
                  {forwardAttachment && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {forwardAttachmentPreview && (
                        <Box
                          component="img"
                          src={forwardAttachmentPreview}
                          alt="Preview"
                          sx={{ maxHeight: 60, maxWidth: 60, borderRadius: 1 }}
                        />
                      )}
                      <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                        {forwardAttachment.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => { setForwardAttachment(null); setForwardAttachmentPreview(""); }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelForward}
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        color: '#64748b',
                        borderColor: '#cbd5e1',
                        borderRadius: '6px',
                        px: 1.8,
                        py: 0.4,
                        '&:hover': {
                          bgcolor: '#f1f5f9',
                          borderColor: '#94a3b8',
                          color: '#0f172a',
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!forwardComment.trim() || isSavingForward}
                      onClick={handleConfirmForward}
                      startIcon={isSavingForward ? <CircularProgress size={14} color="inherit" /> : null}
                      sx={{
                        bgcolor: '#3949ab',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '6px',
                        px: 1.8,
                        py: 0.4,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#303f9f', boxShadow: 'none' },
                        '&:disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
                      }}
                    >
                      {isSavingForward ? "Forwarding..." : "Forward"}
                    </Button>
                  </Box>
                </Box>
              </Collapse>

              <Divider sx={{
                my: { xs: 1.5, sm: 2 },
                borderColor: '#e0e0e0'
              }} />

              {/* File Status */}
              {decodedToken()?.role !== "credit" && (
                <>
                  {decodedToken()?.role !== "credit" && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: { xs: 1, sm: 1.5, md: 2 },
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: { xs: 1.5, sm: 2 },
                        bgcolor: 'var(--mui-palette-neutral-50)',
                        border: '1px solid var(--mui-palette-neutral-200)',
                        mb: { xs: 1.5, sm: 2 },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 'bold',
                          fontSize: {
                            xs: '0.8rem',
                            sm: '0.9rem',
                            md: '1rem'
                          },
                          lineHeight: 1.2,
                        }}
                      >
                        File Status:
                      </Typography>

                      <DropdownComponent
                        id="ticket-file-status"
                        name="fileStatus"
                        label="File Status"
                        value={pendingNewStatus || newEmployeeStatus}
                        onChange={handleFileStatusChange}
                        options={employeeStatusObj}
                        placeholder="Select File Status"
                      />
                    </Box>
                  )}

                  {/* Slide-in mandatory comment box — only for non-approved/disbursed statuses */}
                  <Collapse
                    in={showStatusCommentBox && pendingNewStatus !== "approved" && pendingNewStatus !== "disbursed"}
                    timeout={300}
                    unmountOnExit
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: { xs: 1.5, sm: 2 },
                        bgcolor: 'var(--mui-palette-neutral-50)',
                        border: '1px solid var(--mui-palette-neutral-200)',
                        mb: { xs: 1.5, sm: 2 },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Carry Forward Target Month Selector */}
                      {pendingNewStatus === "carry forward" && (
                        <Box sx={{ mt: 0.5, mb: 1 }}>
                          <DropdownComponent
                            id="ticket-carry-forward-month"
                            name="carryForwardMonth"
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span>Move To Month</span>
                                <Typography component="span" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>*</Typography>
                              </Box>
                            }
                            value={carryForwardMonth}
                            onChange={(val) => setCarryForwardMonth(val)}
                            options={remainingMonths.map((m) => ({ label: m.label, value: m.label }))}
                            placeholder="Select Target Month"
                          />
                        </Box>
                      )}

                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                      >
                        Comment{' '}
                        <Typography component="span" sx={{ color: 'error.main', fontSize: '0.85rem' }}>*</Typography>
                      </Typography>

                      {/* Comment input with attachment icon */}
                      <Box sx={{ position: 'relative' }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Add a comment for this status change..."
                          value={statusChangeComment}
                          onChange={(e) => setStatusChangeComment(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', pr: '40px' } }}
                        />
                        <Tooltip title="Add attachment">
                          <IconButton
                            component="label"
                            size="small"
                            sx={{ position: 'absolute', bottom: 6, right: 4 }}
                          >
                            <AttachFileIcon fontSize="small" />
                            <input type="file" hidden onChange={handleStatusAttachmentChange} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Attachment preview */}
                      {statusChangeAttachment && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {statusChangeAttachmentPreview && (
                            <Box
                              component="img"
                              src={statusChangeAttachmentPreview}
                              alt="Preview"
                              sx={{ maxHeight: 60, maxWidth: 60, borderRadius: 1 }}
                            />
                          )}
                          <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                            {statusChangeAttachment.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => { setStatusChangeAttachment(null); setStatusChangeAttachmentPreview(""); }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}

                      {/* Action buttons */}
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleCancelStatusChange}
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            borderRadius: '6px',
                            px: 1.8,
                            py: 0.4,
                            '&:hover': {
                              bgcolor: '#f1f5f9',
                              borderColor: '#94a3b8',
                              color: '#0f172a',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!statusChangeComment.trim() || (pendingNewStatus === "carry forward" && !carryForwardMonth) || isSavingStatus}
                          onClick={handleConfirmStatusChange}
                          startIcon={isSavingStatus ? <CircularProgress size={14} color="inherit" /> : null}
                          sx={{
                            bgcolor: '#3949ab',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '6px',
                            px: 1.8,
                            py: 0.4,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#303f9f', boxShadow: 'none' },
                            '&:disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
                          }}
                        >
                          {isSavingStatus ? "Saving..." : "Save"}
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>

                  {/* Approved Details Panel — shown while pending or after confirmed */}
                  {(pendingNewStatus === "approved" || newEmployeeStatus === "approved") && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: { xs: 1, sm: 1.5, md: 2 },
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: { xs: 1.5, sm: 2 },
                        bgcolor: 'var(--mui-palette-neutral-50)',
                        border: '1px solid var(--mui-palette-neutral-200)',
                        mb: { xs: 1.5, sm: 2 },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Title */}
                      <Typography
                        variant="subtitle1"
                        align="center"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 'bold',
                          fontSize: {
                            xs: '0.8rem',
                            sm: '0.9rem',
                            md: '1rem',
                          },
                          lineHeight: 1.2,
                        }}
                      >
                        Approval Details
                      </Typography>

                      {/* Date Field */}
                      <TextField
                        fullWidth
                        type="date"
                        label="Date"
                        value={approvedDate}
                        onChange={(e) => setApprovedDate(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Amount Field */}
                      <TextField
                        fullWidth
                        label="Amount"
                        value={formatDisplayAmount(approvedAmount)}
                        placeholder="Enter amount"
                        onChange={(e) => {
                          // Store the raw value but display formatted
                          const rawValue = e.target.value;
                          setApprovedAmount(rawValue);
                        }}
                        onBlur={(e) => {
                          // Format the amount when field loses focus
                          if (e.target.value) {
                            const formatted = formatDecimalAmount(e.target.value);
                            setApprovedAmount(formatted);
                          }
                        }}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Case Type Field */}
                      <DropdownComponent
                        id="approval-case-type"
                        name="caseType"
                        label="Case Type"
                        value={caseType}
                        onChange={(val) => setCaseType(val)}
                        options={[
                          { value: "fresh", label: "Fresh" },
                          { value: "top_up", label: "Top up" },
                        ]}
                        placeholder="Select Case Type"
                      />

                      {/* Fixed Commission Percentage Field */}
                      <TextField
                        fullWidth
                        type="number"
                        label="Fixed Commission Percentage"
                        placeholder="Enter fixed commission percentage"
                        value={fixedCommissionPercentage}
                        onChange={(e) => setFixedCommissionPercentage(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Mandatory comment box — inside approved panel */}
                      <Box sx={{ position: 'relative' }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Add a comment for this status change... *"
                          value={statusChangeComment}
                          onChange={(e) => setStatusChangeComment(e.target.value)}
                          variant="outlined"
                          size="small"
                          label="Comment (required)"
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            ...panelFieldStyles,
                            '& .MuiOutlinedInput-root': {
                              ...panelFieldStyles['& .MuiOutlinedInput-root'],
                              pr: '40px',
                            },
                          }}
                        />
                        <Tooltip title="Add attachment">
                          <IconButton
                            component="label"
                            size="small"
                            sx={{ position: 'absolute', bottom: 6, right: 4 }}
                          >
                            <AttachFileIcon fontSize="small" />
                            <input type="file" hidden onChange={handleStatusAttachmentChange} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {statusChangeAttachment && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {statusChangeAttachmentPreview && (
                            <Box
                              component="img"
                              src={statusChangeAttachmentPreview}
                              alt="Preview"
                              sx={{ maxHeight: 60, maxWidth: 60, borderRadius: 1 }}
                            />
                          )}
                          <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                            {statusChangeAttachment.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => { setStatusChangeAttachment(null); setStatusChangeAttachmentPreview(""); }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}

                      {/* Save Button */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleCancelStatusChange}
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            borderRadius: '6px',
                            px: 1.8,
                            py: 0.4,
                            '&:hover': {
                              bgcolor: '#f1f5f9',
                              borderColor: '#94a3b8',
                              color: '#0f172a',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                        <Tooltip title="Submit approval details and update status">
                          <span>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={handleCombinedApprovalSubmit}
                              disabled={
                                isSavingApproval ||
                                !statusChangeComment.trim() ||
                                !approvedDate ||
                                !(approvedAmount || ticketDetailData?.applicationAmount) ||
                                parseFloat(approvedAmount || ticketDetailData?.applicationAmount || 0) <= 0
                              }
                              startIcon={isSavingApproval ? <CircularProgress size={14} color="inherit" /> : null}
                              sx={{
                                bgcolor: '#3949ab',
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: '6px',
                                px: 2,
                                py: 0.45,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#303f9f', boxShadow: 'none' },
                                '&:disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
                              }}
                            >
                              {isSavingApproval ? "Saving..." : "Save"}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}

                  {/* Disbursement Details Panel — shown while pending or after confirmed */}
                  {(pendingNewStatus === "disbursed" || newEmployeeStatus === "disbursed") && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: { xs: 1, sm: 1.5, md: 2 },
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: { xs: 1.5, sm: 2 },
                        bgcolor: 'var(--mui-palette-neutral-50)',
                        border: '1px solid var(--mui-palette-neutral-200)',
                        mb: { xs: 1.5, sm: 2 },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Title */}
                      <Typography
                        variant="subtitle1"
                        align="center"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 'bold',
                          fontSize: {
                            xs: '0.8rem',
                            sm: '0.9rem',
                            md: '1rem',
                          },
                          lineHeight: 1.2,
                        }}
                      >
                        Disbursement Details
                      </Typography>

                      {/* Date Field */}
                      <TextField
                        fullWidth
                        type="date"
                        label="Date"
                        value={disbursedDate}
                        onChange={(e) => setDisbursedDate(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Amount Field */}
                      <TextField
                        fullWidth
                        type="number"
                        label="Amount"
                        placeholder="Enter amount"
                        value={disbursedAmount}
                        onChange={(e) => setDisbursedAmount(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />
                      {/* Add Cashback Field Here */}
                      <TextField
                        fullWidth
                        type="number"
                        label="Cashback Amount"
                        placeholder="Enter cashback amount"
                        value={cashbackAmount}
                        onChange={(e) => setCashbackAmount(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Case Type Field */}
                      <DropdownComponent
                        id="disbursement-case-type"
                        name="caseType"
                        label="Case Type"
                        value={caseType}
                        onChange={(val) => setCaseType(val)}
                        options={[
                          { value: "fresh", label: "Fresh" },
                          { value: "top_up", label: "Top up" },
                        ]}
                        placeholder="Select Case Type"
                      />

                      {/* Fixed Commission Percentage Field */}
                      <TextField
                        fullWidth
                        type="number"
                        label="Fixed Commission Percentage ( % )"
                        placeholder="Enter fixed commission percentage"
                        value={fixedCommissionPercentage}
                        onChange={(e) => setFixedCommissionPercentage(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={panelFieldStyles}
                      />

                      {/* Mandatory comment box — inside disbursed panel */}
                      <Box sx={{ position: 'relative' }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Add a comment for this status change... *"
                          value={statusChangeComment}
                          onChange={(e) => setStatusChangeComment(e.target.value)}
                          variant="outlined"
                          size="small"
                          label="Comment (required)"
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            ...panelFieldStyles,
                            '& .MuiOutlinedInput-root': {
                              ...panelFieldStyles['& .MuiOutlinedInput-root'],
                              pr: '40px',
                            },
                          }}
                        />
                        <Tooltip title="Add attachment">
                          <IconButton
                            component="label"
                            size="small"
                            sx={{ position: 'absolute', bottom: 6, right: 4 }}
                          >
                            <AttachFileIcon fontSize="small" />
                            <input type="file" hidden onChange={handleStatusAttachmentChange} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {statusChangeAttachment && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {statusChangeAttachmentPreview && (
                            <Box
                              component="img"
                              src={statusChangeAttachmentPreview}
                              alt="Preview"
                              sx={{ maxHeight: 60, maxWidth: 60, borderRadius: 1 }}
                            />
                          )}
                          <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                            {statusChangeAttachment.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => { setStatusChangeAttachment(null); setStatusChangeAttachmentPreview(""); }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}

                      {/* Save Button */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleCancelStatusChange}
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            borderRadius: '6px',
                            px: 1.8,
                            py: 0.4,
                            '&:hover': {
                              bgcolor: '#f1f5f9',
                              borderColor: '#94a3b8',
                              color: '#0f172a',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                        <Tooltip title="Submit disbursement details and finalize status">
                          <span>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={handleCombinedDisbursementSubmit}
                              disabled={
                                isSavingDisbursement ||
                                !statusChangeComment.trim() ||
                                !disbursedDate ||
                                !(disbursedAmount || ticketDetailData?.applicationAmount) ||
                                parseFloat(disbursedAmount || ticketDetailData?.applicationAmount || 0) <= 0
                              }
                              startIcon={isSavingDisbursement ? <CircularProgress size={14} color="inherit" /> : null}
                              sx={{
                                bgcolor: '#3949ab',
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: '6px',
                                px: 2,
                                py: 0.45,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#303f9f', boxShadow: 'none' },
                                '&:disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' },
                              }}
                            >
                              {isSavingDisbursement ? "Saving..." : "Save"}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}


                </>
              )}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 1, sm: 1.5, md: 2 },
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  bgcolor: 'var(--mui-palette-neutral-50)',
                  border: '1px solid var(--mui-palette-neutral-200)',
                  mb: { xs: 1.5, sm: 2 },
                  transition: 'all 0.3s ease',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 'bold',
                    fontSize: {
                      xs: '0.8rem',
                      sm: '0.9rem',
                      md: '1rem'
                    },
                    lineHeight: 1.2,
                  }}
                >
                  Loan Status:
                </Typography>

                <DropdownComponent
                  id="ticket-loan-status"
                  name="loanStatus"
                  label="Loan Status"
                  value={newLoanStatus}
                  onChange={handleChangeLoanStatus}
                  options={loanStatusOptions}
                  placeholder="Select Loan Status"
                />
              </Box>



              {/* Assignee */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: { xs: 0.5, sm: 1 },
                  mb: { xs: 1.5, sm: 2 },
                  bgcolor: { xs: '#f5f5f5', sm: 'transparent' },
                  borderRadius: { xs: 1, sm: 0 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: {
                      xs: '0.75rem',
                      sm: '0.8rem',
                      md: '0.9rem',
                      lg: '1rem'
                    },
                    fontWeight: 'bold',
                    color: 'black',
                  }}
                >
                  Assignee
                </Typography>

                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  flexShrink: 0,
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'black',
                      fontSize: {
                        xs: '0.7rem',
                        sm: '0.75rem',
                        md: '0.8rem'
                      },
                      maxWidth: { xs: '80px', sm: '120px' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {capitalizeFirstLetter(decodedToken()?.username)}
                  </Typography>
                  <Avatar
                    sx={{
                      bgcolor: '#ADB5BD',
                      color: 'white',
                      width: { xs: 28, sm: 32, md: 40 },
                      // height: { xs: 28, sm: 32, md: 40 },
                      fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                    }}
                    alt={capitalizeFirstLetter(decodedToken()?.username)}
                    src={capitalizeFirstLetter(decodedToken()?.username)}
                  // alt={capitalizeFirstLetter( decodedToken()?.username )}
                  // src={capitalizeFirstLetter( decodedToken()?.username )}
                  />
                </Box>
              </Box>

              {/* Original Estimate Field */}
              <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                <OriginalEstimateField
                  ticketId={ticketId}
                  initialEstimate={ticketDetailData?.originalEstimate}
                  userRole={decodedToken()?.role}
                />
              </Box>

              {/* Time Tracking */}
              <Box sx={{ mt: { xs: 1.5, sm: 2 } }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: {
                      xs: '0.75rem',
                      sm: '0.8rem',
                      md: '0.9rem',
                      lg: '.9rem'
                    },
                    ml: ".6vw",
                    fontWeight: 'bold',
                    color: 'black',
                    // mb: { xs: 0.5, sm: 1 },
                  }}
                >
                  Time Tracking
                </Typography>

                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    mt: { xs: 0.5, sm: 1, lg: 2 },
                    px: { xs: 0, sm: 1 },
                  }}
                >
                  <ProgressBar
                    setOpenDialog={setOpenDialog}
                    timeLoggingEstimate={{
                      timeSpent: timeLoggingEstimate.timeSpent,
                      originalEstimate: timeLoggingEstimate.originalEstimate,
                    }}
                    progress={progress}
                    overage={overage}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <TrackingForm
        openDialog={openDialog}
        setOpenDialog={(val) => {
          if (val && !requireExpectedDate()) return;
          setOpenDialog(val);
        }}
        ticketDetailData={workLog?.data}
        ticketId={ticketId}
        originalEstimate={ticketDetailData?.originalEstimate}
      />
      <Toast
        alerting={toast.toastAlert}
        severity={toast.toastSeverity}
        message={toast.toastMessage}
      />
      {loading && <Loader />}
    </>
  );
};

export default React.memo(MainPage);
