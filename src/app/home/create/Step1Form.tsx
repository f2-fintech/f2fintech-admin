/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { axiosInstance } from "@/apis/config/axiosConfig";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { Formik, Form, ErrorMessage } from "formik";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Chip,
  FormControl,
  FormGroup,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  FormHelperText,
  ListItemText,
  ListSubheader,
  Tooltip,
} from "@mui/material";
import { CurrencyRupee as CurrencyRupeeIcon, AccessTime, Close, Edit, Check, ArrowBack as ArrowBackIcon, KeyboardArrowDown as KeyboardArrowDownIcon } from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CallIcon from "@mui/icons-material/Call";
import SmsIcon from "@mui/icons-material/Sms";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import SearchIcon from "@mui/icons-material/Search";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HomeIcon from "@mui/icons-material/Home";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WorkIcon from "@mui/icons-material/Work";
import BusinessIcon from "@mui/icons-material/Business";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { getCompanyId } from "@/utils/cookies";

import { step1ValidationSchema, step1ParametersSchema, focusAndScrollToField } from "./validationSchemas";
import { Utility } from "@/utils";
import Toast from "@/app/components/common/Toast";
import DropdownComponent from "@/app/components/common/DropdownComponent";
import { useGetLoanProviders } from "@/hooks/loanProvider";
import {
  INDIAN_STATES,
  LOAN_TYPES_DATA,
  leadTypes,
  tenureOptions,
  getLoanCategory,
} from "./formConstants";

interface ProviderAmount {
  provider: string;
  amount: string;
}

interface ExistingLoanItem {
  has_running_loans: string;
  which_loan: string;
  loan_amount: string;
  running_emi: string;
}

const initialValues = {
  // Screen 1: Loan & Lead Parameters
  amount: "",
  tenure: "",
  loanType: "",
  loanCategory: "",
  businessEntityType: "",
  company_official_email: "",
  leadType: "",
  caseType: "fresh",
  providers: [] as string[],
  providerAmounts: [] as ProviderAmount[],
  existingLoans: [
    {
      has_running_loans: "",
      which_loan: "",
      loan_amount: "",
      running_emi: "",
    },
  ] as ExistingLoanItem[],

  // Screen 2: Customer Profile Details
  title: "",
  name: "",
  email: "",
  contact: "",
  status: "active",
  father_name: "",
  mother_name: "",
  working_address: "",
  permanent_address: "",
  current_address: "",
  dob: null as any,
  city: "",
  state: "",
  pan: "",
  employment_type: "",
};

const renderRequiredLabel = (text: string) => (
  <span>
    {text.replace(/[*]|(?:\*\s*\(Mandatory\))/g, "").trim()}{" "}
    <span style={{ color: "#e05353", fontSize: "11px", fontWeight: 500, letterSpacing: "0.2px" }}>
      * (Mandatory)
    </span>
  </span>
);

const getInitialStep1Draft = () => {
  const merged = { ...initialValues };
  if (typeof window !== "undefined") {
    try {
      const savedDraftRaw = localStorage.getItem("step1DraftData");
      const savedCustomerRaw = localStorage.getItem("step1CustomerDraft");
      const savedDraft = savedDraftRaw ? JSON.parse(savedDraftRaw) : null;
      const savedCustomer = savedCustomerRaw ? JSON.parse(savedCustomerRaw) : null;

      if (savedDraft) {
        if (savedDraft.amount !== undefined && savedDraft.amount !== null) merged.amount = savedDraft.amount;
        if (savedDraft.loanType) {
          merged.loanType = savedDraft.loanType;
          merged.loanCategory = getLoanCategory(savedDraft.loanType) || savedDraft.loanCategory || "";
        }
        if (savedDraft.tenure) merged.tenure = savedDraft.tenure;
        if (Array.isArray(savedDraft.providers)) merged.providers = savedDraft.providers;
        if (Array.isArray(savedDraft.providerAmounts)) merged.providerAmounts = savedDraft.providerAmounts;
        if (savedDraft.leadType) merged.leadType = savedDraft.leadType;
        if (savedDraft.caseType) merged.caseType = savedDraft.caseType;
        if (Array.isArray(savedDraft.existingLoans) && savedDraft.existingLoans.length > 0) {
          merged.existingLoans = savedDraft.existingLoans;
        }
        if (savedDraft.businessEntityType) merged.businessEntityType = savedDraft.businessEntityType;
        if (savedDraft.companyOfficialEmail || savedDraft.company_official_email) {
          merged.company_official_email = savedDraft.companyOfficialEmail || savedDraft.company_official_email;
        }
      }

      if (savedCustomer) {
        Object.assign(merged, savedCustomer);
        if (savedCustomer.dob) {
          merged.dob = dayjs(savedCustomer.dob).isValid() ? dayjs(savedCustomer.dob) : null;
        }
      }
    } catch (e) {
      console.error("Error reading initial draft from localStorage", e);
    }
  }
  return merged;
};

interface Step1FormProps {
  applicationNumber?: number | string | null;
  setApplicationNumber?: (num: number | string | null) => void;
  getStarted?: boolean;
  setGetStarted?: (value: boolean) => void;
  salary?: any;
  onSubmit?: () => void;
  handleNext?: () => void;
}

const Step1Form: React.FC<Step1FormProps> = ({
  applicationNumber,
  setApplicationNumber,
  getStarted = false,
  setGetStarted,
  salary,
  onSubmit,
}) => {
  const [customerDraft, setCustomerDraft] = useState(() => getInitialStep1Draft());
  const [loading, setLoading] = useState<boolean>(false);
  const [loanStatus, setLoanStatus] = useState<string | null>(null);
  const [stateSearch, setStateSearch] = useState<string>("");
  const [amountDialogOpen, setAmountDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useSelector((state: RootState) => state.toast);

  const { value: providersData, swrLoading: providersLoading } =
    useGetLoanProviders(
      null,
      getStarted ? null : "get-all-loan-providers",
      1,
      100
    );

  const { getLocalStorage, setLocalStorage, toastAndNavigate } = Utility();
  const storedCustomerId = getLocalStorage("customerInfo")?.id;

  const randomFourDigitNumber = Math.floor(1000 + Math.random() * 9000);

  const minDate = dayjs("1900-01-01");
  const maxDate = dayjs().subtract(20, "year");

  // Fetch application number and loan status if customer exists
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (storedCustomerId) {
        try {
          const { data: response } = await axiosInstance.get(
            `${process.env.NEXT_PUBLIC_WEB_URL}/get-application-by-id/${storedCustomerId}`
          );
          if (response.status === "Success") {
            setApplicationNumber?.(response.data.application_no);
            const { data: resp } = await axiosInstance.get(
              `${process.env.NEXT_PUBLIC_WEB_URL}/get-loan-tracking-by-id/${response.data.id}`
            );
            if (resp.status === "Success") {
              setLoanStatus(resp.data.status);
            }
          }
        } catch (err) {
          console.log("Error fetching customer data:", err);
        }
      }
    };
    fetchCustomerData();
  }, [storedCustomerId]);

  // Restore saved draft data on mount
  useEffect(() => {
    const draft = getInitialStep1Draft();
    setCustomerDraft(draft);

    if (getLocalStorage("step1GetStarted")) {
      setGetStarted?.(true);
    }
  }, []);

  const registerCustomer = async (customer: any) => {
    const { data: response } = await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_WEB_URL}/create-customer`,
      {
        ...customer,
        company_id: getCompanyId() || getLocalStorage("selectedCompanyId"),
        role: "customer",
      }
    );
    return response.data.id;
  };

  const createCustomerInfo = async (customerId: string | number, values: any) => {
    await axiosInstance.post(
      `${process.env.NEXT_PUBLIC_WEB_URL}/create-customer-info`,
      {
        ...values,
        customer_id: customerId,
        company_id: getCompanyId() || getLocalStorage("selectedCompanyId"),
      }
    );
    return true;
  };

  const setCustomerData = async (customerInfo: any) => {
    setGetStarted?.(false);
    setLocalStorage("customerInfo", customerInfo);
  };

  // Submit handler (Customer Info + Save pending Application Data for Step 7)
  const create = useCallback(
    async (values: typeof initialValues) => {
      setLoading(true);
      const {
        contact,
        email,
        name,
        status,
        dob,
        title,
        amount,
        tenure,
        loanType,
        loanCategory,
        businessEntityType,
        company_official_email,
        leadType,
        caseType,
        providers,
        providerAmounts,
        existingLoans,
        employment_type,
        ...restValues
      } = values;

      const customer = {
        contact,
        dob,
        email,
        title,
        name,
        password: `${name ? name.replace(/\s/g, "") : "Customer"}@${randomFourDigitNumber}`,
        status: status || "active",
      };

      try {
        let customerId = storedCustomerId;
        let customerInfoExists = false;

        // Check if customer and customer info already exist
        if (customerId) {
          try {
            const { data: infoRes } = await axiosInstance.get(
              `${process.env.NEXT_PUBLIC_WEB_URL}/customer-info/${customerId}`
            );
            if (infoRes?.status === "Success" || infoRes?.data || infoRes?.statusCode === 200) {
              customerInfoExists = true;
            }
          } catch (err: any) {
            customerInfoExists = false;
          }
        }

        if (!customerId) {
          customerId = await registerCustomer(customer);
        }

        const officialEmail =
          loanType === "business loan" &&
            (businessEntityType === "private_limited" || businessEntityType === "llp")
            ? company_official_email
            : undefined;

        if (!customerInfoExists) {
          const customerInfoPayload = {
            ...restValues,
            employment_type,
            lead_type: leadType,
            ...(officialEmail ? { company_official_email: officialEmail } : {}),
          };
          await createCustomerInfo(customerId, customerInfoPayload);
        }

        // Store application data in localStorage for Step 7
        const pendingApplicationData = {
          customerId,
          providers,
          providerAmounts,
          amount,
          tenure,
          loanTypes: [loanType],
          loanCategory,
          leadType,
          existingLoans,
          caseType,
          businessEntityType,
          companyOfficialEmail: officialEmail || "",
          employment_type: employment_type || "",
        };
        setLocalStorage("pendingApplicationData", pendingApplicationData);

        setApplicationNumber?.("pending");

        if (!storedCustomerId) {
          await setCustomerData({
            id: customerId,
            name: customer.name,
            applicationNumbers: ["pending"],
          });
        }

        setLoading(false);
        console.log("Customer and application data verified/stored in localStorage");
        onSubmit?.();
      } catch (err) {
        setLoading(false);
        console.error("Error creating customer or saving draft:", err);
      }
    },
    [storedCustomerId, randomFourDigitNumber, onSubmit]
  );

  // Styles
  const commonFormControlStyles = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      color: "#0f172a",
      transition: "all 0.2s ease",
      alignItems: "center",
      "& .MuiSelect-outlined": {
        paddingTop: "14px",
        paddingBottom: "14px",
        paddingLeft: "4px !important",
        fontSize: "14px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
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
    "& .MuiSelect-icon": {
      color: "#64748b",
    },
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
  };

  const commonMenuProps = {
    PaperProps: {
      sx: {
        bgcolor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        mt: 1,
        "& .MuiMenuItem-root": {
          color: "#1e293b",
          fontSize: "14px",
          fontWeight: 500,
          borderRadius: "6px",
          mx: 1,
          my: 0.5,
          "&:hover": {
            backgroundColor: "#f1f5f9",
          },
          "&.Mui-selected": {
            backgroundColor: "#eef2ff !important",
            color: "#3949ab",
            fontWeight: 600,
          },
        },
      },
    },
  };

  const PROVIDER_OPTIONS = providersLoading
    ? []
    : providersData?.data?.results?.map((p: any) => p.title) || [];

  // Formik AutoSave Component
  const FormikAutoSave: React.FC<{ values: typeof initialValues }> = ({ values }) => {
    useEffect(() => {
      const hasLoanData =
        Boolean(values.amount) ||
        Boolean(values.loanType) ||
        Boolean(values.tenure) ||
        (Array.isArray(values.providers) && values.providers.length > 0) ||
        Boolean(values.leadType) ||
        (values.caseType && values.caseType !== "fresh") ||
        (Array.isArray(values.existingLoans) &&
          values.existingLoans.some(
            (l) => l.has_running_loans || l.which_loan || l.loan_amount || l.running_emi
          )) ||
        Boolean(values.businessEntityType) ||
        Boolean(values.company_official_email);

      if (hasLoanData) {
        setLocalStorage("step1DraftData", {
          amount: values.amount,
          loanType: values.loanType,
          loanCategory: values.loanCategory,
          tenure: values.tenure,
          providers: values.providers,
          providerAmounts: values.providerAmounts,
          leadType: values.leadType,
          caseType: values.caseType,
          existingLoans: values.existingLoans,
          businessEntityType: values.businessEntityType,
          companyOfficialEmail: values.company_official_email,
        });
      }

      const hasCustomerData =
        Boolean(values.title) ||
        Boolean(values.name) ||
        Boolean(values.contact) ||
        Boolean(values.email) ||
        Boolean(values.pan) ||
        Boolean(values.father_name) ||
        Boolean(values.mother_name) ||
        Boolean(values.current_address) ||
        Boolean(values.permanent_address) ||
        Boolean(values.city) ||
        Boolean(values.state) ||
        Boolean(values.employment_type) ||
        Boolean(values.dob);

      if (hasCustomerData) {
        setLocalStorage("step1CustomerDraft", values);
      }
    }, [values]);

    return null;
  };

  return (
    <Box sx={{ width: "100%", backgroundColor: "transparent", py: 0, px: 0, mt: 0 }}>
      <Formik
        enableReinitialize
        initialValues={customerDraft}
        validationSchema={step1ValidationSchema}
        onSubmit={(values) => create(values)}
      >
        {({
          values,
          errors,
          touched,
          setFieldValue,
          setFieldTouched,
          setTouched,
          validateForm,
          handleChange,
          handleBlur,
          handleSubmit,
        }) => {
          // Handlers for Loan Parameters
          const handleLoanTypeChange = (value: string) => {
            setFieldValue("loanType", value);
            const category = getLoanCategory(value);
            setFieldValue("loanCategory", category);
            setFieldValue("tenure", "");
            if (value !== "business loan") {
              setFieldValue("businessEntityType", "");
              setFieldValue("company_official_email", "");
            }
          };

          const handleProviderChange = (selected: string[]) => {
            setFieldValue("providers", selected);
            const current = [...(values.providerAmounts || [])];
            selected.forEach((pName) => {
              if (!current.find((pa) => pa.provider === pName)) {
                current.push({ provider: pName, amount: values.amount || "" });
              }
            });
            const filtered = current.filter((pa) => selected.includes(pa.provider));
            setFieldValue("providerAmounts", filtered);
          };

          const handleProviderRemove = (pNameToRemove: string) => {
            const updated = values.providers.filter((p) => p !== pNameToRemove);
            setFieldValue("providers", updated);
            const updatedAmounts = (values.providerAmounts || []).filter(
              (pa) => pa.provider !== pNameToRemove
            );
            setFieldValue("providerAmounts", updatedAmounts);
          };

          const updateProviderAmount = (pName: string, newAmt: string) => {
            const updated = (values.providerAmounts || []).map((pa) =>
              pa.provider === pName ? { ...pa, amount: newAmt } : pa
            );
            setFieldValue("providerAmounts", updated);
          };

          const handleExistingLoanChange = (index: number, field: string, value: string) => {
            const updated = [...values.existingLoans];
            (updated[index] as any)[field] = value;
            if (field === "has_running_loans" && value === "no") {
              updated[index].which_loan = "";
              updated[index].loan_amount = "";
              updated[index].running_emi = "";
            }
            setFieldValue("existingLoans", updated);
          };

          const handleAddLoan = () => {
            setFieldValue("existingLoans", [
              ...values.existingLoans,
              { has_running_loans: "yes", which_loan: "", loan_amount: "", running_emi: "" },
            ]);
          };

          const handleRemoveLoan = (indexToRemove: number) => {
            const updated = values.existingLoans.filter((_, idx) => idx !== indexToRemove);
            setFieldValue("existingLoans", updated);
          };

          // Screen 1: Initialize Loan Parameters
          if (!getStarted) {
            return (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <FormikAutoSave values={values} />

                {/* Dual Sub-Step Header Pill Bar */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                    width: "100%",
                    mb: 3.5,
                    pb: 2,
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.35rem", sm: "1.6rem" },
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.2,
                      }}
                    >
                      Initialize Loan <span style={{ color: "#3949ab" }}>Parameters</span>
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        color: "#475569",
                        fontWeight: 500,
                        mt: 0.5,
                      }}
                      variant="subtitle1"
                    >
                      Step 1/4
                    </Typography>
                  </Box>

                  {/* Sub-step indicator pills */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          fontSize: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        1
                      </Box>
                      <span>Parameters</span>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        backgroundColor: "#f8fafc",
                        color: "#94a3b8",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#cbd5e1",
                          color: "#ffffff",
                          fontSize: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        2
                      </Box>
                      <span>Profile</span>
                    </Box>
                  </Box>
                </Box>

                {/* Main Fields Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2.5,
                    width: "100%",
                    mb: 3.5,
                  }}
                >
                  {/* Amount Field */}
                  <Box>
                    <TextField
                      autoComplete="off"
                      fullWidth
                      variant="outlined"
                      name="amount"
                      label={renderRequiredLabel("Loan Amount Required")}
                      value={values.amount}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={!!touched.amount && !!errors.amount}
                      helperText={touched.amount && (errors.amount as string)}
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

                  {/* Loan Type Field */}
                  <Box>
                    <DropdownComponent
                      id="field-loanType"
                      name="loanType"
                      label={renderRequiredLabel("Loan Type")}
                      value={values.loanType}
                      onChange={(val) => handleLoanTypeChange(val)}
                      onBlur={() => setFieldTouched("loanType", true, true)}
                      error={!!touched.loanType && !!errors.loanType}
                      helperText={touched.loanType ? (errors.loanType as string) : undefined}
                      groups={[
                        { groupHeader: "Unsecured Loans", options: LOAN_TYPES_DATA.unsecured },
                        { groupHeader: "Secured Loans", options: LOAN_TYPES_DATA.secured },
                      ]}
                      startIcon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
                      placeholder="Select Loan Type"
                      maxHeight={320}
                    />
                  </Box>

                  {/* Business Entity Type Field */}
                  {values.loanType === "business loan" && (
                    <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                      <DropdownComponent
                        id="field-businessEntityType"
                        name="businessEntityType"
                        label={renderRequiredLabel("Type of Business Entity")}
                        value={values.businessEntityType}
                        onChange={(val) => {
                          setFieldValue("businessEntityType", val);
                          setFieldTouched("businessEntityType", true, false);
                        }}
                        onBlur={() => setFieldTouched("businessEntityType", true, true)}
                        error={!!touched.businessEntityType && !!errors.businessEntityType}
                        helperText={
                          touched.businessEntityType
                            ? (errors.businessEntityType as string)
                            : undefined
                        }
                        options={[
                          { value: "sole_proprietorship", label: "Sole Proprietorship" },
                          { value: "private_limited", label: "Private Limited" },
                          { value: "llp", label: "Limited Liability Partnership (LLP)" },
                          { value: "huf", label: "HUF (Hindu Undivided Family)" },
                          { value: "partnership", label: "Partnership" },
                        ]}
                        startIcon={<BusinessIcon sx={{ fontSize: 20 }} />}
                        placeholder="Select Business Entity Type"
                      />
                    </Box>
                  )}

                  {/* Company Official Email ID */}
                  {values.loanType === "business loan" &&
                    (values.businessEntityType === "private_limited" ||
                      values.businessEntityType === "llp") && (
                      <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                        <TextField
                          autoComplete="off"
                          fullWidth
                          variant="outlined"
                          type="email"
                          name="company_official_email"
                          label={renderRequiredLabel("Company Official Email ID")}
                          placeholder="e.g. contact@yourcompany.com"
                          value={values.company_official_email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.company_official_email && !!errors.company_official_email}
                          helperText={
                            (touched.company_official_email && (errors.company_official_email as string)) ||
                            "Official email address registered with Ministry of Corporate Affairs (MCA) / GST"
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon />
                              </InputAdornment>
                            ),
                          }}
                          sx={commonTextFieldStyles}
                        />
                      </Box>
                    )}

                  {/* Tenure Field */}
                  <Box>
                    <Tooltip
                      title={!values.loanType ? "Select Loan Type first" : ""}
                      arrow
                      placement="top"
                      disableHoverListener={Boolean(values.loanType)}
                    >
                      <Box sx={{ width: "100%", cursor: !values.loanType ? "not-allowed" : "default" }}>
                        <DropdownComponent
                          id="field-tenure"
                          name="tenure"
                          label={
                            values.loanCategory
                              ? `Select Tenure (${values.loanCategory === "secured" ? "Long Term" : "Short Term"})`
                              : "Select A Comfortable Tenure"
                          }
                          value={values.tenure}
                          onChange={(val) => {
                            setFieldValue("tenure", val);
                            setFieldTouched("tenure", true, false);
                          }}
                          onBlur={() => setFieldTouched("tenure", true, true)}
                          disabled={!values.loanCategory}
                          error={!!touched.tenure && !!errors.tenure}
                          helperText={touched.tenure ? (errors.tenure as string) : undefined}
                          options={(values.loanCategory ? tenureOptions[values.loanCategory] : []).map(
                            (label) => ({ value: label, label })
                          )}
                          startIcon={<AccessTime sx={{ fontSize: 20 }} />}
                          placeholder="Select Tenure"
                        />
                      </Box>
                    </Tooltip>
                  </Box>

                  {/* Providers Field */}
                  <Box>
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!touched.providers && !!errors.providers}
                      sx={commonFormControlStyles}
                    >
                      <InputLabel>{renderRequiredLabel("Provider Names (Select Multiple)")}</InputLabel>
                      <Select
                        name="providers"
                        label="Provider Names (Select Multiple)"
                        multiple
                        value={values.providers}
                        onChange={(e) => {
                          const val =
                            typeof e.target.value === "string"
                              ? e.target.value.split(",")
                              : e.target.value;
                          handleProviderChange(val);
                        }}
                        onBlur={handleBlur}
                        startAdornment={
                          <InputAdornment position="start">
                            <AccountBalanceIcon />
                          </InputAdornment>
                        }
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {selected.map((val) => (
                              <Chip
                                key={val}
                                label={val}
                                size="small"
                                sx={{
                                  backgroundColor: "#eef2ff",
                                  color: "#3949ab",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  borderRadius: "6px",
                                  "& .MuiChip-deleteIcon": {
                                    color: "#3949ab",
                                    fontSize: "14px",
                                  },
                                }}
                                onDelete={() => handleProviderRemove(val)}
                                onMouseDown={(event) => event.stopPropagation()}
                              />
                            ))}
                          </Box>
                        )}
                        MenuProps={commonMenuProps}
                      >
                        <MenuItem
                          value="Let F2 Fintech decide your lender"
                          sx={{
                            backgroundColor: "#f8fafc",
                            "&:hover": {
                              backgroundColor: "#f1f5f9",
                            },
                          }}
                        >
                          <Checkbox
                            checked={
                              values.providers.indexOf("Let F2 Fintech decide your lender") > -1
                            }
                            sx={{ color: "#94a3b8", "&.Mui-checked": { color: "#3949ab" } }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#3949ab" }}>
                            Let F2 Fintech decide your lender
                          </Typography>
                        </MenuItem>
                        {PROVIDER_OPTIONS.map((providerName: string) => (
                          <MenuItem
                            key={providerName}
                            value={providerName}
                            sx={{ padding: "10px 16px", fontSize: "14px", borderRadius: "6px" }}
                          >
                            <Checkbox
                              checked={values.providers.indexOf(providerName) > -1}
                              sx={{ color: "#94a3b8", "&.Mui-checked": { color: "#3949ab" } }}
                            />
                            <ListItemText primary={providerName} sx={{ color: "#1e293b" }} />
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.providers && errors.providers && (
                        <Typography
                          color="error"
                          sx={{ mt: 0.5, ml: 1, fontSize: "11px", fontFamily: "Verdana, sans-serif" }}
                        >
                          {errors.providers as string}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>

                  {/* Lead Type Field (Moulded Seamless Dropdown) */}
                  <Box>
                    <DropdownComponent
                      id="field-leadType"
                      name="leadType"
                      label={renderRequiredLabel("Lead Type")}
                      value={values.leadType}
                      onChange={(val) => {
                        setFieldValue("leadType", val);
                        setFieldTouched("leadType", true, false);
                      }}
                      onBlur={() => setFieldTouched("leadType", true, true)}
                      error={!!touched.leadType && !!errors.leadType}
                      helperText={touched.leadType ? (errors.leadType as string) : undefined}
                      options={leadTypes}
                      startIcon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
                      placeholder="Select Lead Type"
                    />
                  </Box>

                  {/* Case Type Field */}
                  <Box>
                    <DropdownComponent
                      id="field-caseType"
                      name="caseType"
                      label={renderRequiredLabel("Case Type")}
                      value={values.caseType}
                      onChange={(val) => {
                        setFieldValue("caseType", val);
                        setFieldTouched("caseType", true, false);
                      }}
                      onBlur={() => setFieldTouched("caseType", true, true)}
                      error={!!touched.caseType && !!errors.caseType}
                      helperText={touched.caseType ? (errors.caseType as string) : undefined}
                      options={[
                        { value: "fresh", label: "Fresh" },
                        { value: "top_up", label: "Top Up" },
                      ]}
                      startIcon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
                      placeholder="Select Case Type"
                    />
                  </Box>
                </Box>

                {/* Provider Amounts Summary (Lender Allocation) */}
                {values.providers.length > 0 && (
                  <Box
                    sx={{
                      width: "100%",
                      mb: 3.5,
                      p: 2.5,
                      backgroundColor: "#f8fafc",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography
                        sx={{
                          color: "#3949ab",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          fontFamily: "'Inter', sans-serif",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <AccountBalanceIcon sx={{ fontSize: 17 }} />
                        Lender Amount Allocation ({values.providers.length})
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                        Click pencil icon to customize limit
                      </Typography>
                    </Box>
                    <Stack spacing={1.25}>
                      {values.providers.map((providerName) => {
                        const providerAmount =
                          values.providerAmounts?.find((pa) => pa.provider === providerName)
                            ?.amount || values.amount;
                        return (
                          <Box
                            key={providerName}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              px: 2,
                              py: 1.25,
                              backgroundColor: "#ffffff",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                borderColor: "#c7d2fe",
                                boxShadow: "0 2px 6px rgba(57, 73, 171, 0.06)",
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                color: "#1e293b",
                                fontSize: "13px",
                                fontWeight: 600,
                                flex: 1,
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              {providerName}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Typography
                                sx={{
                                  color: "#3949ab",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                ₹{providerAmount ? Number(providerAmount).toLocaleString("en-IN") : "Not set"}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingProvider(providerName);
                                  setAmountDialogOpen(true);
                                }}
                                sx={{
                                  color: "#3949ab",
                                  backgroundColor: "#eff6ff",
                                  padding: "5px",
                                  "&:hover": {
                                    backgroundColor: "#dbeafe",
                                  },
                                }}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {/* Existing Liabilities & Running Loans Section */}
                <Box sx={{ width: "100%", mb: 3.5 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: "14px",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <CreditCardIcon sx={{ fontSize: 18, color: "#3949ab" }} />
                      Existing Liabilities & Running Loans
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.25, fontFamily: "'Inter', sans-serif" }}>
                      Specify any running loans to compute accurate debt-to-income (DTI) ratio
                    </Typography>
                  </Box>

                  {values.existingLoans.map((loan, index) => {
                    const loanErr = (errors.existingLoans as any)?.[index] || {};
                    const isYes = loan.has_running_loans === "yes";

                    return (
                      <Box
                        key={index}
                        sx={{
                          border: isYes ? "1.5px solid #c7d2fe" : "1px solid #e2e8f0",
                          borderRadius: "14px",
                          p: isYes ? 2.5 : 2,
                          mb: 2,
                          backgroundColor: isYes ? "#ffffff" : "#f8fafc",
                          position: "relative",
                          transition: "all 0.2s ease",
                          boxShadow: isYes ? "0 4px 12px rgba(57, 73, 171, 0.05)" : "none",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: isYes ? 2.5 : 0,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, flexWrap: "wrap" }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#3949ab",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                                fontSize: "11px",
                                backgroundColor: "#eef2ff",
                                border: "1px solid #e0e7ff",
                                px: 1.25,
                                py: 0.35,
                                borderRadius: "6px",
                              }}
                            >
                              RECORD #{index + 1}
                            </Typography>

                            <FormControl
                              size="small"
                              variant="outlined"
                              sx={{
                                minWidth: "180px",
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: "8px",
                                  backgroundColor: "#ffffff",
                                  fontSize: "13px",
                                  height: "36px",
                                },
                              }}
                            >
                              <Select
                                value={loan.has_running_loans || "no"}
                                onChange={(e) =>
                                  handleExistingLoanChange(index, "has_running_loans", e.target.value)
                                }
                              >
                                <MenuItem value="no">No Running Loans</MenuItem>
                                <MenuItem value="yes">Yes, Has Running Loans</MenuItem>
                              </Select>
                            </FormControl>

                            {!isYes && (
                              <Typography sx={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                                ✓ No existing liabilities recorded
                              </Typography>
                            )}
                          </Box>

                          {values.existingLoans.length > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveLoan(index)}
                              sx={{
                                color: "#ef4444",
                                backgroundColor: "#fef2f2",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  backgroundColor: "#fee2e2",
                                },
                              }}
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          )}
                        </Box>

                        {isYes && (
                          <Stack spacing={2.5}>
                            <DropdownComponent
                              id={`field-existingLoans[${index}].which_loan`}
                              name={`existingLoans[${index}].which_loan`}
                              label={renderRequiredLabel("Loan Type")}
                              value={loan.which_loan}
                              onChange={(val) =>
                                handleExistingLoanChange(index, "which_loan", val)
                              }
                              onBlur={() => setFieldTouched(`existingLoans[${index}].which_loan`, true, true)}
                              error={!!loanErr.which_loan}
                              helperText={loanErr.which_loan}
                              groups={[
                                { groupHeader: "Unsecured Loans", options: LOAN_TYPES_DATA.unsecured },
                                { groupHeader: "Secured Loans", options: LOAN_TYPES_DATA.secured },
                              ]}
                              startIcon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
                              placeholder="Select Loan Type"
                              maxHeight={320}
                            />

                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                gap: 2,
                              }}
                            >
                              <TextField
                                fullWidth
                                variant="outlined"
                                label={renderRequiredLabel("Outstanding Amount")}
                                placeholder="0.00"
                                value={loan.loan_amount}
                                onChange={(e) =>
                                  handleExistingLoanChange(index, "loan_amount", e.target.value)
                                }
                                error={!!loanErr.loan_amount}
                                helperText={loanErr.loan_amount}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <CurrencyRupeeIcon sx={{ color: "#64748b", fontSize: 18 }} />
                                    </InputAdornment>
                                  ),
                                }}
                                sx={commonTextFieldStyles}
                              />
                              <TextField
                                fullWidth
                                variant="outlined"
                                label="Running Monthly EMI (Optional)"
                                placeholder="0.00"
                                value={loan.running_emi}
                                onChange={(e) =>
                                  handleExistingLoanChange(index, "running_emi", e.target.value)
                                }
                                error={!!loanErr.running_emi}
                                helperText={loanErr.running_emi}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <CurrencyRupeeIcon sx={{ color: "#64748b", fontSize: 18 }} />
                                    </InputAdornment>
                                  ),
                                }}
                                sx={commonTextFieldStyles}
                              />
                            </Box>
                          </Stack>
                        )}
                      </Box>
                    );
                  })}

                  {values.existingLoans.some((l) => l.has_running_loans === "yes") && (
                    <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit sx={{ fontSize: 16 }} />}
                        onClick={handleAddLoan}
                        sx={{
                          borderRadius: "8px",
                          color: "#3949ab",
                          borderColor: "#cbd5e1",
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "13px",
                          px: 2.5,
                          py: 0.85,
                          backgroundColor: "#ffffff",
                          "&:hover": {
                            borderColor: "#3949ab",
                            backgroundColor: "#eff6ff",
                          },
                        }}
                      >
                        + Add Another Running Loan
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* Primary Action Button */}
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                  onClick={async () => {
                    try {
                      await step1ParametersSchema.validate(values, { abortEarly: false });
                      setLocalStorage("step1GetStarted", true);
                      setLocalStorage("step1DraftData", values);
                      setGetStarted?.(true);
                    } catch (err: any) {
                      const touchedParams: Record<string, boolean> = {
                        amount: true,
                        loanType: true,
                        tenure: true,
                        providers: true,
                        leadType: true,
                        caseType: true,
                      };
                      if (values.loanType === "business loan") {
                        touchedParams.businessEntityType = true;
                        if (
                          values.businessEntityType === "private_limited" ||
                          values.businessEntityType === "llp"
                        ) {
                          touchedParams.company_official_email = true;
                        }
                      }
                      if (values.existingLoans && values.existingLoans.length > 0) {
                        touchedParams.existingLoans = true;
                      }
                      setTouched({ ...touched, ...touchedParams });
                      const firstError =
                        err?.inner?.[0]?.message || err?.message || "Please fill all required loan parameters";
                      const firstErrorPath = err?.inner?.[0]?.path || err?.path;
                      toastAndNavigate(dispatch, true, "error", firstError);
                      if (firstErrorPath) {
                        focusAndScrollToField(firstErrorPath);
                      }
                    }
                  }}
                  sx={{
                    width: "100%",
                    maxWidth: "360px",
                    height: "48px",
                    background: "linear-gradient(135deg, #1e3a8a 0%, #3949ab 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    borderRadius: "12px",
                    textTransform: "none",
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: "0 8px 24px -4px rgba(57, 73, 171, 0.4)",
                    transition: "all 0.2s ease",
                    mt: 1,
                    mb: 3,
                    "&:hover": {
                      background: "linear-gradient(135deg, #1e3a8a 0%, #303f9f 100%)",
                      boxShadow: "0 12px 28px -4px rgba(57, 73, 171, 0.55)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  Let's Get Started
                </Button>

                {/* Dialog for Custom Provider Amount */}
                <Dialog
                  open={amountDialogOpen}
                  onClose={() => setAmountDialogOpen(false)}
                  maxWidth="xs"
                  fullWidth
                  PaperProps={{
                    sx: {
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.15)",
                      border: "1px solid #e2e8f0",
                      p: 0.5,
                    },
                  }}
                >
                  <DialogTitle
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      pb: 1.5,
                      pt: 2,
                      px: 2.5,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "10px",
                          backgroundColor: "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#3949ab",
                        }}
                      >
                        <AccountBalanceIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "16px",
                            color: "#0f172a",
                          }}
                        >
                          Set Amount for {editingProvider}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          Customize loan amount for this lender
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={() => setAmountDialogOpen(false)}
                      size="small"
                      sx={{
                        color: "#94a3b8",
                        "&:hover": {
                          color: "#0f172a",
                          backgroundColor: "#f1f5f9",
                        },
                      }}
                    >
                      <Close sx={{ fontSize: 20 }} />
                    </IconButton>
                  </DialogTitle>
                  <DialogContent sx={{ pt: 3, pb: 2, px: 2.5 }}>
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        autoComplete="off"
                        fullWidth
                        variant="outlined"
                        label={renderRequiredLabel("Loan Amount Required")}
                        placeholder="e.g. 500000"
                        value={
                          values.providerAmounts?.find((pa) => pa.provider === editingProvider)
                            ?.amount || values.amount
                        }
                        onChange={(e) => {
                          if (editingProvider) {
                            updateProviderAmount(editingProvider, e.target.value);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CurrencyRupeeIcon />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Amount must be between ₹50,000 and ₹10,00,00,000 (divisible by 5)"
                        sx={commonTextFieldStyles}
                      />
                    </Box>
                  </DialogContent>
                  <DialogActions
                    sx={{ px: 2.5, pb: 2.5, pt: 1, borderTop: "1px solid #f1f5f9", gap: 1 }}
                  >
                    <Button
                      onClick={() => setAmountDialogOpen(false)}
                      variant="outlined"
                      sx={{
                        textTransform: "none",
                        borderRadius: "8px",
                        color: "#64748b",
                        borderColor: "#cbd5e1",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: "13.5px",
                        px: 2.5,
                        py: 0.8,
                        "&:hover": {
                          borderColor: "#94a3b8",
                          backgroundColor: "#f8fafc",
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setAmountDialogOpen(false)}
                      variant="contained"
                      sx={{
                        textTransform: "none",
                        borderRadius: "8px",
                        backgroundColor: "#3949ab",
                        color: "#ffffff",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: "13.5px",
                        px: 3,
                        py: 0.8,
                        boxShadow: "0 4px 12px rgba(57, 73, 171, 0.25)",
                        "&:hover": {
                          backgroundColor: "#303f9f",
                          boxShadow: "0 6px 16px rgba(57, 73, 171, 0.35)",
                        },
                      }}
                    >
                      Save Amount
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            );
          }

          // Screen 2: Basic Customer Details Form
          return (
            <Form onSubmit={handleSubmit}>
              <FormikAutoSave values={values} />
              <Container
                maxWidth={false}
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  maxWidth: "600px",
                  marginBottom: "15px",
                  padding: "0 !important",
                }}
              >
                {/* Header Section with Dual Sub-step Pills */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    mt: 0,
                    width: "100%",
                    pb: 1.5,
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Button
                      startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
                      onClick={() => {
                        setLocalStorage("step1GetStarted", false);
                        setGetStarted?.(false);
                      }}
                      sx={{
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "12px",
                        fontFamily: "'Inter', sans-serif",
                        borderRadius: "6px",
                        px: 1.5,
                        py: 0.45,
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
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: { xs: "1.35rem", sm: "1.6rem" },
                          color: "#0f172a",
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        Basic <span style={{ color: "#3949ab" }}>Details</span>
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "14px",
                          color: "#475569",
                          fontWeight: 500,
                          mt: 0.5,
                        }}
                        variant="subtitle1"
                      >
                        Step 1/4
                      </Typography>
                    </Box>
                  </Box>

                  {/* Sub-step indicator pills */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      onClick={() => {
                        setLocalStorage("step1GetStarted", false);
                        setGetStarted?.(false);
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        cursor: "pointer",
                        backgroundColor: "#f8fafc",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        "&:hover": {
                          backgroundColor: "#f0fdf4",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          fontSize: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </Box>
                      <span>Parameters</span>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          fontSize: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        2
                      </Box>
                      <span>Profile</span>
                    </Box>
                  </Box>
                </Box>

                {/* Form Fields Container */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    gap: 2.2,
                    mt: 0,
                  }}
                >
                  {/* Title and Name Row */}
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      maxWidth: "600px",
                      gap: 2,
                      flexDirection: { xs: "column", sm: "row" },
                    }}
                  >
                    <FormControl
                      variant="outlined"
                      sx={{ ...commonFormControlStyles, minWidth: { xs: "100%", sm: 120 } }}
                      error={!!touched.title && !!errors.title}
                    >
                      <InputLabel shrink>{renderRequiredLabel("Title")}</InputLabel>
                      <Select
                        name="title"
                        label="Title"
                        value={values.title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        startAdornment={
                          <InputAdornment position="start">
                            <BadgeIcon />
                          </InputAdornment>
                        }
                        renderValue={(selected) => selected || ""}
                        MenuProps={commonMenuProps}
                      >
                        {["Mr", "Mrs", "Miss", "Dr", "Ca"].map((t) => (
                          <MenuItem
                            key={t}
                            value={t}
                            sx={{ display: "flex", justifyContent: "space-between" }}
                          >
                            {t}
                            {values.title === t && (
                              <Check sx={{ color: "#3949ab", fontSize: 18 }} />
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.title && errors.title && (
                        <Typography
                          sx={{
                            color: "#ef4444",
                            marginLeft: 1,
                            margin: "4px 4px",
                            fontSize: "12px",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {errors.title as string}
                        </Typography>
                      )}
                    </FormControl>

                    <TextField
                      autoComplete="off"
                      variant="outlined"
                      type="text"
                      name="name"
                      label={renderRequiredLabel("Full Name (As per PAN Card)")}
                      InputLabelProps={{ shrink: true }}
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={!!touched.name && !!errors.name}
                      helperText={touched.name && (errors.name as string)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ ...commonTextFieldStyles, flex: 1 }}
                    />
                  </Box>

                  {/* Standard Form Fields */}
                  {[
                    { name: "contact", label: "Contact", type: "number", icon: CallIcon },
                    { name: "email", label: "E-mail", type: "email", icon: EmailIcon },
                    {
                      name: "pan",
                      label: "PAN",
                      type: "text",
                      special: "pan",
                      icon: CreditCardIcon,
                    },
                    {
                      name: "father_name",
                      label: "Father's Name",
                      type: "text",
                      icon: PersonIcon,
                    },
                    {
                      name: "mother_name",
                      label: "Mother's Name",
                      type: "text",
                      icon: PersonIcon,
                    },
                    {
                      name: "working_address",
                      label: "Working Address",
                      type: "text",
                      icon: BusinessIcon,
                    },
                    {
                      name: "permanent_address",
                      label: "Permanent Address",
                      type: "text",
                      icon: HomeIcon,
                    },
                    {
                      name: "current_address",
                      label: "Current Address",
                      type: "text",
                      icon: LocationOnIcon,
                    },
                    { name: "city", label: "City", type: "text", icon: LocationOnIcon },
                  ].map((field) => {
                    const IconComponent = field.icon;
                    return (
                      <TextField
                        key={field.name}
                        autoComplete="off"
                        variant="outlined"
                        type={field.type}
                        name={field.name}
                        label={renderRequiredLabel(field.label)}
                        InputLabelProps={{ shrink: true }}
                        value={(values as any)[field.name]}
                        onChange={
                          field.special === "pan"
                            ? (event) => {
                              const uppercaseValue = event.target.value.toUpperCase();
                              setFieldValue("pan", uppercaseValue);
                            }
                            : handleChange
                        }
                        onBlur={handleBlur}
                        error={
                          !!(touched as any)[field.name] && !!(errors as any)[field.name]
                        }
                        helperText={
                          (touched as any)[field.name] &&
                          ((errors as any)[field.name] as string)
                        }
                        inputProps={
                          field.special === "pan"
                            ? {
                              maxLength: 10,
                              style: { textTransform: "uppercase" },
                            }
                            : {}
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <IconComponent />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ ...commonTextFieldStyles, width: "100%", maxWidth: "600px" }}
                      />
                    );
                  })}

                  {/* State Dropdown with Search */}
                  <FormControl
                    variant="outlined"
                    error={!!touched.state && !!errors.state}
                    sx={{ ...commonFormControlStyles, width: "100%", maxWidth: "600px" }}
                  >
                    <InputLabel shrink>{renderRequiredLabel("State")}</InputLabel>
                    <Select
                      name="state"
                      value={values.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="State"
                      startAdornment={
                        <InputAdornment position="start">
                          <LocationOnIcon />
                        </InputAdornment>
                      }
                      renderValue={(selected) => selected || ""}
                      MenuProps={commonMenuProps}
                    >
                      <Box
                        sx={{
                          p: 1,
                          position: "sticky",
                          top: 0,
                          bgcolor: "#ffffff",
                          zIndex: 1,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <TextField
                          size="small"
                          autoFocus
                          placeholder="Type to search state..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 20, color: "#94a3b8 !important" }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            width: "100%",
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "8px",
                              "& .MuiInputBase-input": {
                                py: 1,
                                px: 1.5,
                                fontSize: "14px",
                                color: "#0f172a",
                              },
                            },
                          }}
                        />
                      </Box>
                      {INDIAN_STATES.filter((s) =>
                        s.toLowerCase().includes(stateSearch.toLowerCase())
                      ).map((st) => (
                        <MenuItem
                          key={st}
                          value={st}
                          sx={{ display: "flex", justifyContent: "space-between", py: 1.2 }}
                        >
                          {st}
                          {values.state === st && (
                            <Check sx={{ color: "#3949ab", fontSize: 18 }} />
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.state && errors.state && (
                      <Typography
                        sx={{
                          color: "#ef4444",
                          marginLeft: 1,
                          margin: "4px 4px",
                          fontSize: "12px",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {errors.state as string}
                      </Typography>
                    )}
                  </FormControl>

                  {/* Employment Type Dropdown */}
                  <FormControl
                    variant="outlined"
                    error={!!touched.employment_type && !!errors.employment_type}
                    sx={{ ...commonFormControlStyles, width: "100%", maxWidth: "600px" }}
                  >
                    <InputLabel shrink>{renderRequiredLabel("Employment Type")}</InputLabel>
                    <Select
                      name="employment_type"
                      value={values.employment_type}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Employment Type"
                      startAdornment={
                        <InputAdornment position="start">
                          <WorkIcon />
                        </InputAdornment>
                      }
                      renderValue={(selected) => {
                        const empList = [
                          { value: "salaried", label: "Salaried(Pvt/Govt/MNC Employee)" },
                          {
                            value: "self_employed",
                            label: "Self Employed(Business Owner/Businessman)",
                          },
                          { value: "business", label: "Business" },
                          { value: "professional", label: "Professional" },
                        ];
                        return (
                          empList.find((e) => e.value === selected)?.label ||
                          (selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : "")
                        );
                      }}
                      MenuProps={commonMenuProps}
                    >
                      {[
                        { value: "salaried", label: "Salaried(Pvt/Govt/MNC Employee)" },
                        {
                          value: "self_employed",
                          label: "Self Employed(Business Owner/Businessman)",
                        },
                        { value: "business", label: "Business" },
                        { value: "professional", label: "Professional" },
                      ].map((emp) => (
                        <MenuItem
                          key={emp.value}
                          value={emp.value}
                          sx={{ display: "flex", justifyContent: "space-between" }}
                        >
                          {emp.label}
                          {values.employment_type === emp.value && (
                            <Check sx={{ color: "#3949ab", fontSize: 18 }} />
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                    <ErrorMessage
                      name="employment_type"
                      component="div"
                      style={{
                        color: "#ef4444",
                        margin: "4px 4px",
                        fontSize: "12px",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </FormControl>

                  {/* Date of Birth */}
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: "600px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        format="DD MM YYYY"
                        views={["year", "month", "day"]}
                        label={renderRequiredLabel("Select Date Of Birth")}
                        name="dob"
                        minDate={minDate}
                        maxDate={maxDate}
                        value={
                          values.dob
                            ? dayjs.isDayjs(values.dob)
                              ? values.dob
                              : dayjs(values.dob).isValid()
                                ? dayjs(values.dob)
                                : null
                            : null
                        }
                        onBlur={() => setFieldTouched("dob", true)}
                        onChange={(newValue) => setFieldValue("dob", newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            label={renderRequiredLabel("Select Date Of Birth")}
                            InputLabelProps={{ shrink: true }}
                            error={!!touched.dob && !!errors.dob}
                            helperText={touched.dob && (errors.dob as string)}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTime />
                                </InputAdornment>
                              ),
                            }}
                            sx={commonTextFieldStyles}
                          />
                        )}
                        PopperProps={{
                          sx: {
                            "& .MuiPaper-root": {
                              backgroundColor: "#ffffff",
                              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              color: "#0f172a",
                            },
                            "& .MuiPickersDay-root": {
                              color: "#0f172a",
                              "&:hover": {
                                backgroundColor: "#f1f5f9",
                              },
                              "&.Mui-selected": {
                                backgroundColor: "#3949ab",
                                color: "#ffffff",
                                "&:hover": {
                                  backgroundColor: "#303f9f",
                                },
                              },
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                    <ErrorMessage
                      name="dob"
                      component="div"
                      style={{
                        color: "#ef4444",
                        margin: "4px 4px",
                        fontSize: "12px",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "12px",
                        color: "#64748b",
                        mt: 0.5,
                        mx: 0.5,
                      }}
                    >
                      Minimum age 20 required
                    </Typography>
                  </Box>

                  {/* Terms Checkboxes */}
                  <Box sx={{ width: "100%", maxWidth: "600px", mt: 1 }}>
                    <FormGroup sx={{ mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            defaultChecked
                            sx={{
                              color: "#94a3b8",
                              "&.Mui-checked": {
                                color: "#3949ab",
                              },
                            }}
                          />
                        }
                        label={
                          <Typography
                            sx={{
                              fontSize: "13px",
                              color: "#334155",
                              lineHeight: 1.5,
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            I agree to opt for the product and service of F2fintech. By opting for
                            F2fintech, I agree to have read, understood and explicitly consent to the
                            T&C, Privacy Policy and F2fintech Credit Terms.
                          </Typography>
                        }
                      />
                    </FormGroup>

                    <FormGroup sx={{ mb: 3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            defaultChecked
                            sx={{
                              color: "#94a3b8",
                              "&.Mui-checked": {
                                color: "#3949ab",
                              },
                              alignSelf: "flex-start",
                              mt: 0.25,
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography
                              sx={{
                                fontSize: "13px",
                                color: "#334155",
                                lineHeight: 1.5,
                                fontFamily: "'Inter', sans-serif",
                                mb: 1.5,
                              }}
                            >
                              I further consent to receive the loan and product updates of F2fintech
                              on WhatsApp and allow F2fintech and/or their authorized third party
                              service providers to contact me for marketing purposes via
                            </Typography>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 2.5,
                                flexWrap: "wrap",
                              }}
                            >
                              <SmsIcon sx={{ color: "#3949ab", fontSize: 24 }} />
                              <CallIcon sx={{ color: "#3949ab", fontSize: 24 }} />
                              <WhatsAppIcon sx={{ color: "#25D366", fontSize: 24 }} />
                              <EmailIcon sx={{ color: "#3949ab", fontSize: 24 }} />
                            </Box>
                          </Box>
                        }
                      />
                    </FormGroup>
                  </Box>

                  {/* Submit Button */}
                  <Button
                    disabled={loading}
                    type="submit"
                    onClick={async () => {
                      const formErrors = await validateForm();
                      if (formErrors && Object.keys(formErrors).length > 0) {
                        const errorKeys = Object.keys(formErrors);
                        const visualOrder = [
                          "title",
                          "name",
                          "contact",
                          "email",
                          "pan",
                          "father_name",
                          "mother_name",
                          "working_address",
                          "permanent_address",
                          "current_address",
                          "city",
                          "state",
                          "employment_type",
                          "dob",
                          "amount",
                          "loanType",
                          "businessEntityType",
                          "company_official_email",
                          "tenure",
                          "providers",
                          "leadType",
                          "caseType",
                        ];
                        const firstKey = visualOrder.find((k) => errorKeys.includes(k)) || errorKeys[0];
                        const firstMsg =
                          typeof formErrors[firstKey as keyof typeof formErrors] === "string"
                            ? (formErrors[firstKey as keyof typeof formErrors] as string)
                            : "Please fill all required fields correctly";

                        toastAndNavigate(dispatch, true, "error", firstMsg);
                        focusAndScrollToField(firstKey);
                      }
                    }}
                    sx={{
                      color: "#ffffff",
                      fontWeight: 600,
                      borderRadius: "8px",
                      fontSize: "15px",
                      width: "100%",
                      maxWidth: "600px",
                      height: "46px",
                      mt: 1,
                      mb: 2,
                      backgroundColor: "#3949ab",
                      boxShadow: "0px 8px 20px rgba(57, 73, 171, 0.35)",
                      fontFamily: "'Inter', sans-serif",
                      textTransform: "none",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#303f9f",
                        boxShadow: "0px 10px 25px rgba(57, 73, 171, 0.45)",
                        transform: "translateY(-2px)",
                      },
                      "&:disabled": {
                        backgroundColor: "#e2e8f0",
                        color: "#94a3b8",
                        boxShadow: "none",
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} sx={{ color: "#ffffff" }} />
                    ) : (
                      "Proceed To Next Step"
                    )}
                  </Button>
                </Box>
              </Container>
            </Form>
          );
        }}
      </Formik>
      <Toast
        alerting={toast.toastAlert}
        message={toast.toastMessage}
        severity={toast.toastSeverity}
      />
    </Box>
  );
};

export default Step1Form;