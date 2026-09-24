'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Utility } from "@/utils";
import { axiosInstance } from "@/apis/config/axiosConfig";
import { getCompanyId } from "@/utils/cookies";
import {
  DOC_KEY_TO_DB_TYPE,
  STEP3_FIELD_LABELS as FIELD_LABELS,
  isDoctorLoan,
  isCaCsCmaLoan,
  getFieldKeys,
  getHeading,
  getSubheading,
  getEntityLabel,
} from "./formConstants";
import { validatePartnerDetails, panRegExp, emailRegExp, focusAndScrollToField } from "./validationSchemas";

interface Step3FormProps {
  handleNext: () => void;
  allUploadsSuccess: boolean | null;
  setAllUploadsSuccess: (value: boolean) => void;
}

interface FileSlot {
  file: File | null;
  uploadedUrl?: string | null;
  uploadedName?: string | null;
}

function buildInitialSlots(keys: string[]): Record<string, FileSlot> {
  const result: Record<string, FileSlot> = {};
  let cached: Record<string, any> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("step3UploadedDocs");
      if (raw) cached = JSON.parse(raw);
    } catch (e) { }
  }
  keys.forEach((k) => {
    result[k] = {
      file: null,
      uploadedUrl: cached[k]?.url || null,
      uploadedName: cached[k]?.name || null,
    };
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const Step3Form: React.FC<Step3FormProps> = ({
  handleNext,
  allUploadsSuccess,
  setAllUploadsSuccess,
}) => {
  const { getLocalStorage, setLocalStorage } = Utility();

  // Read loanType, entityType and employmentType from localStorage (written by Step1Form on submit)
  const pendingData = getLocalStorage("pendingApplicationData");
  const storedCustomer = getLocalStorage("customerInfo");
  const customerId = storedCustomer?.id || pendingData?.customerId;
  const companyId = getCompanyId() || getLocalStorage("selectedCompanyId") || storedCustomer?.company_id;

  const loanType: string = pendingData?.loanTypes?.[0] || "";
  const entityType: string = pendingData?.businessEntityType || "";
  const employmentType: string = pendingData?.employment_type || "";

  const fieldKeys = getFieldKeys(loanType, entityType, employmentType);

  const isKnownLoanType =
    loanType === "personal loan" ||
    loanType === "home loan" ||
    loanType === "lap" ||
    loanType === "loan against property" ||
    loanType === "education loan" ||
    loanType === "business loan" ||
    isDoctorLoan(loanType) ||
    isCaCsCmaLoan(loanType) ||
    loanType === "auto loan" ||
    loanType === "machinery loan";

  // ── File slots state ───────────────────────────────────────────────────────
  const [files, setFiles] = useState<Record<string, FileSlot>>(() =>
    buildInitialSlots(fieldKeys)
  );

  // Reset slots when loanType/entityType/employmentType changes (e.g. back-navigation)
  useEffect(() => {
    setFiles(buildInitialSlots(getFieldKeys(loanType, entityType, employmentType)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanType, entityType, employmentType]);

  // ── Director / Partner rows (LLP defaults to minimum 2 designated partners) ──
  const isLlp = loanType === "business loan" && entityType === "llp";
  const defaultNumPersons = isLlp ? 2 : 0;

  const [numPersons, setNumPersons] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step3NumPersons");
        if (raw !== null) {
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch (e) {}
    }
    return defaultNumPersons;
  });

  const [personDetails, setPersonDetails] = useState<
    { name: string; email: string; aadhaar: string; pan: string; mobile: string }[]
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("step3PersonDetails");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return Array.from(
      { length: defaultNumPersons },
      () => ({ name: "", email: "", aadhaar: "", pan: "", mobile: "" })
    );
  });

  const savedPartnersDbRef = useRef<
    Array<{ name: string; email: string; aadhaar: string; pan: string; mobile: string }>
  >([]);

  // Fetch previously uploaded documents and partner details for this customer
  useEffect(() => {
    const fetchExistingDocuments = async () => {
      if (!customerId) return;
      try {
        const { data: response } = await axiosInstance.get(
          `${process.env.NEXT_PUBLIC_WEB_URL}/get-customer-documents/${customerId}`
        );
        const docs = response?.data || response;
        if (Array.isArray(docs) && docs.length > 0) {
          setFiles((prev) => {
            const updated = { ...prev };
            const cacheToSave: Record<string, { url: string; name: string }> = {};

            fieldKeys.forEach((key) => {
              const dbType = DOC_KEY_TO_DB_TYPE[key]?.toLowerCase() || key.toLowerCase();
              const matched = docs.find((d: any) => {
                const docType = (d.type || "").toLowerCase();
                return docType === dbType;
              });
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
              setLocalStorage("step3UploadedDocs", cacheToSave);
            }
            return updated;
          });
        }
      } catch (err) {
        console.log("Error fetching existing documents in Step3Form:", err);
      }
    };

    const fetchExistingPartners = async () => {
      if (!customerId || !companyId) return;
      try {
        const { data: response } = await axiosInstance.get(
          `${process.env.NEXT_PUBLIC_WEB_URL}/get-customer-partners/${customerId}`,
          { headers: { companyid: String(companyId) } }
        );
        const partnerList = response?.data || response;
        if (Array.isArray(partnerList) && partnerList.length > 0) {
          const formatted = partnerList.map((p: any) => ({
            name: p.name || "",
            email: p.email || "",
            aadhaar: p.aadhaar || "",
            pan: p.pan || "",
            mobile: p.mobile || "",
          }));
          // Save existing DB snapshot to ref for diffing
          savedPartnersDbRef.current = formatted;

          setPersonDetails((prev) => {
            const hasLocalData = prev.some(
              (p) => p.name || p.aadhaar || p.pan || p.mobile || p.email
            );
            if (!hasLocalData) {
              setNumPersons(formatted.length);
              setLocalStorage("step3NumPersons", formatted.length);
              setLocalStorage("step3PersonDetails", formatted);
              return formatted;
            }
            return prev;
          });
        }
      } catch (err) {
        // 404 is normal if no partners have been saved yet
      }
    };

    fetchExistingDocuments();
    fetchExistingPartners();
  }, [customerId, companyId, fieldKeys.join(",")]);

  // Synchronize minimum 2 partners whenever LLP loan type is loaded
  useEffect(() => {
    if (loanType === "business loan" && entityType === "llp") {
      setNumPersons((prev) => {
        const nextCount = prev < 2 ? 2 : prev;
        setLocalStorage("step3NumPersons", nextCount);
        return nextCount;
      });
      setPersonDetails((prev) => {
        if (prev.length < 2) {
          const next = Array.from(
            { length: 2 },
            (_, i) => prev[i] || { name: "", email: "", aadhaar: "", pan: "", mobile: "" }
          );
          setLocalStorage("step3PersonDetails", next);
          return next;
        }
        return prev;
      });
    }
  }, [loanType, entityType, setLocalStorage]);

  const handleNumPersonsChange = (val: string) => {
    const n = parseInt(val, 10) || 0;
    setNumPersons(n);
    const updated = Array.from(
      { length: n },
      (_, i) => personDetails[i] || { name: "", email: "", aadhaar: "", pan: "", mobile: "" }
    );
    setPersonDetails(updated);
    setLocalStorage("step3NumPersons", n);
    setLocalStorage("step3PersonDetails", updated);
  };

  const updatePerson = (
    idx: number,
    field: "name" | "email" | "aadhaar" | "pan" | "mobile",
    value: string
  ) => {
    setPersonDetails((prev) => {
      const updated = prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
      setLocalStorage("step3PersonDetails", updated);
      return updated;
    });
  };



  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleToast = (message: string, severity: "success" | "error") => {
    setToast({ open: true, message, severity });
  };

  const [isUploading, setIsUploading] = useState(false);

  // ── Online / Offline listeners ─────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => handleToast("Back online", "success");
    const handleOffline = () => handleToast("You are offline", "error");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);


  // ── File handlers ──────────────────────────────────────────────────────────
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
    setFiles((prev) => ({ ...prev, [field]: { file } }));
  };

  const handleFileDelete = (field: string) => {
    setFiles((prev) => ({ ...prev, [field]: { file: null, uploadedUrl: null, uploadedName: null } }));
    try {
      const raw = localStorage.getItem("step3UploadedDocs");
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed[field];
        setLocalStorage("step3UploadedDocs", parsed);
      }
    } catch (e) { }
  };

  // Helper to persist director / partner details to dedicated customer_partner table
  const saveCustomerPartners = async () => {
    if (numPersons <= 0 || personDetails.length === 0 || !customerId || !companyId) return true;

    // Check if current personDetails matches what is already saved in the database
    const saved = savedPartnersDbRef.current || [];
    if (saved.length === personDetails.length && saved.length > 0) {
      const isIdentical = personDetails.every((p, idx) => {
        const s = saved[idx];
        if (!s) return false;
        return (
          (p.name || "").trim().toLowerCase() === (s.name || "").trim().toLowerCase() &&
          (p.email || "").trim().toLowerCase() === (s.email || "").trim().toLowerCase() &&
          (p.aadhaar || "").trim() === (s.aadhaar || "").trim() &&
          (p.pan || "").trim().toUpperCase() === (s.pan || "").trim().toUpperCase() &&
          (p.mobile || "").trim() === (s.mobile || "").trim()
        );
      });

      if (isIdentical) {
        // Partner data is already present in DB and has not changed; skip redundant API call
        return true;
      }
    }

    const isPartnershipOrLlp =
      (loanType === "business loan" && (entityType === "partnership" || entityType === "llp")) ||
      entityType === "partnership" ||
      entityType === "llp";
    const role = isPartnershipOrLlp ? "partner" : "director";

    const partnersPayload = personDetails.map((p) => ({
      customer_id: Number(customerId),
      company_id: Number(companyId),
      role,
      name: p.name || "",
      email: p.email || "",
      aadhaar: p.aadhaar || "",
      pan: p.pan || "",
      mobile: p.mobile || "",
    }));

    try {
      await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/create-customer-partners`,
        partnersPayload,
        { headers: { companyid: String(companyId) } }
      );
      // Update DB snapshot in memory upon successful creation
      savedPartnersDbRef.current = personDetails.map((p) => ({
        name: p.name || "",
        email: p.email || "",
        aadhaar: p.aadhaar || "",
        pan: p.pan || "",
        mobile: p.mobile || "",
      }));
      return true;
    } catch (err) {
      console.error("Error saving customer partner details:", err);
      return false;
    }
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!navigator.onLine) {
      handleToast("No internet connection. Please try again later.", "error");
      return;
    }

    // Validate partner/director details if numPersons > 0
    if (numPersons > 0) {
      const isPartnership =
        (loanType === "business loan" && entityType === "partnership") ||
        entityType === "partnership";
      const partnerLabel =
        entityType === "llp" || entityType === "pvt_ltd" || entityType === "public_ltd"
          ? "Director"
          : "Partner";
      const validation = validatePartnerDetails(personDetails, {
        label: partnerLabel,
        requireEmail: !isPartnership,
      });

      if (!validation.isValid) {
        handleToast(validation.error || "Please fill all partner/director details correctly.", "error");
        if (validation.fieldId) {
          focusAndScrollToField(validation.fieldId);
        }
        return;
      }
    }

    const activeSlots = Object.entries(files).filter(([, v]) => v.file !== null);

    if (activeSlots.length === 0) {
      const hasUploaded = Object.values(files).some((v) => Boolean(v.uploadedUrl));
      if (hasUploaded) {
        // Persist any updated partner details to customer_partner table
        await saveCustomerPartners();

        setAllUploadsSuccess(true);
        setLocalStorage("StatementUpload", true);
        setLocalStorage("StatementUploadSkipped", false);
        setLocalStorage("activeStep", 2);
        handleToast("Documents verified. Proceeding...", "success");
        handleNext();
        return;
      }
      handleToast("Please select at least one file to upload.", "error");
      return;
    }

    setIsUploading(true);
    let allSuccess = true;
    const cacheToSave: Record<string, { url: string; name: string }> = {};

    for (const [docKey, slot] of activeSlots) {
      const file = slot.file!;
      const formData = new FormData();
      formData.append("document", file);
      formData.append("folder", `document/${file.name}`);
      if (companyId) formData.append("companyId", companyId);

      try {
        const uploadResponse = await axiosInstance.post(
          `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const attachmentUrl = uploadResponse.data.data;

        if (attachmentUrl) {
          await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/create-document`,
            {
              document_url: attachmentUrl,
              customer_id: customerId,
              type: DOC_KEY_TO_DB_TYPE[docKey] ?? docKey,
              company_id: companyId,
            }
          );
          slot.uploadedUrl = attachmentUrl;
          slot.uploadedName = file.name;
          cacheToSave[docKey] = { url: attachmentUrl, name: file.name };
        }
      } catch (err) {
        console.error(`Error uploading ${docKey}:`, err);
        handleToast(`Error uploading ${FIELD_LABELS[docKey] || docKey}`, "error");
        allSuccess = false;
      }
    }

    if (Object.keys(cacheToSave).length > 0) {
      try {
        const raw = localStorage.getItem("step3UploadedDocs");
        const prevCache = raw ? JSON.parse(raw) : {};
        setLocalStorage("step3UploadedDocs", { ...prevCache, ...cacheToSave });
      } catch (e) { }
    }

    // Persist director / partner details to dedicated customer_partner table
    await saveCustomerPartners();

    setIsUploading(false);

    if (allSuccess) {
      setAllUploadsSuccess(true);
      setLocalStorage("StatementUpload", true);
      setLocalStorage("StatementUploadSkipped", false);
      setLocalStorage("activeStep", 2);
      handleToast("Documents uploaded successfully!", "success");
      handleNext();
    }
  }, [
    files,
    companyId,
    customerId,
    numPersons,
    personDetails,
    loanType,
    handleNext,
    setAllUploadsSuccess,
    setLocalStorage,
  ]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasAnyFile = Object.values(files).some((v) => v.file !== null);
  const hasBankingField = fieldKeys.includes("banking");

  // ── Sub-components ─────────────────────────────────────────────────────────
  const FileUploadBox = ({
    label,
    field,
    disabled = false,
    hint,
    buttonText = "Browse File",
    showClickPhoto = false,
    photoButtonText = "Take Photo",
  }: {
    label: string | React.ReactNode;
    field: string;
    disabled?: boolean;
    hint?: string;
    buttonText?: string;
    showClickPhoto?: boolean;
    photoButtonText?: string;
  }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const slot = files[field] || { file: null };

    const resolvedButtonText =
      buttonText === "Upload" || buttonText === "Upload File"
        ? "Browse File"
        : buttonText;

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
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          },
          ...(disabled && {
            opacity: 0.75,
            backgroundColor: "#f8fafc",
          }),
        }}
      >
        {/* Label and Hint row */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0f172a",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {typeof label === "string" && label.includes("* (Mandatory)") ? (
              <>
                {label.replace("* (Mandatory)", "").trim()}{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
              </>
            ) : typeof label === "string" && label.includes("(Optional)") ? (
              <>
                {label.replace("(Optional)", "").trim()}{" "}
                <span style={{ color: "#64748b", fontWeight: 500 }}>(Optional)</span>
              </>
            ) : typeof label === "string" && (label.endsWith(" *") || label.includes(" *") || label.includes("*")) ? (
              <>
                {label.replace(/\*/g, "").trim()}{" "}
                <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
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

        {/* Browse Button or Selected File display */}
        <Box>
          {!slot.file && !slot.uploadedUrl ? (
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <input
                ref={inputRef}
                hidden
                type="file"
                disabled={disabled}
                accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange(e, field)}
              />
              {showClickPhoto && (
                <input
                  ref={cameraInputRef}
                  hidden
                  type="file"
                  disabled={disabled}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, field)}
                />
              )}
              <Button
                component="span"
                onClick={() => !disabled && inputRef.current?.click()}
                variant="outlined"
                disabled={disabled}
                startIcon={<FileUploadOutlinedIcon sx={{ fontSize: 18, color: "#2563eb" }} />}
                sx={{
                  flex: showClickPhoto ? "1 1 0" : "1 1 100%",
                  width: showClickPhoto ? "auto" : "100%",
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
                {disabled ? "Mirrored from Current Address" : resolvedButtonText}
              </Button>
              {showClickPhoto && (
                <Button
                  component="span"
                  onClick={() => !disabled && cameraInputRef.current?.click()}
                  variant="outlined"
                  disabled={disabled}
                  startIcon={<PhotoCameraOutlinedIcon sx={{ fontSize: 18, color: "#2563eb" }} />}
                  sx={{
                    flex: "1 1 0",
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
                  {photoButtonText}
                </Button>
              )}
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

  const SectionHeading = ({ title }: { title: string }) => (
    <Typography
      sx={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#3949ab",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        borderBottom: "1px solid #e0e7ff",
        pb: 1,
        mb: 2,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {title}
    </Typography>
  );

  const renderPersonRows = (
    label: string,
    showEmail?: boolean
  ) => {
    const isPartnership =
      (loanType === "business loan" && entityType === "partnership") ||
      label === "Partner";
    const shouldShowEmail =
      typeof showEmail === "boolean" ? showEmail : !isPartnership;

    return (
      <Box
        sx={{
          mb: 3,
          border: "1px solid #e0e7ff",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 1px 4px 0 rgba(15, 23, 42, 0.04)",
          transition: "all 0.25s ease-in-out",
        }}
      >
        {/* Top Dropdown Section */}
        <Box
          sx={{
            p: 2,
            backgroundColor: numPersons > 0 ? "#ffffff" : "#ffffff",
          }}
        >
          <FormControl
            fullWidth
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                backgroundColor: "#ffffff",
                transition: "border-color 0.2s ease",
              },
            }}
          >
            <InputLabel>Number of {label}s</InputLabel>
            <Select
              label={`Number of ${label}s`}
              value={numPersons > 0 ? String(numPersons) : ""}
              onChange={(e) => handleNumPersonsChange(e.target.value)}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Moulded Connected Partner Details Section */}
        {numPersons > 0 && (
          <Box
            sx={{
              borderTop: "1px dashed #cbd5e1",
              backgroundColor: "#f8fafc",
              p: { xs: 1.5, sm: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 2,
              animation: "fadeIn 0.25s ease-in-out",
              "@keyframes fadeIn": {
                "0%": { opacity: 0, transform: "translateY(-4px)" },
                "100%": { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {personDetails.map((person, idx) => (
              <Box
                key={`person-${idx}`}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  p: { xs: 1.5, sm: 2 },
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: "#3949ab",
                      fontWeight: 700,
                      backgroundColor: "#eef2ff",
                      border: "1px solid #e0e7ff",
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      letterSpacing: "0.2px",
                    }}
                  >
                    {label} #{idx + 1}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    id={`person_${idx}_name`}
                    label={
                      <span>
                        {label.includes("Director")
                          ? "Director Name (As per PAN)"
                          : `${label} Name (As per PAN)`}{" "}
                        <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                      </span>
                    }
                    placeholder="Full Name as per PAN"
                    value={person.name || ""}
                    onChange={(e) => updatePerson(idx, "name", e.target.value)}
                    error={Boolean(person.name && person.name.trim().length > 0 && person.name.trim().length < 2)}
                    helperText={person.name && person.name.trim().length > 0 && person.name.trim().length < 2 ? "Name must be at least 2 characters" : ""}
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        backgroundColor: "#fcfdfe",
                      },
                    }}
                  />
                  {shouldShowEmail && (
                    <TextField
                      id={`person_${idx}_email`}
                      label={
                        <span>
                          Email ID <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                        </span>
                      }
                      placeholder="Email address"
                      value={person.email || ""}
                      onChange={(e) => updatePerson(idx, "email", e.target.value)}
                      error={Boolean(person.email && person.email.trim().length > 0 && !emailRegExp.test(person.email.trim()))}
                      helperText={person.email && person.email.trim().length > 0 && !emailRegExp.test(person.email.trim()) ? "Invalid Email format" : ""}
                      size="small"
                      type="email"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          backgroundColor: "#fcfdfe",
                        },
                      }}
                    />
                  )}
                  <TextField
                    id={`person_${idx}_aadhaar`}
                    label={
                      <span>
                        Aadhaar Number <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                      </span>
                    }
                    placeholder="12-digit Aadhaar"
                    value={person.aadhaar}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      updatePerson(idx, "aadhaar", digitsOnly);
                    }}
                    error={Boolean(
                      person.aadhaar &&
                      person.aadhaar.length > 0 &&
                      (person.aadhaar.length !== 12 || !/^\d{12}$/.test(person.aadhaar))
                    )}
                    helperText={
                      person.aadhaar &&
                      person.aadhaar.length > 0 &&
                      (person.aadhaar.length !== 12 || !/^\d{12}$/.test(person.aadhaar))
                        ? "Aadhaar must be exactly 12 digits"
                        : ""
                    }
                    inputProps={{ maxLength: 12 }}
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        backgroundColor: "#fcfdfe",
                      },
                    }}
                  />
                  <TextField
                    id={`person_${idx}_pan`}
                    label={
                      <span>
                        PAN Number <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                      </span>
                    }
                    placeholder="10-digit PAN"
                    value={person.pan}
                    onChange={(e) =>
                      updatePerson(idx, "pan", e.target.value.toUpperCase())
                    }
                    error={Boolean(
                      person.pan &&
                      person.pan.length > 0 &&
                      (person.pan.length !== 10 || !panRegExp.test(person.pan.toUpperCase()))
                    )}
                    helperText={
                      person.pan &&
                      person.pan.length > 0 &&
                      (person.pan.length !== 10 || !panRegExp.test(person.pan.toUpperCase()))
                        ? "Invalid PAN format (e.g. ABCDE1234F)"
                        : ""
                    }
                    inputProps={{
                      maxLength: 10,
                      style: { textTransform: "uppercase" },
                    }}
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        backgroundColor: "#fcfdfe",
                      },
                    }}
                  />
                  <Box
                    sx={
                      shouldShowEmail
                        ? { gridColumn: { xs: "1", sm: "1 / span 2" } }
                        : undefined
                    }
                  >
                    <TextField
                      id={`person_${idx}_mobile`}
                      fullWidth
                      label={
                        <span>
                          Mobile Number <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                        </span>
                      }
                      placeholder="10-digit Mobile number"
                      value={person.mobile}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        updatePerson(idx, "mobile", digitsOnly);
                      }}
                      error={Boolean(
                        person.mobile &&
                        person.mobile.length > 0 &&
                        (person.mobile.length !== 10 || !/^[6-9]\d{9}$/.test(person.mobile))
                      )}
                      helperText={
                        person.mobile &&
                        person.mobile.length > 0 &&
                        (person.mobile.length !== 10 || !/^[6-9]\d{9}$/.test(person.mobile))
                          ? "Mobile must be a valid 10-digit number starting with 6-9"
                          : ""
                      }
                      inputProps={{ maxLength: 10 }}
                      size="small"
                      type="tel"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          backgroundColor: "#fcfdfe",
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          marginBottom: "15px",
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 3, mt: 2 }}>
          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: "1.5rem", sm: "2rem", md: "1.8rem" },
              color: "#0f172a",
              fontWeight: 700,
              marginBottom: 1,
            }}
          >
            {getHeading(loanType, entityType).split(" ").slice(0, -1).join(" ")}{" "}
            <span style={{ color: "#3949ab" }}>
              {getHeading(loanType, entityType).split(" ").slice(-1)[0]}
            </span>
          </Typography>
          {getSubheading(loanType, entityType) && (
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#64748b",
                fontWeight: 500,
                mb: 1,
              }}
            >
              {getSubheading(loanType, entityType)}
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "#475569",
              marginBottom: 2,
              fontWeight: 500,
            }}
            variant="subtitle1"
          >
            Step 2/4
          </Typography>
        </Box>

        {/* Document Slots */}
        <Box sx={{ width: "100%", maxWidth: "640px" }}>
          {/* ── PERSONAL LOAN ──────────────────────────────────────────────── */}
          {loanType === "personal loan" && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Form 16 (Last 2 Years – Part A & Part B) * (Mandatory)"
                  hint="For the last 2 financial years"
                  field="form16"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="For the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── HOME LOAN ──────────────────────────────────────────────────── */}
          {loanType === "home loan" && (
            <Box sx={{ mb: 3 }}>
              {employmentType === "self_employed" ||
                employmentType === "business" ||
                employmentType === "self employed" ||
                employmentType === "self_employed(business)" ||
                employmentType === "self-employed" ? (
                <>
                  {/* List of Partners on top */}
                  <Box sx={{ mb: 3, mt: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <PeopleOutlineIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                      <Typography
                        sx={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#0f172a",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        List of Partners{" "}
                        <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "#64748b",
                        fontFamily: "'Inter', sans-serif",
                        mb: 2,
                      }}
                    >
                      Provide details and KYC documents (Aadhaar & PAN) for all partners in the firm
                    </Typography>
                    {renderPersonRows("Partner")}
                  </Box>

                  {/* Section 1: Self-Employed Business Documents */}
                  <Box sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        borderBottom: "1px solid #e2e8f0",
                        pb: 1,
                        mb: 2,
                      }}
                    >
                      <DescriptionOutlinedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#475569",
                          fontFamily: "'Inter', sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Self-Employed Business Documents (Partnership Requirements)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <FileUploadBox
                        label="Partnership Deed * (Mandatory)"
                        hint="Upload registered or notarized Partnership Deed of the firm"
                        field="partnershipDeed"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Udyam Registration Certificate * (Mandatory)"
                        hint="Upload Udyam MSME Registration Certificate of the Partnership firm"
                        field="udhyam"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="GST Registration Certificate * (Mandatory)"
                        hint="Upload GST Registration Certificate (Form REG-06)"
                        field="gstCertificate"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Financial Statements – Profit & Loss & Balance Sheet (Last 2 Years) * (Mandatory)"
                        hint="Upload Profit & Loss Statement and Audited/Certified Balance Sheet for the last 2 years"
                        field="financials"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                        hint="Upload Computation of Income sheet for the firm for the last 2 financial years"
                        field="computationOfIncome"
                        buttonText="Upload"
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                /* Section 1: Salaried Income Documents */
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderBottom: "1px solid #e2e8f0",
                      pb: 1,
                      mb: 2,
                    }}
                  >
                    <DescriptionOutlinedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        fontFamily: "'Inter', sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Salaried Income Documents (Personal Loan Requirements)
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <FileUploadBox
                      label="Form 16 (Last 2 Years - Part A & Part B) * (Mandatory)"
                      hint="For the last 2 financial years"
                      field="form16"
                      buttonText="Upload"
                    />
                    <FileUploadBox
                      label="ITR (Last 2 Financial Years) * (Mandatory)"
                      hint="For the last 2 financial years"
                      field="itr"
                      buttonText="Upload"
                    />
                  </Box>
                </Box>
              )}

              {/* Section 2: Property Legal Documents */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ApartmentOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        fontFamily: "'Inter', sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Home Loan Property Legal Documents
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#2563eb",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "6px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Property Ownership & Sanction Docs
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBox
                    label="BBA and ATS (Builder Buyer Agreement / Agreement To Sell) * (Mandatory)"
                    field="bbaAts"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="Property Sales DEED (In case of Resale) * (Mandatory)"
                    field="propertySalesDeed"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="Sanction Letter (In case of Balance Transfer) (Optional)"
                    field="sanctionLetter"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="SOA - Statement of Account (In case of Balance Transfer) (Optional)"
                    field="soa"
                    buttonText="Upload"
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── LOAN AGAINST PROPERTY (LAP) ───────────────────────────────── */}
          {(loanType === "lap" || loanType === "loan against property") && (
            <Box sx={{ mb: 3 }}>
              {employmentType === "self_employed" ||
                employmentType === "business" ||
                employmentType === "self employed" ||
                employmentType === "self_employed(business)" ||
                employmentType === "self-employed" ? (
                <>
                  {/* List of Partners on top */}
                  <Box sx={{ mb: 3, mt: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <PeopleOutlineIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                      <Typography
                        sx={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#0f172a",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        List of Partners{" "}
                        <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "13px",
                        color: "#64748b",
                        fontFamily: "'Inter', sans-serif",
                        mb: 2,
                      }}
                    >
                      Provide details and KYC documents (Aadhaar & PAN) for all partners in the firm
                    </Typography>
                    {renderPersonRows("Partner")}
                  </Box>

                  {/* Section 1: Self-Employed Business Documents */}
                  <Box sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        borderBottom: "1px solid #e2e8f0",
                        pb: 1,
                        mb: 2,
                      }}
                    >
                      <DescriptionOutlinedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#475569",
                          fontFamily: "'Inter', sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Self-Employed Business Documents (Partnership Requirements)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <FileUploadBox
                        label="Partnership Deed * (Mandatory)"
                        hint="Upload registered or notarized Partnership Deed of the firm"
                        field="partnershipDeed"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Udyam Registration Certificate * (Mandatory)"
                        hint="Upload Udyam MSME Registration Certificate of the Partnership firm"
                        field="udhyam"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="GST Registration Certificate * (Mandatory)"
                        hint="Upload GST Registration Certificate (Form REG-06)"
                        field="gstCertificate"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Financial Statements – Profit & Loss & Balance Sheet (Last 2 Years) * (Mandatory)"
                        hint="Upload Profit & Loss Statement and Audited/Certified Balance Sheet for the last 2 years"
                        field="financials"
                        buttonText="Upload"
                      />
                      <FileUploadBox
                        label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                        hint="Upload Computation of Income sheet for the firm for the last 2 financial years"
                        field="computationOfIncome"
                        buttonText="Upload"
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                /* Section 1: Salaried Income Documents */
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderBottom: "1px solid #e2e8f0",
                      pb: 1,
                      mb: 2,
                    }}
                  >
                    <DescriptionOutlinedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        fontFamily: "'Inter', sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Salaried Income Required Documents
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <FileUploadBox
                      label="Form 16 (Last 2 Years - Part A & Part B) * (Mandatory)"
                      hint="For the last 2 financial years"
                      field="form16"
                      buttonText="Upload"
                    />
                    <FileUploadBox
                      label="ITR (Last 2 Financial Years) * (Mandatory)"
                      hint="For the last 2 financial years"
                      field="itr"
                      buttonText="Upload"
                    />
                  </Box>
                </Box>
              )}

              {/* Section 2: LAP Property Legal Documents */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ApartmentOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475569",
                        fontFamily: "'Inter', sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      LAP Property Legal Documents
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#2563eb",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "6px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Property Ownership & Sanction Docs
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBox
                    label="Copy of Registry * (Mandatory)"
                    field="copyRegistry"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="Sales Deed * (Mandatory)"
                    field="salesDeed"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="GPA / Power of Attorney * (Mandatory)"
                    field="gpa"
                    buttonText="Upload"
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── EDUCATION LOAN ───────────────────────────────────────────── */}
          {loanType === "education loan" && (
            <Box sx={{ mb: 3 }}>
              {/* Section 1: Academic & Admission Proofs */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid #e2e8f0",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      fontFamily: "'Inter', sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Academic & Admission Proofs
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBox
                    label="Marksheets (10th, 12th, Grad) * (Mandatory)"
                    field="marksheets"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="College Offer Letter * (Mandatory)"
                    field="collegeOfferLetter"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="Fee Structure Document * (Mandatory)"
                    field="feeStructure"
                    buttonText="Upload"
                  />
                </Box>
              </Box>

              {/* Section 2: Entrance Exam & Banking */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid #e2e8f0",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      fontFamily: "'Inter', sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Entrance Exam & Banking
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBox
                    label="Entrance Exam Scorecard (Optional)"
                    field="entranceScorecard"
                    buttonText="Upload"
                  />
                  <FileUploadBox
                    label="Applicant Bank Cancelled Cheque * (Mandatory)"
                    field="cancelledCheque"
                    buttonText="Upload"
                  />
                </Box>
              </Box>

            </Box>
          )}

          {/* ── BUSINESS LOAN — SOLE PROPRIETORSHIP ───────────────────────── */}
          {loanType === "business loan" && entityType === "sole_proprietorship" && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Computation of Income sheet for the last 2 financial years"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financials (Profit & Loss Statement & Balance Sheet – Last 2 Years) * (Mandatory)"
                  hint="Upload Profit & Loss Statement & Audited/Certified Balance Sheet for the last 2 years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration / Shop & Establishment Act Registration * (Mandatory)"
                  hint="Upload Udyam Aadhar or Shop & Establishment Act Registration certificate"
                  field="udhyamCertificate"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Income Tax Returns (ITR with computation sheet) for the last 2 years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GST Registration Certificate & Returns (Optional)"
                  hint="Upload GST Registration certificate & recent GST returns"
                  field="gst"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── BUSINESS LOAN — HUF (HINDU UNDIVIDED FAMILY) ──────────────── */}
          {loanType === "business loan" && entityType === "huf" && (
            <Box sx={{ mb: 3 }}>
              {/* Checklist Pending for HUF Warning Box */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2,
                  mb: 2.5,
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fef08a",
                  borderRadius: "16px",
                }}
              >
                <InfoOutlinedIcon sx={{ color: "#d97706", fontSize: 22, flexShrink: 0 }} />
                <Box>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#92400e",
                      fontFamily: "'Inter', sans-serif",
                      mb: 0.25,
                    }}
                  >
                    Checklist Pending for HUF
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "13px",
                      color: "#b45309",
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    Specific additional document requirements for HUF will be customized soon.
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Deed of HUF / HUF Declaration * (Mandatory)"
                  hint="Upload registered Deed of HUF or HUF declaration certificate"
                  field="hufDeed"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="HUF PAN Card * (Mandatory)"
                  hint="Upload clear PDF or image of the HUF PAN Card"
                  field="hufPan"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Computation of Income sheet of HUF for the last 2 financial years"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financial Statements (Profit & Loss & Balance Sheet - Last 2 Years) * (Mandatory)"
                  hint="Upload Audited/Certified Profit & Loss Statement and Balance Sheet for the last 2 years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Income Tax Returns of HUF for the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="1 Year Bank Account Statement * (Mandatory)"
                  hint="Upload official bank account statement for the last 12 months for the HUF bank account"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate (Optional)"
                  hint="Upload Udyam MSME registration certificate if applicable"
                  field="udhyam"
                  buttonText="Upload"
                />

              </Box>
            </Box>
          )}

          {/* ── BUSINESS LOAN — PRIVATE LIMITED ────────────────────────────── */}
          {loanType === "business loan" && entityType === "private_limited" && (
            <Box sx={{ mb: 3 }}>
              {/* List of Directors / Designated Partners on top */}
              <Box sx={{ mb: 3, mt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <PeopleOutlineIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#0f172a",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    List of Directors / Designated Partners{" "}
                    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontFamily: "'Inter', sans-serif",
                    mb: 2,
                  }}
                >
                  Provide details and KYC documents (Aadhaar, PAN) for directors/partners
                </Typography>
                {renderPersonRows("Director/Designated Partner")}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  mb: 3,
                }}
              >
                <FileUploadBox
                  label="1 Year Current Account Bank Statement * (Mandatory)"
                  hint="Upload official bank account statement for the last 12 months for the company's primary current account"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Income Tax Returns for the company for the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years - Verified by CA) * (Mandatory)"
                  hint="Upload Computation of Income sheet for the last 2 financial years verified by a Chartered Accountant (CA)"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financial Statements (Profit & Loss & Balance Sheet - Last 2 Years) * (Mandatory)"
                  hint="Upload Audited Profit & Loss Statement and Balance Sheet for the last 2 financial years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GSTR-3B Returns (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload GSTR-3B monthly/quarterly returns filed for the last 2 years"
                  field="gst"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="List of Directors (LOD) * (Mandatory)"
                  hint="Upload certified List of Directors (LOD) on company letterhead signed by authorized signatory"
                  field="listOfDirectors"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="List of Shareholders * (Mandatory)"
                  hint="Upload certified list of current shareholders with equity percentage breakdown"
                  field="listOfShareholders"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Articles of Association (AOA) * (Mandatory)"
                  hint="Upload official Articles of Association of the company"
                  field="aoa"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Memorandum of Association (MOA) * (Mandatory)"
                  hint="Upload official Memorandum of Association of the company"
                  field="moa"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate * (Mandatory)"
                  hint="Upload Udyam MSME registration certificate of the company"
                  field="udhyam"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Company PAN Card * (Mandatory)"
                  hint="Upload clear PDF or image of the Company PAN Card"
                  field="companyPan"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GST Registration Certificate * (Mandatory)"
                  hint="Upload GST Registration Certificate (Form REG-06)"
                  field="gstCertificate"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── BUSINESS LOAN — LLP ───────────────────────────────────────── */}
          {loanType === "business loan" && entityType === "llp" && (
            <Box sx={{ mb: 3 }}>
              {/* List of Directors / Designated Partners on top */}
              <Box sx={{ mb: 3, mt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <PeopleOutlineIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#0f172a",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    List of Directors / Designated Partners{" "}
                    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontFamily: "'Inter', sans-serif",
                    mb: 2,
                  }}
                >
                  Provide details and KYC documents (Aadhaar, PAN){" "}
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>
                    (Minimum 2 Directors Required for LLP)
                  </span>
                </Typography>
                {renderPersonRows("Director/Designated Partner")}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  mb: 3,
                }}
              >
                <FileUploadBox
                  label="1 Year Current Account Bank Statement * (Mandatory)"
                  hint="Upload official bank account statement for the last 12 months for the firm's primary current account"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Certificate of Incorporation * (Mandatory)"
                  hint="Upload Certificate of Incorporation issued by Registrar of Companies (ROC)"
                  field="certificateOfIncorporation"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Board Resolution (BR) * (Mandatory)"
                  hint="Upload Board Resolution passed by partners authorizing loan application"
                  field="boardResolution"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="List of Directors / Designated Partners (LOD) * (Mandatory)"
                  hint="Upload certified List of Directors / Designated Partners (LOD) on firm letterhead signed by authorized partner"
                  field="listOfDirectors"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Income Tax Returns for the firm for the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years - Verified by CA) * (Mandatory)"
                  hint="Upload Computation of Income sheet for the last 2 financial years certified and verified by a CA"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financial Statements (Profit & Loss & Balance Sheet - Last 2 Years) * (Mandatory)"
                  hint="Upload Audited Profit & Loss Statement and Balance Sheet for the last 2 financial years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GSTR-3B Returns (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload GSTR-3B monthly/quarterly returns filed for the last 2 years"
                  field="gst"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="List of Shareholders / Partners * (Mandatory)"
                  hint="Upload certified list of current partners/shareholders with contribution breakdown"
                  field="listOfShareholders"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="LLP Agreement / Articles of Association * (Mandatory)"
                  hint="Upload registered LLP Agreement or Articles of Association"
                  field="llpAgreement"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Memorandum of Association (MOA) * (Mandatory)"
                  hint="Upload official Memorandum of Association of the firm"
                  field="moa"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate * (Mandatory)"
                  hint="Upload Udyam MSME registration certificate of the firm"
                  field="udhyam"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Company / Firm PAN Card * (Mandatory)"
                  hint="Upload clear PDF or image of the Firm PAN Card"
                  field="companyPan"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GST Registration Certificate * (Mandatory)"
                  hint="Upload GST Registration Certificate (Form REG-06)"
                  field="gstCertificate"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── BUSINESS LOAN — PARTNERSHIP ─────────────────────────────────── */}
          {loanType === "business loan" && entityType === "partnership" && (
            <Box sx={{ mb: 3 }}>
              {/* List of Partners on top */}
              <Box sx={{ mb: 3, mt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <PeopleOutlineIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#0f172a",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    List of Partners{" "}
                    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontFamily: "'Inter', sans-serif",
                    mb: 2,
                  }}
                >
                  Provide details and KYC documents (Aadhaar & PAN) for all partners in the firm
                </Typography>
                {renderPersonRows("Partner", false)}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  mb: 3,
                }}
              >
                <FileUploadBox
                  label="Partnership Deed * (Mandatory)"
                  hint="Upload registered or notarized Partnership Deed of the firm"
                  field="partnershipDeed"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate * (Mandatory)"
                  hint="Upload Udyam MSME Registration Certificate of the Partnership firm"
                  field="udhyam"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GST Registration Certificate * (Mandatory)"
                  hint="Upload GST Registration Certificate (Form REG-06)"
                  field="gstCertificate"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financial Statements – Profit & Loss & Balance Sheet (Last 2 Years) * (Mandatory)"
                  hint="Upload Profit & Loss Statement and Audited/Certified Balance Sheet for the last 2 years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Computation of Income sheet for the firm for the last 2 financial years"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── DOCTOR LOAN ─────────────────────────────────────────────────── */}
          {isDoctorLoan(loanType) && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5, borderBottom: "1px solid #e2e8f0", pb: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                  </svg>
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Doctor Practice & Qualification Documents
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="UG Degree (MBBS, BDS, BAMS, BHMS) * (Mandatory)"
                  field="ugDegree"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="UG Registration Certificate * (Mandatory)"
                  field="ugRegistration"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="PG Degree (MD, MS, MCH) (Optional)"
                  field="pgDegree"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="PG Registration Certificate (Optional)"
                  field="pgRegistration"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Consultancy Letter * (Mandatory)"
                  field="consultancyLetter"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Doctor / Clinic Letter Head * (Mandatory)"
                  field="clinicLetterHead"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) (Optional)"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Certificate of Incorporation (COI) (Optional)"
                  field="coi"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate (Optional)"
                  field="udyam"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── CA / CS / CMA LOAN ─────────────────────────────────────────── */}
          {isCaCsCmaLoan(loanType) && !isDoctorLoan(loanType) && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5, borderBottom: "1px solid #e2e8f0", pb: 1.5 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#7c3aed",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="5" />
                    <path d="m8.5 12.5-2.5 8.5 6-3.5 6 3.5-2.5-8.5" />
                  </svg>
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#64748b",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  CA / CS / CMA Practice & Accreditation Documents
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Certificate of Practice (COP) * (Mandatory)"
                  field="copCertificate"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Certificate of Membership (COM) * (Mandatory)"
                  field="comCertificate"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Firm Card * (Mandatory)"
                  field="firmCard"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Letter Head * (Mandatory)"
                  field="letterHead"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="2 Yrs ITR & Computation (COI) * (Mandatory)"
                  field="itrCoi"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam & Shop Registration * (Mandatory)"
                  field="udyamShopReg"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── AUTO LOAN ───────────────────────────────────────────────────── */}
          {loanType === "auto loan" && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5, borderBottom: "1px solid #e2e8f0", pb: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                  }}
                >
                  <DirectionsCarIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Auto / Vehicle Loan Required Documents
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Vehicle Proforma Invoice / Dealer Quotation * (Mandatory)"
                  hint="Upload formal proforma invoice or on-road quotation from authorized vehicle dealer"
                  field="proformaInvoice"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="For the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Form 16 / Audited Financial Statements (Last 2 Years) * (Mandatory)"
                  hint="Upload Form 16 (Part A & B) for salaried or audited financials for self-employed"
                  field="form16"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Bank Account Statement (Last 6 Months) * (Mandatory)"
                  hint="Upload official bank account statement for the last 6 months"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Driving License / RC Copy (Optional)"
                  hint="Upload applicant's Driving License or Registration Certificate (RC) for pre-owned vehicle loan"
                  field="drivingLicense"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── MACHINERY LOAN ───────────────────────────────────────────────── */}
          {loanType === "machinery loan" && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5, borderBottom: "1px solid #e2e8f0", pb: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                  }}
                >
                  <PrecisionManufacturingIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Machinery & Equipment Required Documents
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Machinery Quotation / Proforma Invoice * (Mandatory)"
                  hint="Upload formal quote/proforma invoice from equipment supplier with technical specifications"
                  field="machineryQuotation"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Financial Statements (Profit & Loss & Balance Sheet - Last 2 Years) * (Mandatory)"
                  hint="Upload Audited Profit & Loss Statement and Balance Sheet for the last 2 financial years"
                  field="financials"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="ITR (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload Income Tax Returns for the last 2 financial years"
                  field="itr"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Computation of Income (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload CA-certified Computation of Income sheet for the last 2 financial years"
                  field="computationOfIncome"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GST Registration Certificate * (Mandatory)"
                  hint="Upload GST Registration Certificate (Form REG-06)"
                  field="gstCertificate"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="GSTR-3B Returns (Last 2 Financial Years) * (Mandatory)"
                  hint="Upload GSTR-3B monthly/quarterly returns filed for the last 2 years"
                  field="gst"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Udyam Registration Certificate * (Mandatory)"
                  hint="Upload Udyam MSME Registration Certificate of the enterprise"
                  field="udhyam"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="1 Year Current Account Bank Statement * (Mandatory)"
                  hint="Upload official bank account statement for the last 12 months for primary operating account"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Project Report / Machine Installation Layout (Optional)"
                  hint="Upload technical project report or installation layout plan if applicable"
                  field="projectReport"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── JUST INQUIRY / GENERIC FALLBACK ─────────────────────────────── */}
          {(!isKnownLoanType || loanType === "just inquiry") && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5, borderBottom: "1px solid #e2e8f0", pb: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                  }}
                >
                  <DescriptionOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#475569",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Supporting Documents (Optional)
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Bank Account Statement (Last 6 Months) (Optional)"
                  hint="Upload recent 6 months Bank Statement or inquiry reference documents"
                  field="banking"
                  buttonText="Upload"
                />
                <FileUploadBox
                  label="Income Tax Returns / Salary Proof (Optional)"
                  hint="Upload recent ITR or salary proof if available"
                  field="itr"
                  buttonText="Upload"
                />
              </Box>
            </Box>
          )}

          {/* ── Action Buttons ───────────────────────────────────────────────── */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              width: "100%",
              mt: 2,
              mb: "8vh",
            }}
          >
            <Button
              color="primary"
              disabled={isUploading /* [TEST MODE] !hasAnyFile check relaxed for UI testing */}
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
                lineHeight: "1.5rem",
                borderRadius: "8px",
                minWidth: "180px",
                height: "44px",
                padding: "10px 28px",
                boxShadow: "0px 8px 20px rgba(57, 73, 171, 0.35)",
                transition: "all 0.2s ease",
                textTransform: "none",
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
              onClick={async () => {
                if (numPersons > 0) {
                  const isPartnership =
                    (loanType === "business loan" && entityType === "partnership") ||
                    entityType === "partnership";
                  const partnerLabel =
                    entityType === "llp" || entityType === "pvt_ltd" || entityType === "public_ltd"
                      ? "Director"
                      : "Partner";
                  const validation = validatePartnerDetails(personDetails, {
                    label: partnerLabel,
                    requireEmail: !isPartnership,
                  });

                  if (!validation.isValid) {
                    handleToast(validation.error || "Please fill all partner/director details correctly.", "error");
                    if (validation.fieldId) {
                      focusAndScrollToField(validation.fieldId);
                    }
                    return;
                  }

                  // Persist partner/director details to database when proceeding via Next button
                  await saveCustomerPartners();
                }

                const hasAnyUploaded = Object.values(files).some((v) => Boolean(v.uploadedUrl));
                const hasAnySelected = Object.values(files).some((v) => v.file !== null);

                if (!hasAnyUploaded && !hasAnySelected) {
                  handleToast("Please upload at least 1 document to proceed to the next step.", "error");
                  return;
                }

                if (hasAnySelected && !hasAnyUploaded) {
                  handleToast("Please click 'Upload & Proceed' to submit your selected files before proceeding.", "error");
                  return;
                }

                setLocalStorage("activeStep", 2);
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
      </Container>

      {/* MUI Snackbar for toast messages */}
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
    </>
  );
};

export default Step3Form;
