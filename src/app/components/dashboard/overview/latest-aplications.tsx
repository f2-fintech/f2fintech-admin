"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SxProps } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import dayjs from "dayjs";

import Loader from "../../common/Loader";
import { useGetCustomerApplications } from "@/hooks/customerApplication";
import { CustomerApplicationData } from "@/types/customerApplication";

import {
  Button,
  CardActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import { ArrowRightIcon } from "@mui/x-date-pickers";

export interface Application {
  id: string;
  name: string;
  updatedAt: Date;
}

export interface LatestApplicationsProps {
  applications?: Application[];
  sx?: SxProps;
}

export function LatestApplications({
  sx,
}: LatestApplicationsProps): React.JSX.Element {
  const [paginationLoading, setPaginationLoading] = useState<boolean>(false);
  const [applications, setApplications] = useState<
    CustomerApplicationData | []
  >([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [apiEndpoint, setApiEndpoint] = useState<string>("get-customer-loan-applications");
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:600px)");
  const isTab = useMediaQuery("(min-width:601px) and (max-width:1200px)");

  // Initialize company from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCompanyId = localStorage.getItem("selectedCompanyId");
      if (savedCompanyId) {
        setSelectedCompany(savedCompanyId);
        setApiEndpoint(`get-customer-loan-applications?companyId=${savedCompanyId}`);
      }
    }
  }, []);

  // Listen for company change events
  useEffect(() => {
    const handleCompanyChange = (event: any) => {
      console.log("LatestApplications received companyChanged event:", event.detail);
      const newCompanyId = event.detail;
      setSelectedCompany(newCompanyId);

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedCompanyId", newCompanyId);
      }

      // Update endpoint with company parameter
      const newEndpoint = `get-customer-loan-applications?companyId=${newCompanyId}`;
      setApiEndpoint(newEndpoint);

      // Reset applications to trigger re-fetch
      setApplications([]);
    };

    window.addEventListener("companyChanged", handleCompanyChange);

    // Also listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        const newCompanyId = e.newValue || "";
        setSelectedCompany(newCompanyId);
        setApiEndpoint(`get-customer-loan-applications?companyId=${newCompanyId}`);
        setApplications([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("companyChanged", handleCompanyChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Use the dynamic endpoint
  const {
    value: data,
    error: getApplicationsError,
    swrLoading,
  } = useGetCustomerApplications(apiEndpoint, 1, 6);

  // Handle API response
  useEffect(() => {
    if (data?.results && data.results.length > 0) {
      setApplications(data.results);
    } else {
      setApplications((prev: any) => (prev && prev.length > 0 ? [] : prev));
    }
  }, [data?.results, getApplicationsError]);

  const handleViewAllClick = () => {
    router.push("/");
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: { xs: "100%", sm: "100%", md: "100%" },
        maxHeight: { xs: "85vh", sm: "100vh", md: "130vh" },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        mx: "auto",
        ...sx,
      }}
    >
      {/* Header with company indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: { md: 3 },
          height: { xs: "8vh", sm: "5vh", md: "9vh" },
          mt: { sm: "1vh", md: "4vh" },
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            ml: "1vw",
            fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.5rem" },
          }}
        >
          New Applications
        </Typography>
      </Box>

      <Divider />

      {/* Table Container */}
      <Box
        sx={{
          height: { xs: "60vh", sm: "34.5vh", md: "103vh" },
          width: "100%",
          overflow: "auto",
        }}
      >
        <TableContainer sx={{ width: "100%" }}>
          <Table
            sx={{
              minHeight: "auto",
              maxHeight:
                applications?.length <= 1
                  ? "fit-content"
                  : {
                    xs: "60vh",
                    sm: "34.5vh",
                    md: "103vh",
                  },
              width: "100%",
            }}
          >
            {/* Table Header */}
            <TableHead
              sx={{
                height: { xs: "8vh", sm: "5vh", md: "12vh" },
                position: "sticky",
                top: 0,
                bgcolor: "background.paper",
                zIndex: 1,
              }}
            >
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600 }}>Sr.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Name
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Application Date</TableCell>
              </TableRow>
            </TableHead>

            {/* Table Body */}
            <TableBody>
              {!applications?.length || swrLoading || paginationLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ height: { xs: "50vh", sm: "30vh", md: "90vh" } }}
                  >
                    {swrLoading || paginationLoading ? (
                      <Loader />
                    ) : (
                      "No applications found"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                applications.map(
                  (application: CustomerApplicationData, index: number) => (
                    <TableRow
                      key={application.applicationId}
                      sx={{
                        height: { xs: "10vh", sm: "7vh", md: "15vh" },
                        "&:hover": { bgcolor: "primary.50" },
                        transition: "background-color 0.2s",
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            justifyContent: { xs: "flex-start", sm: "center" },
                          }}
                        >
                          <Person
                            sx={{
                              color: "primary.main",
                              fontSize: { xs: "1rem", sm: "1.2rem" },
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: {
                                xs: "0.8rem",
                                sm: "0.9rem",
                                md: "1rem",
                              },
                            }}
                          >
                            {application.customerName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: { xs: "flex-start", sm: "center" },
                            gap: 1,
                          }}
                        >
                          <CurrencyRupeeIcon
                            sx={{
                              color: "primary.main",
                              fontSize: { xs: "1rem", sm: "1.2rem" },
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: {
                                xs: "0.8rem",
                                sm: "0.9rem",
                                md: "1rem",
                              },
                            }}
                          >
                            {application.applicationAmount}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                        }}
                      >
                        {dayjs(application.applicationDate).format(
                          "MMM D, YYYY"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          height: { xs: "8vh", sm: "5vh", md: "9vh" },
          mb: { xs: "1vh", sm: 0 },
          mt: "auto",
        }}
      >
        <CardActions sx={{ justifyContent: "flex-end", p: { xs: 1, sm: 2 } }}>
          <Button
            color="inherit"
            endIcon={<ArrowRightIcon />}
            size="small"
            variant="text"
            onClick={handleViewAllClick}
            sx={{
              width: { xs: "120px", sm: "15vw", md: "8vw" },
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              mr: ".6vw",
              bgcolor: "#0c66e4",
              color: "white",
              "&:hover": {
                bgcolor: "#0c66e4",
                color: "white",
              },
              whiteSpace: "nowrap",
              mt: {
                xs: 3,
                md: 0,
                sm: -1,
                lg: 0,
              },
            }}
          >
            View all
          </Button>
        </CardActions>
      </Box>
    </Paper>
  );
}