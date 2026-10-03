"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/apis/apiClient";
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
} from "@mui/material";
import { ArrowClockwise as RefreshIcon, FileText as DocumentIcon } from "@phosphor-icons/react";
import Loader from "../components/common/Loader";

const SecuredLoansPage = () => {
  const { data, error, isLoading } = useSWR<any>("admin/secured-loans", fetcher);
  const loans = data?.data || [];
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  const handleRefreshStatus = async (id: number) => {
    setRefreshingId(id);
    try {
      const response = await axiosInstance.get(`/admin/secured-loans/${id}/status`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": localStorage.getItem("oms_cookie") || ""
        }
      });
      if (response.data.status === "Success") {
        alert("Status refreshed successfully!");
        mutate("admin/secured-loans");
      } else {
        alert("Failed to refresh status.");
      }
    } catch (err) {
      alert("An error occurred while refreshing status.");
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, margin: "0 auto", minHeight: "100vh" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
          Secured Loans
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Managing and tracking secured loan applications.
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <Loader />
        </Box>
      ) : loans.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Typography variant="h6" color="text.secondary">
            No secured loans found
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#3949ab", "& th": { color: "white", fontWeight: 600 } }}>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Lead Status</TableCell>
                <TableCell>Doc Status</TableCell>
                <TableCell>Sammaan Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.map((loan: any) => (
                <TableRow key={loan.id} hover>
                  <TableCell>{loan.id}</TableCell>
                  <TableCell>{loan.firstName} {loan.lastName}</TableCell>
                  <TableCell>{loan.mobileNo}</TableCell>
                  <TableCell>{loan.emailId}</TableCell>
                  <TableCell>₹{loan.expectedLoanAmount}</TableCell>
                  <TableCell>
                    {loan.externalLeadId ? (
                      <Chip label={`SF: ${loan.externalLeadId}`} color="primary" size="small" variant="outlined" />
                    ) : (
                      <Chip label={loan.status} color={loan.status === "Failed" ? "error" : "warning"} size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {loan.documentUploaded ? (
                      <Tooltip title={`Doc ID: ${loan.documentId}`}>
                        <Chip icon={<DocumentIcon />} label="Uploaded" color="success" size="small" />
                      </Tooltip>
                    ) : (
                      <Chip label="Missing" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {loan.currentStatus ? (
                      <Chip label={loan.currentStatus} color="info" size="small" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Not Checked</Typography>
                    )}
                  </TableCell>
                  <TableCell>{new Date(loan.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Refresh Status from Sammaan">
                      <span>
                        <IconButton
                          color="primary"
                          onClick={() => handleRefreshStatus(loan.id)}
                          disabled={!loan.externalLeadId || refreshingId === loan.id}
                        >
                          {refreshingId === loan.id ? <CircularProgress size={20} /> : <RefreshIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default SecuredLoansPage;
