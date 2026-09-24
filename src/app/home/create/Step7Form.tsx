'use client';

import { axiosInstance } from "@/apis/config/axiosConfig";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { CurrencyRupee as CurrencyRupeeIcon } from "@mui/icons-material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AddIcon from "@mui/icons-material/Add";

import { Utility } from "@/utils";
import { getCompanyId } from "@/utils/cookies";
import { COAPP_DOC_KEY_TO_DB_TYPE } from "./formConstants";
import { focusAndScrollToField, emailRegExp, phoneRegExp } from "./validationSchemas";

const renderRequiredLabel = (text: string) => (
  <span>
    {text.replace(/[*]|(?:\*\s*\(Mandatory\))/g, "").trim()}{" "}
    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>
      * (Mandatory)
    </span>
  </span>
);

interface Step7FormProps {
  handleBack: () => void;
  aadharUploadsSuccess: boolean;
}

const getInitialStep7Draft = () => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("step7DraftData");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          amount: parsed.amount ?? null,
          emi: parsed.emi ?? null,
          liability: parsed.liability ?? null,
        };
      }
    } catch (e) {}
  }
  return { amount: null, emi: null, liability: null };
};

const getInitialStep7CoApp = () => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("step7CoAppDetails");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          coAppRelation: parsed.coAppRelation || "Father",
          coAppEmploymentType: parsed.coAppEmploymentType || "Salaried",
          coAppEmail: parsed.coAppEmail || "",
          coAppMobile: parsed.coAppMobile || "",
          coAppMotherName: parsed.coAppMotherName || "",
        };
      }
    } catch (e) {}
  }
  return {
    coAppRelation: "Father",
    coAppEmploymentType: "Salaried",
    coAppEmail: "",
    coAppMobile: "",
    coAppMotherName: "",
  };
};

const Step7Form: React.FC<Step7FormProps> = ({
  handleBack,
  aadharUploadsSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // To store selected files
  const [selectedAudioFiles, setSelectedAudioFiles] = useState<File[]>([]); // To store selected audio files
  const [amount, setAmount] = useState<number | string | null>(() => getInitialStep7Draft().amount);
  const [emi, setEmi] = useState<number | string | null>(() => getInitialStep7Draft().emi);
  const [liability, setLiability] = useState<number | string | null>(() => getInitialStep7Draft().liability);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [generatedApplicationNumber, setGeneratedApplicationNumber] = useState<string | number>("");
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleCopyApplicationNumber = (num: string) => {
    const cleanNum = num.trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanNum);
    }
    setCopiedNumber(cleanNum);
    handleToast(`Application ID ${cleanNum} copied to clipboard!`, "success");
    setTimeout(() => {
      setCopiedNumber(null);
    }, 2500);
  };

  const { getLocalStorage, setLocalStorage, remLocalStorage, decodedToken } =
    Utility();

  const handleResetAndFillAnother = () => {
    setIsResetting(true);
    remLocalStorage("applicationSubmittedSuccessfully");
    remLocalStorage("submittedApplicationNumbers");
    remLocalStorage("customerInfo");
    remLocalStorage("pendingApplicationData");
    remLocalStorage("loanFormData");
    remLocalStorage("activeStep");
    remLocalStorage("StatementUpload");
    remLocalStorage("StatementUploadSkipped");
    remLocalStorage("profileDetail");
    remLocalStorage("step1DraftData");
    remLocalStorage("step1GetStarted");
    remLocalStorage("step1CustomerDraft");
    remLocalStorage("step3UploadedDocs");
    remLocalStorage("step3PersonDetails");
    remLocalStorage("step3NumPersons");
    remLocalStorage("step4UploadedDocs");
    remLocalStorage("step4UploadedBankStatements");
    remLocalStorage("step4IsPdfProtected");
    remLocalStorage("step4BankingPassword");
    remLocalStorage("step7DraftData");
    remLocalStorage("step7CoAppDetails");
    setTimeout(() => {
      location.reload();
    }, 300);
  };

  const handleToast = (message: string, severity: "success" | "error") => {
    setToast({ open: true, message, severity });
  };

  const [errors, setErrors] = useState<{
    amount: string;
    emi: string;
    liability: string;
    coAppRelation: string;
    coAppEmploymentType: string;
    coAppEmail: string;
    coAppMobile: string;
    coAppMotherName: string;
  }>({
    amount: "",
    emi: "",
    liability: "",
    coAppRelation: "",
    coAppEmploymentType: "",
    coAppEmail: "",
    coAppMobile: "",
    coAppMotherName: "",
  });

  const pendingDataFallback = getLocalStorage("pendingApplicationData") || getLocalStorage("loanFormData");
  const storedCustomerId = getLocalStorage("customerInfo")?.id || pendingDataFallback?.customerId;
  const [isUploading, setIsUploading] = useState(false);

  const primaryLoanType = pendingDataFallback?.loanTypes?.[0] || pendingDataFallback?.loanType || "";
  const loanType = String(primaryLoanType).toLowerCase().trim();

  // ── Co-Applicant state (for Education loan) ──────────────────────────────
  const [coAppRelation, setCoAppRelation] = useState<string>(() => getInitialStep7CoApp().coAppRelation);
  const [coAppEmploymentType, setCoAppEmploymentType] = useState<string>(() => getInitialStep7CoApp().coAppEmploymentType);
  const [coAppEmail, setCoAppEmail] = useState<string>(() => getInitialStep7CoApp().coAppEmail);
  const [coAppMobile, setCoAppMobile] = useState<string>(() => getInitialStep7CoApp().coAppMobile);
  const [coAppMotherName, setCoAppMotherName] = useState<string>(() => getInitialStep7CoApp().coAppMotherName);

  // Auto-save Step 7 draft data (Financial Info)
  useEffect(() => {
    if (amount !== null || emi !== null || liability !== null) {
      setLocalStorage("step7DraftData", { amount, emi, liability });
    }
  }, [amount, emi, liability, setLocalStorage]);

  // Auto-save Step 7 Co-Applicant details
  useEffect(() => {
    if (
      coAppEmail ||
      coAppMobile ||
      coAppMotherName ||
      coAppRelation !== "Father" ||
      coAppEmploymentType !== "Salaried"
    ) {
      setLocalStorage("step7CoAppDetails", {
        coAppRelation,
        coAppEmploymentType,
        coAppEmail,
        coAppMobile,
        coAppMotherName,
      });
    }
  }, [coAppRelation, coAppEmploymentType, coAppEmail, coAppMobile, coAppMotherName, setLocalStorage]);

  const [coAppFiles, setCoAppFiles] = useState<{
    coAppAadhaar: File | null;
    coAppPan: File | null;
    coAppCancelledCheque: File | null;
    coAppForm16: File | null;
    coAppSalarySlips: File | null;
    coAppIdCard: File | null;
  }>({
    coAppAadhaar: null,
    coAppPan: null,
    coAppCancelledCheque: null,
    coAppForm16: null,
    coAppSalarySlips: null,
    coAppIdCard: null,
  });

  const handleCoAppFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof coAppFiles
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      handleToast(`${file.name} exceeds the 10 MB limit`, "error");
      return;
    }
    setCoAppFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleCoAppFileDelete = (field: keyof typeof coAppFiles) => {
    setCoAppFiles((prev) => ({ ...prev, [field]: null }));
  };

  const FileUploadBoxCoApp = ({
    label,
    field,
    buttonText = "Browse File",
    hint,
  }: {
    label: string;
    field: keyof typeof coAppFiles;
    buttonText?: string;
    hint?: string;
  }) => {
    const inputFieldRef = useRef<HTMLInputElement | null>(null);
    const file = coAppFiles[field];

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
        }}
      >
        {label ? (
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
        ) : null}

        <Box>
          {!file ? (
            <Box>
              <input
                ref={inputFieldRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleCoAppFileChange(e, field)}
              />
              <Button
                component="span"
                onClick={() => inputFieldRef.current?.click()}
                variant="outlined"
                startIcon={<FileUploadOutlinedIcon sx={{ fontSize: 18, color: "#2563eb" }} />}
                sx={{
                  borderRadius: "24px",
                  textTransform: "none",
                  borderColor: "#bfdbfe",
                  color: "#2563eb",
                  fontWeight: 600,
                  fontSize: "13px",
                  px: 2.5,
                  py: 0.75,
                  backgroundColor: "#ffffff",
                  fontFamily: "'Inter', sans-serif",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    backgroundColor: "#eff6ff",
                  },
                }}
              >
                {buttonText}
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
                border: "1.5px solid #c7d2fe",
                borderRadius: "10px",
                backgroundColor: "#eef2ff",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, overflow: "hidden" }}>
                <InsertDriveFileIcon sx={{ color: "#2563eb", fontSize: 22, flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: { xs: "200px", sm: "380px" },
                  }}
                >
                  {file.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => handleCoAppFileDelete(field)}
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
          )}
        </Box>
      </Box>
    );
  };

  const commonTextFieldStyles = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      color: "#0f172a",
      transition: "all 0.2s ease",
      alignItems: "center",
      "& .MuiInputBase-input": {
        paddingTop: "14px",
        paddingBottom: "14px",
        paddingLeft: "4px !important",
        fontSize: "14px",
        fontWeight: 500,
        color: "#0f172a",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#cbd5e1",
        borderWidth: "1px",
        transition: "all 0.2s ease",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#94a3b8",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#3949ab",
        borderWidth: "2px",
      },
      "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
        borderColor: "#e2e8f0",
      },
      "&.Mui-disabled": {
        backgroundColor: "#f1f5f9 !important",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#475569",
      fontSize: "13px",
      fontWeight: 500,
      backgroundColor: "#ffffff",
      px: 0.5,
      "&.Mui-focused": {
        color: "#3949ab !important",
      },
    },
    "& .MuiInputAdornment-root": {
      color: "#3949ab !important",
      marginRight: "2px",
      display: "flex",
      alignItems: "center",
      "& *": { color: "#3949ab !important" },
    },
    "& .MuiFormHelperText-root": {
      color: "#64748b",
      "&.Mui-error": {
        color: "#ef4444",
      },
    },
  };

  const commonFormControlStyles = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      borderRadius: "10px",
      color: "#0f172a",
      fontSize: "14px",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#cbd5e1",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#94a3b8",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#3949ab",
        borderWidth: "2px",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#475569",
      fontSize: "13px",
      fontWeight: 500,
      backgroundColor: "#ffffff",
      px: 0.5,
      "&.Mui-focused": {
        color: "#3949ab !important",
      },
    },
  };

  // Validation for Amount
  const validateAmount = (value: string | number | null) => {
    let error = "";
    if (!value) {
      error = "This field is required.";
    } else if (isNaN(Number(value))) {
      error = "Amount must be a number.";
    } else if (Number(value) < 50000 || Number(value) > 1000000000) {
      error = "Amount must be between 50 thousand and 100 crore.";
    }
    setErrors((prev) => ({ ...prev, amount: error }));
  };

  // Validation for EMI
  const validateEmi = (value: string | number | null) => {
    let error = "";
    if (value && isNaN(Number(value))) {
      error = "EMI must be a number.";
    }
    setErrors((prev) => ({ ...prev, emi: error }));
  };

  // Validation for Liability
  const validateLiability = (value: string | number | null) => {
    let error = "";
    if (value && isNaN(Number(value))) {
      error = "Liability must be a number.";
    }
    setErrors((prev) => ({ ...prev, liability: error }));
  };

  // Co-Applicant Field Validations (for Education Loan)
  const validateCoAppRelation = (val: string) => {
    let error = "";
    if (!val || !val.trim()) {
      error = "Relation with applicant is required";
    }
    setErrors((prev) => ({ ...prev, coAppRelation: error }));
    return !error;
  };

  const validateCoAppEmploymentType = (val: string) => {
    let error = "";
    if (!val || !val.trim()) {
      error = "Employment type is required";
    }
    setErrors((prev) => ({ ...prev, coAppEmploymentType: error }));
    return !error;
  };

  const validateCoAppEmail = (val: string) => {
    let error = "";
    const clean = (val || "").trim();
    if (!clean) {
      error = "Co-Applicant email is required";
    } else if (!emailRegExp.test(clean)) {
      error = "Please enter a valid email address";
    }
    setErrors((prev) => ({ ...prev, coAppEmail: error }));
    return !error;
  };

  const validateCoAppMobile = (val: string) => {
    let error = "";
    const clean = (val || "").replace(/\s+/g, "");
    if (!clean) {
      error = "Co-Applicant mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(clean)) {
      error = "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9";
    }
    setErrors((prev) => ({ ...prev, coAppMobile: error }));
    return !error;
  };

  const validateCoAppMotherName = (val: string) => {
    let error = "";
    const clean = (val || "").trim();
    if (!clean) {
      error = "Co-Applicant mother's name is required";
    } else if (clean.length < 2) {
      error = "Mother's name must be at least 2 characters";
    }
    setErrors((prev) => ({ ...prev, coAppMotherName: error }));
    return !error;
  };


  // Function to update customer info
  const updateCustomerInfo = async (data: any) => {
    try {
      await axiosInstance.patch(
        `${process.env.NEXT_PUBLIC_WEB_URL}/customer-info-update`,
        data
      )
      console.log("Customer info updated successfully.");
    } catch (error) {
      console.log("Error updating customer info:", error);
    }
  };

  // Generate random application number
  const randomNumberGenerator = (): number =>
    Math.floor(10000000 + Math.random() * 90000000);

  // Function to create the customer application
  async function createCustomerApplication(
    customerId: number,
    applicationNumber: number,
    amount: number,
    tenure: number,
    provider: string,
    loanType: string,
    loanCategory: string,
    leadType: string,
    existingLoans: any[],
    caseType: string,
    businessEntityType?: string,
  ) {
    const { data: applicationResponse } =
      await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_WEB_URL}/create-application`,
        {
          customer_id: customerId,
          applied_by: decodedToken()?.id,
          application_no: applicationNumber,
          amount,
          tenure,
          provider,
          loan_type: loanType,
          ...(businessEntityType && { business_entity_type: businessEntityType }),
          loan_category: loanCategory,
          lead_type: leadType,
          existing_loans: JSON.stringify(existingLoans.map((l: any) => ({
            has_running_loans: l.has_running_loans === "yes" ? 1 : 0,
            which_loan: l.which_loan,
            loan_amount: l.loan_amount ? Number(l.loan_amount) : null,
            running_emi: l.running_emi ? Number(l.running_emi) : null
          }))),
          case_type: caseType,
          source: "oms",
          company_id: getCompanyId() || getLocalStorage("selectedCompanyId"),
        });
    return applicationResponse.data.applicationId;
  }

  // Function to create loan tracking
  async function createLoanTracking(applicationId: number) {
    await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_WEB_URL}/create-loan-tracking`,
      {
        customer_application_id: applicationId,
        status: "submitted",
        company_id: getCompanyId() || getLocalStorage("selectedCompanyId"),
      });
  }

  // Handle deleting a file from the selected files array
  const handleAttachmentDelete = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    if (inputRef.current) {
      inputRef.current.value = ""; // Reset the value of the input element
    }
  };

  const handleAttachmentAudioDelete = (index: number) => {
    const updatedFiles = selectedAudioFiles.filter((_, i) => i !== index);
    setSelectedAudioFiles(updatedFiles);
    if (inputRef.current) {
      inputRef.current.value = ""; // Reset the value of the input element
    }
  };

  const updateFormInfo = async (data: any) => {
    const fallbackCache = getLocalStorage("pendingApplicationData") || getLocalStorage("loanFormData");
    const activeCustomerId = storedCustomerId || fallbackCache?.customerId;
    if (activeCustomerId) {
      try {
        await updateCustomerInfo({ ...data, customer_id: activeCustomerId });
        console.log("Customer additional info updated successfully.");
      } catch (error) {
        console.error("Error updating customer info:", error);
      }
    } else {
      console.error("No customer ID found.");
    }
  };

  // Handle form submission
  const create = useCallback(async () => {
    // Validate mandatory annual income / turnover
    if (!amount || isNaN(Number(amount)) || Number(amount) < 50000 || Number(amount) > 1000000000) {
      validateAmount(amount);
      handleToast("Please enter a valid Annual Income / Turnover (between ₹50,000 and ₹100 Crore) before submitting.", "error");
      focusAndScrollToField("field-salary-turnover");
      return;
    }

    // Validate Co-Applicant fields for Education Loan
    if (loanType === "education loan") {
      if (!validateCoAppRelation(coAppRelation)) {
        handleToast("Please select relation with applicant.", "error");
        focusAndScrollToField("coapp-relation");
        return;
      }
      if (!validateCoAppEmploymentType(coAppEmploymentType)) {
        handleToast("Please select employment type for co-applicant.", "error");
        focusAndScrollToField("coapp-employment-type");
        return;
      }
      if (!validateCoAppEmail(coAppEmail)) {
        handleToast(
          !coAppEmail.trim() ? "Co-Applicant email is required." : "Please enter a valid email address for co-applicant.",
          "error"
        );
        focusAndScrollToField("field-coapp-email");
        return;
      }
      const cleanMobile = (coAppMobile || "").replace(/\s+/g, "");
      if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
        validateCoAppMobile(coAppMobile);
        handleToast(
          !cleanMobile
            ? "Co-Applicant mobile number is required."
            : "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9 for co-applicant.",
          "error"
        );
        focusAndScrollToField("field-coapp-mobile");
        return;
      }
      if (!validateCoAppMotherName(coAppMotherName)) {
        handleToast(
          !coAppMotherName.trim()
            ? "Co-Applicant mother's name is required."
            : "Mother's name must be at least 2 characters.",
          "error"
        );
        focusAndScrollToField("field-coapp-mother-name");
        return;
      }

      // Check if at least 1 co-applicant document is uploaded
      const hasAnyCoAppDoc = Object.values(coAppFiles).some((f) => f !== null);
      if (!hasAnyCoAppDoc) {
        handleToast("Please upload at least 1 Co-Applicant document before completing the application.", "error");
        focusAndScrollToField("coapp-identity-section");
        return;
      }
    }

    // Check if the user is online
    if (!navigator.onLine) {
      handleToast("No internet connection. Please try again later.", "error");
      return;
    }
    setIsUploading(true);

    const fallbackCache = getLocalStorage("pendingApplicationData") || getLocalStorage("loanFormData");
    const activeCustomerId = storedCustomerId || fallbackCache?.customerId;

    const data: Record<string, any> = {
      customer_id: activeCustomerId,
      salary: amount,
      existing_emi: emi,
      existing_liability: liability,
    };

    // Attach Co-Applicant details only for Education Loans when fields exist
    if (loanType === "education loan") {
      if (coAppRelation) data.co_applicant_relation = coAppRelation;
      if (coAppEmploymentType) data.co_applicant_employment_type = coAppEmploymentType;
      if (coAppEmail) data.co_applicant_email = coAppEmail;
      if (coAppMobile) data.co_applicant_contact = coAppMobile;
      if (coAppMotherName) data.co_applicant_mother_name = coAppMotherName;
    }

    let attachmentUrls: string[] = [];

    await updateFormInfo(data);

    const appNumbersGenerated: string[] = [];
    // Create applications from pending data
    const pendingData = getLocalStorage("pendingApplicationData") || getLocalStorage("loanFormData");

    if (pendingData && activeCustomerId) {
      try {
        const {
          providers,
          providerAmounts,
          amount: loanAmount,
          tenure,
          loanTypes,
          loanCategory,
          leadType,
          existingLoans,
          caseType,
        } = pendingData;

        const activeProviders = providers && providers.length > 0 ? providers : ["Default Provider"];
        const primaryLoanType = loanTypes && loanTypes.length > 0 ? loanTypes[0] : (pendingData?.loanType || "personal loan");
        const numericTenure = tenure ? Number(String(tenure).split(" ")[0]) : 5;
        const activeLoanCategory = loanCategory || pendingData?.loanCategory || "unsecured";
        const activeLeadType = leadType || pendingData?.leadType || "notion";
        const activeExistingLoans = existingLoans || pendingData?.existingLoans || [];
        const activeCaseType = caseType || pendingData?.caseType || "fresh";

        // Create exactly ONE application for the customer with all providers as a comma-separated string
        const providersString = activeProviders.join(", ");
        // Use the primary loan amount from Step 1 (loanAmount) as the base
        const finalAmount = Number(loanAmount || amount || 100000);

        const appNo = randomNumberGenerator();
        const activeBusinessEntityType = pendingData?.businessEntityType || undefined;
        const applicationId = await createCustomerApplication(
          activeCustomerId,
          appNo,
          finalAmount,
          numericTenure,
          providersString,
          primaryLoanType,
          activeLoanCategory,
          activeLeadType,
          activeExistingLoans,
          activeCaseType,
          activeBusinessEntityType
        );

        await createLoanTracking(applicationId);
        appNumbersGenerated.push(String(appNo));
        console.log(`Successfully created single application ${appNo} for providers: ${providersString}`);

        // Update customerInfo in localStorage with all generated application numbers
        const customerInfo = getLocalStorage("customerInfo") || { id: activeCustomerId };
        customerInfo.applicationNumbers = appNumbersGenerated;
        setLocalStorage("customerInfo", customerInfo);

        remLocalStorage("pendingApplicationData");
      } catch (error) {
        console.error("Error creating per-provider applications in Step 7:", error);
      }
    }

    if (loanType === "education loan") {
      // Upload co-applicant files
      const activeCoAppEntries = Object.entries(coAppFiles).filter(([, f]) => f !== null) as [string, File][];
      const activeCompanyId = getCompanyId() || getLocalStorage("selectedCompanyId");

      for (const [docKey, file] of activeCoAppEntries) {
        const formData = new FormData();
        formData.append("document", file);
        formData.append("folder", `document/${file.name}`);
        if (activeCompanyId) formData.append("companyId", activeCompanyId);

        try {
          const uploadResponse = await axiosInstance.post(
            `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          const attachmentUrl = uploadResponse.data.data;
          if (attachmentUrl && activeCustomerId) {
            await axiosInstance.post(
              `${process.env.NEXT_PUBLIC_WEB_URL}/create-document`,
              {
                customer_id: activeCustomerId,
                document_url: attachmentUrl,
                type: COAPP_DOC_KEY_TO_DB_TYPE[docKey] ?? docKey,
                company_id: activeCompanyId,
              }
            );
          }
        } catch (err) {
          console.error(`Error uploading co-applicant document ${docKey}:`, err);
          handleToast("Error uploading co-applicant documents", "error");
        }
      }

      // Persist co-applicant contact & employment details to customer_info
      if (activeCustomerId && (coAppEmail || coAppMobile || coAppMotherName || coAppRelation || coAppEmploymentType)) {
        try {
          await axiosInstance.patch(
            `${process.env.NEXT_PUBLIC_WEB_URL}/customer-info-update`,
            {
              customer_id: activeCustomerId,
              ...(coAppEmail && { co_applicant_email: coAppEmail }),
              ...(coAppMobile && { co_applicant_contact: coAppMobile }),
              ...(coAppMotherName && { co_applicant_mother_name: coAppMotherName }),
              ...(coAppRelation && { co_applicant_relation: coAppRelation }),
              ...(coAppEmploymentType && { co_applicant_employment_type: coAppEmploymentType }),
            }
          );
        } catch (err) {
          console.error("Error saving co-applicant details:", err);
        }
      }
    } else {
      if (selectedFiles.length !== 0 && activeCustomerId) {
        for (const file of selectedFiles) {
          // Uploading each document
          const formData = new FormData();
          formData.append("document", file);
          formData.append("folder", `document/${file.name}`);

          try {
            const uploadResponse = await axiosInstance.post(
              `${process.env.NEXT_PUBLIC_WEB_URL}/upload-to-s3`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            const attachmentUrl = uploadResponse.data.data; // Store the URL from the response

            if (attachmentUrl) {
              attachmentUrls.push(attachmentUrl); // Push URL to array

              await axiosInstance.post(
                `${process.env.NEXT_PUBLIC_WEB_URL}/create-document`,
                {
                  customer_id: activeCustomerId,
                  document_url: attachmentUrl,
                  type: "certificate",
                }
              );
            }
          } catch (err) {
            handleToast("Error uploading documents", "error");
            setIsUploading(false);
            return; // Exit early if there's an error
          }
        }
      }
    }

    // Handle audio files (if necessary)
    if (selectedAudioFiles.length !== 0) {
      console.log('Load audio files');
    }

    // If no files to upload, log this info
    if (!selectedFiles.length && !selectedAudioFiles.length) {
      console.log('no files to upload');
    }
    setIsUploading(false);

    // Reveal success screen with all generated application numbers
    const customerInfoFinal = getLocalStorage("customerInfo");
    let finalIdsString = "";
    if (appNumbersGenerated.length > 0) {
      finalIdsString = appNumbersGenerated.join(", ");
    } else if (customerInfoFinal?.applicationNumbers?.length > 0 && customerInfoFinal.applicationNumbers[0] !== "pending") {
      finalIdsString = customerInfoFinal.applicationNumbers.join(", ");
    }
    setGeneratedApplicationNumber(finalIdsString);
    setLocalStorage("applicationSubmittedSuccessfully", true);
    setLocalStorage("submittedApplicationNumbers", finalIdsString);
    setShowSuccessScreen(true);
  }, [
    amount,
    emi,
    liability,
    storedCustomerId,
    selectedFiles,
    selectedAudioFiles,
    loanType,
    coAppFiles,
    coAppRelation,
    coAppEmploymentType,
    coAppEmail,
    coAppMobile,
    coAppMotherName,
  ]);

  // Restore success screen persistence on accidental refresh
  useEffect(() => {
    if (getLocalStorage("applicationSubmittedSuccessfully")) {
      const savedNumbers = getLocalStorage("submittedApplicationNumbers");
      if (savedNumbers) {
        setGeneratedApplicationNumber(savedNumbers);
      }
      setShowSuccessScreen(true);
    }
  }, []);

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

  return (
    <Container
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginTop: 2,
      }}
    >
      {showSuccessScreen ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "600px",
            mx: "auto",
            my: { xs: 3, md: 5 },
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.03)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top Royal Blue Accent Bar */}
          <Box
            sx={{
              width: "100%",
              height: "6px",
              background: "linear-gradient(90deg, #1e3a8a 0%, #3949ab 50%, #2563eb 100%)",
            }}
          />

          <Box
            sx={{
              p: { xs: 3.5, sm: 4.5 },
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Elegant Double-Ring Success Icon */}
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                border: "6px solid #f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1e3a8a 0%, #3949ab 100%)",
                  boxShadow: "0 6px 16px rgba(57, 73, 171, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckRoundedIcon sx={{ color: "#ffffff", fontSize: 28 }} />
              </Box>
            </Box>

            {/* Status Pill */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                backgroundColor: "#eff6ff",
                border: "1px solid #dbeafe",
                color: "#1d4ed8",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                borderRadius: "20px",
                px: 2,
                py: 0.5,
                mb: 1.5,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                }}
              />
              Application Submitted
            </Box>

            {/* Title */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#0f172a",
                fontFamily: "'Inter', sans-serif",
                fontSize: { xs: "20px", sm: "24px" },
                mb: 1,
              }}
            >
              Loan Application Created Successfully
            </Typography>

            {/* Description */}
            <Typography
              sx={{
                color: "#64748b",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                maxWidth: "460px",
                lineHeight: 1.55,
                mb: 3.5,
              }}
            >
              The application has been logged securely in the system. Use the reference number below for tracking and communication.
            </Typography>

            {/* Application Reference ID Section with Click-to-Copy */}
            {generatedApplicationNumber && (
              <Box
                sx={{
                  width: "100%",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "14px",
                  p: 2.5,
                  mb: 3,
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
                    sx={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#475569",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Application Reference ID
                  </Typography>

                  <Box
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#15803d",
                      backgroundColor: "#dcfce7",
                      borderRadius: "12px",
                      px: 1.25,
                      py: 0.2,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Active • Submitted
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {String(generatedApplicationNumber)
                    .split(",")
                    .map((num) => {
                      const cleanNum = num.trim();
                      const formattedNum =
                        cleanNum.length === 8
                          ? `${cleanNum.slice(0, 4)} ${cleanNum.slice(4)}`
                          : cleanNum;
                      const isCopied = copiedNumber === cleanNum;

                      return (
                        <Tooltip
                          key={cleanNum}
                          title={isCopied ? "Copied to clipboard!" : "Click to copy application ID"}
                          arrow
                          placement="top"
                        >
                          <Box
                            onClick={() => handleCopyApplicationNumber(cleanNum)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: isCopied ? "#f0fdf4" : "#ffffff",
                              border: isCopied
                                ? "1.5px solid #86efac"
                                : "1.5px solid #cbd5e1",
                              borderRadius: "10px",
                              px: 2.5,
                              py: 1.25,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                borderColor: "#3949ab",
                                backgroundColor: isCopied ? "#f0fdf4" : "#f8fafc",
                                boxShadow: "0 2px 8px rgba(57, 73, 171, 0.12)",
                                transform: "translateY(-1px)",
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Typography
                                sx={{
                                  fontSize: { xs: "18px", sm: "20px" },
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  fontFamily: "'Inter', monospace, sans-serif",
                                  letterSpacing: 2,
                                }}
                              >
                                {formattedNum}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.6,
                                fontSize: "12px",
                                fontWeight: 600,
                                color: isCopied ? "#15803d" : "#3949ab",
                                backgroundColor: isCopied ? "#dcfce7" : "#eff6ff",
                                borderRadius: "8px",
                                px: 1.5,
                                py: 0.6,
                                transition: "all 0.2s ease",
                              }}
                            >
                              {isCopied ? (
                                <>
                                  <CheckRoundedIcon sx={{ fontSize: 16 }} />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  <span>Copy</span>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Tooltip>
                      );
                    })}
                </Box>
              </Box>
            )}

            {/* Quick Metadata Highlights (Channel & Status) */}
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                mb: 4,
              }}
            >
              <Box
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  py: 1.75,
                  px: 2,
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f1f5f9",
                  },
                }}
              >
                <Typography sx={{ fontSize: "11px", color: "#64748b", fontWeight: 600, fontFamily: "'Inter', sans-serif", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Channel
                </Typography>
                <Typography sx={{ fontSize: "14px", color: "#0f172a", fontWeight: 700, fontFamily: "'Inter', sans-serif", mt: 0.5 }}>
                  OMS
                </Typography>
              </Box>

              <Box
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  py: 1.75,
                  px: 2,
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f1f5f9",
                  },
                }}
              >
                <Typography sx={{ fontSize: "11px", color: "#64748b", fontWeight: 600, fontFamily: "'Inter', sans-serif", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Status
                </Typography>
                <Typography sx={{ fontSize: "14px", color: "#2563eb", fontWeight: 700, fontFamily: "'Inter', sans-serif", mt: 0.5 }}>
                  Submitted
                </Typography>
              </Box>
            </Box>

            {/* Action Button */}
            <Button
              variant="contained"
              disabled={isResetting}
              onClick={handleResetAndFillAnother}
              startIcon={
                isResetting ? (
                  <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                ) : (
                  <AddIcon sx={{ fontSize: "19px !important" }} />
                )
              }
              sx={{
                width: "100%",
                maxWidth: "340px",
                height: "48px",
                background: isResetting
                  ? "#3949ab"
                  : "linear-gradient(135deg, #1e3a8a 0%, #3949ab 100%)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14.5px",
                px: 4,
                borderRadius: "12px",
                textTransform: "none",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 8px 24px -4px rgba(57, 73, 171, 0.4)",
                transition: "all 0.2s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #1e3a8a 0%, #303f9f 100%)",
                  boxShadow: "0 12px 28px -4px rgba(57, 73, 171, 0.55)",
                  transform: "translateY(-2px)",
                },
                "&.Mui-disabled": {
                  background: isResetting ? "#3949ab" : "#e2e8f0",
                  color: isResetting ? "#ffffff" : "#94a3b8",
                  opacity: isResetting ? 0.85 : 1,
                  boxShadow: "none",
                  cursor: "not-allowed",
                },
              }}
            >
              {isResetting ? "Starting New Application..." : "Fill Another Application"}
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: {
                xs: "1.5rem",
                sm: "2rem",
                md: "1.8rem",
              },
              color: "#0f172a",
              fontWeight: 700,
              marginBottom: 1,
              mt: 2,
            }}
          >
            Additional <span style={{ color: "#3949ab" }}>Details</span>
          </Typography>
          <Typography
            sx={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "#475569",
              marginBottom: 3,
              fontWeight: 500,
            }}
          >
            Step 4/4
          </Typography>
          {/* ── 1. Financial & Income Information Section ── */}
          <Box
            sx={{
              width: "100%",
              maxWidth: "680px",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              backgroundColor: "#ffffff",
              p: { xs: 2.5, sm: 3.5 },
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              mb: 3.5,
            }}
          >
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#0f172a",
                  fontFamily: "'Inter', sans-serif",
                  mb: 0.5,
                }}
              >
                {loanType === "education loan" ? "1. Financial & Income Information" : "Financial & Income Information"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Provide primary applicant annual financial details and existing liabilities
              </Typography>
            </Box>

            {/* Highlighted Annual Salary / Turnover Section with Calm/Cool Palette */}
            <Box
              sx={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                borderRadius: "14px",
                p: 2.25,
                mb: 2.5,
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", fontFamily: "'Inter', sans-serif" }}>
                  Annual Income / Turnover
                </Typography>
                <Box
                  sx={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#dc2626",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fee2e2",
                    px: 1.2,
                    py: 0.25,
                    borderRadius: "6px",
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.3px",
                  }}
                >
                  Mandatory
                </Box>
              </Box>

              <TextField
                id="field-salary-turnover"
                autoComplete="off"
                fullWidth
                variant="outlined"
                type="text"
                name="amount"
                label={
                  <span>
                    ( Salary / Turnover ) p.a{" "}
                    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>* (Mandatory)</span>
                  </span>
                }
                placeholder="Enter annual salary or business turnover in ₹"
                value={amount ?? ""}
                onChange={(e) => {
                  setAmount(e.target.value);
                  validateAmount(e.target.value);
                }}
                onBlur={() => validateAmount(amount)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CurrencyRupeeIcon sx={{ color: "#64748b" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...commonTextFieldStyles,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                  },
                }}
              />
            </Box>

            {/* Existing EMI & Credit Card Liabilities in 2 columns */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                autoComplete="off"
                fullWidth
                variant="outlined"
                name="emi"
                type="number"
                label={
                  <span>
                    Existing EMI Amount{" "}
                    <span style={{ color: "#64748b", fontWeight: 500 }}>(Optional)</span>
                  </span>
                }
                placeholder="₹ Monthly EMI"
                value={emi ?? ""}
                onChange={(e) => {
                  setEmi(e.target.value);
                  validateEmi(e.target.value);
                }}
                onBlur={() => validateEmi(emi)}
                error={!!errors.emi}
                helperText={errors.emi}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CurrencyRupeeIcon />
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />
              <TextField
                autoComplete="off"
                fullWidth
                variant="outlined"
                name="liability"
                type="number"
                label={
                  <span>
                    Existing Credit Card Liability{" "}
                    <span style={{ color: "#64748b", fontWeight: 500 }}>(Optional)</span>
                  </span>
                }
                placeholder="₹ Total liability"
                value={liability ?? ""}
                onChange={(e) => {
                  setLiability(e.target.value);
                  validateLiability(e.target.value);
                }}
                onBlur={() => validateLiability(liability)}
                error={!!errors.liability}
                helperText={errors.liability}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CurrencyRupeeIcon />
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />
            </Box>
          </Box>

          {/* ── 2. Co-Applicant Details & Proofs Group Section ── */}
          {loanType === "education loan" ? (
            <Box
              sx={{
                width: "100%",
                maxWidth: "680px",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                p: { xs: 2.5, sm: 3.5 },
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                mb: 4,
              }}
            >
              {/* Header with Circular Icon and Guarantor Pill */}
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75, mb: 3 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    backgroundColor: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <PeopleOutlineIcon sx={{ color: "#7c3aed", fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      2. Co-Applicant Details & Income Proofs
                    </Typography>
                    <Box
                      sx={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#7c3aed",
                        backgroundColor: "#f3e8ff",
                        border: "1px solid #ddd6fe",
                        px: 1.5,
                        py: 0.3,
                        borderRadius: "12px",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Guarantor
                    </Box>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontFamily: "'Inter', sans-serif",
                      mt: 0.5,
                    }}
                  >
                    Relationship, identity verification & financial income proof
                  </Typography>
                </Box>
              </Box>

              {/* Sub-section 1: Co-Applicant Personal Info */}
              <Box sx={{ mb: 3.5 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid #f1f5f9",
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
                    Co-Applicant Personal Info
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <FormControl
                    fullWidth
                    size="small"
                    error={!!errors.coAppRelation}
                    sx={commonFormControlStyles}
                  >
                    <InputLabel id="coapp-relation-label" shrink>
                      {renderRequiredLabel("Relation with Applicant")}
                    </InputLabel>
                    <Select
                      id="coapp-relation"
                      labelId="coapp-relation-label"
                      label={renderRequiredLabel("Relation with Applicant")}
                      value={coAppRelation}
                      onChange={(e) => {
                        setCoAppRelation(e.target.value);
                        validateCoAppRelation(e.target.value);
                      }}
                      onBlur={() => validateCoAppRelation(coAppRelation)}
                      sx={{ borderRadius: "10px" }}
                      notched
                    >
                      <MenuItem value="Father">Father</MenuItem>
                      <MenuItem value="Mother">Mother</MenuItem>
                      <MenuItem value="Spouse">Spouse</MenuItem>
                      <MenuItem value="Brother">Brother</MenuItem>
                      <MenuItem value="Sister">Sister</MenuItem>
                      <MenuItem value="Guardian">Guardian</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                    {errors.coAppRelation && (
                      <Typography sx={{ color: "#ef4444", fontSize: "12px", mt: 0.5, ml: 1, fontFamily: "'Inter', sans-serif" }}>
                        {errors.coAppRelation}
                      </Typography>
                    )}
                  </FormControl>

                  <FormControl
                    fullWidth
                    size="small"
                    error={!!errors.coAppEmploymentType}
                    sx={commonFormControlStyles}
                  >
                    <InputLabel id="coapp-emptype-label" shrink>
                      {renderRequiredLabel("Employment Type")}
                    </InputLabel>
                    <Select
                      id="coapp-employment-type"
                      labelId="coapp-emptype-label"
                      label={renderRequiredLabel("Employment Type")}
                      value={coAppEmploymentType}
                      onChange={(e) => {
                        setCoAppEmploymentType(e.target.value);
                        validateCoAppEmploymentType(e.target.value);
                      }}
                      onBlur={() => validateCoAppEmploymentType(coAppEmploymentType)}
                      sx={{ borderRadius: "10px" }}
                      notched
                    >
                      <MenuItem value="Salaried">Salaried</MenuItem>
                      <MenuItem value="Self-Employed">Self-Employed</MenuItem>
                      <MenuItem value="Business">Business</MenuItem>
                      <MenuItem value="Professional">Professional</MenuItem>
                      <MenuItem value="Retired">Retired</MenuItem>
                    </Select>
                    {errors.coAppEmploymentType && (
                      <Typography sx={{ color: "#ef4444", fontSize: "12px", mt: 0.5, ml: 1, fontFamily: "'Inter', sans-serif" }}>
                        {errors.coAppEmploymentType}
                      </Typography>
                    )}
                  </FormControl>

                  <TextField
                    id="field-coapp-email"
                    fullWidth
                    size="small"
                    label={renderRequiredLabel("Co-Applicant Email ID")}
                    placeholder="e.g. parent@gmail.com"
                    value={coAppEmail}
                    onChange={(e) => {
                      setCoAppEmail(e.target.value);
                      validateCoAppEmail(e.target.value);
                    }}
                    onBlur={() => validateCoAppEmail(coAppEmail)}
                    error={!!errors.coAppEmail}
                    helperText={errors.coAppEmail}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...commonTextFieldStyles, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                  />

                  <TextField
                    id="field-coapp-mobile"
                    fullWidth
                    size="small"
                    label={renderRequiredLabel("Co-Applicant Mobile No.")}
                    placeholder="10-digit mobile number"
                    value={coAppMobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setCoAppMobile(val);
                      validateCoAppMobile(val);
                    }}
                    onBlur={() => validateCoAppMobile(coAppMobile)}
                    error={!!errors.coAppMobile}
                    helperText={errors.coAppMobile}
                    inputProps={{ maxLength: 10 }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...commonTextFieldStyles, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                  />

                  <Box sx={{ gridColumn: { xs: "1", sm: "1 / span 2" } }}>
                    <TextField
                      id="field-coapp-mother-name"
                      fullWidth
                      size="small"
                      label={renderRequiredLabel("Co-Applicant Mother's Name")}
                      placeholder="Full Mother's Name"
                      value={coAppMotherName}
                      onChange={(e) => {
                        setCoAppMotherName(e.target.value);
                        validateCoAppMotherName(e.target.value);
                      }}
                      onBlur={() => validateCoAppMotherName(coAppMotherName)}
                      error={!!errors.coAppMotherName}
                      helperText={errors.coAppMotherName}
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...commonTextFieldStyles, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Sub-section 2: Identity Verification */}
              <Box sx={{ mb: 3.5 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid #f1f5f9",
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
                    Co-Applicant Identity Verification
                  </Typography>
                </Box>
                <Box
                  id="coapp-identity-section"
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBoxCoApp
                    label="Co-Applicant Aadhaar Card * (Mandatory)"
                    field="coAppAadhaar"
                    buttonText="Browse File"
                  />
                  <FileUploadBoxCoApp
                    label="Co-Applicant PAN Card * (Mandatory)"
                    field="coAppPan"
                    buttonText="Browse File"
                  />
                </Box>
              </Box>

              {/* Sub-section 3: Banking & Income Proofs */}
              <Box sx={{ mb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f1f5f9",
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
                    Banking & Income Proofs
                  </Typography>
                  <Box
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      px: 1.5,
                      py: 0.3,
                      borderRadius: "6px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Salaried Person
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  <FileUploadBoxCoApp
                    label="Co-Applicant Cancelled Bank Cheque * (Mandatory)"
                    field="coAppCancelledCheque"
                    buttonText="Browse File"
                  />
                </Box>

                {/* Salaried Income Documents header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 2 }}>
                  <DescriptionOutlinedIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#334155",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Salaried Income Documents
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FileUploadBoxCoApp
                    label="Form 16 (Last 2 Years – Part A & Part B) * (Mandatory)"
                    field="coAppForm16"
                    buttonText="Browse File"
                  />
                  <FileUploadBoxCoApp
                    label="3 Months Salary Slips * (Mandatory)"
                    field="coAppSalarySlips"
                    buttonText="Browse File"
                  />
                  <FileUploadBoxCoApp
                    label="Company / Govt ID Card * (Mandatory)"
                    field="coAppIdCard"
                    buttonText="Browse File"
                  />
                </Box>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                maxWidth: "680px",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                p: { xs: 2.5, sm: 3.5 },
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                mb: 3.5,
              }}
            >
              {/* Card Header */}
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Degree & Registration Certificates
                    </Typography>
                    <Box
                      sx={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#64748b",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        px: 1.5,
                        py: 0.3,
                        borderRadius: "12px",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Optional
                    </Box>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontFamily: "'Inter', sans-serif",
                      mt: 0.5,
                    }}
                  >
                    Upload educational degrees, certificates or professional registration documents (Max 4)
                  </Typography>
                </Box>
              </Box>

              {/* Full-width Dropzone / File Picker */}
              {selectedFiles.length < 4 && (
                <Box
                  component="label"
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: "110px",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    backgroundColor: "#f8fafc",
                    cursor: "pointer",
                    p: 2.5,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "#2563eb",
                      backgroundColor: "#eff6ff",
                    },
                  }}
                >
                  <IconButton component="span" sx={{ color: "#2563eb", p: 0.5, pointerEvents: "none" }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: 30 }} />
                  </IconButton>
                  <Typography sx={{ fontSize: "13px", color: "#1e293b", fontWeight: 600, mt: 0.5, fontFamily: "'Inter', sans-serif" }}>
                    Click to Browse or Upload Certificate
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.2, fontFamily: "'Inter', sans-serif" }}>
                    Supports PDF, PNG, JPG (Max 5MB each, up to {4 - selectedFiles.length} more {4 - selectedFiles.length === 1 ? "file" : "files"})
                  </Typography>
                  <input
                    ref={inputRef}
                    hidden
                    multiple
                    type="file"
                    accept=".jpg, .gif, .png, .jpeg, .svg, .webp, application/pdf, .doc, .docx, .txt"
                    onChange={(event) => {
                      const newFiles = Array.from(event.target.files);
                      const totalFiles = selectedFiles.length + newFiles.length;

                      if (totalFiles > 4) {
                        handleToast("Maximum limit reached: 4 files", "error");
                        return;
                      }

                      const filteredFiles = newFiles.filter((file) => {
                        if (file.size > 5048576) {
                          handleToast(`${file.name} exceeds the 5 MB limit`, "error");
                          return false;
                        }
                        return true;
                      });

                      if (filteredFiles.length === 0) return;

                      setSelectedFiles((prevFiles) => [...prevFiles, ...filteredFiles]);
                    }}
                  />
                </Box>
              )}

              {/* Selected Files Preview inside Card */}
              {selectedFiles.length > 0 && (
                <Box sx={{ width: "100%", mt: selectedFiles.length < 4 ? 2 : 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {selectedFiles.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflow: "hidden" }}>
                        <InsertDriveFileIcon sx={{ color: "#2563eb", fontSize: 20, flexShrink: 0 }} />
                        <Typography
                          sx={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#0f172a",
                            fontFamily: "'Inter', sans-serif",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: { xs: "180px", sm: "320px" },
                          }}
                        >
                          {file.name}
                        </Typography>
                        <Typography sx={{ fontSize: "11px", color: "#64748b", flexShrink: 0 }}>
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleAttachmentDelete(index)}
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
          )}

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              width: "100%",
              maxWidth: "480px",
              justifyContent: handleBack ? "space-between" : "center",
              alignItems: "center",
              mt: 4,
              mb: 6,
            }}
          >
            {handleBack && (
              <Button
                startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
                onClick={() => {
                  setLocalStorage("activeStep", 2);
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
            )}

            <Button
              disabled={isUploading || !amount || !String(amount).trim() || !!errors.amount}
              variant="contained"
              onClick={create}
              startIcon={
                isUploading ? (
                  <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                ) : undefined
              }
              sx={{
                fontSize: "14px",
                color: "#ffffff",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                backgroundColor: "#3949ab",
                borderRadius: "8px",
                minWidth: "250px",
                height: "44px",
                padding: "10px 32px",
                textTransform: "none",
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
              {isUploading
                ? loanType === "education loan"
                  ? "Uploading & Completing..."
                  : "Submitting Application..."
                : loanType === "education loan"
                ? "Upload & Complete Application"
                : "Submit & Complete Application"}
            </Button>
          </Box>

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
      )}
    </Container>
  );
};

export default Step7Form;
