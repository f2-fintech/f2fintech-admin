"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Grid,
  Button,
  TextField,
  Typography,
  Box,
  useMediaQuery,
  InputAdornment,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Menu,
} from "@mui/material";
import ApplicationCard from "../components/common/ApplicationCard";
import Loader from "../components/common/Loader";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  setCustomerApplications,
  resetCustomerApplications,
} from "@/redux/features/customerApplicationSlice";
import { useGetCustomerApplications } from "@/hooks/customerApplication";
import { Utility } from "@/utils";
import { ClearRounded, SearchRounded, PersonRounded, TrendingUpRounded, CalendarMonthRounded } from "@mui/icons-material";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import TableViewIcon from "@mui/icons-material/TableView";
import { axiosInstance } from "../../apis/config/axiosConfig";
import { fetcher } from "@/apis/apiClient";
import { CompanyAPI } from "@/apis/CompanyAPI";
import Toast from "../components/common/Toast";

const ITEMS_PER_PAGE = 15;

const HomeContent: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [searchTerm, setSearchTerm] = useState<string>(urlSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(urlSearch);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreData, setHasMoreData] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Date range filter — initialised from URL so dashboard card click pre-filters the list
  const [startDate, setStartDate] = useState<string | null>(searchParams.get("startDate") || null);
  const [endDate, setEndDate] = useState<string | null>(searchParams.get("endDate") || null);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    applicationId: null,
    customerName: "",
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toggleListView, setToggleListView] = useState("table");
  const [prevSearchTerm, setPrevSearchTerm] = useState<string>("");

  // Sync state FROM URL (e.g. notification click, browser back/forward)
  useEffect(() => {
    const currentUrlSearch = searchParams.get("search") || "";
    if (currentUrlSearch !== searchTerm) {
      setSearchTerm(currentUrlSearch);
      setDebouncedSearchTerm(currentUrlSearch);
    }
  }, [searchParams]); // Listen for URL changes via searchParams

  // Sync URL FROM debounced search term (e.g. typing, clearing)
  useEffect(() => {
    const currentUrlSearch = searchParams.get("search") || "";
    // Only update URL if it's different from the current debounced term
    if (debouncedSearchTerm !== currentUrlSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearchTerm) {
        params.set("search", debouncedSearchTerm);
      } else {
        params.delete("search");
      }
      const queryString = params.toString();
      const newUrl = `${pathname}${queryString ? `?${queryString}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearchTerm]); // Only trigger when debouncedSearchTerm actually changes

  const { customerApplication } = useSelector(
    (state: RootState) => state.customerApplications
  );
  const { toast } = useSelector((state: RootState) => state.toast);
  const dispatch: AppDispatch = useDispatch();
  const { capitalizeEachWord, debounceScroll, decodedToken, remLocalStorage, toastAndNavigate } = Utility();
  const isMobile = useMediaQuery("(max-width:600px)");
  const isTab = useMediaQuery("(min-width:601px) and (max-width:1200px)");

  // Get user info from token
  const userInfo = decodedToken();
  const salesUserId = userInfo?.role === "sales" ? userInfo?.id : null;
  const userRole = userInfo?.role;
  const userCompanyId = userInfo?.company_id || userInfo?.companyId; // Support both naming conventions
  const userDesignation = userInfo?.designation?.toLowerCase() || '';
  const isL1OrL2 = ["team leader", "tl", "sales manager", "sm", "l1", "l2"].includes(userDesignation);
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "super admin";
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [userData, setUserData] = useState<any>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberId") || (!isL1OrL2 && userRole === "sales" ? salesUserId?.toString() || "all" : "all") : "all"
  );
  const [selectedTeamMemberName, setSelectedTeamMemberName] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("selectedTeamMemberName") || (!isL1OrL2 && userRole === "sales" ? userInfo?.username || userInfo?.name || "My Details" : "All My Team") : "All My Team"
  );
  const [computedSalesUserId, setComputedSalesUserId] = useState<string | number | null>(salesUserId);

  useEffect(() => {
    const computeId = async () => {
      if (userRole !== "sales") {
        setComputedSalesUserId(salesUserId);
        return;
      }
      if (selectedTeamMember === "all" || selectedTeamMember === "") {
        // "All Team Members" — fetch all IDs this user can see based on their designation
        try {
          const userInfoDecoded = decodedToken();
          const designation = userInfoDecoded?.designation || '';
          const res = await axiosInstance.get(`/teams/my-team-member-ids/${salesUserId}`, {
            params: { designation, role: 'sales' }
          });
          if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setComputedSalesUserId(res.data.data.join(','));
          } else {
            setComputedSalesUserId(salesUserId);
          }
        } catch (e) {
          setComputedSalesUserId(salesUserId);
        }
      } else {
        // Specific team member selected
        setComputedSalesUserId(Number(selectedTeamMember));
      }
    };
    if (salesUserId) computeId();
  }, [selectedTeamMember, salesUserId, userRole]);

  const effectiveSalesUserId = selectedUser ? selectedUser.id : computedSalesUserId;


  useEffect(() => {
    // Fetch user data only if user is admin
    const fetchUsers = async () => {
      try {
        const { data } = await fetcher(`get-users?page=${1}&limit=${500}`);
        const sortedUsers = data?.results.sort((a: any, b: any) => {
          if (a.role < b.role) return -1;
          if (a.role > b.role) return 1;
          return 0;
        });

        setUserData(
          userRole === "admin" || userRole === "sub admin"
            ? sortedUsers
            : sortedUsers?.filter((user: any) => user.role === userRole)
        );
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    if (userRole === "admin" || userRole === "sub admin") {
      fetchUsers();
    }
  }, [userRole]);

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>(
    typeof window !== "undefined"
      ? (localStorage.getItem("selectedCompanyId") !== null ? localStorage.getItem("selectedCompanyId")! : "101")
      : "101"
  );

  // Sync with global company selection
  useEffect(() => {
    const handleGlobalCompanyChange = (event: any) => {
      console.log("Dashboard received companyChanged event:", event.detail);
      const newCompanyId = event.detail;
      setSelectedCompany(newCompanyId);

      // Reset application data
      dispatch(resetCustomerApplications());
      setCurrentPage(1);
      setHasMoreData(true);

      // Clear search & date filters when company changes
      if (searchTerm) {
        setSearchTerm("");
        setDebouncedSearchTerm("");
      }
      setStartDate(null);
      setEndDate(null);

      // Increment refresh key to force SWR to refetch
      setRefreshKey(prev => prev + 1);
    };

    const handleTeamMemberChange = (event: any) => {
      setSelectedTeamMember(event.detail);
      dispatch(resetCustomerApplications());
      setCurrentPage(1);
      setHasMoreData(true);
      setRefreshKey(prev => prev + 1);
    };

    const handleTeamMemberNameChange = (event: any) => {
      setSelectedTeamMemberName(event.detail);
    };

    window.addEventListener("companyChanged", handleGlobalCompanyChange);
    window.addEventListener("teamMemberChanged", handleTeamMemberChange);
    window.addEventListener("teamMemberNameChanged", handleTeamMemberNameChange);

    return () => {
      window.removeEventListener("companyChanged", handleGlobalCompanyChange);
      window.removeEventListener("teamMemberChanged", handleTeamMemberChange);
      window.removeEventListener("teamMemberNameChanged", handleTeamMemberNameChange);
    };
  }, [dispatch, searchTerm]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await CompanyAPI.getAll({
        page: 1,
        limit: 1000
      });

      setCompanies(res.data.results || []);
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // useEffect(() => {
  //   dispatch(resetCustomerApplications());
  //   setCurrentPage(1);
  //   setHasMoreData(true);
  // }, [selectedCompany]);

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
      setIsSearching(false);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const {
    value: data,
    swrLoading,
    error,
    refetch,
  } = useGetCustomerApplications(
    "get-customer-loan-applications",
    currentPage,
    ITEMS_PER_PAGE,
    effectiveSalesUserId,
    debouncedSearchTerm,
    startDate,     // formattedStartDate
    endDate,       // formattedEndDate
    refreshKey,
    undefined,     // source
    selectedCompany
  );

  // A fingerprint that changes whenever SWR actually returns a *different* dataset,
  // even if the number of items happens to be the same (e.g. date-filtered vs unfiltered).
  const dataFingerprint = `${selectedCompany}|${refreshKey}|${data?.count ?? ''}|${data?.results?.[0]?.applicationId ?? ''}|${data?.results?.length ?? ''}`;

  // Fetch and update state with new data
  useEffect(() => {
    if (!data || !data.results) return;

    // Check if search term changed (new search)
    const isNewSearch = debouncedSearchTerm !== prevSearchTerm;

    if (isNewSearch) {
      // Reset data for new search
      dispatch(resetCustomerApplications());
      setPrevSearchTerm(debouncedSearchTerm);
    }

    if (data.results.length > 0) {
      dispatch(setCustomerApplications({ ...data, currentPage }));
      setHasMoreData(data.results.length === ITEMS_PER_PAGE);
    } else {
      if (currentPage === 1 || isNewSearch) {
        dispatch(resetCustomerApplications());
      }
      setHasMoreData(false);
    }
    // dataFingerprint detects genuine dataset changes even when length is identical;
    // startDate/endDate deliberately excluded — they change before SWR has new data.
  }, [dataFingerprint, currentPage, debouncedSearchTerm]);


  // Handle infinite scrolling
  const handleScroll = useCallback(
    debounceScroll(() => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom && !swrLoading && hasMoreData && !debouncedSearchTerm) {
        setCurrentPage((prevPage) => prevPage + 1);
      }
    }, 500),
    [swrLoading, hasMoreData, debouncedSearchTerm]
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      dispatch(resetCustomerApplications()) as unknown as void;
    };
  }, [dispatch]);

  // Filter applications by company ID - Only show applications with same company_id as logged-in user
  const filteredCustomers = useMemo(() => {
    let applications = customerApplication?.results || [];

    // Filter by company for non-admins (company 101 sees all companies' applications)
    if (userRole !== "admin" && userRole !== "super admin") {
      const is101Company = Number(userCompanyId) === 101 || Number(selectedCompany) === 101;
      if (!is101Company) {
        applications = applications.filter(application =>
          ((application as any).company_id === userCompanyId) ||
          (application.companyId === userCompanyId)
        );
      }
    }

    return applications;
  }, [customerApplication, userRole, userCompanyId, selectedCompany]);

  // Update the count display to show total count from backend
  const displayCount = useMemo(() => {
    return customerApplication?.count || 0;
  }, [customerApplication?.count]);

  // Add this new validation function after validateCompanySelection
  /**
   * Validates company selection for checkbox action
   * @returns {boolean} - Returns true if validation passes, false otherwise
   */
  const validateCompanyForCheckbox = (): boolean => {
    if (typeof window === "undefined") return false;
    const selectedCompanyId = localStorage.getItem("selectedCompanyId");

    // Company 101 or admin/super admin users are permitted to process applications across all companies
    const is101 = Number(userCompanyId) === 101 || Number(selectedCompany) === 101 || Number(selectedCompanyId) === 101;
    if (is101 || userRole === "admin" || userRole === "super admin") {
      return true;
    }

    if (!selectedCompanyId || selectedCompanyId === "") {
      toastAndNavigate(
        dispatch,
        true,
        "error",
        "Please select an Aggregator from the dropdown before proceeding →"
      );
      return false;
    }
    return true;
  };

  // Modify the validateCompanySelection function to include role check
  /**
   * Validates if a company/aggregator is selected before allowing navigation
   * @returns {boolean} - Returns true if company is selected, false otherwise
   */
  const validateCompanySelection = (): boolean => {
    // Check if we're in browser environment
    if (typeof window === "undefined") return false;
    let selectedCompanyId = localStorage.getItem("selectedCompanyId");

    // Company 101 or admin/super admin users are permitted to process applications across all companies
    const is101 = Number(userCompanyId) === 101 || Number(selectedCompany) === 101 || Number(selectedCompanyId) === 101;
    if (is101 || userRole === "admin" || userRole === "super admin") {
      return true;
    }

    // If no company is selected in local storage but they haven't explicitly set "All Aggregators" ("")
    // then we default to 101 (Financial Freedom).
    if (selectedCompanyId === null) {
      selectedCompanyId = "101";
      localStorage.setItem("selectedCompanyId", "101");
    }

    // Only show validation error for non-admin and non-sub-admin users
    if (userRole !== "admin" && userRole !== "sub admin") {
      if (!selectedCompanyId || selectedCompanyId === "") {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          "Please select an Aggregator from the dropdown before proceeding →"
        );
        return false;
      }
    }

    return true;
  };

  // Delete application function using axios
  const handleDeleteApplication = async (
    applicationId: string,
    customerName: string,
    reason: string
  ) => {
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/delete-loan-application/${applicationId}`);

      setDeleteDialog({ open: false, applicationId: null, customerName: "" });
      window.location.reload();
    } catch (error) {
      console.error("Error deleting application:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, applicationId: null, customerName: "" });
    }
  };

  const openDeleteDialog = (applicationId: string, customerName: string) => {
    if (!isAdmin && !isSuperAdmin) {
      console.warn("Only admin users can delete applications");
      return;
    }

    setDeleteDialog({
      open: true,
      applicationId,
      customerName,
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", xl: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", xl: "center" },
          gap: 3,
          width: "100%",
          mb: 2,
        }}
      >
        {/* Left side: Title and Filters */}
        <Box sx={{ flexGrow: 1, display: "flex", minWidth: 0, flexDirection: "column", gap: 1 }}>
          {userRole === "sales" && String(selectedTeamMember) !== String(salesUserId) && (
            <Box sx={{ ml: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "#3949ab", fontWeight: 700 }}>
                Viewing Data For: {capitalizeEachWord(selectedTeamMemberName)}
              </Typography>
            </Box>
          )}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              p: 1.5,
              flexDirection: { xs: "column", sm: "column", md: "row" },
              gap: 2.5,
              width: "100%",
              boxSizing: "border-box"
            }}
          >
            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.3rem", md: "1.5rem" },
                  whiteSpace: "nowrap",
                  color: "#1a2340",
                }}
              >
                Fresh Applications: {displayCount}
              </Typography>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'block' }, width: "1px", height: "32px", bgcolor: "#e2e8f0" }} />

            {/* Search and Filters Row */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: "wrap",
                flex: 1,
                flexDirection: { xs: "column", sm: "column", md: "row" },
                "& > *": {
                  width: { xs: "100%", sm: "100%", md: "auto" },
                },
              }}
            >
              {/* Search Panel */}
              <TextField
                size="small"
                placeholder="Search by name, number or PAN"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  flex: 1,
                  minWidth: { xs: "100%", sm: 250, md: 300 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#f8fafc",
                    transition: "all 0.2s ease",
                    "& fieldset": { border: "1px solid #e2e8f0" },
                    "&:hover fieldset": { borderColor: "#cbd5e1" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#3f50b5",
                      borderWidth: "1px"
                    },
                    "&.Mui-focused": {
                      backgroundColor: "#fff",
                      boxShadow: "0 0 0 3px rgba(63,80,181,0.1)",
                    }
                  },
                  "& .MuiOutlinedInput-input": {
                    py: 1,
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "#334155"
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ fontSize: 20, color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm("")}>
                        <ClearRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Vertical Divider if User Filter is visible */}
              {(userRole === "admin" || userRole === "sub admin") && (
                <Box sx={{ width: "1px", height: "24px", bgcolor: "#e2e8f0", ml: 0.5, mr: 0.5 }} />
              )}

              {/* User Filter (Admin only) */}
              {(userRole === "admin" || userRole === "sub admin") && (
                <Box>
                  <Tooltip title="Filter by user">
                    <Chip
                      icon={<PersonRounded sx={{ fontSize: 18 }} />}
                      label={
                        selectedUser
                          ? (selectedUser.username || selectedUser.name || "Unknown")
                          : "Select User"
                      }
                      onClick={(e) => setUserAnchorEl(e.currentTarget)}
                      sx={{
                        backgroundColor: selectedUser ? "#388e3c15" : "transparent",
                        color: selectedUser ? "#388e3c" : "#475569",
                        border: selectedUser ? "1px solid #388e3c30" : "1px solid transparent",
                        borderRadius: "12px",
                        height: "36px",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        px: 0.5,
                        "&:hover": { backgroundColor: selectedUser ? "#388e3c25" : "#f1f5f9" },
                        "& .MuiChip-icon": { color: "inherit", ml: 1 },
                        transition: "all 0.2s ease"
                      }}
                    />
                  </Tooltip>
                  <Menu
                    anchorEl={userAnchorEl}
                    open={Boolean(userAnchorEl)}
                    onClose={() => setUserAnchorEl(null)}
                    PaperProps={{
                      sx: {
                        mt: 1,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        borderRadius: 2,
                        maxHeight: 300,
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setSelectedUser(null);
                        setUserAnchorEl(null);
                      }}
                      sx={{
                        mx: 1,
                        my: 0.5,
                        borderRadius: "12px",
                        minWidth: 280,
                        fontWeight: 600,
                        color: "#d32f2f"
                      }}
                    >
                      Clear Selection
                    </MenuItem>
                    {(() => {
                      const users = userData?.results || userData?.data || userData || [];
                      // Only show sales users as requested
                      const salesUsers = users.filter((u: any) => u.role?.toLowerCase() === "sales");

                      if (!Array.isArray(salesUsers) || salesUsers.length === 0) {
                        return (
                          <MenuItem disabled sx={{ minWidth: 200 }}>
                            No sales users available
                          </MenuItem>
                        );
                      }

                      return salesUsers.map((user: any) => (
                        <MenuItem
                          key={user.id || user.username}
                          onClick={() => {
                            setSelectedUser(user);
                            setUserAnchorEl(null);
                          }}
                          sx={{
                            mx: 1,
                            my: 0.5,
                            borderRadius: "12px",
                            border: "1px solid #388e3c40",
                            bgcolor: "#388e3c15",
                            "&:hover": {
                              bgcolor: "#388e3c25",
                            },
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            minWidth: 280,
                            p: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                              sx={{
                                bgcolor: "#fff",
                                borderRadius: "50%",
                                p: 0.5,
                                display: "flex",
                                color: "#388e3c",
                              }}
                            >
                              <TrendingUpRounded sx={{ fontSize: 18 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 500, color: "#334155" }}>
                              {user.username || user.name || "Unknown User"}
                            </Typography>
                          </Box>
                          <Chip
                            label="Sales"
                            size="small"
                            sx={{
                              bgcolor: "#fff",
                              color: "#388e3c",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              height: 22,
                              textTransform: "capitalize",
                              border: "1px solid #388e3c20"
                            }}
                          />
                        </MenuItem>
                      ));
                    })()}
                  </Menu>
                </Box>
              )}

              {/* Active Date Range Chip — shown when navigated from dashboard with a date/month filter */}
              {(startDate || endDate) && (
                <>
                  <Box sx={{ width: "1px", height: "24px", bgcolor: "#e2e8f0", ml: 0.5, mr: 0.5 }} />
                  <Tooltip title="Active date filter — click × to clear">
                    <Chip
                      icon={<CalendarMonthRounded sx={{ fontSize: 18 }} />}
                      label={(() => {
                        if (startDate && endDate) {
                          const s = new Date(startDate);
                          const e = new Date(endDate);
                          if (s.toDateString() === e.toDateString()) {
                            return s.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                          }
                          if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
                            return s.toLocaleString("default", { month: "long", year: "numeric" });
                          }
                          return `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
                        }
                        return startDate || endDate || "";
                      })()}
                      onDelete={() => {
                        setStartDate(null);
                        setEndDate(null);
                        setCurrentPage(1);
                        // Restore scrolling — don't reset the store here; the
                        // data useEffect will replace it when new SWR data arrives.
                        setHasMoreData(true);

                        // Clear URL parameters so a refresh doesn't bring the dates back
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("startDate");
                        params.delete("endDate");
                        params.delete("month");
                        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                      }}
                      sx={{
                        backgroundColor: "#e0e7ff",
                        color: "#3730a3",
                        border: "1px solid #c7d2fe",
                        borderRadius: "12px",
                        height: "36px",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        px: 0.5,
                        "& .MuiChip-deleteIcon": { color: "#4f46e5", "&:hover": { color: "#312e81" } },
                        "& .MuiChip-icon": { color: "inherit", ml: 1 },
                        transition: "all 0.2s ease"
                      }}
                    />
                  </Tooltip>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Right Side Actions Container */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", flexShrink: 0, justifyContent: { xs: "flex-start", xl: "flex-end" } }}>
          <Link href="/ticket" passHref>
            <Button
              variant="contained"
              onClick={(e) => {
                if (!validateCompanySelection()) {
                  e.preventDefault();
                }
              }}
              sx={{
                height: "48px",
                borderRadius: "16px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                bgcolor: "#3f50b5",
                boxShadow: "0 4px 14px rgba(63,80,181,0.2)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "#303f9f",
                  boxShadow: "0 6px 20px rgba(63,80,181,0.3)",
                  transform: "translateY(-1px)",
                }
              }}
            >
              {userRole === "admin" || userRole === "sales" || userRole === "sub admin"
                ? "Show Tickets"
                : "Show My Tickets"}
            </Button>
          </Link>

          {userRole === "sales" && String(selectedTeamMember) === String(salesUserId) && (
            <Link href="/home/create" passHref>
              <Button
                variant="outlined"
                onClick={(e) => {
                  if (!validateCompanySelection()) {
                    e.preventDefault();
                  } else {
                    remLocalStorage("customerInfo");
                  }
                }}
                sx={{
                  height: "48px",
                  borderRadius: "16px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  borderColor: "#c7d2fe",
                  color: "#3f50b5",
                  bgcolor: "#fff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#818cf8",
                    bgcolor: "#eef2ff",
                    transform: "translateY(-1px)",
                  }
                }}
              >
                Create Application
              </Button>
            </Link>
          )}

          {/* View Toggles Container */}
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
                onClick={() => setToggleListView("grid")}
                sx={{
                  color: toggleListView === "grid" ? "primary.main" : "action.disabled",
                  backgroundColor: toggleListView === "grid" ? "action.selected" : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: toggleListView === "grid" ? "primary.light" : "action.hover",
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
                  color: toggleListView === "list" ? "primary.main" : "action.disabled",
                  backgroundColor: toggleListView === "list" ? "action.selected" : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: toggleListView === "list" ? "primary.light" : "action.hover",
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
                  color: toggleListView === "table" ? "primary.main" : "action.disabled",
                  backgroundColor: toggleListView === "table" ? "action.selected" : "transparent",
                  borderRadius: "8px",
                  p: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: toggleListView === "table" ? "primary.light" : "action.hover",
                  },
                }}
              >
                <TableViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

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
        <Box sx={{ width: "97%" }}>
          {error && (
            <Typography color="error" sx={{ textAlign: "center", mt: 2 }}>
              Error loading applications: {error.message}
            </Typography>
          )}

          {isSearching ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "10vh",
              }}
            >
              <Typography>Searching...</Typography>
            </Box>
          ) : !filteredCustomers?.length ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "90vh",
              }}
            >
              <Typography
                sx={{
                  color: "black",
                  display: "flex",
                  mb: "20vh",
                }}
              >
                {searchTerm
                  ? "No applications match your search criteria"
                  : "No Applications Found..."}
              </Typography>
            </Box>
          ) : (
            <>
              {toggleListView === "table" ? (
                <TableContainer
                  component={Paper}
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    overflowX: "auto",
                    width: "100%",
                    maxWidth: {
                      xs: "90vw",
                      md: "100vw",
                      sm: "90vw",
                      lg: "100vw",
                    },
                  }}
                >
                  <Table
                    sx={{
                      tableLayout: "auto",
                      minWidth: { xs: 650, sm: 750, md: 900 },
                      "& .MuiTableCell-root": {
                        padding: { xs: "4px", sm: "6px", md: "8px" },
                        fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                        wordWrap: "break-word",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: { xs: "80px", sm: "120px", md: "150px" },
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
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow sx={{ background: "#3f50b5" }}>
                        {/* S.no */}
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            color: "white",
                            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                            wordWrap: "break-word",
                            minWidth: { xs: "60px", sm: "30px", md: "10px" },
                          }}
                        >
                          S.no
                        </TableCell>

                        {/* Channel */}
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 600,
                            color: "white",
                            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "0.95rem" },
                            whiteSpace: "nowrap",
                            minWidth: "110px",
                            px: 1,
                          }}
                        >
                          Channel
                        </TableCell>

                        {/* Source */}
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

                        {/* Name */}
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

                        {/* Email */}
                        {userRole !== "sales" && (
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 600,
                              color: "white",
                              fontSize: "1rem",
                              wordWrap: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            Email
                          </TableCell>
                        )}

                        {/* Amount */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word" }}>Amount</TableCell>

                        {/* Provider */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word" }}>Provider</TableCell>

                        {/* Loan Type */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word", whiteSpace: "normal" }}>Loan Type</TableCell>

                        {/* Lead Type */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word", whiteSpace: "normal" }}>Lead Type</TableCell>

                        {/* Tenure */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word" }}>Tenure</TableCell>

                        {/* Location */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word" }}>Location</TableCell>

                        {/* Created At (was "Application Date") */}
                        <TableCell sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word", whiteSpace: "normal" }}>Created At</TableCell>

                        {/* Actions */}
                        {userRole !== "sales" && (
                          <TableCell align="center" sx={{ fontWeight: 600, color: "white", fontSize: "1rem", wordWrap: "break-word" }}>
                            Actions
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCustomers.map((customerApplication, index) => (
                        <ApplicationCard
                          key={customerApplication.applicationId}
                          customerApplication={customerApplication}
                          mainIndex={index + 1}
                          refetch={refetch}
                          showDeleteButton={isAdmin || isSuperAdmin}
                          onDelete={openDeleteDialog}
                          isApplication={true}
                          handleDeleteApplication={handleDeleteApplication}
                          toggleListView={toggleListView}
                          userRole={userRole}
                          validateCompanyForCheckbox={validateCompanyForCheckbox}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : toggleListView === "list" ? (
                // List View
                <Paper
                  elevation={0}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                    width: "100%",
                  }}
                >
                  <Grid container spacing={0}>
                    {filteredCustomers.map((customerApplication, index) => (
                      <ApplicationCard
                        key={customerApplication.applicationId}
                        customerApplication={customerApplication}
                        mainIndex={index + 1}
                        refetch={refetch}
                        showDeleteButton={isAdmin || isSuperAdmin}
                        onDelete={openDeleteDialog}
                        isApplication={true}
                        handleDeleteApplication={handleDeleteApplication}
                        toggleListView={toggleListView}
                        userRole={userRole}
                        validateCompanyForCheckbox={validateCompanyForCheckbox}
                      />
                    ))}
                  </Grid>
                </Paper>
              ) : (
                // Grid View
                <Grid container spacing={2} sx={{ width: "100%", mt: 1 }}>
                  {filteredCustomers.map((customerApplication, index) => (
                    <ApplicationCard
                      key={customerApplication.applicationId}
                      customerApplication={customerApplication}
                      mainIndex={index + 1}
                      refetch={refetch}
                      showDeleteButton={isAdmin || isSuperAdmin}
                      onDelete={openDeleteDialog}
                      isApplication={true}
                      handleDeleteApplication={handleDeleteApplication}
                      toggleListView={toggleListView}
                      userRole={userRole}
                      validateCompanyForCheckbox={validateCompanyForCheckbox}
                    />
                  ))}
                </Grid>
              )}

              {!hasMoreData && !swrLoading && (
                <Typography
                  sx={{
                    width: "100%",
                    textAlign: "center",
                    mt: 4,
                    color: "black",
                  }}
                >
                  No more applications to load...
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>
      {(swrLoading || isDeleting) && <Loader />}
      <Toast
        alerting={toast.toastAlert}
        message={toast.toastMessage}
        severity={toast.toastSeverity}
      />
    </Box>
  );
};

const Home = () => {
  return (
    <Suspense fallback={<Loader />}>
      <HomeContent />
    </Suspense>
  );
};

export default Home;