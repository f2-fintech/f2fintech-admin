"use client";

import Link from "next/link";
import {
  AccountBalanceRounded,
  AccountBalanceWalletRounded,
  CancelRounded,
  DeleteForeverRounded,
  PauseCircleOutlineRounded,
  ReportRounded,
  SendRounded,
  FilterListRounded,
  ThumbUpRounded,
  LoginRounded,
  ForwardRounded,
  FactCheckRounded,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import Grid from "@mui/material/Unstable_Grid2";
import ArchiveIcon from "@mui/icons-material/Archive";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SendTimeExtensionIcon from "@mui/icons-material/SendTimeExtension";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";

import { Budget } from "@/app/components/dashboard/overview/budget";
import { LatestOrders } from "@/app/components/dashboard/overview/latest-orders";
import { LatestApplications } from "@/app/components/dashboard/overview/latest-aplications";
import { Sales } from "@/app/components/dashboard/overview/sales";
import { Traffic } from "@/app/components/dashboard/overview/traffic";
import { Utility } from "@/utils";
import {
  Box,
  Paper,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { axiosInstance } from "../../apis/config/axiosConfig";


interface Ticket {
  month: string;
  count: number;
}

// Updated function to fetch total applications count using axios
async function fetchTotalApplications(
  month?: string,
  year?: number,
  date?: string,
): Promise<number | null> {
  try {
    const params: any = {};

    // Only add month if it's provided and not empty
    if (month && month !== "") {
      params.month = month;
      // Always include the current year when month is provided
      params.year = new Date().getFullYear().toString();
    }

    // Only add date if it's provided and not empty
    if (date && date !== "") {
      params.date = date;
    }

    const response = await axiosInstance.get("/application/count", { params });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch total applications:", error);
    return null;
  }
}

// Updated function to fetch total new applications count using axios
async function fetchTotalNewApplication(
  month?: string,
  year?: number,
  date?: string,
): Promise<{ count: number; amount: number } | null> {
  try {
    const params: any = {};

    if (month) params.month = month;
    if (year) params.year = year.toString();
    if (date) params.date = date;

    const response = await axiosInstance.get("/application/new-count", { params });

    return {
      count: response.data.data.count || response.data.data,
      amount: response.data.data.amount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch total new applications:", error);
    return null;
  }
}

// Updated function to fetch total tickets using axios
async function fetchTotalTickets(
  status: string | null = null,
  id: number | string | null = null,
  role: string,
  date?: string | null,
  month?: string,
  year?: string,
  companyId?: string,
): Promise<number | { count: number; amount: number; grossAmount?: number; netAmount?: number }> {
  try {
    const params: any = {};

    // Add userId for non-admin users
    if (role !== "admin" && role !== "sub admin" && id !== null) {
      params.userId = id.toString();
    }

    // Add status if provided
    if (status) {
      params.status = status;
    }

    // Add date filters
    if (date) {
      params.date = date;
    }
    if (month) {
      params.month = month;
    }
    if (year) {
      params.year = year;
    }
    if (companyId) {
      params.companyId = companyId;
    }

    const response = await axiosInstance.get("/dashboard/tickets/count", { params });

    if (status === "disbursed") {
      const data = response.data.data;
      const count = typeof data === "object" ? (data.count || 0) : 0;
      const amount = typeof data === "object" ? (data.amount || 0) : 0;
      const grossAmount = typeof data === "object" ? (data.grossAmount ?? amount) : amount;
      const netAmount = typeof data === "object" ? (data.netAmount ?? amount) : amount;
      return {
        count,
        amount,
        grossAmount,
        netAmount,
      };
    }

    if (status === "approved" || status === "abnd") {
      const data = response.data.data;
      return {
        count: typeof data === "object" ? (data.count || 0) : (data || 0),
        amount: typeof data === "object" ? (data.amount || 0) : 0,
      };
    }

    return response.data.data || 0;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return 0;
  }
}

// Updated function to get total tickets by month using axios
async function getTotalTicketsByMonth(year: number): Promise<Ticket[]> {
  try {
    const params: any = { year };

    const response = await axiosInstance.get("/dashboard/tickets/counts-by-month", { params });
    console.log("Monthly tickets response:", response.data);

    return response.data.data.map((ticket: Ticket) => ticket.count);
  } catch (error) {
    console.error("Failed to fetch monthly count:", error);
    throw new Error("Failed to fetch monthly count");
  }
}

// Updated function to get done tickets by month using axios
async function getDoneTicketsByMonth(year: number): Promise<Ticket[]> {
  try {
    const params: any = { year };

    const response = await axiosInstance.get("/dashboard/tickets/done-counts-by-month", { params });

    return response.data.data.map((ticket: Ticket) => ticket.count);
  } catch (error) {
    console.error("Failed to fetch monthly done count:", error);
    throw new Error("Failed to fetch monthly done count");
  }
}

// Updated function to fetch agent count using axios
async function fetchAgentCount(): Promise<number | null> {
  try {
    const response = await axiosInstance.get("/dashboard/agents/count");
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch agent count:", error);
    return null;
  }
}

async function fetchAggregateTicketCounts(
  date?: string,
  month?: string,
  year?: string,
  userId?: number | string,
  companyId?: string,
): Promise<any> {
  try {
    const params: any = {};
    if (date) params.date = date;
    if (month) params.month = month;
    if (year) params.year = year;
    if (userId) params.userId = userId.toString();
    if (companyId) params.companyId = companyId;

    const response = await axiosInstance.get("/dashboard/tickets/aggregate-counts", { params });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch aggregate counts:", error);
    return {};
  }
}

const SummaryCard = ({ title, value, icon: Icon, tooltip, color }: any) => (
  <Tooltip title={tooltip} arrow placement="top">
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        transition: 'box-shadow 0.2s',
        cursor: 'default',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mt: 1 }}>
          {value}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5, borderRadius: '50%', backgroundColor: `${color}15`, color: color }}>
        <Icon fontSize="medium" />
      </Box>
    </Paper>
  </Tooltip>
);

const StatCard = ({ title, value, amount, icon: Icon, tooltip, link }: any) => {
  const mainColor = 'rgb(44, 60, 227)';
  const isStatic = !link || link === '#';
  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Paper
        elevation={0}
        component={Link}
        href={link || "#"}
        sx={{
          p: 2.5,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #e2e8f0',
          backgroundColor: '#ffffff',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: isStatic ? 'default' : 'pointer',
          textDecoration: 'none',
          display: 'block',
          '&:hover': isStatic
            ? { boxShadow: 'none' }
            : {
              borderColor: '#cbd5e1',
              borderLeftColor: mainColor,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
              transform: 'translateY(-3px)',
            }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#64748b',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1.3,
              maxWidth: '75%'
            }}
          >
            {title}
          </Typography>
          <Box
            className="icon-wrapper"
            sx={{
              p: 1,
              borderRadius: '10px',
              backgroundColor: 'rgba(44, 60, 227, 0.1)',
              color: mainColor,
              display: 'flex',
            }}
          >
            <Icon fontSize="small" />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.5px' }}>
            {Number(value || 0).toLocaleString('en-IN')}
          </Typography>
          {amount != null && (
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', px: 1.5, py: 0.75, borderRadius: '6px', fontSize: '0.85rem' }}>
              ₹{Number(amount).toLocaleString('en-IN')}
            </Typography>
          )}
        </Box>
      </Paper>
    </Tooltip>
  );
};

function SubAdminDashboard() {
  const { decodedToken, getCookies, capitalizeEachWord } = Utility();
  const cookies = getCookies();
  const userToken = (cookies as any).token;
  const { id, role, companyId, username, name } = decodedToken(userToken?.value) || {};

  const todayDate = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState<string | null>(todayDate);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [totalApps, setTotalApps] = useState<number>(0);
  const [newApps, setNewApps] = useState<any>({});
  const [approvedData, setApprovedData] = useState<any>({});
  const [disbursedData, setDisbursedData] = useState<any>({});
  const [abndData, setAbndData] = useState<any>({});

  const currentYear = new Date().getFullYear();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [selectedCompany, setSelectedCompany] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "" : ""
  );

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberId") || "all" : "all"
  );

  useEffect(() => {
    const handleGlobalCompanyChange = (event: any) => setSelectedCompany(event.detail);
    const handleTeamMemberChange = (event: any) => setSelectedTeamMember(event.detail);

    window.addEventListener("companyChanged", handleGlobalCompanyChange);
    window.addEventListener("teamMemberChanged", handleTeamMemberChange);

    return () => {
      window.removeEventListener("companyChanged", handleGlobalCompanyChange);
      window.removeEventListener("teamMemberChanged", handleTeamMemberChange);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);



  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 16) return "Good Afternoon!";
    return "Good Evening!";
  };
  const rawName = name || username || "User";
  const displayName = rawName ? capitalizeEachWord(rawName) : "";

  const handleMonthChange = (e: any) => {
    let newMonth = e.target.value;
    if (newMonth && newMonth !== "") setDate("");
    if (newMonth === "All") newMonth = "";
    setSelectedMonth(newMonth);
  };

  const handleDateChange = (e: any) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (newDate && newDate !== "") setSelectedMonth("");
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        let activeUserId: string | number | undefined = id;

        if (role === 'sales') {
          if (selectedTeamMember === "all" && id) {
            try {
              const res = await axiosInstance.get(`/teams/my-team-member-ids/${id}`, {
                params: { designation: decodedToken(userToken?.value)?.designation || '', role }
              });
              if (res.data.data && Array.isArray(res.data.data)) {
                activeUserId = res.data.data.join(',');
              }
            } catch (err) {
              console.error("Failed to fetch team member ids", err);
            }
          } else if (selectedTeamMember !== "all" && selectedTeamMember !== "") {
            activeUserId = Number(selectedTeamMember);
          }
        }

        const [aggCounts, apps, freshApps, approved, disbursed, abnd] = await Promise.all([
          fetchAggregateTicketCounts(date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined, activeUserId),
          fetchTotalApplications(), // ALWAYS show all time
          fetchTotalNewApplication(selectedMonth || undefined, selectedMonth ? currentYear : undefined, date || undefined),
          fetchTotalTickets("approved", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined),
          fetchTotalTickets("disbursed", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined),
          fetchTotalTickets("abnd", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined),
        ]);
        setCounts(aggCounts || {});
        setTotalApps(apps || 0);
        setNewApps(freshApps || {});
        setApprovedData(typeof approved === 'object' && approved !== null ? approved : { count: approved, amount: null });
        setDisbursedData(typeof disbursed === 'object' && disbursed !== null ? disbursed : { count: disbursed, amount: null });
        setAbndData(typeof abnd === 'object' && abnd !== null ? abnd : { count: abnd, amount: null });
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [date, selectedMonth, selectedCompany, selectedTeamMember, id, role, userToken?.value]);

  const getLink = (status: string) => {
    const base = `/ticket?status=${encodeURIComponent(status)}`;

    if (selectedMonth) {
      // Compute first and last day of the selected month
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIndex = monthNames.indexOf(selectedMonth);
      const year = new Date().getFullYear();
      const pad = (n: number) => String(n).padStart(2, "0");
      const firstDay = `${year}-${pad(monthIndex + 1)}-01`;
      // Last day: day 0 of next month = last day of current month
      const lastDate = new Date(year, monthIndex + 1, 0);
      const lastDay = `${year}-${pad(monthIndex + 1)}-${pad(lastDate.getDate())}`;
      return `${base}&month=${encodeURIComponent(selectedMonth)}&startDate=${firstDay}&endDate=${lastDay}`;
    }

    // When a specific date is selected, pass it as both startDate and endDate
    // so the ticket page filters exactly that day's tickets
    if (date) {
      return `${base}&startDate=${date}&endDate=${date}`;
    }
    return base;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1600, margin: '0 auto' }}>
      {/* Top Filter Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0d1b54', letterSpacing: '-0.5px' }}>
            {getGreeting()} {displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            {formatDateTime(currentDateTime)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} onChange={handleMonthChange} label="Month" sx={{ bgcolor: '#fff' }}>
              <MenuItem value="All">All Months</MenuItem>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            value={date || ""}
            onChange={handleDateChange}
            size="small"
            sx={{ bgcolor: '#fff', minWidth: 150 }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {/* Section 1: Application Overview */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>
        Application Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Total Applications" value={totalApps || 0} icon={ArchiveIcon} color="#1de9b6" link="#" tooltip="Total count of all applications (showing all time)" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Fresh Applications" value={newApps.count || 0} icon={FiberNewIcon} color="#00e5ff"
            link={getLink('fresh-applications')
              .replace('/ticket?status=fresh-applications&', '/home?')
              .replace('/ticket?status=fresh-applications', '/home')}
            tooltip="New fresh applications" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Total Tickets" value={counts['total'] || 0} icon={FilterListRounded} color="#cddc39" link={getLink('all')} tooltip="Total tickets in system" />
        </Grid>
      </Grid>

      {/* Section 2: Active Pipeline */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>
        Active Pipeline
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Under Credit Review" value={counts['under credit review'] || 0} icon={WorkHistoryIcon} color="#8bc34a" link={getLink('under credit review')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Operations" value={counts['operations'] || 0} icon={LoginRounded} color="#ffa726" link={getLink('operations')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Pendency in File" value={counts['pendency in file'] || 0} icon={PendingActionsIcon} color="#ff7043" link={getLink('pendency in file')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="File Send to Banker" value={counts['file send to banker'] || 0} icon={SendRounded} color="#827717" link={getLink('file send to banker')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Awaiting Banker Response" value={counts['file sent to banker - awaiting response'] || 0} icon={SendTimeExtensionIcon} color="#9e9d24" link={getLink('file sent to banker - awaiting response')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Hold" value={counts['hold'] || 0} icon={PauseCircleOutlineRounded} color="#1a237e" link={getLink('hold')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="To be Approved" value={counts['to be approved'] || 0} icon={ThumbUpRounded} color="#26c6da" link={getLink('to be approved')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="To be Disbursed" value={counts['to be disbursed'] || 0} icon={ForwardRounded} color="#a5d6a7" link={getLink('to be disbursed')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Carry Forward" value={counts['carry forward'] || 0} icon={SendTimeExtensionIcon} color="#795548" link={getLink('carry forward')} tooltip="" />
        </Grid>
      </Grid>

      {/* Section 3: Final Outcomes */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>
        Final Outcomes
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Approved" value={approvedData.count || 0} amount={approvedData.amount} icon={AccountBalanceRounded} color="#69f0ae" link={getLink('approved')} tooltip="Funds Approved" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard
            title="Gross Disbursed"
            value={disbursedData.count || 0}
            amount={disbursedData.grossAmount ?? disbursedData.amount}
            icon={ReportRounded}
            color="#ff9800"
            link={getLink('disbursed')}
            tooltip="Gross Funds Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard
            title="Net Disbursed"
            value={disbursedData.count || 0}
            amount={disbursedData.netAmount ?? disbursedData.amount}
            icon={AccountBalanceWalletRounded}
            color="#00bcd4"
            link={getLink('disbursed')}
            tooltip="Net Funds Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard
            title="ABND"
            value={abndData.count ?? (counts['abnd'] || 0)}
            amount={abndData.amount}
            icon={FactCheckRounded}
            color="#64748b"
            link={getLink('abnd')}
            tooltip="Approved But Not Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Rejected" value={counts['rejected'] || 0} icon={CancelRounded} color="#dd2c00" link={getLink('rejected')} tooltip="Rejected Tickets" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="Drop" value={counts['drop'] || 0} icon={DeleteForeverRounded} color="#ff6e40" link={getLink('drop')} tooltip="Dropped Tickets" />
        </Grid>
      </Grid>

      {/* Bottom Section: Action Lists */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
              Recent Applications
            </Typography>
            <LatestApplications sx={{ height: "100%", boxShadow: 'none' }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
              Agent Activity Monitoring
            </Typography>
            <LatestOrders sx={{ height: "100%", boxShadow: 'none' }} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function SalesDashboard() {
  const { decodedToken, getCookies, capitalizeEachWord } = Utility();
  const cookies = getCookies() as Record<string, string>;
  const userToken = cookies.oms_cookie || cookies.token;
  const { id, role, companyId, username, name } = decodedToken(userToken) || {};

  const todayDate = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState<string | null>(todayDate);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [totalApps, setTotalApps] = useState<number>(0);
  const [newApps, setNewApps] = useState<any>({});
  const [approvedData, setApprovedData] = useState<any>({});
  const [disbursedData, setDisbursedData] = useState<any>({});
  const [abndData, setAbndData] = useState<any>({});

  const currentYear = new Date().getFullYear();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [selectedCompany, setSelectedCompany] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "" : ""
  );

  const userDesignation = decodedToken(userToken)?.designation?.toLowerCase() || '';
  const isL1OrL2 = ["team leader", "tl", "sales manager", "sm", "l1", "l2"].includes(userDesignation);

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberId") || (!isL1OrL2 && role === "sales" ? id?.toString() || "all" : "all") : "all"
  );

  const [selectedTeamMemberName, setSelectedTeamMemberName] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberName") || (!isL1OrL2 && role === "sales" ? decodedToken(userToken)?.username || decodedToken(userToken)?.name || "My Details" : "All My Team") : "All My Team"
  );

  // Recent applications for this sales user
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  useEffect(() => {
    const handleGlobalCompanyChange = (event: any) => setSelectedCompany(event.detail);
    const handleTeamMemberChange = (event: any) => setSelectedTeamMember(event.detail);
    const handleTeamMemberNameChange = (event: any) => setSelectedTeamMemberName(event.detail);

    window.addEventListener("companyChanged", handleGlobalCompanyChange);
    window.addEventListener("teamMemberChanged", handleTeamMemberChange);
    window.addEventListener("teamMemberNameChanged", handleTeamMemberNameChange);
    return () => {
      window.removeEventListener("companyChanged", handleGlobalCompanyChange);
      window.removeEventListener("teamMemberChanged", handleTeamMemberChange);
      window.removeEventListener("teamMemberNameChanged", handleTeamMemberNameChange);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) =>
    date.toLocaleString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 16) return "Good Afternoon!";
    return "Good Evening!";
  };
  const rawName = name || username || "User";
  const displayName = rawName ? capitalizeEachWord(rawName) : "";

  const viewingLabel = String(selectedTeamMember) === String(id)
    ? capitalizeEachWord(displayName)
    : capitalizeEachWord(selectedTeamMemberName);

  const handleMonthChange = (e: any) => {
    let newMonth = e.target.value;
    if (newMonth && newMonth !== "") setDate("");
    if (newMonth === "All") newMonth = "";
    setSelectedMonth(newMonth);
  };

  const handleDateChange = (e: any) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (newDate && newDate !== "") setSelectedMonth("");
  };

  // Fetch recent fresh (unpicked) applications for this sales user
  const fetchRecentApps = async (activeDate?: string | null, activeMonth?: string, activeUserId?: string | number) => {
    try {
      setAppsLoading(true);
      const params: any = { page: 1, limit: 6 };
      if (activeUserId) params.appliedBy = activeUserId;
      if (selectedCompany) params.companyId = selectedCompany;
      // Apply date/month filter so table reflects the active filter
      if (activeDate) {
        params.startDate = activeDate;
        params.endDate = activeDate;
      } else if (activeMonth) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = monthNames.indexOf(activeMonth);
        const year = new Date().getFullYear();
        const pad = (n: number) => String(n).padStart(2, "0");
        params.startDate = `${year}-${pad(monthIndex + 1)}-01`;
        const lastDate = new Date(year, monthIndex + 1, 0);
        params.endDate = `${year}-${pad(monthIndex + 1)}-${pad(lastDate.getDate())}`;
      }
      const response = await axiosInstance.get("/get-customer-loan-applications", { params });
      setRecentApps(response.data?.data?.results || []);
    } catch (err) {
      console.error("Failed to fetch sales recent applications", err);
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        let activeUserId: string | number | undefined = id;

        if (role === 'sales') {
          if (selectedTeamMember === "all" && id) {
            try {
              const res = await axiosInstance.get(`/teams/my-team-member-ids/${id}`, {
                params: { designation: decodedToken(userToken)?.designation || '', role }
              });
              if (res.data.data && Array.isArray(res.data.data)) {
                activeUserId = res.data.data.join(',');
              }
            } catch (err) {
              console.error("Failed to fetch team member ids", err);
            }
          } else if (selectedTeamMember !== "all" && selectedTeamMember !== "") {
            activeUserId = Number(selectedTeamMember);
          }
        }

        const [aggCounts, freshApps, approved, disbursed] = await Promise.all([
          fetchAggregateTicketCounts(
            date || undefined,
            selectedMonth || undefined,
            selectedMonth ? currentYear.toString() : undefined,
            activeUserId,
            selectedCompany || undefined
          ),
          // Fresh applications count — respects date/month filter AND scoped to this user
          axiosInstance.get("/application/new-count", {
            params: {
              appliedBy: activeUserId,
              ...(selectedCompany && { companyId: selectedCompany }),
              ...(selectedMonth && { month: selectedMonth, year: currentYear.toString() }),
              ...(date && !selectedMonth && { date }),
            },
          }),
          fetchTotalTickets("approved", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined, selectedCompany || undefined),
          fetchTotalTickets("disbursed", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined, selectedCompany || undefined),
          fetchTotalTickets("abnd", activeUserId, role, date || undefined, selectedMonth || undefined, selectedMonth ? currentYear.toString() : undefined, selectedCompany || undefined),
        ]);
        setCounts(aggCounts || {});
        const freshCount = freshApps?.data?.data ?? 0;
        setNewApps({ count: typeof freshCount === 'object' ? freshCount.count : freshCount });
        setApprovedData(typeof approved === 'object' && approved !== null ? approved : { count: approved, amount: null });
        setDisbursedData(typeof disbursed === 'object' && disbursed !== null ? disbursed : { count: disbursed, amount: null });
        setAbndData(typeof abnd === 'object' && abnd !== null ? abnd : { count: abnd, amount: null });

        fetchRecentApps(date, selectedMonth, activeUserId);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [date, selectedMonth, selectedCompany, selectedTeamMember, id, role, userToken]);

  // Total applications — always all-time, scoped to this sales user, never changes with date/month
  useEffect(() => {
    const loadTotalApps = async () => {
      try {
        let activeUserId: string | number | undefined = id;

        if (role === 'sales') {
          if (selectedTeamMember === "all" && id) {
            try {
              const res = await axiosInstance.get(`/teams/my-team-member-ids/${id}`, {
                params: { designation: decodedToken(userToken)?.designation || '', role }
              });
              if (res.data.data && Array.isArray(res.data.data)) {
                activeUserId = res.data.data.join(',');
              }
            } catch (err) {
              console.error("Failed to fetch team member ids", err);
            }
          } else if (selectedTeamMember !== "all" && selectedTeamMember !== "") {
            activeUserId = Number(selectedTeamMember);
          }
        }

        const response = await axiosInstance.get("/application/count", {
          params: {
            appliedBy: activeUserId,
            ...(selectedCompany && { companyId: selectedCompany })
          },
        });
        setTotalApps(response.data?.data || 0);
      } catch (err) {
        console.error("Failed to fetch sales total applications", err);
      }
    };
    loadTotalApps();
  }, [id, selectedTeamMember, selectedCompany, role, userToken]);

  // Link builder — takes current date/month filter into account
  const getLink = (status: string) => {
    const base = `/ticket?status=${encodeURIComponent(status)}`;
    if (selectedMonth) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIndex = monthNames.indexOf(selectedMonth);
      const year = new Date().getFullYear();
      const pad = (n: number) => String(n).padStart(2, "0");
      const firstDay = `${year}-${pad(monthIndex + 1)}-01`;
      const lastDate = new Date(year, monthIndex + 1, 0);
      const lastDay = `${year}-${pad(monthIndex + 1)}-${pad(lastDate.getDate())}`;
      return `${base}&month=${encodeURIComponent(selectedMonth)}&startDate=${firstDay}&endDate=${lastDay}`;
    }
    if (date) return `${base}&startDate=${date}&endDate=${date}`;
    return base;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1600, margin: '0 auto' }}>
      {/* Top Filter Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0d1b54', letterSpacing: '-0.5px' }}>
            {getGreeting()} {displayName}
          </Typography>
          {String(selectedTeamMember) !== String(id) && (
            <Typography variant="subtitle1" sx={{ color: "#3949ab", fontWeight: 700, mt: 0.5 }}>
              Viewing Data For: {viewingLabel}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            {formatDateTime(currentDateTime)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} onChange={handleMonthChange} label="Month" sx={{ bgcolor: '#fff' }}>
              <MenuItem value="All">All Months</MenuItem>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            value={date || ""}
            onChange={handleDateChange}
            size="small"
            sx={{ bgcolor: '#fff', minWidth: 150 }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {/* Section 1: Application Overview */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>Application Overview</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="My All-Time Applications"
            value={totalApps}
            icon={ArchiveIcon}
            color="#1de9b6"
            link="#"
            tooltip="All-time count of applications you have filed (not affected by date filters)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <StatCard title="My Fresh Applications" value={newApps.count || 0} icon={FiberNewIcon} color="#00e5ff"
            link={getLink('fresh-applications')
              .replace('/ticket?status=fresh-applications&', '/home?')
              .replace('/ticket?status=fresh-applications', '/home')}
            tooltip="My fresh applications filed" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="My Picked Applications"
            value={counts['total'] || 0}
            icon={FilterListRounded}
            color="#cddc39"
            link={getLink('all')}
            tooltip="Total tickets created from your applications"
          />
        </Grid>

      </Grid>

      {/* Section 2: Active Pipeline */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>Active Pipeline</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Under Credit Review"
            value={counts['under credit review'] || 0}
            icon={WorkHistoryIcon}
            color="#8bc34a"
            link={getLink('under credit review')}
            tooltip=""
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Operations" value={counts['operations'] || 0} icon={LoginRounded} color="#ffa726" link={getLink('operations')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pendency in File" value={counts['pendency in file'] || 0} icon={PendingActionsIcon} color="#ff7043" link={getLink('pendency in file')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="File Send to Banker" value={counts['file send to banker'] || 0} icon={SendRounded} color="#827717" link={getLink('file send to banker')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Awaiting Banker Response" value={counts['file sent to banker - awaiting response'] || 0} icon={SendTimeExtensionIcon} color="#9e9d24" link={getLink('file sent to banker - awaiting response')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Hold" value={counts['hold'] || 0} icon={PauseCircleOutlineRounded} color="#1a237e" link={getLink('hold')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="To be Approved" value={counts['to be approved'] || 0} icon={ThumbUpRounded} color="#26c6da" link={getLink('to be approved')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="To be Disbursed" value={counts['to be disbursed'] || 0} icon={ForwardRounded} color="#a5d6a7" link={getLink('to be disbursed')} tooltip="" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Carry Forward" value={counts['carry forward'] || 0} icon={SendTimeExtensionIcon} color="#795548" link={getLink('carry forward')} tooltip="" />
        </Grid>
      </Grid>

      {/* Section 3: Final Outcomes */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 2 }}>Final Outcomes</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Approved" value={approvedData.count || 0} amount={approvedData.amount} icon={AccountBalanceRounded} color="#69f0ae" link={getLink('approved')} tooltip="Funds Approved" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Gross Disbursed"
            value={disbursedData.count || 0}
            amount={disbursedData.grossAmount ?? disbursedData.amount}
            icon={ReportRounded}
            color="#ff9800"
            link={getLink('disbursed')}
            tooltip="Gross Funds Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Net Disbursed"
            value={disbursedData.count || 0}
            amount={disbursedData.netAmount ?? disbursedData.amount}
            icon={AccountBalanceWalletRounded}
            color="#00bcd4"
            link={getLink('disbursed')}
            tooltip="Net Funds Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="ABND"
            value={abndData.count ?? (counts['abnd'] || 0)}
            amount={abndData.amount}
            icon={FactCheckRounded}
            color="#64748b"
            link={getLink('abnd')}
            tooltip="Approved But Not Disbursed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Rejected" value={counts['rejected'] || 0} icon={CancelRounded} color="#dd2c00" link={getLink('rejected')} tooltip="Rejected Tickets" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Drop" value={counts['drop'] || 0} icon={DeleteForeverRounded} color="#ff6e40" link={getLink('drop')} tooltip="Dropped Tickets" />
        </Grid>
      </Grid>

      {/* Section 4: My Recent Applications */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                My Recent Applications
              </Typography>
              <Button
                size="small"
                variant="contained"
                href={getLink('fresh-applications')
                  .replace('/ticket?status=fresh-applications&', '/home?')
                  .replace('/ticket?status=fresh-applications', '/home')}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#3f50b5', '&:hover': { bgcolor: '#303f9f' } }}
              >
                View All
              </Button>
            </Box>
            {appsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">Loading...</Typography>
              </Box>
            ) : recentApps.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No recent applications found.</Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      {['#', 'Customer', 'Amount', 'Provider', 'Loan Type', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentApps.map((app: any, i: number) => (
                      <tr key={app.applicationId || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 500 }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>{app.customerName || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>₹{Number(app.applicationAmount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{app.applicationProvider || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{app.loanType || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                            fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: app.loanStatus === 'disbursed' ? '#dcfce7' : '#f1f5f9',
                            color: app.loanStatus === 'disbursed' ? '#15803d' : '#475569',
                          }}>
                            {app.loanStatus || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {app.applicationDate ? new Date(app.applicationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function AdminDashboard() {
  const { decodedToken, getCookies, capitalizeEachWord } = Utility();
  const cookies = getCookies();
  const userToken = (cookies as any).token;
  const { id, role, companyId, username, name } = decodedToken(userToken?.value) || {};

  const [date, setDate] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [allCounts, setAllCounts] = useState<any>({});
  const [totalAgents, setTotalAgents] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const currentDate = new Date().toLocaleDateString("en-CA");

  const [selectedCompany, setSelectedCompany] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("selectedCompanyId") || ""
      : ""
  );

  // Sync with global company selection
  useEffect(() => {
    const handleGlobalCompanyChange = (event: any) => {
      setSelectedCompany(event.detail);
    };

    window.addEventListener("companyChanged", handleGlobalCompanyChange);
    return () => window.removeEventListener("companyChanged", handleGlobalCompanyChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toLocaleString("default", { month: "long" });
    setDate(currentDate);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 16) return "Good Afternoon!";
    return "Good Evening!";
  };
  const rawName = name || username || "User";
  const displayName = rawName ? capitalizeEachWord(rawName) : "";

  const handleMonthChange = (e) => {
    let newMonth = e.target.value;

    console.log("newMonth", newMonth);
    // If a month is selected, clear the date filter
    if (newMonth && newMonth !== "") {
      setDate("");
    }
    if (newMonth === "All") {
      newMonth = "";
    }
    setSelectedMonth(newMonth);
  };

  // Date TextField onChange handler
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);

    // If a date is selected, clear the month filter
    if (newDate && newDate !== "") {
      setSelectedMonth("");
    }
  };

  useEffect(() => {
    getAllCounts();
  }, [date, selectedMonth, selectedCompany]);

  useEffect(() => {
    const loadAgentCount = async () => {
      const count = await fetchAgentCount();
      setTotalAgents(count);
    };
    loadAgentCount();
  }, []);

  const getAllCounts = async () => {
    try {
      const [
        totalApplications,
        totalNewApplications,
        totalTickets,
        totalUnderCreditReview,
        totalOperations,
        totalPendencyInFile,
        totalToBeDisbursed,
        totalDisbursed,
        totalFileSendToBanker,
        totalCarryForward,
        totalToBeApproved,
        totalApproved,
        totalRejected,
        totalDrop,
        totalHold,
        totalAbnd,
        totalTicketsByMonth,
        doneTicketsByMonth,
      ] = await Promise.all([
        fetchTotalApplications(), // ALWAYS show all time
        fetchTotalNewApplication(
          selectedMonth || undefined,
          selectedMonth ? currentYear : undefined,
          date
        ),
        fetchTotalTickets(null, id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("under credit review", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("operations", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("pendency in file", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("to be disbursed", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("disbursed", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("file send to banker", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("carry forward", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("to be approved", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("approved", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("rejected", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("drop", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("hold", id, role, date, selectedMonth, currentYear.toString()),
        fetchTotalTickets("abnd", id, role, date, selectedMonth, currentYear.toString()),
        getTotalTicketsByMonth(currentYear),
        getDoneTicketsByMonth(currentYear),
      ]);

      // Normalize the data for `disbursed` status
      const normalizedDisbursed =
        typeof totalDisbursed === "object" && totalDisbursed !== null
          ? totalDisbursed
          : { count: totalDisbursed, amount: null };

      const normalizedApproved =
        typeof totalApproved === "object" && totalApproved !== null
          ? totalApproved
          : { count: totalApproved, amount: null };

      const normalizedAbnd =
        typeof totalAbnd === "object" && totalAbnd !== null
          ? totalAbnd
          : { count: totalAbnd, amount: null };

      const normalizedNewApplications = totalNewApplications
        ? {
          count: totalNewApplications.count,
          amount: totalNewApplications.amount || null,
        }
        : { count: null, amount: null };

      setAllCounts({
        totalApplications,
        totalNewApplications: normalizedNewApplications,
        totalTickets,
        totalUnderCreditReview,
        totalOperations,
        totalPendencyInFile,
        totalToBeDisbursed,
        totalDisbursed: normalizedDisbursed,
        totalFileSendToBanker,
        totalCarryForward,
        totalToBeApproved,
        totalApproved: normalizedApproved,
        totalRejected,
        totalDrop,
        totalHold,
        totalAbnd: normalizedAbnd,
        totalTicketsByMonth,
        doneTicketsByMonth,
      });
    } catch (error) {
      console.error("Error fetching all counts:", error);
    }
  };

  // Helper: build ticket page link respecting the active date or month filter
  const getAdminLink = (status: string) => {
    const base = `/ticket?status=${encodeURIComponent(status)}`;
    if (selectedMonth) {
      return `${base}&month=${encodeURIComponent(selectedMonth)}&startDate=${getFirstDayOfMonth(selectedMonth)}&endDate=${getLastDayOfMonth(selectedMonth)}`;
    }
    if (date) {
      return `${base}&startDate=${date}&endDate=${date}`;
    }
    return base;
  };

  const dashboardItems = [
    {
      icon: ArchiveIcon,
      label: "Total Applications",
      key: "totalApplications",
      color: "#f5f7fa",
      iconBgColor: "#1de9b6",
      count: allCounts?.totalApplications,
      link: "#",
      tooltip: "(All Time Count Of Applications)",
    },
    {
      icon: FiberNewIcon,
      label: "Fresh Applications",
      key: "totalNewApplications",
      color: "#f5f7fa",
      iconBgColor: "#00e5ff",
      count: allCounts?.totalNewApplications?.count,
      amount: allCounts?.totalNewApplications?.amount,
      link: getAdminLink("fresh-applications")
        .replace("/ticket?status=fresh-applications&", "/home?")
        .replace("/ticket?status=fresh-applications", "/home"),
    },
    {
      icon: FilterListRounded,
      label: "Total Tickets",
      key: "totalTickets",
      color: "#f5f7fa",
      iconBgColor: "#cddc39",
      count: allCounts?.totalTickets,
      link: getAdminLink("all"),
    },
    {
      icon: WorkHistoryIcon,
      label: "Under Credit Review",
      key: "underCreditReview",
      color: "#f5f7fa",
      iconBgColor: "#8bc34a",
      count: allCounts?.totalUnderCreditReview,
      link: getAdminLink("under credit review"),
    },
    {
      icon: LoginRounded,
      label: "Operations",
      key: "operations",
      color: "#f5f7fa",
      iconBgColor: "#ffa726",
      count: allCounts?.totalOperations,
      link: getAdminLink("operations"),
    },
    {
      icon: PendingActionsIcon,
      label: "Pendency in File",
      key: "pendencyInFile",
      color: "#f5f7fa",
      iconBgColor: "#ff7043",
      count: allCounts?.totalPendencyInFile,
      link: getAdminLink("pendency in file"),
    },
    {
      icon: SendRounded,
      label: "File Send to Banker",
      key: "fileSendToBanker",
      color: "#f5f7fa",
      iconBgColor: "#827717",
      count: allCounts?.totalFileSendToBanker,
      link: getAdminLink("file send to banker"),
    },
    {
      icon: PauseCircleOutlineRounded,
      label: "Hold",
      key: "hold",
      color: "#f5f7fa",
      iconBgColor: "#1a237e",
      count: allCounts?.totalHold,
      link: getAdminLink("hold"),
    },
    {
      icon: ThumbUpRounded,
      label: "To be Approved",
      key: "toBeApproved",
      color: "#f5f7fa",
      iconBgColor: "#26c6da",
      count: allCounts?.totalToBeApproved,
      link: getAdminLink("to be approved"),
    },
    {
      icon: ForwardRounded,
      label: "To be Disbursed",
      key: "toBeDisbursed",
      color: "#f5f7fa",
      iconBgColor: "#a5d6a7",
      count: allCounts?.totalToBeDisbursed,
      link: getAdminLink("to be disbursed"),
    },
    {
      icon: AccountBalanceRounded,
      label: "Approved",
      key: "approved",
      color: "#f5f7fa",
      iconBgColor: "#69f0ae",
      count: allCounts?.totalApproved?.count,
      amount: allCounts?.totalApproved?.amount,
      link: getAdminLink("approved"),
    },
    {
      icon: ReportRounded,
      label: "Gross Disbursed",
      key: "grossDisbursed",
      color: "#f5f7fa",
      iconBgColor: "#ff9800",
      count: allCounts?.totalDisbursed?.count,
      amount: allCounts?.totalDisbursed?.grossAmount ?? allCounts?.totalDisbursed?.amount,
      link: getAdminLink("disbursed"),
    },
    {
      icon: AccountBalanceWalletRounded,
      label: "Net Disbursed",
      key: "netDisbursed",
      color: "#f5f7fa",
      iconBgColor: "#00bcd4",
      count: allCounts?.totalDisbursed?.count,
      amount: allCounts?.totalDisbursed?.netAmount ?? allCounts?.totalDisbursed?.amount,
      link: getAdminLink("disbursed"),
    },
    {
      icon: FactCheckRounded,
      label: "ABND",
      key: "abnd",
      color: "#f5f7fa",
      iconBgColor: "#64748b",
      count: allCounts?.totalAbnd?.count,
      amount: allCounts?.totalAbnd?.amount,
      link: getAdminLink("abnd"),
      tooltip: "(Approved But Not Disbursed)",
    },
    {
      icon: SendTimeExtensionIcon,
      label: "Carry Forward",
      key: "caryForward",
      color: "#f5f7fa",
      iconBgColor: "#795548",
      count: allCounts?.totalCarryForward,
      link: getAdminLink("carry forward"),
    },
    {
      icon: CancelRounded,
      label: "Rejected",
      key: "rejected",
      color: "#f5f7fa",
      iconBgColor: "#dd2c00",
      count: allCounts?.totalRejected,
      link: getAdminLink("rejected"),
    },
    {
      icon: DeleteForeverRounded,
      label: "Drop",
      key: "drop",
      color: "#f5f7fa",
      iconBgColor: "#ff6e40",
      count: allCounts?.totalDrop,
      link: getAdminLink("drop"),
    },
    {
      icon: SendRounded,
      label: "AI Leads",
      key: "aiLeads",
      color: "#f5f7fa",
      iconBgColor: "#00e676",
      count: null,
      link: "/ai-leads",
    },

    ...(role === "admin"
      ? [
        {
          icon: SupervisorAccountIcon,
          label: "Total Agents",
          key: "totalAgents",
          color: "#f5f7fa",
          iconBgColor: "#9fa8da",
          count: totalAgents,
          link: "/users",
        },
      ]
      : []),
  ];

  function getFirstDayOfMonth(monthName: string): string {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = monthNames.indexOf(monthName);
    const currentYear = new Date().getFullYear();
    const firstDay = new Date(currentYear, monthIndex, 1);

    return formatLocalDate(firstDay);
  }

  function getLastDayOfMonth(monthName: string): string {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = monthNames.indexOf(monthName);
    const currentYear = new Date().getFullYear();
    const lastDay = new Date(currentYear, monthIndex + 1, 0);

    return formatLocalDate(lastDay);
  }

  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: { xs: "flex-start", sm: "space-between" },
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 2, sm: 2, md: 3 },
            mb: 5,
            p: { xs: 1.5, sm: 2 },
            backgroundColor: "#f5f7fa",
            borderRadius: 2,
            boxShadow: 1,
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: { xs: "flex-start", sm: "flex-start" },
              minWidth: { xs: "100%", sm: 250, md: 300 },
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0d1b54', letterSpacing: '-0.5px' }}>
              {getGreeting()} {displayName}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {formatDateTime(currentDateTime)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "row", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "flex-start",
              gap: { xs: 1.5, sm: 2 },
              width: { xs: "50%", sm: "auto" },
            }}
          >
            <>
              <FormControl
                sx={{ minWidth: { xs: "100%", sm: 180 } }}
                size="small"
              >
                <InputLabel id="month-select-label" sx={{ color: "#5c6bc0" }}>
                  Month
                </InputLabel>
                <Select
                  labelId="month-select-label"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  label="Month"
                  sx={{
                    backgroundColor: "#ffffff",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#c5cae9",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#7986cb",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#3f51b5",
                      borderWidth: 1,
                    },
                    borderRadius: 1,
                  }}
                >
                  <MenuItem value=""></MenuItem>
                  <MenuItem value="All">All Months</MenuItem>
                  <MenuItem value="January">January</MenuItem>
                  <MenuItem value="February">February</MenuItem>
                  <MenuItem value="March">March</MenuItem>
                  <MenuItem value="April">April</MenuItem>
                  <MenuItem value="May">May</MenuItem>
                  <MenuItem value="June">June</MenuItem>
                  <MenuItem value="July">July</MenuItem>
                  <MenuItem value="August">August</MenuItem>
                  <MenuItem value="September">September</MenuItem>
                  <MenuItem value="October">October</MenuItem>
                  <MenuItem value="November">November</MenuItem>
                  <MenuItem value="December">December</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Date"
                type="date"
                value={date || ""}
                onChange={(e) => {
                  console.log("current date change", e.target.value);
                  setDate(e.target.value);

                  // If a date is selected, clear the month filter
                  if (e.target.value && e.target.value !== "") {
                    setSelectedMonth("");
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                  sx: { color: "#5c6bc0" },
                }}
                sx={{
                  minWidth: 150,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#ffffff",
                    borderRadius: 1,
                    "& fieldset": {
                      borderColor: "#c5cae9",
                    },
                    "&:hover fieldset": {
                      borderColor: "#7986cb",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#3f51b5",
                    },
                  },
                }}
                size="small"
              />
            </>
          </Box>
        </Box>

        <Grid
          lg={12.2}
          sm={12.3}
          container
          spacing={3}
          sx={{
            width: "100%",
            display: "flex",
            height: "100vh",
            transform: "translateZ(0)",
            justifyContent: "center",
            overflowX: "auto",
            maxWidth: "100vw",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            mx: "0 auto",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {dashboardItems.map((item, index) => (
            <Grid
              xl={3}
              lg={3}
              md={3}
              sm={6}
              xs={6}
              key={index}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Link
                href={item.link || ""}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  width: "100%",
                  display: "flex",
                }}
              >
                <Budget
                  Icon={item.icon}
                  name={item.label}
                  value={item.count}
                  iconBgColor={item.iconBgColor}
                  amount={item.amount !== null ? item.amount : null}
                  sx={{
                    width: "100%",
                    backgroundColor: item.color,
                    borderRadius: "20px",
                    minHeight: "65px",
                    padding: "6px 8px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    transition: "all 120ms ease-in-out",

                    // Use row layout for the main content
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",

                    ":hover": {
                      transform: "scale(1.01)",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.10)",
                    },

                    // FIRST ROW - Icon + Label + Count in one row
                    "& .first-row": {
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flex: 1,
                    },

                    "& .MuiSvgIcon-root": {
                      fontSize: "1.2rem",
                      opacity: 0.9,
                    },

                    "& .label-text": {
                      fontSize: ".85rem",
                      fontWeight: 600,
                      lineHeight: "1",
                      whiteSpace: "normal",
                      textAlign: "left",
                      flex: 1,
                    },

                    "& .count-text": {
                      fontSize: ".9rem",
                      fontWeight: 700,
                      lineHeight: "1.1",
                      minWidth: "30px",
                      textAlign: "right",
                    },

                    // AMOUNT (second row - below if exists)
                    "& .amount-text": {
                      fontSize: ".6rem",
                      opacity: 0.85,
                      fontWeight: 500,
                      lineHeight: "1",
                      textAlign: "center",
                      width: "100%",
                      marginTop: "2px",
                    },
                  }}
                />
              </Link>
            </Grid>
          ))}
          <Grid
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
            container
            spacing={3}
            lg={12}
            xs={12}
          >
            <Grid lg={7} md={6} xs={12}>
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  backgroundColor: "#fff",
                  borderRadius: "15px",
                  height: "100%",
                }}
              >
                <Sales
                  chartSeries={[
                    {
                      name: "Total Tickets",
                      data: (allCounts?.totalTicketsByMonth || Array(12).fill(0)).map((value) =>
                        Math.round(value || 0)
                      ),
                    },
                    {
                      name: "Disbursed Tickets",
                      data: (allCounts?.doneTicketsByMonth || Array(12).fill(0)).map((value) =>
                        Math.round(value || 0)
                      ),
                    },
                  ]}
                  sx={{ height: "100%" }}
                />
              </Paper>
            </Grid>

            {/* 📌 Traffic Chart */}
            <Grid lg={5} md={6} xs={12}>
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  backgroundColor: "#fff",
                  borderRadius: "15px",
                  height: "100%",
                }}
              >
                <Traffic
                  date={date}
                  setDate={setDate}
                  chartSeries={[
                    allCounts?.totalTickets || 0,
                    allCounts?.totalUnderCreditReview || 0,
                    allCounts?.totalOperations || 0,
                    allCounts?.totalPendencyInFile || 0,
                    allCounts?.totalToBeDisbursed || 0,
                    allCounts?.totalDisbursed?.count || 0,
                    allCounts?.totalAbnd?.count || 0,
                    allCounts?.totalFileSendToBanker || 0,
                    allCounts?.totalToBeApproved || 0,
                    allCounts?.totalApproved?.count || 0,
                    allCounts?.totalCarryForward || 0,
                  ]}
                  labels={[
                    "Total Tickets",
                    "Under Credit Review",
                    "Operations",
                    "Pendency in File",
                    "To be Disbursed",
                    "Disbursed",
                    "ABND",
                    "File Send to Banker",
                    "To be Approved",
                    "Approved",
                    "Carry Forward",
                  ]}
                  sx={{ height: "100%" }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={3} lg={12} xs={12}>
            <Grid lg={4} md={6} xs={12}>
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  backgroundColor: "#f8f9fa",
                  borderRadius: "15px",
                  height: "100%",
                }}
              >
                <LatestApplications sx={{ height: "100%" }} />
              </Paper>
            </Grid>

            {/* 📜 Latest Orders */}
            <Grid lg={8} md={6} xs={12}>
              <Paper
                elevation={3}
                sx={{
                  p: 1,
                  backgroundColor: "#fff",
                  borderRadius: "15px",
                  height: "100%",
                }}
              >
                <LatestOrders sx={{ height: "100%" }} />
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default function Page(): React.JSX.Element {
  const [isMounted, setIsMounted] = useState(false);
  const { decodedToken } = Utility();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <Box sx={{ minHeight: "60vh" }} />;
  }

  const role = decodedToken()?.role;

  if (role === 'sales') {
    return <SalesDashboard />;
  }

  if (role === 'sub admin') {
    return <SubAdminDashboard />;
  }

  return <AdminDashboard />;
}