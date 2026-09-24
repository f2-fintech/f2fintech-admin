'use client';

import React, { useState, useEffect, ReactNode } from "react";
import {
  Box,
  Button,
  Container,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Tooltip,
} from "@mui/material";

import Step1Form from "./Step1Form";
import Step3Form from "./Step3Form";
import Step4Form from "./Step4Form";
import Step7Form from "./Step7Form";

import { Utility } from "@/utils";
import { axiosInstance } from "@/apis/config/axiosConfig";

interface StepForm {
  label: string;
  icon: string;
}

const steps_form: StepForm[] = [
  {
    label: "Basic Details",
    icon: "https://open-frontend-bucket.s3.amazonaws.com/open-capital/onboarding/register/icons/basic-details.svg",
  },
  {
    label: "Documents Upload",
    icon: "https://open-frontend-bucket.s3.amazonaws.com/open-capital/onboarding/register/icons/statement.svg",
  },
  {
    label: "Core Documents",
    icon: "https://open-frontend-bucket.s3.amazonaws.com/open-capital/onboarding/register/icons/profile-details.svg",
  },
  {
    label: "Additional Details",
    icon: "https://open-frontend-bucket.s3.amazonaws.com/open-capital/onboarding/register/icons/business-details.svg",
  },
];

const stepLabels: string[] = ["Loan Details", "Documents Upload", "Profile & Proofs", "Additional Details"];

const MultiStepForm: React.FC = () => {
  const { getLocalStorage, setLocalStorage } = Utility();

  const [activeStep, setActiveStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("activeStep");
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) return parsed;
        }
      } catch (e) {}
    }
    return 0;
  });

  const [getStarted, setGetStarted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("step1GetStarted"));
      } catch (e) {}
    }
    return false;
  });

  const [applicationNumber, setApplicationNumber] = useState<string | null>(null); // for step form 1
  const [applicationData, setApplicationData] = useState<any>(null); // for step form 1
  const [allUploadsSuccess, setAllUploadsSuccess] = useState<boolean | null>(null); // Track if all uploads were successful for step form 3
  const [aadharUploadsSuccess, setAadharUploadsSuccess] = useState<boolean | null>(null); // Track if all uploads were successful for step form 4
  const [salarySuccess, setSalarySuccess] = useState<boolean | null>(null); // Track if salary upload was successful for step form 4

  const [isStepCompleted, setIsStepCompleted] = useState<{
    step2: boolean;
    step3: boolean;
    step4: boolean;
  }>({
    step2: false,
    step3: false,
    step4: false,
  });

  const storedCustomerId = getLocalStorage("customerInfo")?.id;

  // Restore step and progress from localStorage on mount
  useEffect(() => {
    const savedActiveStep = getLocalStorage("activeStep");
    if (savedActiveStep !== null && savedActiveStep !== undefined) {
      setActiveStep(parseInt(savedActiveStep, 10));
    }
    const savedGetStarted = getLocalStorage("step1GetStarted");
    if (savedGetStarted) {
      setGetStarted(true);
    }
  }, []);

  // Save active step and progress to localStorage
  useEffect(() => {
    setLocalStorage("activeStep", activeStep);
  }, [activeStep]);

  const handleNext = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = (): void => {
    setActiveStep((prevActiveStep) => Math.max(prevActiveStep - 1, 0));
  };

  // Handle form submission to allow progressing
  const handleFormSubmit = (): void => {
    if (activeStep === 0)
      setIsStepCompleted((prev) => ({ ...prev, step2: true }));
    if (activeStep === 1)
      setIsStepCompleted((prev) => ({ ...prev, step3: true }));
    if (activeStep === 2)
      setIsStepCompleted((prev) => ({ ...prev, step4: true }));
    handleNext();
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeStep, getStarted]);

  // Fetch application number and loan status using stored customer ID
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (storedCustomerId) {
        try {
          const { data: response } = await axiosInstance.get(
            `${process.env.NEXT_PUBLIC_WEB_URL}/customer-info/${storedCustomerId}`);
          if (response.status === "Success") {
            setApplicationData(response.data);
          }
        } catch (err) {
          console.log("Error fetching customer data:", err);
        }
      }
    };
    fetchCustomerData();
  }, [storedCustomerId]);

  // Render form content for each step
  const getStepContent = (step: number): ReactNode => {
    switch (step) {
      case 0:
        return (
          <Step1Form
            handleNext={handleNext}
            applicationNumber={applicationNumber}
            setApplicationNumber={setApplicationNumber}
            onSubmit={handleFormSubmit}
            getStarted={getStarted}
            setGetStarted={setGetStarted}
            salary={applicationData?.salary}
          />
        );
      case 1:
        return (
          <Step3Form
            handleNext={handleNext}
            allUploadsSuccess={allUploadsSuccess}
            setAllUploadsSuccess={setAllUploadsSuccess}
          />
        );
      case 2:
        return (
          <Step4Form
            handleNext={handleNext}
            handleBack={handleBack}
            allUploadsSuccess={allUploadsSuccess}
            aadharUploadsSuccess={aadharUploadsSuccess}
            setAadharUploadsSuccess={setAadharUploadsSuccess}
          />
        );
      case 3:
        return (
          <Step7Form
            aadharUploadsSuccess={aadharUploadsSuccess}
            setSalarySuccess={setSalarySuccess}
            handleBack={handleBack}
          />
        );
      default:
        return "Unknown step";
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: { xs: "12px", sm: "24px", md: "40px" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0px 10px 30px rgba(12, 102, 228, 0.05)",
          border: "1px solid #e2e8f0",
          overflow: "visible",
        }}
      >
        {/* Full Width Top Line-Stepper (Read-Only Progress Indicator) */}
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            px: { xs: 2, sm: 4, md: 8 },
            pt: 4,
            pb: 3,
            borderBottom: "1px solid #f1f5f9",
            backgroundColor: "#ffffff",
          }}
        >
          {stepLabels.map((label, index) => {
            const isActive = index === activeStep;
            const isSkipped = index === 1 && (getLocalStorage("StatementUploadSkipped") === true || getLocalStorage("StatementUploadSkipped") === "true");
            const isCompleted = index < activeStep && !isSkipped;
            const isFuture = index > activeStep;

            const tooltipTitle = isFuture
              ? "Complete current step to proceed"
              : isCompleted
              ? "Step completed"
              : "Current active step";

            return (
              <Tooltip
                key={label}
                title={tooltipTitle}
                arrow
                placement="bottom"
              >
                <Box
                  sx={{
                    flex: 1,
                    mx: 1,
                    cursor: isFuture ? "not-allowed" : "default",
                    userSelect: "none",
                    opacity: isFuture ? 0.55 : 1,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      cursor: isFuture ? "not-allowed" : "default",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "11px", sm: "13px", md: "14px" },
                      fontWeight: isActive ? 700 : 600,
                      color: (isActive || isSkipped || isCompleted) ? "#3949ab" : "#94a3b8",
                      mb: 1,
                      textAlign: "center",
                      transition: "all 0.2s ease",
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                    }}
                  >
                    <span>{label}</span>
                    {isSkipped && (
                      <span style={{ fontSize: "10px", backgroundColor: "#eef2ff", color: "#3949ab", padding: "1px 6px", borderRadius: "10px", fontWeight: "bold", border: "1px solid #c7d2fe" }}>
                        Skipped
                      </span>
                    )}
                    {isCompleted && (
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 700, marginLeft: "2px" }}>
                        ✓
                      </span>
                    )}
                  </Typography>
                  <Box
                    sx={{
                      height: "4px",
                      width: "100%",
                      backgroundColor: isActive ? "#3949ab" : (isSkipped || isCompleted) ? "#93c5fd" : "#e2e8f0",
                      borderRadius: "2px",
                      transition: "all 0.3s ease",
                    }}
                  />
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Two-Column Space Below Stepper */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            width: "100%",
            minHeight: "75vh",
          }}
        >
          {/* Left Side Presentation Pane with Logo & Brand Headline */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: { xs: "100%", md: "42%" },
              backgroundColor: "#f8fafc",
              borderRight: { xs: "none", md: "1px solid #f1f5f9" },
              // Inherits default alignSelf: "stretch" so the #f8fafc background seamlessly fills down to the absolute bottom alongside the right-side form column
            }}
          >
            {/* Inner Sticky Content Wrapper tracks seamlessly inside the stretched column track */}
            <Box
              sx={{
                position: "sticky",
                top: "80px",
                padding: { xs: "24px 16px", sm: "32px 24px", md: "40px 32px" },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 1,
                width: "100%",
              }}
            >
              {/* Centered Main Logo */}
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  mb: { xs: 1, sm: 1.5, md: 2 },
                }}
              >
                <Box
                  component="img"
                  src="/img/f2Fintechlogo.png"
                  alt="F2Fintech Logo"
                  sx={{
                    height: { xs: "70px", sm: "90px", md: "115px" },
                    width: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0px 4px 12px rgba(57, 73, 171, 0.08))",
                  }}
                />
              </Box>

              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: { xs: "1.5rem", sm: "1.8rem", md: "2.1rem" },
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  mb: 1,
                  textAlign: "center",
                }}
              >
                Application<br />
                <span style={{ color: "#3949ab" }}>Intake Console</span>
              </Typography>

              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "#64748b",
                  lineHeight: 1.5,
                  fontWeight: 500,
                  maxWidth: "340px",
                  textAlign: "center",
                }}
              >
                Internal operations module to initialize customer financing profiles, structure loan parameters, and track multi-provider approval lifecycles.
              </Typography>
            </Box>
          </Box>

          {/* Right Side Intake Forms View */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
              width: { xs: "100%", md: "58%" },
              padding: { xs: "16px 10px", sm: "20px 20px", md: "24px 32px" },
              backgroundColor: "#ffffff",
              overflowY: "auto",
            }}
          >
            <Box sx={{ width: "100%", maxWidth: "680px" }}>
              {getStepContent(activeStep)}
              {activeStep === 0 &&
                !getStarted &&
                applicationNumber && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      pt: 2,
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      onClick={handleNext}
                      sx={{ mr: 2, color: "white", bgcolor: "#3949ab", textTransform: "none", px: 4, py: 1, borderRadius: "8px" }}
                    >
                      Proceed to Uploads
                    </Button>
                  </Box>
                )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>


  );
};

export default MultiStepForm;
