import {
  Avatar,
  Box,
  Button,
  Grid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ArrowBackRounded, EditRounded, CloseRounded } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Utility } from "@/utils";
import { axiosInstance } from "@/apis/config/axiosConfig";
import Toast from "../../components/common/Toast";
import { AppDispatch, RootState } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useCreateTicketHistory } from "@/hooks/tickethistory";
import { useGetLoanProviders } from "@/hooks/loanProvider";
import dayjs from "dayjs";
import React from "react";
import DropdownComponent from "../../components/common/DropdownComponent";

const editFieldStyles = {
  mb: 2,
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
        px: 0.8,
        py: 0.2,
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
          fontSize: "0.68rem",
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

const TicketDetail = ({ ticketDetailData, isTab }) => {
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useSelector((state: RootState) => state.toast);
  const {
    capitalizeEachWord,
    formatTenure,
    formatDate,
    formatAmount,
    decodedToken,
    toastAndNavigate,
  } = Utility();

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editedTicketData, setEditedTicketData] = useState(ticketDetailData);
  const [fetchedAppliedByName, setFetchedAppliedByName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editedTicketData?.appliedByName && editedTicketData.appliedByName !== "N/A") {
      setFetchedAppliedByName(editedTicketData.appliedByName);
      return;
    }
    const appliedById = editedTicketData?.appliedBy || editedTicketData?.applied_by;
    if (!appliedById) return;
    axiosInstance
      .get(`get-user-name/${appliedById}`)
      .then((res) => {
        const username = res.data?.data?.username;
        if (username) setFetchedAppliedByName(username);
      })
      .catch(() => { });
  }, [editedTicketData?.appliedByName, editedTicketData?.appliedBy, editedTicketData?.applied_by]);

  const { createTicketHistory } = useCreateTicketHistory(
    "create-ticket-history"
  );
  const muiTheme = useTheme();
  const userRole = decodedToken()?.role;
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const isIpad = useMediaQuery(muiTheme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));

  // Fetch loan providers
  const { value: providersData, swrLoading: providersLoading } =
    useGetLoanProviders(null, "get-all-loan-providers", 1, 100);

  const PROVIDER_OPTIONS = providersLoading
    ? []
    : providersData?.data?.results?.map(provider => provider.title) || [];

  const isOverdue = React.useMemo(() => {
    if (!ticketDetailData?.due_date || ticketDetailData?.approved_at) return false;
    return dayjs().isAfter(dayjs(ticketDetailData.due_date), 'day');
  }, [ticketDetailData?.due_date, ticketDetailData?.approved_at]);


  // Update editedTicketData when ticketDetailData changes
  useEffect(() => {
    if (ticketDetailData) {
      setEditedTicketData(ticketDetailData);
    }
  }, [ticketDetailData]);

  const handleOpenEditModal = () => {
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedTicketData = { ...editedTicketData, [name]: value };
    setEditedTicketData(updatedTicketData);
  };
  // A helper function to compare the original and edited ticket details
  const getChangedFields = (original, edited) => {
    const changes: string[] = [];
    Object.keys(original).forEach((key) => {
      if (original[key] !== edited[key]) {
        changes.push(
          `${key} changed from "${original[key]}" to "${edited[key]}"`
        );
      }
    });
    return changes;
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      // Call the update API on Save
      const { data: response } = await axiosInstance.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/update-loan-application/${editedTicketData?.applicationId}`,
        editedTicketData
      );
      if (response?.statusCode === 200) {
        const loggedInUser = decodedToken()?.username;
        const changes = getChangedFields(ticketDetailData, editedTicketData);

        const formattedChanges = changes.map((change) => {
          const [key, rest] = change.split(" changed from ");
          return `${key} changed from ${rest}`;
        });

        const historyMessage =
          changes.length > 0
            ? `${loggedInUser} edited the following Ticket Details:
               ${formattedChanges}`
            : `${loggedInUser} did not change any details.`;

        const createdHistory = await createTicketHistory({
          ticket_id: ticketDetailData?.ticketId,
          action: historyMessage,
        });
        if (createdHistory?.statusCode === 200) {
          toastAndNavigate(
            dispatch,
            true,
            "info",
            "Ticket Details Edited Successfully"
          );
          setOpenEditModal(false);
        } else {
          setOpenEditModal(false);
        }
      } else {
        setOpenEditModal(false);
      }
    } catch (error) {
      console.error("Error saving the ticket:", error);
      setOpenEditModal(false);
    } finally {
      setIsSaving(false);
    }
  };
  const DetailItem = ({ label, value, isOverdue = false }: { label: string; value: React.ReactNode; isOverdue?: boolean }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: isOverdue ? "error.main" : "text.secondary",
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.05em",
          display: "block",
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: isOverdue ? "error.main" : "text.primary",
          fontWeight: isOverdue ? 700 : 600,
          fontSize: "0.95rem",
          wordWrap: "break-word"
        }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        sx={{
          flexDirection: "column",
        }}
        mb={1}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start" }}>
            <Tooltip title="Go back to the previous page">
              <Button
                size="small"
                startIcon={<ArrowBackRounded sx={{ fontSize: "18px !important" }} />}
                onClick={() => router.back()}
                sx={{
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.4,
                  "&:hover": {
                    bgcolor: "#f1f5f9",
                    color: "#0f172a",
                  },
                }}
              >
                Back
              </Button>
            </Tooltip>
          </Box>

          {/* Edit Button */}
          <Box sx={{ marginLeft: "auto" }}>
            <Tooltip title="Edit ticket details">
              <Button
                size="small"
                startIcon={<EditRounded sx={{ fontSize: "16px !important" }} />}
                onClick={handleOpenEditModal}
                sx={{
                  color: "#3949ab",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.4,
                  "&:hover": {
                    bgcolor: "rgba(57, 73, 171, 0.08)",
                  },
                }}
              >
                Edit
              </Button>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <Box sx={{
            backgroundColor: "rgba(12, 102, 228, 0.08)",
            padding: "10px 28px",
            borderRadius: "10px",
            border: "1px solid rgba(12, 102, 228, 0.2)"
          }}>
            <Typography
              variant="h5"
              sx={{
                color: "primary.main",
                fontSize: "1.1rem",
                fontWeight: 800,
                letterSpacing: "0.05em"
              }}
            >
              TICKET ID: F2FIN-{ticketDetailData?.ticketId}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          borderRadius: "14px",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Box
          sx={{
            flex: 1,
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: 4,
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <Grid container spacing={3}>
            {/* Ticket Details */}
            <Grid item xs={12} sm={6}>
              <DetailItem label="Name" value={capitalizeEachWord(editedTicketData?.customerName)} />
              <DetailItem label="Email" value={editedTicketData?.customerEmail} />
              <DetailItem label="Location" value={capitalizeEachWord(editedTicketData?.customerLocation)} />
              <DetailItem label="Tenure" value={formatTenure(editedTicketData?.applicationTenure)} />
              <DetailItem label="Loan Provider" value={capitalizeEachWord(editedTicketData?.provider) || "No provider available"} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DetailItem label="Contact" value={`+91 ${editedTicketData?.customerContact || ""}`} />
              <DetailItem label="Designation" value={capitalizeEachWord(editedTicketData?.customerDesignation)} />
              <DetailItem label="Amount" value={formatAmount(editedTicketData?.applicationAmount)} />
              <DetailItem label="Application Date" value={formatDate(editedTicketData?.applicationDate)} />
              <DetailItem label="Loan Category" value={capitalizeEachWord(editedTicketData?.loanCategory) || "No category available"} />
            </Grid>
            <Grid item xs={12} sm={12}>
              <Divider sx={{ my: 1, borderColor: "rgba(0,0,0,0.05)" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Expected Decision"
                value={
                  editedTicketData?.due_date
                    ? new Date(editedTicketData.due_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                    : "No Expected Date"
                }
                isOverdue={isOverdue}
              />
            </Grid>
            {(editedTicketData?.source || editedTicketData?.applicationSource) && (
              <Grid item xs={12} sm={6}>
                <DetailItem
                  label="Source"
                  value={
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.3 }}>
                      {getSourcePill(editedTicketData?.source || editedTicketData?.applicationSource)}
                      {fetchedAppliedByName && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "0.95rem",
                            color: getSourceColor(editedTicketData?.source || editedTicketData?.applicationSource),
                            fontWeight: 600,
                            lineHeight: 1,
                          }}
                        >
                          {capitalizeEachWord(fetchedAppliedByName)}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Grid>
            )}
          </Grid>
          {editedTicketData?.co_applicant_name && (
            <>
              <Divider sx={{ my: 3, borderColor: "rgba(0,0,0,0.05)" }} />
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}>
                🎓 Student / Co-Applicant Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <DetailItem label="Name" value={capitalizeEachWord(editedTicketData?.co_applicant_name)} />
                  <DetailItem label="Contact" value={`+91 ${editedTicketData?.co_applicant_contact || ""}`} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailItem label="Email" value={editedTicketData?.co_applicant_email} />
                  <DetailItem label="Mother's Name" value={capitalizeEachWord(editedTicketData?.co_applicant_mother_name)} />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Box>

      {/* Modal for Editing Ticket */}
      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialogContent-root": {
            padding: "16px",
            maxHeight: "500px",
          },
          "& .MuiDialogActions-root": {
            padding: "16px",
            justifyContent: "flex-end",
          },
          "& .MuiPaper-root": {
            borderRadius: "12px",
          },
          // Hide the scrollbars
          "&::-webkit-scrollbar": {
            display: "none",
          },
          "& *": {
            scrollbarWidth: "none",
          },
          height: "70v%",
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            pb: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Edit Ticket Details
          <IconButton
            aria-label="close"
            onClick={handleCloseEditModal}
            size="small"
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: "#64748b",
              "&:hover": {
                color: "#0f172a",
                bgcolor: "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "20px !important", px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                name="customerName"
                value={editedTicketData?.customerName || ""}
                onChange={handleInputChange}
                fullWidth
                size="small"
                variant="outlined"
                sx={editFieldStyles}
                autoComplete="off"
              />
            </Grid>
            {(userRole === "admin" || userRole === "sub admin") && (
              <Grid item xs={12} sx={{ mb: 2 }}>
                <DropdownComponent
                  id="edit-ticket-loan-provider"
                  name="provider"
                  label="Loan Provider"
                  value={editedTicketData?.provider || ""}
                  onChange={(val) =>
                    setEditedTicketData((prev) => ({ ...prev, provider: val }))
                  }
                  options={PROVIDER_OPTIONS.map((bank) => ({
                    label: bank,
                    value: bank,
                  }))}
                  placeholder="Select Loan Provider"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Email"
                name="customerEmail"
                value={editedTicketData?.customerEmail || ""}
                onChange={handleInputChange}
                fullWidth
                size="small"
                variant="outlined"
                sx={editFieldStyles}
                autoComplete="off"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact"
                name="customerContact"
                value={editedTicketData?.customerContact || ""}
                onChange={handleInputChange}
                fullWidth
                size="small"
                variant="outlined"
                sx={editFieldStyles}
                autoComplete="off"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Location"
                name="customerLocation"
                value={editedTicketData?.customerLocation || ""}
                onChange={handleInputChange}
                fullWidth
                size="small"
                variant="outlined"
                sx={editFieldStyles}
                autoComplete="off"
              />
            </Grid>

            {/* Amount Field */}
            <Grid item xs={12}>
              <TextField
                label="Amount"
                name="applicationAmount"
                value={editedTicketData?.applicationAmount || ""}
                onChange={handleInputChange}
                fullWidth
                size="small"
                variant="outlined"
                sx={editFieldStyles}
                autoComplete="off"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            size="small"
            onClick={handleCloseEditModal}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "#64748b",
              borderColor: "#cbd5e1",
              borderRadius: "6px",
              px: 2,
              py: 0.4,
              "&:hover": {
                bgcolor: "#f1f5f9",
                borderColor: "#94a3b8",
                color: "#0f172a",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            onClick={handleSaveEdit}
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              bgcolor: "#3949ab",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderRadius: "6px",
              px: 2,
              py: 0.4,
              boxShadow: "none",
              "&:hover": { bgcolor: "#303f9f", boxShadow: "none" },
              "&:disabled": { bgcolor: "#cbd5e1", color: "#94a3b8" },
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      <Toast
        alerting={toast.toastAlert}
        severity={toast.toastSeverity}
        message={toast.toastMessage}
      />
    </>
  );
};

export default TicketDetail;
