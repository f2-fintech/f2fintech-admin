/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
import { axiosInstance } from "@/apis/config/axiosConfig";
import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  Avatar,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  useMediaQuery,
  Pagination,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import type { AppDispatch, RootState } from "@/redux/store";
import { Utility } from "@/utils";

import { format } from "date-fns";
import Toast from "../../components/common/Toast";
import {
  useGetTicketActivities,
  useDeleteTicketActivity,
  useCreateTicketActivity,
  useModifyTicketActivity,
} from "@/hooks/ticketActivities";
import useIntersectionObserver from "@/hooks/IntersectionObserver";
import { TicketActivities } from "@/types/ticketActivities";
import { User } from "@/types/user";

const ITEMS_PER_PAGE = 3;

interface CommentsProps {
  storedTicketId: string | string[];
  userData: User;
  isExpectedDateSaved?: boolean;
  onRequireExpectedDate?: () => boolean;
}

const Comments = ({ storedTicketId, userData, isExpectedDateSaved = true, onRequireExpectedDate }: CommentsProps) => {
  const [newComment, setNewComment] = useState<string>("");
  const [isCommenting, setIsCommenting] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [isSavingComment, setIsSavingComment] = useState<boolean>(false);
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [editedComment, setEditedComment] = useState<string | undefined>("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
    null
  );
  const { toast } = useSelector((state: RootState) => state.toast);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAttachment, setShowAttachment] = useState({});
  const [hasFetched, setHasFetched] = useState(false);
  const commentRef = useRef(null);
  const isVisible = useIntersectionObserver(commentRef);
  const muiTheme = useTheme();

  const dispatch: AppDispatch = useDispatch();
  const { capitalizeFirstLetter, decodedToken, toastAndNavigate } = Utility();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm')); // 0-599px
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md')); // 600-899px
  const isIpad = useMediaQuery(muiTheme.breakpoints.between('md', 'lg')); // 900-1199px
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg')); // 1200px+

  const { value: comments, refetch } = useGetTicketActivities(
    {} as TicketActivities,
    hasFetched ? `get-ticket-activities/${storedTicketId}` : ""
  );

  const { createTicketActivity } = useCreateTicketActivity(
    "create-ticket-activity"
  );
  const { deleteTicketActivity } = useDeleteTicketActivity(
    "delete-ticket-activity"
  );
  const { modifyTicketActivity } = useModifyTicketActivity(
    "update-ticket-activity"
  );

  useEffect(() => {
    if (isVisible && !hasFetched) {
      refetch();
      setHasFetched(true);
    }
  }, [isVisible, hasFetched]);

  // Helper function to get file extension from URL
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

  // Helper function to check if attachment is PDF
  const isPdfAttachment = (attachmentUrl: string) => {
    const extension = getFileExtensionFromUrl(attachmentUrl);
    return extension === "pdf";
  };

  // Helper function to check if attachment is Excel based on URL
  const isExcelAttachment = (attachmentUrl: string) => {
    const extension = getFileExtensionFromUrl(attachmentUrl);
    const excelExtensions = ["xlsx", "xls", "csv", "xlsm", "xlsb"];
    return excelExtensions.includes(extension);
  };

  const handleCreateComment = useCallback(async () => {
    if (onRequireExpectedDate && !onRequireExpectedDate()) return;
    if (!newComment.trim()) return;

    setIsCommenting(true);
    try {
      let attachmentUrl = null;

      if (attachment) {
        try {
          const formData = new FormData();
          formData.append("document", attachment);
          formData.append("folder", `comment/${attachment.name}`);

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
        } catch (err) {
          console.log("Error uploading attachment:", err);
          toastAndNavigate(
            dispatch,
            true,
            "error",
            "Error uploading attachment"
          );
        }
      }

      const newCommentData = {
        ticket_id: storedTicketId,
        user_id: decodedToken()?.id,
        comment: newComment,
        attachment: attachmentUrl,
      };
      const createdComment = await createTicketActivity(newCommentData);
      if (createdComment) {
        setNewComment("");
        setAttachment(null);
        setAttachmentPreview("");
        toastAndNavigate(dispatch, true, "info", "Commented Successfully");
        refetch();
      }
    } catch (error) {
      toastAndNavigate(dispatch, true, "error", "Error Creating Comment");
      console.log("Error creating the comment:", error);
    } finally {
      setIsCommenting(false);
    }
  }, [attachment, newComment, storedTicketId, refetch, onRequireExpectedDate, dispatch, createTicketActivity, decodedToken, toastAndNavigate]);

  const handleDeleteComment = useCallback(
    async (commentId: number) => {
      try {
        await deleteTicketActivity(commentId);
        toastAndNavigate(dispatch, true, "info", "Deleted Successfully");
        await refetch();
      } catch (error) {
        toastAndNavigate(dispatch, true, "error", "Error Deleting Comment");
        console.log("Error deleting the comment:", error);
      }
    },
    [deleteTicketActivity, refetch, dispatch, toastAndNavigate]
  );

  const handleEditComment = useCallback(
    (commentId: number, commentText: string) => {
      setEditingCommentId(commentId);
      setEditedComment(commentText);
    },
    []
  );

  const handleSaveEditComment = useCallback(
    async (commentId: number, ticketId: number) => {
      if (!editedComment || !editedComment.trim()) return;
      setIsSavingComment(true);
      try {
        const updatedCommentData = {
          comment: editedComment,
          updated_at: new Date().toISOString(),
        };
        const updatedComment = await modifyTicketActivity(
          ticketId,
          commentId,
          updatedCommentData
        );
        if (updatedComment) {
          setEditingCommentId(null);
          setEditedComment("");
          setAttachment(null);
          toastAndNavigate(dispatch, true, "info", "Updated Successfully");
          refetch();
        }
      } catch (error) {
        toastAndNavigate(dispatch, true, "error", "Error Updating Comment");
        console.log("Error Updating the comment:", error);
      } finally {
        setIsSavingComment(false);
      }
    },
    [editedComment, modifyTicketActivity, refetch, dispatch, toastAndNavigate]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditedComment("");
  }, []);

  const handleAttachmentChange = (e: any) => {
    const file = e.target.files[0];
    setAttachment(file);

    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setAttachmentPreview(previewUrl);
    } else {
      setAttachmentPreview("");
    }
  };

  const handleAttachmentDelete = () => {
    setAttachment(null);
    setAttachmentPreview("");
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  const paginatedComments =
    comments && comments.data
      ? comments.data.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
      : [];

  // RECOMMENDED: Replace your existing toggleAttachment function with this
  const toggleAttachment = (commentId, attachmentUrl) => {
    if (isExcelAttachment(attachmentUrl)) {
      // Microsoft Office Online Viewer is most reliable for Excel files
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        attachmentUrl
      )}`;

      // Try opening the file
      const newWindow = window.open(officeViewerUrl, "_blank");

      // If popup is blocked or fails, provide alternative options
      if (
        !newWindow ||
        newWindow.closed ||
        typeof newWindow.closed === "undefined"
      ) {
        // Show options modal or direct download
        const shouldDownload = window.confirm(
          "Unable to open file in viewer. Would you like to download it instead?"
        );

        if (shouldDownload) {
          // Create download link
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
      // For images and other files, use existing modal behavior
      setShowAttachment((prev) => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));
    }
  };

  // Solution 3: Client-side Excel parsing using XLSX library
  // Add this to your component imports
  // import * as XLSX from 'xlsx';

  const [excelData, setExcelData] = useState(null);
  const [showExcelModal, setShowExcelModal] = useState({});

  const parseExcelFile = async (attachmentUrl) => {
    try {
      const response = await fetch(attachmentUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Get first worksheet
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      return data;
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      return null;
    }
  };

  const handleExcelView = async (commentId, attachmentUrl) => {
    const data = await parseExcelFile(attachmentUrl);
    if (data) {
      setExcelData({ [commentId]: data });
      setShowExcelModal((prev) => ({ ...prev, [commentId]: true }));
    } else {
      // Fallback to external viewer
      window.open(
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          attachmentUrl
        )}`,
        "_blank"
      );
    }
  };

  // Excel data display modal component
  const ExcelModal = ({ commentId, data, onClose }) => (
    <Box
      sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        padding: 2,
        maxHeight: "80vh",
        maxWidth: "90vw",
        overflow: "auto",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Excel File Preview</Typography>
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#64748b",
            borderColor: "#cbd5e1",
            borderRadius: "6px",
            px: 1.5,
            py: 0.3,
            "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
          }}
        >
          Close
        </Button>
      </Box>

      <Box sx={{ overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    backgroundColor: rowIndex === 0 ? "#f5f5f5" : "white",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </table>
      </Box>
    </Box>
  );

  // Solution 4: Improved button with better UX
  const ExcelFileButton = ({ commentId, attachmentUrl }) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
      setLoading(true);

      try {
        // Try Office Online first
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          attachmentUrl
        )}`;
        const newWindow = window.open(officeUrl, "_blank");

        // Check if window opened successfully
        if (!newWindow) {
          // Popup blocked, try alternative
          window.location.href = officeUrl;
        }
      } catch (error) {
        console.error("Error opening Excel file:", error);
        // Fallback to download
        const link = document.createElement("a");
        link.href = attachmentUrl;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="contained"
        size="small"
        sx={{
          textTransform: "none",
          fontSize: "0.78rem",
          fontWeight: 600,
          borderRadius: "6px",
          bgcolor: "#3949ab",
          color: "#ffffff",
          boxShadow: "none",
          py: 0.4,
          px: 1.5,
          "&:hover": {
            bgcolor: "#303f9f",
            boxShadow: "none",
          },
          "&:disabled": {
            bgcolor: "#cbd5e1",
            color: "#94a3b8",
          },
        }}
      >
        {loading ? "Opening..." : "Open Excel File"}
      </Button>
    );
  };

  return (
    <Box mt={2} mb={2} sx={{ position: "relative" }} ref={commentRef}>
      <Box
        sx={{
          position: "relative",
          mb: 2,
        }}
      >
        <TextField
          fullWidth
          placeholder="Add a comment..."
          multiline
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          sx={{
            mt: 1,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
            }
          }}
        />
        <Tooltip title="Add attachment">
          <IconButton
            component="label"
            sx={{ position: "absolute", bottom: 8, right: 8 }}
          >
            <AttachFileIcon />
            <input type="file" hidden onChange={handleAttachmentChange} />
          </IconButton>
        </Tooltip>
      </Box>
      {attachment && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            width: {
              xs: "auto",
              sm: "auto",
              md: "auto",
            },
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              height: "6px",
            },
          }}
        >
          {" "}
          {attachmentPreview && (
            <Box
              component="img"
              src={attachmentPreview}
              alt="Preview"
              sx={{
                maxHeight: 100,
                maxWidth: 100,
                ml: 2,
                borderRadius: 2,
              }}
            />
          )}
          <IconButton onClick={handleAttachmentDelete} sx={{ ml: 2 }}>
            <DeleteIcon />
          </IconButton>
          <Typography>{attachment.name}</Typography>
        </Box>
      )}

      <Box
        mt={1}
        display="flex"
        justifyContent="flex-start"
        alignItems="center"
      >
        <Tooltip title={!newComment?.trim() ? "Write text in the above field to comment" : ""}>
          <span>
            <Button
              variant="contained"
              onClick={handleCreateComment}
              disabled={isCommenting || !newComment?.trim()}
              startIcon={isCommenting ? <CircularProgress size={14} color="inherit" /> : null}
              size="small"
              sx={{
                bgcolor: "#3949ab",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 2,
                py: 0.6,
                borderRadius: "8px",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#303f9f",
                  boxShadow: "0 2px 4px rgba(57, 73, 171, 0.2)",
                },
                "&:disabled": {
                  bgcolor: "#cbd5e1",
                  color: "#94a3b8",
                },
              }}
            >
              {isCommenting ? "Commenting..." : "Comment"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Box mt={3}>
        {paginatedComments.length > 0 ? (
          paginatedComments.map((comment: any) => {
            const commentedBy = userData?.data?.results?.find(
              (user) => user.id == comment.user_id
            );
            return (
              <Box
                key={comment.id}
                mt={2}
                p={{ xs: 1.5, sm: 2, md: 2 }}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  height: "auto",
                  borderRadius: "12px",
                  backgroundColor: "var(--mui-palette-neutral-100)",
                  border: "1px solid var(--mui-palette-neutral-200)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#fff",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
                  }
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: "primary.light",
                    mr: { xs: 1, sm: 1.5, md: 2 },
                    color: "primary.main",
                    width: { xs: 32, sm: 36, md: 40 },
                    height: { xs: 32, sm: 36, md: 40 },
                    fontSize: { xs: "0.75rem", sm: "0.9rem", md: "1rem" },
                    fontWeight: 700,
                  }}
                >
                  {commentedBy?.username?.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      flexDirection: { xs: "column", sm: "row" },
                      mb: { xs: 0.5, sm: 0.5, md: 0.5 },
                      gap: { xs: 0.5, sm: 2 },
                    }}
                  >
                    <Typography
                      fontWeight="bold"
                      sx={{
                        fontSize: { xs: "0.7rem", sm: "1rem", md: "1rem" },
                        color: "#333",
                      }}
                    >
                      {capitalizeFirstLetter(commentedBy?.username)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: {
                          xs: "0.65rem",
                          sm: "0.8rem",
                          md: "0.85rem",
                        },
                        flexShrink: 0,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                      }}
                    >
                      {format(
                        new Date(comment.created_at),
                        "MMM dd, yyyy 'at' hh:mm a"
                      )}
                      {comment.updated_at &&
                        Math.abs(new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime()) > 1000
                      }
                    </Typography>
                  </Box>

                  {editingCommentId === comment.id ? (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        autoFocus
                        onFocus={(e) => {
                          const val = e.target.value;
                          e.target.setSelectionRange(val.length, val.length);
                        }}
                        value={editedComment}
                        onChange={(e) =>
                          setEditedComment(
                            capitalizeFirstLetter(e.target.value)
                          )
                        }
                        rows={3}
                        sx={{
                          bgcolor: "#fff",
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                          },
                        }}
                      />
                      <Box
                        mt={1}
                        sx={{
                          display: "flex",
                          gap: 1,
                        }}
                      >
                        <Button
                          variant="contained"
                          size="small"
                          disabled={isSavingComment || !editedComment?.trim()}
                          startIcon={isSavingComment ? <CircularProgress size={14} color="inherit" /> : null}
                          sx={{
                            color: "white",
                            bgcolor: "#3949ab",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: "6px",
                            px: 1.8,
                            py: 0.4,
                            boxShadow: "none",
                            "&:hover": {
                              bgcolor: "#303f9f",
                              boxShadow: "none",
                            },
                            "&:disabled": {
                              bgcolor: "#cbd5e1",
                              color: "#94a3b8",
                            },
                          }}
                          onClick={() =>
                            handleSaveEditComment(comment.id, comment.ticket_id)
                          }
                        >
                          {isSavingComment ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={isSavingComment}
                          sx={{
                            color: "#64748b",
                            borderColor: "#cbd5e1",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            textTransform: "none",
                            borderRadius: "6px",
                            px: 1.8,
                            py: 0.4,
                            "&:hover": {
                              bgcolor: "#f1f5f9",
                              borderColor: "#94a3b8",
                              color: "#0f172a",
                            },
                          }}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Box
                        sx={{
                          maxHeight: {
                            xs: "15vh",
                            sm: "12vh",
                            md: "12vh",
                            lg: "10vh",
                          },
                          overflowY: "auto",
                          "&::-webkit-scrollbar": {
                            display: "none",
                          },
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            mb: 1,
                            color: "gray",
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.95rem",
                              md: "0.9rem",
                            },
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {capitalizeFirstLetter(comment.comment)}
                        </Typography>
                        {comment.attachment && (
                          <Box sx={{ mt: 0.5 }}>
                            <Button
                              onClick={() =>
                                toggleAttachment(comment.id, comment.attachment)
                              }
                              variant="outlined"
                              size="small"
                              sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                borderRadius: "6px",
                                borderColor: "#cbd5e1",
                                color: "#3949ab",
                                py: 0.35,
                                px: 1.5,
                                "&:hover": {
                                  borderColor: "#3949ab",
                                  bgcolor: "rgba(57, 73, 171, 0.04)",
                                },
                              }}
                            >
                              {isExcelAttachment(comment.attachment)
                                ? "Open Excel File"
                                : showAttachment[comment.id]
                                  ? "Hide Attachment"
                                  : "View Attachment"}
                            </Button>

                            {/* Only show modal for non-Excel files */}
                            {!isExcelAttachment(comment.attachment) &&
                              showAttachment[comment.id] && (
                                <Box
                                  sx={{
                                    position: "fixed",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 1300,
                                    backgroundColor: "white",
                                    borderRadius: "12px",
                                    boxShadow:
                                      "0px 8px 24px rgba(0, 0, 0, 0.15)",
                                    p: { xs: 1.5, sm: 2 },
                                    textAlign: "center",
                                    height: {
                                      xs: "90vh",
                                      sm: "85vh",
                                      md: "90vh",
                                    },
                                    width: {
                                      xs: "95vw",
                                      sm: "90vw",
                                      md: "85vw",
                                      lg: "80vw",
                                    },
                                    maxWidth: "1200px",
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      flexGrow: 1,
                                      overflow: "hidden",
                                      mb: 2,
                                    }}
                                  >
                                    <img
                                      src={comment.attachment}
                                      alt="Attachment Preview"
                                      style={{
                                        height: "100%",
                                        width: "100%",
                                        objectFit: "contain",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  </Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 1.5,
                                    }}
                                  >
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
                                        },
                                      }}
                                    >
                                      Close
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{
                                        textTransform: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        bgcolor: "#ef4444",
                                        color: "#ffffff",
                                        boxShadow: "none",
                                        borderRadius: "6px",
                                        px: 2,
                                        py: 0.4,
                                        "&:hover": {
                                          bgcolor: "#dc2626",
                                          boxShadow: "none",
                                        },
                                      }}
                                      onClick={() =>
                                        setDeleteCommentId(comment.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </Box>
                                </Box>
                              )}
                          </Box>
                        )}
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "flex-start",
                        }}
                      >
                        <Button
                          size="small"
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            bgcolor: "rgba(57, 73, 171, 0.08)",
                            color: "#3949ab",
                            border: "1px solid rgba(57, 73, 171, 0.2)",
                            px: 1.5,
                            py: 0.35,
                            borderRadius: "6px",
                            minWidth: "auto",
                            "&:hover": {
                              bgcolor: "rgba(57, 73, 171, 0.16)",
                              borderColor: "#3949ab",
                            },
                          }}
                          onClick={() =>
                            handleEditComment(comment.id, comment.comment)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            bgcolor: "rgba(239, 68, 68, 0.08)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            px: 1.5,
                            py: 0.35,
                            borderRadius: "6px",
                            minWidth: "auto",
                            "&:hover": {
                              bgcolor: "rgba(239, 68, 68, 0.16)",
                              borderColor: "#ef4444",
                            },
                          }}
                          onClick={() => setDeleteCommentId(comment.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            );
          })
        ) : (
          <Typography
            sx={{
              color: "black",
            }}
          >
            No comments available
          </Typography>
        )}
        <Pagination
          count={
            comments && comments.data
              ? Math.ceil(comments.data.length / ITEMS_PER_PAGE)
              : 0
          }
          page={currentPage}
          onChange={handlePageChange}
          sx={{ mt: 2 }}
        />
      </Box>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteCommentId !== null}
        onClose={() => {
          if (!isDeleting) setDeleteCommentId(null);
        }}
        PaperProps={{
          sx: { borderRadius: "12px", p: 1, minWidth: { xs: "280px", sm: "360px" } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete Comment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
            Are you sure you want to delete this comment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteCommentId(null)}
            variant="outlined"
            size="small"
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#64748b",
              borderColor: "#cbd5e1",
              px: 2,
              py: 0.5,
              "&:hover": {
                bgcolor: "#f1f5f9",
                borderColor: "#94a3b8",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (deleteCommentId !== null) {
                setIsDeleting(true);
                try {
                  await handleDeleteComment(deleteCommentId);
                } finally {
                  setIsDeleting(false);
                  setDeleteCommentId(null);
                }
              }
            }}
            variant="contained"
            size="small"
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              bgcolor: "#ef4444",
              color: "#ffffff",
              boxShadow: "none",
              px: 2.2,
              py: 0.5,
              "&:hover": {
                bgcolor: "#dc2626",
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.25)",
              },
              "&:disabled": {
                bgcolor: "#cbd5e1",
                color: "#94a3b8",
              },
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        alerting={toast.toastAlert}
        severity={toast.toastSeverity}
        message={toast.toastMessage}
      />
    </Box>
  );
};

export default memo(Comments);
