import React, { useState, memo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import PdfViewer from "@/app/components/common/PdfViewer";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { axiosInstance } from "@/apis/config/axiosConfig";
import { Utility } from "@/utils";
import type { AppDispatch, RootState } from "@/redux/store";
import Toast from "../../components/common/Toast";

const TicketDocuments = ({
  isMobile,
  isTab,
  isIpad,
  documents,
  customerId,
  ticketId,
  onDocumentUploaded,
  onRequireExpectedDate,
  onCreateHistory,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAttachment, setShowAttachment] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const itemsPerPage = 3;

  const dispatch: AppDispatch = useDispatch();
  const { toast } = useSelector((state: RootState) => state.toast);
  const { capitalizeFirstLetter, decodedToken, toastAndNavigate } = Utility();

  const toggleAttachment = (id) => {
    setShowAttachment((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedDocuments = documents.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Check if the user is online
      if (!navigator.onLine) {
        toastAndNavigate(dispatch, true, "error", "You are offline. Please check your internet connection.");
        return;
      }

      // Check file size limit (10MB = 10,485,760 bytes)
      if (file.size > 10485760) {
        toastAndNavigate(dispatch, true, "error", `${file.name} exceeds the 10MB limit`);
        return;
      }

      setSelectedFile(file);

      // Create preview if it is an image
      if (file.type && file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setSelectedFilePreview(previewUrl);
      } else {
        setSelectedFilePreview("");
      }
    }
  };

  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFilePreview("");
    const fileInput = document.getElementById("add-document-input");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Upload document function (explicitly triggered by user)
  const handleUploadSelectedFile = async () => {
    if (!selectedFile) return;
    if (onRequireExpectedDate && !onRequireExpectedDate()) return;

    let attachmentUrl = null;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("folder", `document/${selectedFile.name}`);

    try {
      // First upload to S3
      const uploadResponse = await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      attachmentUrl = uploadResponse.data.data;

      if (attachmentUrl) {
        // Then create document record in database
        await axiosInstance.post(`${process.env.NEXT_PUBLIC_WEB_URL}/create-document`, {
          document_url: attachmentUrl,
          customer_id: customerId,
          type: "general document",
        });

        // Create ticket history for the document upload
        if (onCreateHistory && ticketId) {
          try {
            await onCreateHistory({
              ticket_id: ticketId,
              action: `${decodedToken()?.username} uploaded a document - ${selectedFile.name}`,
            });
          } catch (histErr) {
            console.error("Error creating ticket history for document upload:", histErr);
          }
        }

        toastAndNavigate(dispatch, true, "info", "Document uploaded successfully");

        // Call callback to refresh documents list if provided
        if (onDocumentUploaded) {
          onDocumentUploaded();
        }

        handleCancelSelectedFile();
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      toastAndNavigate(dispatch, true, "error", "Error uploading document");
    } finally {
      setIsUploading(false);
    }
  };

  // Handler for button click to trigger file input
  const handleAddDocumentClick = () => {
    if (onRequireExpectedDate && !onRequireExpectedDate()) return;
    const fileInput = document.getElementById("add-document-input");
    if (fileInput) {
      fileInput.click();
    }
  };

  const isPDF = (url) => url && url.toLowerCase().endsWith(".pdf");

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            pb: 1.5,
            gap: 1.5,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: "#1e293b",
              fontWeight: 700,
              fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.25rem" },
            }}
          >
            Documents
          </Typography>

          <Tooltip title="Select a new document to upload">
            <span>
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon sx={{ fontSize: "16px !important" }} />}
                onClick={handleAddDocumentClick}
                disabled={isUploading}
                sx={{
                  bgcolor: "#3949ab",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  px: 1.8,
                  py: 0.45,
                  boxShadow: "none",
                  minWidth: "fit-content",
                  "&:hover": { bgcolor: "#303f9f", boxShadow: "none" },
                  "&:disabled": { bgcolor: "#cbd5e1", color: "#94a3b8" },
                }}
              >
                Add Document
              </Button>
            </span>
          </Tooltip>
          <input
            id="add-document-input"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </Box>

        {/* Selected Document Pending Upload Section */}
        {selectedFile && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "8px",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#475569",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                mb: 0.8,
                display: "block",
                letterSpacing: "0.02em",
              }}
            >
              Selected Document
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.2,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                gap: 1.5,
              }}
            >
              {selectedFilePreview ? (
                <Box
                  component="img"
                  src={selectedFilePreview}
                  alt="Preview"
                  sx={{
                    width: 38,
                    height: 38,
                    objectFit: "cover",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <InsertDriveFileIcon sx={{ color: "#3949ab", fontSize: 28, flexShrink: 0 }} />
              )}

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>

              {/* Action Buttons: Delete/Remove & Upload */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <Tooltip title="Remove selected file">
                  <IconButton
                    size="small"
                    onClick={handleCancelSelectedFile}
                    disabled={isUploading}
                    sx={{
                      color: "#ef4444",
                      p: 0.5,
                      borderRadius: "6px",
                      "&:hover": {
                        bgcolor: "rgba(239, 68, 68, 0.08)",
                        color: "#dc2626",
                      },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: "18px" }} />
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  variant="contained"
                  onClick={handleUploadSelectedFile}
                  disabled={isUploading}
                  startIcon={
                    isUploading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <CloudUploadIcon sx={{ fontSize: "16px !important" }} />
                    )
                  }
                  sx={{
                    bgcolor: "#3949ab",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: "6px",
                    px: 1.8,
                    py: 0.45,
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#303f9f", boxShadow: "none" },
                    "&:disabled": { bgcolor: "#cbd5e1", color: "#94a3b8" },
                  }}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {documents.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 1,
            }}
          >
            {displayedDocuments.map((doc, index) => (
              <React.Fragment key={index}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.9rem 1rem",
                    background: "var(--mui-palette-neutral-100)",
                    border: "1px solid var(--mui-palette-neutral-200)",
                    borderRadius: "8px",
                    width: "100%",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "#fff",
                      borderColor: "#3949ab",
                      boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
                    },
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: "#172B4D", fontWeight: 500, flexGrow: 1, fontSize: "0.9rem" }}
                  >
                    {capitalizeFirstLetter(doc.type) || "Unknown Document"}
                  </Typography>
                  <Tooltip title={isPDF(doc.document_url) ? "Open PDF in new tab" : "View Document Image"}>
                    <span>
                      <Button
                        onClick={() => {
                          if (!isPDF(doc.document_url)) {
                            toggleAttachment(index);
                          }
                        }}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: "#3949ab",
                          borderColor: "#cbd5e1",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: "6px",
                          px: 1.5,
                          py: 0.3,
                          "&:hover": {
                            bgcolor: "rgba(57, 73, 171, 0.08)",
                            borderColor: "#3949ab",
                          },
                        }}
                      >
                        {isPDF(doc.document_url) ? (
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "none" }}
                          >
                            Open PDF
                          </a>
                        ) : (
                          "View"
                        )}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>

                {/* Conditional rendering of the attachment */}
                {showAttachment[index] && (
                  <Box
                    sx={{
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 1000,
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
                      padding: 2,
                      textAlign: "center",
                      maxHeight: "85vh",
                      maxWidth: "90vw",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ mb: 2, overflow: "auto", maxHeight: "70vh" }}>
                      <img
                        src={doc.document_url}
                        alt={`Attachment for ${doc.type}`}
                        style={{
                          maxHeight: "65vh",
                          maxWidth: "80vw",
                          objectFit: "contain",
                          borderRadius: "6px",
                        }}
                      />
                    </Box>
                    <Button
                      onClick={() => toggleAttachment(index)}
                      variant="outlined"
                      size="small"
                      sx={{
                        textTransform: "none",
                        fontSize: "0.78rem",
                        fontWeight: 600,
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
                      Close
                    </Button>
                  </Box>
                )}
              </React.Fragment>
            ))}
          </Box>
        ) : (
          <Typography
            sx={{
              color: "#5E6C84",
              fontSize: "0.85rem",
              py: 2,
            }}
          >
            No documents available.
          </Typography>
        )}
        {documents.length > itemsPerPage && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 3,
              pt: 2,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              width: "100%",
            }}
          >
            <Button
              variant="outlined"
              size="small"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              sx={{
                color: "#64748b",
                borderColor: "#cbd5e1",
                fontSize: "0.78rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "6px",
                px: 1.5,
                py: 0.3,
                "&:hover": {
                  bgcolor: "#f1f5f9",
                  borderColor: "#94a3b8",
                  color: "#0f172a",
                },
                "&:disabled": { borderColor: "#e2e8f0", color: "#94a3b8" },
              }}
            >
              Previous
            </Button>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.8rem",
              }}
            >
              Page {currentPage} of {totalPages}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              sx={{
                color: "#64748b",
                borderColor: "#cbd5e1",
                fontSize: "0.78rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "6px",
                px: 1.5,
                py: 0.3,
                "&:hover": {
                  bgcolor: "#f1f5f9",
                  borderColor: "#94a3b8",
                  color: "#0f172a",
                },
                "&:disabled": { borderColor: "#e2e8f0", color: "#94a3b8" },
              }}
            >
              Next
            </Button>
          </Box>
        )}
      </Paper>
      <Toast
        alerting={toast.toastAlert}
        severity={toast.toastSeverity}
        message={toast.toastMessage}
      />
    </Box>
  );
};

export default memo(TicketDocuments);
