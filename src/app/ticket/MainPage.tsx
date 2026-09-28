"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  CircularProgress,
  useTheme,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import TableViewIcon from "@mui/icons-material/TableView";
import * as XLSX from "xlsx";

import ApplicationCard from "../components/common/ApplicationCard";
import FilterPanel from "../components/common/FilterPanel";
import Loader from "../components/common/Loader";
import Toast from "../components/common/Toast";
import { useDeleteTicket, useGetTickets } from "@/hooks/ticket";
import { fetcher } from "@/apis/apiClient";
import { Utility } from "@/utils";
import type { Ticket } from "@/types/ticket";
import type { AppDispatch, RootState } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import {
  setTickets,
  resetTickets,
  removeTicket,
} from "@/redux/features/ticketSlice";
import { useDeleteCustomerApplication } from "@/hooks/customerApplication";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import { resetCustomerApplications } from "@/redux/features/customerApplicationSlice";
import { axiosInstance } from "@/apis/config/axiosConfig";

const Ticket = () => {
  const [filter, setFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loanProvider, setLoanProvider] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("all");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [disbursedAmount, setDisbursedAmount] = useState<number>(0);
  const [toggleListView, setToggleListView] = useState("table");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreData, setHasMoreData] = useState<boolean>(true);

  const { ticket } = useSelector((state: RootState) => state.tickets);
  const { toast } = useSelector((state: RootState) => state.toast);
  const { deleteTicket, error, loading } = useDeleteTicket();
  const { deleteCustomerApplication } = useDeleteCustomerApplication();

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTab = useMediaQuery("(min-width:601px) and (max-width:1200px)");
  const ITEMS_PER_PAGE = 12;
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { capitalizeEachWord, debounceScroll, decodedToken, getCookies } = Utility();

  const userRole = decodedToken()?.role;
  const [exportLoading, setExportLoading] = useState(false);
  const cookies = getCookies();
  const userToken = (cookies as any).token;
  const { id } = decodedToken(userToken?.value);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("selectedCompanyId") || ""
      : ""
  );

  const userDesignation = decodedToken(userToken?.value)?.designation?.toLowerCase() || '';
  const isL1OrL2 = ["team leader", "tl", "sales manager", "sm", "l1", "l2"].includes(userDesignation);

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberId") || (!isL1OrL2 && userRole === "sales" ? id?.toString() || "all" : "all") : "all"
  );
  const [selectedTeamMemberName, setSelectedTeamMemberName] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberName") || (!isL1OrL2 && userRole === "sales" ? decodedToken(userToken?.value)?.username || decodedToken(userToken?.value)?.name || "My Details" : "All My Team") : "All My Team"
  );
  const [computedSalesUserId, setComputedSalesUserId] = useState<string | number | null>(id);

  useEffect(() => {
    const computeId = async () => {
      if (userRole !== "sales") {
        setComputedSalesUserId(id);
        return;
      }
      if (selectedTeamMember === "all" || selectedTeamMember === "") {
        // "All Team Members" — fetch all IDs this user can see based on their designation
        try {
          const { designation } = decodedToken(userToken?.value) || {};
          const res = await axiosInstance.get(`/teams/my-team-member-ids/${id}`, {
            params: { designation: designation || '', role: 'sales' }
          });
          if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setComputedSalesUserId(res.data.data.join(','));
          } else {
            setComputedSalesUserId(id);
          }
        } catch (e) {
          setComputedSalesUserId(id);
        }
      } else {
        // Specific team member selected
        setComputedSalesUserId(Number(selectedTeamMember));
      }
    };
    if (id) computeId();
  }, [selectedTeamMember, id, userRole]);

  const apiEndpoint = selectedUser
    ? `get-all-tickets/${selectedUser.id}${sortBy === "disbursed" ? "?onlyDisbursed=true" : ""}${selectedCompany ? `&companyId=${selectedCompany}` : ''}`
    : userRole === "admin" || userRole === "sub admin"
      ? sortBy === "all" && loanProvider === "all"
        ? `get-all-tickets${selectedCompany ? `?companyId=${selectedCompany}` : ''}`
        : `get-all-tickets?status=${sortBy == "forwarded to me" || sortBy == "forwarded by me"
          ? sortBy.replace(/\s+/g, "")
          : sortBy
        }&provider=${loanProvider}${sortBy === "disbursed" ? "&onlyDisbursed=true" : ""}${selectedCompany ? `&companyId=${selectedCompany}` : ''}`
      : userRole === "operations" || userRole === "credit"
        ? sortBy === "all" && loanProvider === "all"
          ? `get-all-tickets/${decodedToken()?.id}${selectedCompany ? `?companyId=${selectedCompany}` : ''}`
          : `get-all-tickets/${decodedToken()?.id}?status=${sortBy == "forwarded to me" || sortBy == "forwarded by me"
            ? sortBy.replace(/\s+/g, "")
            : sortBy
          }&provider=${loanProvider}${sortBy === "disbursed" ? "&onlyDisbursed=true" : ""}${selectedCompany ? `&companyId=${selectedCompany}` : ''}`
        : userRole === "sales"
          ? sortBy === "all" && loanProvider === "all"
            ? `get-all-tickets/${computedSalesUserId}?appliedBy=sales${selectedCompany ? `&companyId=${selectedCompany}` : ''}`
            : `get-all-tickets/${computedSalesUserId}?appliedBy=sales&status=${sortBy == "forwarded to me" || sortBy == "forwarded by me"
              ? sortBy.replace(/\s+/g, "")
              : sortBy
            }&provider=${loanProvider}${sortBy === "disbursed" ? "&onlyDisbursed=true" : ""}${selectedCompany ? `&companyId=${selectedCompany}` : ''}`
          : `get-all-tickets${sortBy === "disbursed" ? "?onlyDisbursed=true" : ""}${selectedCompany ? `${sortBy === "disbursed" ? '&' : '?'}companyId=${selectedCompany}` : ''}`;

  const {
    value: ticketData,
    swrLoading,
    refetcher,
  } = useGetTickets(
    apiEndpoint,
    currentPage,
    ITEMS_PER_PAGE,
    filter,
    startDate,
    endDate,
    selectedCompany
  );

  const [userData, setUserData] = useState([]);
  const pathname = usePathname();


  const handleExportToExcel = async () => {
    try {
      setExportLoading(true); // Start loading

      // Show loading state
      const currentUser = decodedToken();
      const userName = currentUser?.username || "Unknown User";
      const currentUserRole = currentUser?.role || "Unknown Role";

      // Build API endpoint with all current filters
      let exportApiEndpoint = selectedUser
        ? `get-all-tickets/${selectedUser.id}`
        : currentUserRole === "admin" || currentUserRole === "sub admin"
          ? sortBy === "all" && loanProvider === "all"
            ? `get-all-tickets`
            : `get-all-tickets?status=${sortBy === "forwarded to me" || sortBy === "forwarded by me"
              ? sortBy.replace(/\s+/g, "")
              : sortBy
            }&provider=${loanProvider}`
          : currentUserRole === "operations" || currentUserRole === "credit"
            ? sortBy === "all" && loanProvider === "all"
              ? `get-all-tickets/${currentUser?.id}`
              : `get-all-tickets/${currentUser?.id}?status=${sortBy === "forwarded to me" || sortBy === "forwarded by me"
                ? sortBy.replace(/\s+/g, "")
                : sortBy
              }&provider=${loanProvider}`
            : currentUserRole === "sales"
              ? sortBy === "all" && loanProvider === "all"
                ? `get-all-tickets/${computedSalesUserId}?appliedBy=sales`
                : `get-all-tickets/${computedSalesUserId}?appliedBy=sales&status=${sortBy === "forwarded to me" || sortBy === "forwarded by me"
                  ? sortBy.replace(/\s+/g, "")
                  : sortBy
                }&provider=${loanProvider}`
              : `get-all-tickets`;

      // Add query parameters for export (fetch all data)
      const exportParams = new URLSearchParams();

      // Set a high limit to get all records or implement pagination
      exportParams.set("page", "1");
      exportParams.set("limit", "10000"); // Adjust based on your needs

      if (selectedCompany) {
        exportParams.set("companyId", selectedCompany);
      }
      // Add date filters if present
      if (startDate) {
        exportParams.set("startDate", startDate);
      }
      if (endDate) {
        exportParams.set("endDate", endDate);
      }

      // Add search filter if present
      if (filter) {
        exportParams.set("name", filter);
      }

      // Combine endpoint with parameters
      const finalEndpoint = `${exportApiEndpoint}${exportApiEndpoint.includes("?") ? "&" : "?"
        }${exportParams.toString()}`;

      // Fetch all tickets data for export
      const exportData = await fetcher(finalEndpoint);

      if (!exportData?.data?.results?.length) {
        alert("No ticket data available to export!");
        setExportLoading(false);
        return;
      }

      // Calculate report period
      let reportPeriod = "All Time";
      const currentDate = new Date();
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
      const currentMonth = monthNames[currentDate.getMonth()];
      const currentYear = currentDate.getFullYear();

      if (startDate && endDate) {
        reportPeriod = `${new Date(
          startDate
        ).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
      } else if (startDate) {
        reportPeriod = `From ${new Date(
          startDate
        ).toLocaleDateString()} to ${currentDate.toLocaleDateString()}`;
      } else if (endDate) {
        reportPeriod = `All records until ${new Date(
          endDate
        ).toLocaleDateString()}`;
      } else {
        reportPeriod = `All records of ${currentMonth} ${currentYear} until ${currentDate.toLocaleDateString()}`;
      }

      // Format the exported data
      const formattedData = exportData.data.results.map((t, index) => ({
        "Ticket ID": t?.ticketId || "-",
        Name: t?.customerName || "-",
        Email: t?.customerEmail || "-",
        Amount: t?.applicationAmount || "-",
        Provider: t?.applicationProvider || "-",
        "Loan Type": t?.loanType || "-",
        "Lead Type": t?.leadType || "-",
        Tenure: t?.applicationTenure
          ? `${t.applicationTenure} ${t.applicationTenure > 1 ? "Years" : "Year"
          }`
          : "-",
        Status: t?.ticketStatus || "-",
        Location: `${t?.customerLocation || "-"}, ${t?.customerState || "-"}`,
        "Created At": t?.createdAt
          ? new Date(t.createdAt).toLocaleDateString()
          : "-",
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      // Add metadata at the bottom
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      const nextRow = range.e.r + 2;

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [
          [],
          [],
          [],
          ["Report Generated By:", userName],
          ["User Role:", currentUserRole],
          ["Report Period:", reportPeriod],
          [
            "Filters Applied:",
            `Status: ${sortBy} , Provider: ${loanProvider}${filter ? `, Search: ${filter}` : ""
            }`,
          ],
          [
            "Generated On:",
            new Date().toLocaleDateString() +
            " " +
            new Date().toLocaleTimeString(),
          ],
          ["Total Records:", exportData.data.results.length],
        ],
        { origin: `A${nextRow}` }
      );

      // Update worksheet range
      const updatedRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      updatedRange.e.r += 9;
      worksheet["!ref"] = XLSX.utils.encode_range(updatedRange);

      // Create and export workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

      const fileName = `Tickets_${currentUserRole}_${userName.replace(
        /\s+/g,
        "_"
      )}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Use the built-in XLSX method to trigger the download seamlessly
      XLSX.writeFile(workbook, fileName);

      // Stop loading after successful download
      setExportLoading(false);
    } catch (error) {
      console.error("Error exporting tickets:", error);
      alert("Failed to export tickets. Please try again.");
      setExportLoading(false);
    }
  };

  // Function to handle view toggle and save to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = sessionStorage.getItem("ticketViewPreference");
      if (savedView !== null) {
        try {
          const parsedView = JSON.parse(savedView);
          setToggleListView(parsedView);
        } catch (error) {
          console.error("Error parsing saved view preference:", error);
          // Fall back to default
          setToggleListView("list");
        }
      }
    }
  }, []);

  // Company change handler - improved version
  useEffect(() => {
    const handleGlobalCompanyChange = (event: any) => {
      console.log("Ticket received companyChanged event:", event.detail);
      const newCompanyId = event.detail;

      // FIRST: Clear Redux state immediately
      dispatch(resetTickets());

      // SECOND: Reset all local states
      setSelectedCompany(newCompanyId);
      setCurrentPage(1);
      setHasMoreData(true);
      setFilter("");
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setSelectedUser(null);
      setSortBy("all");
      setLoanProvider("all");
      setStartDate(null);
      setEndDate(null);
      setDisbursedAmount(0); // Add this line

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedCompanyId", newCompanyId);
      }

      // Clear URL params
      const params = new URLSearchParams();
      router.push(`${pathname}?${params.toString()}`, { shallow: true });
    };

    const handleTeamMemberChange = (event: any) => {
      // Immediately clear stale data before the async computedSalesUserId resolves
      dispatch(resetTickets());
      setCurrentPage(1);
      setHasMoreData(true);
      setSelectedTeamMember(event.detail);
    };

    const handleTeamMemberNameChange = (event: any) => {
      setSelectedTeamMemberName(event.detail);
    };

    window.addEventListener("companyChanged", handleGlobalCompanyChange);
    window.addEventListener("teamMemberChanged", handleTeamMemberChange);
    window.addEventListener("teamMemberNameChanged", handleTeamMemberNameChange);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId" && e.newValue) {
        handleGlobalCompanyChange({ detail: e.newValue });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("companyChanged", handleGlobalCompanyChange);
      window.removeEventListener("teamMemberChanged", handleTeamMemberChange);
      window.removeEventListener("teamMemberNameChanged", handleTeamMemberNameChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch, router, pathname]);

  // Load view preference from sessionStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = sessionStorage.getItem("ticketViewPreference");
      if (savedView !== null) {
        setToggleListView(JSON.parse(savedView));
      }
    }
  }, []);

  useEffect(() => {
    // Fetch user data only if user is admin
    const fetchUsers = async () => {
      try {
        const { data } = await fetcher(`get-users?page=${1}&limit=${500}`);
        const sortedUsers = data?.results.sort((a, b) => {
          if (a.role < b.role) return -1;
          if (a.role > b.role) return 1;
          return 0;
        });

        setUserData(
          userRole === "admin" || userRole === "sub admin"
            ? sortedUsers
            : sortedUsers?.filter((user) => user.role === userRole)
        );
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [userRole]);

  // Initialize state from URL params
  useEffect(() => {
    const queryStatus = searchParams.get("status");
    const queryProvider = searchParams.get("provider");
    const queryStartDate = searchParams.get("startDate");
    const queryEndDate = searchParams.get("endDate");
    const queryUserId = searchParams.get("userId");
    const queryMonth = searchParams.get("month");

    // Set all filters from URL
    setSortBy(queryStatus || (userRole === "credit" ? "forwarded" : "all"));
    setLoanProvider(queryProvider || "all");

    // If startDate/endDate are in the URL, use them directly.
    // If only month is provided (e.g., from old dashboard links), derive the
    // date range from the month name so the ticket page filter pre-fills correctly.
    if (queryStartDate || queryEndDate) {
      setStartDate(queryStartDate || null);
      setEndDate(queryEndDate || null);
    } else if (queryMonth) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIndex = monthNames.indexOf(queryMonth);
      if (monthIndex !== -1) {
        const year = new Date().getFullYear();
        const pad = (n: number) => String(n).padStart(2, "0");
        const firstDay = `${year}-${pad(monthIndex + 1)}-01`;
        const lastDate = new Date(year, monthIndex + 1, 0);
        const lastDay = `${year}-${pad(monthIndex + 1)}-${pad(lastDate.getDate())}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
      }
    } else {
      setStartDate(null);
      setEndDate(null);
    }

    // Set user (only for admin)
    if (queryUserId && userRole === "admin" && userData) {
      const foundUser = userData?.find(
        (user) => user.id === parseInt(queryUserId)
      );
      setSelectedUser(foundUser || null);
    }
  }, [searchParams, userData, userRole]);

  // Reset ticket state and fetch when sortBy or other filters change
  useEffect(() => {
    setCurrentPage(1);
    dispatch(resetTickets());
  }, [
    sortBy,
    loanProvider,
    filter,
    selectedUser,
    startDate,
    endDate,
    dispatch,
  ]);


  // Fetch and update state with new data
  useEffect(() => {
    if (ticketData.results.length > 0) {
      let filteredResults = ticketData.results;

      // If status is 'disbursed', filter to only show records with disbursedAt
      if (sortBy === "disbursed") {
        filteredResults = ticketData.results.filter(ticket =>
          ticket.disbursedAt && ticket.disbursedAt !== null
        );

        // Set disbursed amount only for actually disbursed records
        if (ticketData.totalDisbursedAmount) {
          setDisbursedAmount(ticketData.totalDisbursedAmount);
        }
      } else {
        setDisbursedAmount(0);
      }

      // Update the dispatch with filtered results
      dispatch(setTickets({
        ...ticketData,
        results: filteredResults,
        currentPage
      }));

      setHasMoreData(ticketData.results.length === ITEMS_PER_PAGE);

      if (filteredResults.length === 0 && ticketData?.errorMessage) {
        console.error("API Error:", ticketData.errorMessage);
      }
    } else {
      setHasMoreData(false);
      setDisbursedAmount(0);
      if (ticketData?.errorMessage) {
        console.error("API Error:", ticketData.errorMessage);
      }
    }
  }, [ticketData.results, sortBy, ticketData]);

  // Reset disbursed amount when status changes away from 'disbursed'
  useEffect(() => {
    if (sortBy !== "disbursed") {
      setDisbursedAmount(0);
    }
  }, [sortBy]);

  // Handle infinite scrolling
  const handleScroll = useCallback(
    debounceScroll(() => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom && !swrLoading && hasMoreData) {
        setCurrentPage((prevPage) => prevPage + 1);
      }
    }, 200),
    [swrLoading, hasMoreData]
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // persist the filters in URL
  const handleFilterChange = useCallback(
    (filterParams: any = {}) => {
      setCurrentPage(1);
      dispatch(resetTickets());

      // Reset disbursed amount if status is changing away from 'disbursed'
      if (filterParams.status && filterParams.status !== "disbursed") {
        setDisbursedAmount(0);
      }

      // Update query parameters in the URL
      const params = new URLSearchParams(searchParams);

      // Handle status parameter - preserve existing if not being updated
      if (filterParams.status !== undefined) {
        if (filterParams.status && filterParams.status !== "all") {
          params.set("status", filterParams.status);
        } else {
          params.delete("status");
        }
      }
      // If status is not being updated, preserve existing value
      else if (sortBy && sortBy !== "all") {
        params.set("status", sortBy);
      }

      // Handle provider parameter - preserve existing if not being updated
      if (filterParams.provider !== undefined) {
        if (filterParams.provider && filterParams.provider !== "all") {
          params.set("provider", filterParams.provider);
        } else {
          params.delete("provider");
        }
      }
      // If provider is not being updated, preserve existing value
      else if (loanProvider && loanProvider !== "all") {
        params.set("provider", loanProvider);
      }

      // Handle startDate parameter - preserve existing if not being updated
      if (filterParams.startDate !== undefined) {
        if (filterParams.startDate) {
          params.set("startDate", filterParams.startDate);
        } else {
          params.delete("startDate");
        }
      }
      // If startDate is not being updated, preserve existing value
      else if (startDate) {
        params.set("startDate", startDate);
      }

      // Handle endDate parameter - preserve existing if not being updated
      if (filterParams.endDate !== undefined) {
        if (filterParams.endDate) {
          params.set("endDate", filterParams.endDate);
        } else {
          params.delete("endDate");
        }
      }
      // If endDate is not being updated, preserve existing value
      else if (endDate) {
        params.set("endDate", endDate);
      }

      // Handle user parameter - preserve existing if not being updated
      if (filterParams.user !== undefined) {
        if (filterParams.user) {
          params.set("userId", filterParams.user.id.toString());
        } else {
          params.delete("userId");
        }
      }
      // If user is not being updated, preserve existing value
      else if (selectedUser) {
        params.set("userId", selectedUser.id.toString());
      }

      // Handle clear all filters case
      if (Object.keys(filterParams).length === 0) {
        params.delete("status");
        params.delete("provider");
        params.delete("startDate");
        params.delete("endDate");
        params.delete("userId");
      }

      router.push(`?${params.toString()}`, { shallow: true });
    },
    [
      searchParams,
      router,
      dispatch,
      sortBy,
      loanProvider,
      startDate,
      endDate,
      selectedUser,
    ]
  );

  const handleProviderChange = (value: string) => {
    const providerValue = value.toLowerCase();
    setLoanProvider(providerValue);
    handleFilterChange({ provider: providerValue });
  };

  const handleSortChange = (value: string) => {
    const sortValue = value.toLowerCase();
    setSortBy(sortValue);

    // Reset disbursed amount immediately if not disbursed status
    if (sortValue !== "disbursed") {
      setDisbursedAmount(0);
    }
    handleFilterChange({ status: sortValue });
  };

  const handleDeleteTicket = async (ticketId: number, reason: string) => {
    const currentUserId = decodedToken()?.id;
    const deleteTicketResp = await deleteTicket(
      "delete-ticket",
      ticketId,
      reason,
      currentUserId
    );
    dispatch(removeTicket(ticketId));
    if (refetcher) {
      await refetcher();
    }
    return deleteTicketResp;
  };
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

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
        padding: { sm: "0 15px", md: "0" },
      }}
    >
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
          {userRole === "sales" && String(selectedTeamMember) !== String(id) && (
            <Box sx={{ ml: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "#3949ab", fontWeight: 700 }}>
                Viewing Data For: {capitalizeEachWord(selectedTeamMemberName)}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: {
                xs: "column-reverse",
                sm: "column-reverse",
                md: "row",
              },
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
              userData={userData}
              userRole={userRole}
              ticketCount={ticketData?.count}
              disbursedAmount={disbursedAmount}
              handleFilterChange={handleFilterChange}
            />
          </Box>
        </Box>

        {/* Right Side Actions Container */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            alignSelf: { xs: "flex-end", xl: "center" },
            flexShrink: 0,
          }}
        >
          {/* Export / Download Button */}
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

          {/* View Toggle Container */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              border: "1px solid #c7d2fe",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              p: 0.5,
              height: "48px",
              boxSizing: "border-box",
            }}
          >
            <Tooltip title="Grid View">
              <IconButton
                onClick={() => {
                  setToggleListView("grid");
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                      "ticketViewPreference",
                      JSON.stringify("grid")
                    );
                  }
                }}
                sx={{
                  color:
                    toggleListView === "grid"
                      ? "primary.main"
                      : "action.disabled",
                  backgroundColor:
                    toggleListView === "grid" ? "action.selected" : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor:
                      toggleListView === "grid"
                        ? "primary.light"
                        : "action.hover",
                  },
                }}
              >
                <GridViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="List View">
              <IconButton
                onClick={() => {
                  setToggleListView("list");
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                      "ticketViewPreference",
                      JSON.stringify("list")
                    );
                  }
                }}
                sx={{
                  color:
                    toggleListView === "list"
                      ? "primary.main"
                      : "action.disabled",
                  backgroundColor:
                    toggleListView === "list" ? "action.selected" : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor:
                      toggleListView === "list"
                        ? "primary.light"
                        : "action.hover",
                  },
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Table View">
              <IconButton
                onClick={() => {
                  setToggleListView("table");
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                      "ticketViewPreference",
                      JSON.stringify("table")
                    );
                  }
                }}
                sx={{
                  color:
                    toggleListView === "table"
                      ? "primary.main"
                      : "action.disabled",
                  backgroundColor:
                    toggleListView === "table"
                      ? "action.selected"
                      : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor:
                      toggleListView === "table"
                        ? "primary.light"
                        : "action.hover",
                  },
                }}
              >
                <TableViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Updated View Toggle Box with Session Storage */}

      <Box
        sx={{
          width: "100%",
          minHeight: "60vh",
          marginTop: "16px",
          display: "flex",
          justifyContent: "center",
          alignItems: "start",
        }}
      >
        <Grid
          container
          spacing={2}
          sx={{
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: isMobile ? "column" : isTab ? "" : "",
            width: "97%",
            marginLeft: "0 !important",
            marginTop: "0 !important",
          }}
        >
          {!ticket?.results?.length ? (
            <Typography
              sx={{
                width: "100%",
                textAlign: "center",
                // mt: "20vh",
                color: "text.secondary",
              }}
            >
              {userRole === "admin" || userRole === "credit" || userRole === "sales" ? (
                "No Tickets Found"
              ) : (
                <Link href="/home">
                  No Tickets Found. Start Picking Some By Clicking Here!
                </Link>
              )}
            </Typography>
          ) : (
            <>
              {toggleListView === "table" ? (
                <Box
                  sx={{
                    width: "100%",
                    borderRadius: 1,
                    boxShadow: 2,
                  }}
                >
                  <TableContainer
                    component={Paper}
                    sx={{
                      borderRadius: 1,
                      overflowX: "auto",
                      width: "100%",
                      maxWidth: "100vw",
                      '&::-webkit-scrollbar': {
                        display: 'none',
                      },
                      msOverflowStyle: 'none',
                      scrollbarWidth: 'none',
                    }}
                  >
                    <Table
                      sx={{
                        tableLayout: "auto",
                        "& .MuiTableCell-root": {
                          padding: { xs: "4px", sm: "6px", md: "8px" },
                        },
                        "& .MuiTableCell-head": {
                          padding: "10px 12px",
                          position: "relative",
                        },
                        "& .MuiTableCell-head:not(:last-child)::after": {
                          content: '""',
                          position: "absolute",
                          right: 0,
                          top: "25%",
                          bottom: "25%",
                          width: "2px",
                          backgroundColor: "rgba(255, 255, 255, 0.5)",
                          boxShadow: "1px 0 4px rgba(0,0,0,0.3)",
                          borderRadius: "2px",
                        }
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ background: "#3f50b5" }}>
                          <TableCell
                            sx={{
                              fontWeight: 600,
                              color: "white",
                              fontSize: {
                                xs: "0.75rem",
                                sm: "0.875rem",
                                md: "1rem",
                              },
                              wordWrap: "break-word",
                              minWidth: { xs: "60px", sm: "30px", md: "10px" },
                            }}
                          >
                            T.ID
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 600,
                              color: "white",
                              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.95rem" },
                              whiteSpace: "nowrap",
                              width: "70px",
                              px: 1,
                            }}
                          >
                            Source
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 600,
                              color: "white",
                              fontSize: "1rem",
                              wordWrap: "break-word",
                            }}
                          >
                            Name
                          </TableCell>
                          {userRole !== "sales" && (
                            <TableCell
                              align="center"
                              sx={{
                                fontWeight: 600,
                                color: "white",
                                fontSize: "1rem",
                                wordWrap: "break-word",
                                whiteSpace: "normal"
                              }}
                            >
                              Email
                            </TableCell>
                          )}
                          {/* {userRole == "sales" && (
                            <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Contact</TableCell>
                          )} */}
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Amount</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Provider</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word', minWidth: "130px", maxWidth: "160px" }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Loan Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Lead Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Tenure</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Location</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Created At</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: 'break-word' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ticket.results.map((ticket, index) => (
                          <ApplicationCard
                            key={ticket.ticketId || ticket.applicationId || index}
                            mainIndex={index + 1}
                            customerApplication={ticket}
                            userRole={userRole}
                            handleStartClick={() =>
                              router.push(`ticket/${ticket.ticketId}`)
                            }
                            handleDeleteTicket={handleDeleteTicket}
                            toggleListView={toggleListView}
                            validateCompanyForCheckbox={undefined}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {ticket.results.map((ticket, index) => (
                    <ApplicationCard
                      key={ticket.ticketId || ticket.applicationId || index}
                      mainIndex={index + 1}
                      customerApplication={ticket}
                      userRole={userRole}
                      handleStartClick={() =>
                        router.push(`ticket/${ticket.ticketId}`)
                      }
                      handleDeleteTicket={handleDeleteTicket}
                      toggleListView={toggleListView}
                      validateCompanyForCheckbox={undefined}
                    />
                  ))}
                </Grid>
              )}

              {!hasMoreData && !swrLoading && (
                <Typography
                  sx={{
                    width: "100%",
                    textAlign: "center",
                    mt: 5,
                    mb: 2,
                    color: "text.secondary",
                  }}
                >
                  No more tickets to load...
                </Typography>
              )}
            </>
          )}
        </Grid>
      </Box>
      {swrLoading && <Loader />}
      <Toast
        alerting={toast.toastAlert}
        message={toast.toastMessage}
        severity={toast.toastSeverity}
      />
    </Box>
  );
};

export default Ticket;
