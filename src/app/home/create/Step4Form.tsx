'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
  TextField,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Utility } from "@/utils";
import { axiosInstance } from "@/apis/config/axiosConfig";
import { getCompanyId } from "@/utils/cookies";
import {
  STEP4_FIELD_LABELS as FIELD_LABELS,
  STEP4_FIELD_HINTS as FIELD_HINTS,
  STEP4_DOC_KEY_TO_DB_TYPE,
} from "./formConstants";
import { focusAndScrollToField } from "./validationSchemas";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Step4FormProps {
  handleNext: () => void;
  handleBack: () => void;
  allUploadsSuccess?: boolean;
  aadharUploadsSuccess?: boolean;
  setAadharUploadsSuccess: (value: boolean) => void;
}

interface FileSlot {
  file: File | null;
  uploadedUrl?: string | null;
  uploadedName?: string | null;
}

interface UploadedDoc {
  url: string;
  name: string;
  pdf_password?: string;
}

const STEP4_DEFAULT_KEYS = [
  "aadharFront",
  "aadharBack",
  "pancard",
  "passportSizePhoto",
  "currentAddressProof",
  "permanentAddressProof",
  "salarySlip",
  "form26as",
];

const STEP4_DOC_KEY_TO_DB_MATCHERS: Record<string, string[]> = {
  aadharFront: ["aadhaar front", "aadhar front"],
  aadharBack: ["aadhaar back", "aadhar back"],
  pancard: ["pancard", "pan card", "pan"],
  passportSizePhoto: ["profile photo", "photo", "passport photo"],
  currentAddressProof: ["current address proof", "electricity bill", "utility bill"],
  permanentAddressProof: ["current address proof", "ownership proof", "utility bill", "electricity bill"],
  salarySlip: ["salary slip", "salary slips"],
  form26as: ["form 26 as", "form 26as"],
};

function buildInitialStep4Slots(): Record<string, FileSlot> {
  const result: Record<string, FileSlot> = {};
  let cached: Record<string, any> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("step4UploadedDocs");
      if (raw) cached = JSON.parse(raw);
    } catch (e) { }
  }
  STEP4_DEFAULT_KEYS.forEach((k) => {
    result[k] = {
      file: null,
      uploadedUrl: cached[k]?.url || null,
      uploadedName: cached[k]?.name || null,
    };
  });
  return result;
}

function cleanPasswordString(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === "string" || typeof parsed === "number") {
      str = String(parsed).trim();
    }
  } catch { }
  return str.replace(/^["'\\]+|["'\\]+$/g, "").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const Step4Form: React.FC<Step4FormProps> = ({
  handleNext,
  handleBack,
  allUploadsSuccess,
  setAadharUploadsSuccess,
}) => {
  const { getLocalStorage, setLocalStorage } = Utility();
  const customerId = getLocalStorage("customerInfo")?.id;
  const companyId = getCompanyId() || getLocalStorage("selectedCompanyId");

  const [files, setFiles] = useState<Record<string, FileSlot>>(() =>
    buildInitialStep4Slots()
  );

  const [uploadedBankStatements, setUploadedBankStatements] = useState<UploadedDoc[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step4UploadedBankStatements");
        if (raw) return JSON.parse(raw);
      } catch (e) { }
    }
    return [];
  });

  const [bankingFiles, setBankingFiles] = useState<File[]>([]);
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step4SameAsCurrentAddress");
        if (raw === "true" || raw === true) return true;
      } catch (e) { }
    }
    return false;
  });

  const [isPdfProtected, setIsPdfProtected] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step4IsPdfProtected");
        if (raw === "true" || raw === true) return true;
      } catch (e) { }
    }
    return false;
  });

  const [bankingPassword, setBankingPassword] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step4BankingPassword");
        if (raw) {
          return cleanPasswordString(raw);
        }
      } catch (e) { }
    }
    return "";
  });

  const [isUploading, setIsUploading] = useState(false);

  // Fetch previously uploaded documents for this customer from database
  useEffect(() => {
    const fetchExistingDocuments = async () => {
      if (!customerId) return;
      try {
        const { data: response } = await axiosInstance.get(
          `${process.env.NEXT_PUBLIC_WEB_URL}/get-customer-documents/${customerId}`
        );
        const docs = response?.data || response;
        if (Array.isArray(docs) && docs.length > 0) {
          // 1. Process standard single-slot documents
          setFiles((prev) => {
            const updated = { ...prev };
            const cacheToSave: Record<string, { url: string; name: string }> = {};

            const addressDocs = docs.filter((d: any) => {
              const docType = (d.type || "").toLowerCase();
              return (
                docType === "current address proof" ||
                docType === "electricity bill" ||
                docType === "utility bill" ||
                docType === "ownership proof"
              );
            });

            STEP4_DEFAULT_KEYS.forEach((key) => {
              let matched: any = null;
              if (key === "currentAddressProof") {
                matched = addressDocs[0];
              } else if (key === "permanentAddressProof") {
                matched = addressDocs.length > 1 ? addressDocs[1] : (sameAsCurrentAddress ? addressDocs[0] : null);
              } else {
                const matchers = STEP4_DOC_KEY_TO_DB_MATCHERS[key] || [STEP4_DOC_KEY_TO_DB_TYPE[key]?.toLowerCase() || key.toLowerCase()];
                matched = docs.find((d: any) => {
                  const docType = (d.type || "").toLowerCase();
                  return matchers.includes(docType);
                });
              }

              if (matched && matched.document_url) {
                const fileName = matched.document_url.split("/").pop() || FIELD_LABELS[key] || "Uploaded Document";
                updated[key] = {
                  file: prev[key]?.file || null,
                  uploadedUrl: matched.document_url,
                  uploadedName: fileName,
                };
                cacheToSave[key] = { url: matched.document_url, name: fileName };
              }
            });

            if (Object.keys(cacheToSave).length > 0) {
              setLocalStorage("step4UploadedDocs", cacheToSave);
            }
            return updated;
          });

          // 2. Process Bank Statements
          const bankDocs = docs.filter(
            (d: any) => (d.type || "").toLowerCase() === "bank statement" && d.document_url
          );
          if (bankDocs.length > 0) {
            const mappedBankDocs: UploadedDoc[] = bankDocs.map((d: any) => ({
              url: d.document_url,
              name: d.document_url.split("/").pop() || "Bank Statement",
              pdf_password: cleanPasswordString(d.pdf_password || ""),
            }));
            setUploadedBankStatements(mappedBankDocs);
            setLocalStorage("step4UploadedBankStatements", mappedBankDocs);
          }

          // 3. Restore PDF Password if present in any document
          const withPassword = docs.find((d: any) => Boolean(d.pdf_password));
          if (withPassword && withPassword.pdf_password) {
            const cleanPwd = cleanPasswordString(withPassword.pdf_password);
            if (cleanPwd) {
              setIsPdfProtected(true);
              setBankingPassword(cleanPwd);
              setLocalStorage("step4IsPdfProtected", true);
              setLocalStorage("step4BankingPassword", cleanPwd);
            }
          }
        }
      } catch (err) {
        console.log("Error fetching existing documents in Step4Form:", err);
      }
    };
    fetchExistingDocuments();
  }, [customerId, sameAsCurrentAddress]);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const bankInputRef = useRef<HTMLInputElement | null>(null);

  const handleToast = (message: string, severity: "success" | "error") => {
    setToast({ open: true, message, severity });
  };

  // Date calculation for Statement Date Example (e.g. "15 Sep" and "1 Mar")
  const currentDate = new Date();
  const currentDayMonth = `${currentDate.getDate()} ${currentDate.toLocaleDateString("en-US", {
    month: "short",
  })}`;
  const sixMonthsAgoDate = new Date();
  sixMonthsAgoDate.setMonth(currentDate.getMonth() - 6);
  sixMonthsAgoDate.setDate(1); // Starting date must always be the 1st of the month
  const sixMonthsAgoDayMonth = `1 ${sixMonthsAgoDate.toLocaleDateString("en-US", {
    month: "short",
  })}`;

  // Handle single file change
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      handleToast(`${file.name} exceeds the 10 MB limit`, "error");
      return;
    }
    setFiles((prev) => {
      const updated = { ...prev, [field]: { file, uploadedUrl: null, uploadedName: null } };
      if (field === "currentAddressProof" && sameAsCurrentAddress) {
        updated.permanentAddressProof = { file, uploadedUrl: null, uploadedName: null };
      }
      return updated;
    });
  };

  const handleFileDelete = (field: string) => {
    setFiles((prev) => {
      const updated = { ...prev, [field]: { file: null, uploadedUrl: null, uploadedName: null } };
      if (field === "currentAddressProof" && sameAsCurrentAddress) {
        updated.permanentAddressProof = { file: null, uploadedUrl: null, uploadedName: null };
      }
      return updated;
    });
    try {
      const raw = localStorage.getItem("step4UploadedDocs");
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed[field];
        if (field === "currentAddressProof" && sameAsCurrentAddress) {
          delete parsed["permanentAddressProof"];
        }
        setLocalStorage("step4UploadedDocs", parsed);
      }
    } catch (e) { }
  };

  const handleSameAsCurrentChange = (checked: boolean) => {
    setSameAsCurrentAddress(checked);
    if (checked) {
      setFiles((prev) => ({
        ...prev,
        permanentAddressProof: { file: prev.currentAddressProof?.file || null },
      }));
    } else {
      setFiles((prev) => ({
        ...prev,
        permanentAddressProof: { file: null },
      }));
    }
  };

  // Handle multiple banking files
  const handleBankingFilesAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const validFiles: File[] = [];
    for (const f of selected) {
      if (f.size > 15 * 1024 * 1024) {
        handleToast(`${f.name} exceeds 15 MB limit`, "error");
      } else {
        validFiles.push(f);
      }
    }

    setBankingFiles((prev) => [...prev, ...validFiles]);
    if (bankInputRef.current) bankInputRef.current.value = "";
  };

  const handleBankingFileDelete = (index: number) => {
    setBankingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadedBankStatementDelete = (index: number) => {
    setUploadedBankStatements((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setLocalStorage("step4UploadedBankStatements", updated);
      return updated;
    });
  };

  // ── Upload Handler ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!navigator.onLine) {
      handleToast("No internet connection. Please try again later.", "error");
      return;
    }

    const hasAnyNewFile =
      Object.values(files).some((slot) => slot.file !== null) ||
      bankingFiles.length > 0;

    if (isPdfProtected && (!bankingPassword || !bankingPassword.trim())) {
      handleToast("Please enter the PDF password for your protected bank statement.", "error");
      focusAndScrollToField("field-banking-password");
      return;
    }

    if (!hasAnyNewFile) {
      const hasAnyUploaded =
        Object.values(files).some((slot) => Boolean(slot.uploadedUrl)) ||
        uploadedBankStatements.length > 0;
      if (hasAnyUploaded) {
        setAadharUploadsSuccess(true);
        setLocalStorage("profileDetail", true);
        setLocalStorage("activeStep", 3);
        handleToast("Core documents verified. Proceeding...", "success");
        handleNext();
        return;
      }
      handleToast("Please select at least one file to upload.", "error");
      focusAndScrollToField("field-bank-statements-card");
      return;
    }

    setIsUploading(true);
    let allSuccess = true;

    // Helper to upload a file to S3
    const uploadFileToS3 = async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("folder", `document/${file.name}`);
      if (companyId) formData.append("companyId", companyId);

      const uploadRes = await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return uploadRes.data?.data || null;
    };

    // Helper to save document record
    const saveDocRecord = async (
      attachmentUrl: string,
      type: string,
      pdfPassword?: string
    ) => {
      if (!customerId) return;
      await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/create-document`,
        {
          document_url: attachmentUrl,
          customer_id: customerId,
          type,
          company_id: companyId,
          ...(pdfPassword ? { pdf_password: pdfPassword } : {}),
        }
      );
    };

    // 1. Upload standard single-slot documents (excluding address proofs)
    const standardFields = Object.entries(files).filter(
      ([key]) => key !== "currentAddressProof" && key !== "permanentAddressProof"
    );
    const cacheToSave: Record<string, { url: string; name: string }> = {};

    for (const [fieldKey, slot] of standardFields) {
      if (slot.file) {
        try {
          const attachmentUrl = await uploadFileToS3(slot.file);
          if (attachmentUrl) {
            await saveDocRecord(
              attachmentUrl,
              STEP4_DOC_KEY_TO_DB_TYPE[fieldKey] ?? fieldKey
            );
            slot.uploadedUrl = attachmentUrl;
            slot.uploadedName = slot.file.name;
            cacheToSave[fieldKey] = { url: attachmentUrl, name: slot.file.name };
          }
        } catch (err) {
          console.error(`Error uploading ${fieldKey}:`, err);
          allSuccess = false;
        }
      }
    }

    // 2. Handle Address Proofs (current & permanent) with S3 deduplication
    try {
      let currentAddressUrl: string | null = null;
      if (files.currentAddressProof.file) {
        currentAddressUrl = await uploadFileToS3(files.currentAddressProof.file);
        if (currentAddressUrl) {
          await saveDocRecord(
            currentAddressUrl,
            STEP4_DOC_KEY_TO_DB_TYPE["currentAddressProof"] ?? "current address proof"
          );
          files.currentAddressProof.uploadedUrl = currentAddressUrl;
          files.currentAddressProof.uploadedName = files.currentAddressProof.file.name;
          cacheToSave["currentAddressProof"] = { url: currentAddressUrl, name: files.currentAddressProof.file.name };
        }
      }

      if (sameAsCurrentAddress && currentAddressUrl) {
        // Reuse current address URL directly without uploading to S3 again
        await saveDocRecord(
          currentAddressUrl,
          STEP4_DOC_KEY_TO_DB_TYPE["permanentAddressProof"] ?? "current address proof"
        );
        files.permanentAddressProof.uploadedUrl = currentAddressUrl;
        files.permanentAddressProof.uploadedName = files.currentAddressProof.uploadedName || "Current Address Proof";
        cacheToSave["permanentAddressProof"] = { url: currentAddressUrl, name: files.permanentAddressProof.uploadedName };
      } else if (!sameAsCurrentAddress && files.permanentAddressProof.file) {
        // Separate upload for different permanent address document
        const permanentAddressUrl = await uploadFileToS3(files.permanentAddressProof.file);
        if (permanentAddressUrl) {
          await saveDocRecord(
            permanentAddressUrl,
            STEP4_DOC_KEY_TO_DB_TYPE["permanentAddressProof"] ?? "current address proof"
          );
          files.permanentAddressProof.uploadedUrl = permanentAddressUrl;
          files.permanentAddressProof.uploadedName = files.permanentAddressProof.file.name;
          cacheToSave["permanentAddressProof"] = { url: permanentAddressUrl, name: files.permanentAddressProof.file.name };
        }
      }
    } catch (err) {
      console.error("Error uploading address proof:", err);
      allSuccess = false;
    }

    // 3. Upload banking statements
    const cleanPwd = cleanPasswordString(bankingPassword);
    const uploadedBankDocsToCache: UploadedDoc[] = [...uploadedBankStatements];
    for (const file of bankingFiles) {
      try {
        const attachmentUrl = await uploadFileToS3(file);
        if (attachmentUrl) {
          await saveDocRecord(
            attachmentUrl,
            "bank statement",
            isPdfProtected && cleanPwd ? cleanPwd : undefined
          );
          uploadedBankDocsToCache.push({
            url: attachmentUrl,
            name: file.name,
            pdf_password: isPdfProtected && cleanPwd ? cleanPwd : "",
          });
        }
      } catch (err) {
        console.error("Error uploading banking statement:", err);
        allSuccess = false;
      }
    }

    if (uploadedBankDocsToCache.length > uploadedBankStatements.length) {
      setUploadedBankStatements(uploadedBankDocsToCache);
      setLocalStorage("step4UploadedBankStatements", uploadedBankDocsToCache);
      setBankingFiles([]);
    }

    if (Object.keys(cacheToSave).length > 0) {
      try {
        const raw = localStorage.getItem("step4UploadedDocs");
        const prevCache = raw ? JSON.parse(raw) : {};
        setLocalStorage("step4UploadedDocs", { ...prevCache, ...cacheToSave });
      } catch (e) { }
    }

    setIsUploading(false);
    if (allSuccess) {
      setAadharUploadsSuccess(true);
      setLocalStorage("profileDetail", true);
      handleToast("Core documents uploaded successfully!", "success");
      handleNext();
    } else {
      handleToast("Some documents failed to upload. Please retry.", "error");
    }
  }, [
    files,
    sameAsCurrentAddress,
    bankingFiles,
    uploadedBankStatements,
    isPdfProtected,
    bankingPassword,
    companyId,
    customerId,
    handleNext,
    setAadharUploadsSuccess,
    setLocalStorage,
  ]);

  // ── Unified Card Component ─────────────────────────────────────────────────
  const CoreDocumentCard = ({
    field,
    disabled = false,
  }: {
    field: string;
    disabled?: boolean;
  }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const label = FIELD_LABELS[field] || field;
    const hint = FIELD_HINTS[field];
    const slot = files[field] || { file: null };

    return (
      <Box
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "#cbd5e1",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          },
          ...(disabled && {
            opacity: 0.75,
            backgroundColor: "#f8fafc",
          }),
        }}
      >
        {/* Title and Hint */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0f172a",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {label.includes("* (Mandatory)") ? (
              <>
                {label.replace("* (Mandatory)", "").trim()}{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
              </>
            ) : label.endsWith(" *") ? (
              <>
                {label.slice(0, -2)}{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
              </>
            ) : label.includes("(Optional)") ? (
              <>
                {label.replace("(Optional)", "").trim()}{" "}
                <span style={{ color: "#64748b", fontWeight: 500 }}>(Optional)</span>
              </>
            ) : (
              label
            )}
          </Typography>
          {hint && (
            <Typography
              sx={{
                fontSize: "12px",
                color: "#64748b",
                mt: 0.5,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {hint}
            </Typography>
          )}
        </Box>

        {/* Upload Button or Selected File Display */}
        <Box>
          {!slot.file && !slot.uploadedUrl ? (
            <Box>
              <input
                ref={inputRef}
                hidden
                type="file"
                disabled={disabled}
                accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange(e, field)}
              />
              <Button
                component="span"
                onClick={() => !disabled && inputRef.current?.click()}
                variant="outlined"
                disabled={disabled}
                startIcon={<FileUploadOutlinedIcon sx={{ fontSize: 18, color: "#2563eb" }} />}
                sx={{
                  width: "100%",
                  borderRadius: "24px",
                  textTransform: "none",
                  borderColor: "#bfdbfe",
                  color: "#2563eb",
                  fontWeight: 600,
                  fontSize: "13px",
                  px: 2.5,
                  py: 0.85,
                  backgroundColor: "#ffffff",
                  fontFamily: "'Inter', sans-serif",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    backgroundColor: "#eff6ff",
                  },
                }}
              >
                {disabled ? "Mirrored from Current Address" : "Browse File"}
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 1.25,
                border: slot.file ? "1.5px solid #c7d2fe" : "1.5px solid #86efac",
                borderRadius: "10px",
                backgroundColor: slot.file ? "#eef2ff" : "#f0fdf4",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, overflow: "hidden", minWidth: 0, flex: 1 }}>
                <InsertDriveFileIcon sx={{ color: slot.file ? "#2563eb" : "#16a34a", fontSize: 22, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#1e293b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {slot.file ? slot.file.name : slot.uploadedName || "Uploaded Document"}
                    </Typography>
                    {slot.file && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          px: 1,
                          py: 0.2,
                          borderRadius: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Ready to upload
                      </Box>
                    )}
                    {slot.uploadedUrl && !slot.file && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          px: 1,
                          py: 0.2,
                          borderRadius: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✓ Uploaded
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleFileDelete(field)}
                  sx={{
                    color: "#ef4444",
                    backgroundColor: "#fef2f2",
                    ml: 1,
                    flexShrink: 0,
                    "&:hover": { backgroundColor: "#fee2e2" },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", py: 1 }}>
      {/* Step Header */}
      <Box sx={{ mb: 3.5, textAlign: "center" }}>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: { xs: "1.5rem", sm: "1.85rem" },
            color: "#0f172a",
            fontWeight: 700,
            mb: 0.5,
          }}
        >
          Profile Details and <span style={{ color: "#3949ab" }}>Core Proofs</span>
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "#64748b",
            fontWeight: 500,
            mb: 1,
          }}
        >
          Mandatory identification, address proofs, and financial verification documents
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "#475569",
            fontWeight: 500,
          }}
          variant="subtitle1"
        >
          Step 3/4
        </Typography>
      </Box>

      {/* 2-Column Grid for Core Documents */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2.5,
          mb: 3,
        }}
      >
        {/* 1. Aadhar Card Front */}
        <CoreDocumentCard field="aadharFront" />

        {/* 2. Aadhar Card Back */}
        <CoreDocumentCard field="aadharBack" />

        {/* 3. Pan Card */}
        <CoreDocumentCard field="pancard" />

        {/* 4. Passport Size Photo */}
        <CoreDocumentCard field="passportSizePhoto" />

        {/* 5. Address Proof for Current Address */}
        <CoreDocumentCard field="currentAddressProof" />

        {/* 6. Address Proof for Permanent Address */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <CoreDocumentCard
            field="permanentAddressProof"
            disabled={sameAsCurrentAddress}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={sameAsCurrentAddress}
                onChange={(e) => handleSameAsCurrentChange(e.target.checked)}
                sx={{
                  color: "#94a3b8",
                  "&.Mui-checked": { color: "#3949ab" },
                  py: 0.5,
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#475569",
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Same as current address
              </Typography>
            }
            sx={{ ml: 0.5 }}
          />
        </Box>

        {/* 7. 3 Months Salary Slips (Optional) */}
        <CoreDocumentCard field="salarySlip" />

        {/* 8. Form 26AS (Last 2 Financial Years) (Optional) */}
        <CoreDocumentCard field="form26as" />

        {/* 9. 6 Months Bank Statement (Full Width) */}
        <Box
          id="field-bank-statements-card"
          sx={{
            gridColumn: { xs: "1", sm: "1 / -1" },
            border: "1.5px solid #e2e8f0",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            p: { xs: 2.5, sm: 3 },
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#cbd5e1",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            },
          }}
        >
          {/* Header Row */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                flexShrink: 0,
                mt: 0.2,
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#0f172a",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                6 Months Bank Statement{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
              </Typography>
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#64748b",
                  mt: 0.25,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Please upload your updated 6 months bank statement
              </Typography>
            </Box>
          </Box>

          {/* Statement Date Example Box */}
          <Box
            sx={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              p: 2,
              mb: 2.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
            }}
          >
            <InfoOutlinedIcon sx={{ color: "#d97706", fontSize: 20, mt: 0.2, flexShrink: 0 }} />
            <Box>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#92400e",
                  fontFamily: "'Inter', sans-serif",
                  mb: 0.25,
                }}
              >
                Statement Date Example:
              </Typography>
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#78350f",
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                For Example: As today is {currentDayMonth}, please upload the bank statement from{" "}
                <strong>{sixMonthsAgoDayMonth}</strong> to <strong>{currentDayMonth}</strong>.{" "}
                <span style={{ color: "#b45309" }}>(Note:  Bank statements must start from the 1st date of the month, not mid-month)</span>
              </Typography>
            </Box>
          </Box>

          {/* Action Row & Uploaded Bank Statements */}
          <Box sx={{ mb: 2.5 }}>
            <input
              ref={bankInputRef}
              hidden
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleBankingFilesAdd}
            />
            <Button
              component="span"
              onClick={() => bankInputRef.current?.click()}
              variant="contained"
              startIcon={<FileUploadOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "24px",
                textTransform: "none",
                backgroundColor: "#ea580c",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                px: 2.5,
                py: 0.85,
                mb: uploadedBankStatements.length > 0 || bankingFiles.length > 0 ? 2 : 0,
                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                fontFamily: "'Inter', sans-serif",
                "&:hover": {
                  backgroundColor: "#c2410c",
                  boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                },
              }}
            >
              Browse Statement File(s)
            </Button>

            {/* List of Uploaded and Newly Picked Bank Statements */}
            {(uploadedBankStatements.length > 0 || bankingFiles.length > 0) && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                {/* Render already uploaded Bank Statements */}
                {uploadedBankStatements.map((doc, idx) => (
                  <Box
                    key={`uploaded-bank-${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2,
                      py: 1.25,
                      border: "1.5px solid #86efac",
                      borderRadius: "10px",
                      backgroundColor: "#f0fdf4",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, overflow: "hidden", minWidth: 0, flex: 1 }}>
                      <InsertDriveFileIcon sx={{ color: "#16a34a", fontSize: 22, flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#1e293b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {doc.name}
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#dcfce7",
                              color: "#15803d",
                              px: 1,
                              py: 0.2,
                              borderRadius: "12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✓ Uploaded
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleUploadedBankStatementDelete(idx)}
                      sx={{
                        color: "#ef4444",
                        backgroundColor: "#fef2f2",
                        ml: 1,
                        flexShrink: 0,
                        "&:hover": { backgroundColor: "#fee2e2" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {/* Render selected PDF files */}
                {bankingFiles.map((file, idx) => (
                  <Box
                    key={`new-bank-${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2,
                      py: 1.25,
                      border: "1.5px solid #c7d2fe",
                      borderRadius: "10px",
                      backgroundColor: "#eef2ff",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, overflow: "hidden", minWidth: 0, flex: 1 }}>
                      <InsertDriveFileIcon sx={{ color: "#2563eb", fontSize: 22, flexShrink: 0 }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.name}
                        </Typography>
                        <Box
                          component="span"
                          sx={{
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#e0e7ff",
                            color: "#3730a3",
                            px: 1,
                            py: 0.2,
                            borderRadius: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Ready to upload
                        </Box>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleBankingFileDelete(idx)}
                      sx={{
                        color: "#ef4444",
                        backgroundColor: "#fef2f2",
                        ml: 1,
                        flexShrink: 0,
                        "&:hover": { backgroundColor: "#fee2e2" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Password Protection */}
          <Box
            sx={{
              p: 2,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPdfProtected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsPdfProtected(checked);
                    setLocalStorage("step4IsPdfProtected", checked);
                    if (!checked) {
                      setBankingPassword("");
                      setLocalStorage("step4BankingPassword", "");
                    }
                  }}
                  sx={{
                    color: "#94a3b8",
                    "&.Mui-checked": { color: "#3949ab" },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Is Bank Statement PDF Password Protected?
                </Typography>
              }
            />
            {isPdfProtected && (
              <TextField
                id="field-banking-password"
                fullWidth
                size="small"
                label="PDF Password"
                placeholder="Enter bank statement PDF password"
                value={cleanPasswordString(bankingPassword)}
                onChange={(e) => {
                  const val = cleanPasswordString(e.target.value);
                  setBankingPassword(val);
                  setLocalStorage("step4BankingPassword", val);
                }}
                sx={{
                  mt: 1.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Navigation & Submit Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 4,
          mb: 6,
          px: 1,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
          onClick={() => {
            setLocalStorage("activeStep", 1);
            handleBack();
          }}
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "#475569",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "8px",
            px: 2.5,
            py: 0.9,
            minWidth: "auto",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: "#f1f5f9",
              color: "#3949ab",
              borderColor: "#cbd5e1",
              boxShadow: "0 2px 5px rgba(57, 73, 171, 0.08)",
            },
          }}
        >
          Back
        </Button>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            color="primary"
            disabled={isUploading}
            onClick={handleUpload}
            variant="contained"
            startIcon={
              isUploading ? (
                <CircularProgress size={18} sx={{ color: "#ffffff" }} />
              ) : undefined
            }
            sx={{
              color: "#ffffff",
              backgroundColor: "#3949ab",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              borderRadius: "8px",
              minWidth: "180px",
              height: "44px",
              padding: "10px 28px",
              boxShadow: "0px 8px 20px rgba(57, 73, 171, 0.35)",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#303f9f",
                boxShadow: "0px 10px 25px rgba(57, 73, 171, 0.45)",
                transform: "translateY(-2px)",
              },
              "&.Mui-disabled": {
                backgroundColor: isUploading ? "#3949ab" : "#e2e8f0",
                color: isUploading ? "#ffffff" : "#94a3b8",
                opacity: isUploading ? 0.85 : 1,
                boxShadow: "none",
                cursor: "not-allowed",
              },
            }}
          >
            {isUploading ? "Uploading..." : "Upload & Proceed"}
          </Button>

          <Button
            onClick={() => {
              const hasAnyUploaded =
                Object.values(files).some((slot) => Boolean(slot.uploadedUrl)) ||
                uploadedBankStatements.length > 0;
              const hasAnySelected =
                Object.values(files).some((slot) => slot.file !== null) ||
                bankingFiles.length > 0;

              if (!hasAnyUploaded && !hasAnySelected) {
                handleToast("Please upload at least 1 document to proceed to the next step.", "error");
                return;
              }

              if (hasAnySelected && !hasAnyUploaded) {
                handleToast("Please click 'Upload & Proceed' to submit your selected files before proceeding.", "error");
                return;
              }

              setLocalStorage("activeStep", 3);
              handleNext();
            }}
            variant="outlined"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#3949ab",
              backgroundColor: "#f8fafc",
              border: "1.5px solid #c7d2fe",
              textTransform: "none",
              borderRadius: "8px",
              minWidth: "130px",
              height: "44px",
              px: 3,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#eff6ff",
                borderColor: "#3949ab",
                transform: "translateY(-1px)",
              },
            }}
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Toast Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Step4Form;
