import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { axiosInstance } from "@/apis/config/axiosConfig";
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Button,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AudioFileIcon from "@mui/icons-material/Audiotrack";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Upload, CloudUpload, AttachFile } from "@mui/icons-material";

import Toast from "../../components/common/Toast";
import { Utility } from "@/utils";
import { AppDispatch, RootState } from "@/redux/store";
import {
  useGetTicketVoiceNotes,
  useCreateTicketVoiceNote,
  useDeleteTicketVoiceNote,
} from "@/hooks/ticketVoiceNote";
import { useCreateTicketHistory } from "@/hooks/tickethistory";
import Loader from "../../components/common/Loader";
import { TicketVoiceNote, TicketVoiceNoteData } from "@/types/ticketVoiceNote";

interface UploadProgress {
  [key: string]: number;
}

const TicketVoiceNotes = ({ isMobile, isTab, isIpad, ticketDetailData, onRequireExpectedDate }) => {
  const [selectedAudioFiles, setSelectedAudioFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const dispatch: AppDispatch = useDispatch();
  const { toast } = useSelector((state: RootState) => state.toast);
  const { toastAndNavigate, decodedToken } = Utility();
  const { createTicketHistory } = useCreateTicketHistory(
    "create-ticket-history"
  );

  // Custom hooks for voice notes
  const {
    value: voiceNotes,
    swrLoading,
    refetch,
  } = useGetTicketVoiceNotes(
    {} as TicketVoiceNote,
    ticketDetailData?.ticketId
      ? `get-ticket-voice-notes/${ticketDetailData.ticketId}`
      : ""
  );

  const { createTicketVoiceNote, loading: createLoading } =
    useCreateTicketVoiceNote("create-ticket-voice-note");
  const { deleteTicketVoiceNote, loading: deleteLoading } =
    useDeleteTicketVoiceNote("delete-ticket-voice-note");

  // Handle multiple file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach((file) => {
      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          `${file.name} exceeds 20MB limit`
        );
        return;
      }
      validFiles.push(file);
    });
    setSelectedAudioFiles((prev) => [...prev, ...validFiles]);
  };

  // Guard-aware click handler for audio file selection
  const handleSelectAudioClick = () => {
    if (onRequireExpectedDate && !onRequireExpectedDate()) return;
    inputRef.current?.click();
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedAudioFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload single voice note with progress tracking
  const uploadSingleVoiceNote = async (
    file: File
  ): Promise<{ success: boolean; fileName: string; error?: string }> => {
    try {
      // Upload file to S3
      const formData = new FormData();
      formData.append("document", file);
      formData.append("folder", `voice-note/${file.name}`);

      const uploadResponse = await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          maxContentLength: 20 * 1024 * 1024,
          maxBodyLength: 20 * 1024 * 1024,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: progress,
            }));
          },
        }
      );
      // const attachmentUrl = "https://f2fintechcustomerdocs.s3.eu-north-1.amazonaws.com/voice-note/ElevenLabs_2025-02-19T10_53_14_George_pre_s50_sb75_se0_b_m2.mp3";
      const attachmentUrl = uploadResponse?.data?.data;

      // Create voice note record
      const voiceNoteData = {
        ticket_id: ticketDetailData.ticketId,
        user_id: decodedToken()?.id,
        voice_note_url: attachmentUrl,
      };

      const response = await createTicketVoiceNote(voiceNoteData);
      if (response?.statusCode === 201) {
        const loggedInUser = decodedToken()?.username;
        const historyMessage = `${loggedInUser} uploaded a voice note - ${file.name}`;
        await createTicketHistory({
          ticket_id: ticketDetailData.ticketId,
          action: historyMessage,
        });
        return { success: true, fileName: file.name };
      }
      return {
        success: false,
        fileName: file.name,
        error: "Failed to create voice note record",
      };
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      return {
        success: false,
        fileName: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Upload all selected voice notes in parallel
  const handleVoiceNotesUpload = useCallback(async () => {
    if (selectedAudioFiles.length === 0 || !ticketDetailData?.ticketId) return;
    setLoading(true);

    try {
      // Upload all files in parallel using Promise.all
      const uploadPromises = selectedAudioFiles.map((file) =>
        uploadSingleVoiceNote(file)
      );
      const results = await Promise.all(uploadPromises);

      // Process results
      const successfulUploads = results.filter((result) => result.success);
      const failedUploads = results.filter((result) => !result.success);

      // Clear selected files and reset input
      setSelectedAudioFiles([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      // Refresh the voice notes list
      refetch();

      // Show appropriate toast message
      if (successfulUploads.length > 0 && failedUploads.length === 0) {
        toastAndNavigate(
          dispatch,
          true,
          "success",
          `All ${successfulUploads.length} voice note(s) uploaded successfully`
        );
      } else if (successfulUploads.length > 0 && failedUploads.length > 0) {
        toastAndNavigate(
          dispatch,
          true,
          "warning",
          `${successfulUploads.length} uploaded successfully, ${failedUploads.length} failed`
        );
      } else {
        toastAndNavigate(
          dispatch,
          true,
          "error",
          "All uploads failed. Please try again"
        );
      }

      // Log failed uploads for debugging
      if (failedUploads.length > 0) {
        console.error("Failed uploads:", failedUploads);
      }
    } catch (error) {
      console.error("Error in parallel upload:", error);
      toastAndNavigate(
        dispatch,
        true,
        "error",
        "Error uploading voice notes. Please try again"
      );
    } finally {
      setLoading(false);
      setUploadProgress({});
    }
  }, [selectedAudioFiles, ticketDetailData]);

  // Delete voice note
  const handleDeleteVoiceNote = async (
    voiceNoteId: number,
    voiceNoteUrl: string
  ) => {
    try {
      await deleteTicketVoiceNote(voiceNoteId);
      const loggedInUser = decodedToken()?.username;
      const historyMessage = `${loggedInUser} deleted a voice note`;
      await createTicketHistory({
        ticket_id: ticketDetailData.ticketId,
        action: historyMessage,
      });
      toastAndNavigate(
        dispatch,
        true,
        "success",
        "Voice note deleted successfully"
      );
      await refetch();
    } catch (error) {
      console.error("Error deleting voice note:", error);
      toastAndNavigate(dispatch, true, "error", "Error deleting voice note");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get file name from URL
  const getFileName = (url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1] || "Voice Note";
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (swrLoading) {
    return <Loader />;
  }

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 2, sm: 3 },
          height: "100%",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2, borderBottom: "1px solid rgba(0,0,0,0.06)", pb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              color: "text.primary",
              fontWeight: 700,
              fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
            }}
          >
            Voice Notes
          </Typography>
        </Box>

        {/* Upload Section */}
        <Box
          sx={{
            mb: 3,
            bgcolor: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: "10px",
            flexShrink: 0,
            p: 2,
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1, fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}
            >
              Upload Voice Notes
            </Typography>

            {/* File Selection */}
            <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
              <Tooltip title="Select multiple audio files (Max 20MB each)">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AttachFile sx={{ fontSize: "17px !important" }} />}
                  onClick={handleSelectAudioClick}
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
                    "&:hover": {
                      bgcolor: "#303f9f",
                      boxShadow: "none",
                    },
                  }}
                >
                  Select Audio Files
                  <input
                    ref={inputRef}
                    hidden
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </Button>
              </Tooltip>
              <Typography
                variant="caption"
                sx={{ color: "#64748b", fontSize: "0.75rem" }}
              >
                Max 20MB per file
              </Typography>
            </Box>

            {/* Selected Files List */}
            {selectedAudioFiles.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.8, fontWeight: 600, fontSize: "0.78rem", color: "#475569" }}>
                  Selected Files ({selectedAudioFiles.length})
                </Typography>
                <Box
                  sx={{
                    maxHeight: "160px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {selectedAudioFiles.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.2,
                        bgcolor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0, mr: 1.5 }}>
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
                          {file.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                          {formatFileSize(file.size)}
                        </Typography>
                        {uploadProgress[file.name] && (
                          <LinearProgress
                            variant="determinate"
                            value={uploadProgress[file.name]}
                            sx={{
                              mt: 0.5,
                              borderRadius: 1,
                              height: 4,
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "#3949ab",
                              },
                            }}
                          />
                        )}
                      </Box>
                      <Tooltip title="Remove file">
                        <IconButton
                          size="small"
                          onClick={() => removeSelectedFile(index)}
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
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Upload Button */}
            {selectedAudioFiles.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Tooltip title="Start uploading selected voice notes">
                  <span>
                    <Button
                      onClick={handleVoiceNotesUpload}
                      disabled={loading || createLoading}
                      variant="contained"
                      size="small"
                      startIcon={<CloudUpload sx={{ fontSize: "17px !important" }} />}
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
                      Upload {selectedAudioFiles.length} File{selectedAudioFiles.length > 1 ? "s" : ""}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>

        {/* Voice Notes List */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f1f1",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(12, 102, 228, 0.3)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "rgba(12, 102, 228, 0.5)",
            },
          }}
        >
          {voiceNotes && voiceNotes.data && voiceNotes.data.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {voiceNotes.data.map((voiceNote: TicketVoiceNoteData) => (
                <Card
                  key={voiceNote.id}
                  sx={{
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    "&:hover": { boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ p: "16px !important" }}>
                    {/* Voice Note Header */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          sx={{ width: 36, height: 36, bgcolor: "primary.light", color: "primary.main" }}
                        >
                          <PersonIcon sx={{ fontSize: "1.2rem" }} />
                        </Avatar>
                        <Box>
                          {/* <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        User #{voiceNote.user_id}
                                                    </Typography> */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            {/* <AccessTimeIcon sx={{ fontSize: "0.8rem", color: "#666" }} /> */}
                            <Typography
                              variant="caption"
                              sx={{ color: "#5E6C84", fontWeight: 500 }}
                            >
                              <span style={{ color: "#172B4D", fontWeight: 600 }}>Uploaded At:</span>{" "}
                              {formatDate(voiceNote.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Tooltip title="Delete this voice note">
                        <IconButton
                          onClick={() =>
                            handleDeleteVoiceNote(
                              voiceNote.id,
                              voiceNote.voice_note_url
                            )
                          }
                          disabled={deleteLoading}
                          sx={{ color: "#d32f2f" }}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Audio Player */}
                    <Box
                      sx={{
                        bgcolor: "#f5f5f5",
                        borderRadius: "4px",
                        p: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1, color: "#666" }}>
                        {getFileName(voiceNote.voice_note_url)}
                      </Typography>
                      <audio
                        controls
                        style={{
                          width: "100%",
                          height: "40px",
                        }}
                      >
                        <source
                          src={voiceNote.voice_note_url}
                          type="audio/mpeg"
                        />
                        <source
                          src={voiceNote.voice_note_url}
                          type="audio/ogg"
                        />
                        <source
                          src={voiceNote.voice_note_url}
                          type="audio/wav"
                        />
                        Your browser does not support the audio element.
                      </audio>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "#666",
              }}
            >
              <AudioFileIcon sx={{ fontSize: "3rem", mb: 1, opacity: 0.5 }} />
              <Typography variant="h6">No voice notes yet</Typography>
              <Typography variant="body2">
                Upload your first voice note using the form above
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Toast
        alerting={toast.toastAlert}
        severity={toast.toastSeverity}
        message={toast.toastMessage}
      />

      {(loading || createLoading || deleteLoading) && <Loader />}
    </Box>
  );
};

export default TicketVoiceNotes;
