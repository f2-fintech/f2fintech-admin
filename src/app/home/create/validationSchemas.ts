import * as yup from "yup";
import { subYears } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Common RegEx Patterns & Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const phoneRegExp =
  /^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/;

export const emailRegExp =
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

export const panRegExp =
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const aadhaarRegExp =
  /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Personal, Loan & Financial Info Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const step1ParametersSchema = yup.object().shape({
  amount: yup
    .mixed()
    .required("Loan Amount is required")
    .test("amount-required", "Loan Amount is required", (val) => {
      if (val === null || val === undefined || String(val).trim() === "") return false;
      return true;
    })
    .test("amount-valid", "Amount must be between 50,000 and 10,00,00,000 and divisible by 5", (val) => {
      if (!val) return false;
      const num = Number(val);
      if (isNaN(num)) return false;
      return num >= 50000 && num <= 100000000 && num % 5 === 0;
    }),
  loanType: yup.string().required("Loan Type is required"),
  loanCategory: yup.string().nullable(),
  businessEntityType: yup
    .string()
    .when("loanType", {
      is: (val: string) => val === "business loan",
      then: (schema) => schema.required("Type of Business Entity is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  company_official_email: yup
    .string()
    .when(["loanType", "businessEntityType"], {
      is: (loanType: string, entityType: string) =>
        loanType === "business loan" && (entityType === "private_limited" || entityType === "llp"),
      then: (schema) =>
        schema
          .required("Company official email is required")
          .test("valid-comp-email", "Company official email is not valid", (val) =>
            Boolean(val && emailRegExp.test(val.trim()))
          ),
      otherwise: (schema) => schema.nullable(),
    }),
  tenure: yup.string().required("Tenure is required"),
  providers: yup
    .array()
    .of(yup.string())
    .min(1, "Please select at least one provider")
    .required("Provider is required"),
  providerAmounts: yup
    .array()
    .of(
      yup.object().shape({
        provider: yup.string().nullable(),
        amount: yup.string().nullable(),
      })
    )
    .nullable(),
  leadType: yup.string().required("Lead Type is required"),
  caseType: yup.string().required("Case Type is required"),
  existingLoans: yup
    .array()
    .of(
      yup.object().shape({
        has_running_loans: yup.string().nullable(),
        which_loan: yup.string().when("has_running_loans", {
          is: "yes",
          then: (schema) => schema.required("Loan type is required"),
          otherwise: (schema) => schema.nullable(),
        }),
        loan_amount: yup.mixed().when("has_running_loans", {
          is: "yes",
          then: (schema) =>
            schema
              .required("Outstanding amount is required")
              .test("valid-loan-amount", "Amount must be a number greater than 0", (val) => {
                if (!val) return false;
                const num = Number(val);
                return !isNaN(num) && num > 0;
              }),
          otherwise: (schema) => schema.nullable(),
        }),
        running_emi: yup
          .mixed()
          .test("valid-running-emi", "EMI must be a non-negative number", (val) => {
            if (!val) return true;
            const num = Number(val);
            return !isNaN(num) && num >= 0;
          })
          .nullable(),
      })
    )
    .nullable(),
});

export const step1ValidationSchema = yup.object().shape({
  // Screen 1: Parameters
  amount: yup
    .mixed()
    .required("Loan Amount is required")
    .test("amount-required", "Loan Amount is required", (val) => {
      if (val === null || val === undefined || String(val).trim() === "") return false;
      return true;
    })
    .test("amount-valid", "Amount must be between 50,000 and 10,00,00,000 and divisible by 5", (val) => {
      if (!val) return false;
      const num = Number(val);
      if (isNaN(num)) return false;
      return num >= 50000 && num <= 100000000 && num % 5 === 0;
    }),
  loanType: yup.string().required("Loan Type is required"),
  loanCategory: yup.string().nullable(),
  businessEntityType: yup
    .string()
    .when("loanType", {
      is: (val: string) => val === "business loan",
      then: (schema) => schema.required("Type of Business Entity is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  company_official_email: yup
    .string()
    .when(["loanType", "businessEntityType"], {
      is: (loanType: string, entityType: string) =>
        loanType === "business loan" && (entityType === "private_limited" || entityType === "llp"),
      then: (schema) =>
        schema
          .required("Company official email is required")
          .test("valid-comp-email", "Company official email is not valid", (val) =>
            Boolean(val && emailRegExp.test(val.trim()))
          ),
      otherwise: (schema) => schema.nullable(),
    }),
  tenure: yup.string().required("Tenure is required"),
  providers: yup
    .array()
    .of(yup.string())
    .min(1, "Please select at least one provider")
    .required("Provider is required"),
  providerAmounts: yup
    .array()
    .of(
      yup.object().shape({
        provider: yup.string().nullable(),
        amount: yup.string().nullable(),
      })
    )
    .nullable(),
  leadType: yup.string().required("Lead Type is required"),
  caseType: yup.string().required("Case Type is required"),
  existingLoans: yup
    .array()
    .of(
      yup.object().shape({
        has_running_loans: yup.string().nullable(),
        which_loan: yup.string().when("has_running_loans", {
          is: "yes",
          then: (schema) => schema.required("Loan type is required"),
          otherwise: (schema) => schema.nullable(),
        }),
        loan_amount: yup.mixed().when("has_running_loans", {
          is: "yes",
          then: (schema) =>
            schema
              .required("Outstanding amount is required")
              .test("valid-loan-amount", "Amount must be a number greater than 0", (val) => {
                if (!val) return false;
                const num = Number(val);
                return !isNaN(num) && num > 0;
              }),
          otherwise: (schema) => schema.nullable(),
        }),
        running_emi: yup
          .mixed()
          .test("valid-running-emi", "EMI must be a non-negative number", (val) => {
            if (!val) return true;
            const num = Number(val);
            return !isNaN(num) && num >= 0;
          })
          .nullable(),
      })
    )
    .nullable(),

  // Screen 2: Profile / Basic Details
  title: yup.string().required("Title is required"),
  name: yup
    .string()
    .trim()
    .required("Full Name as per PAN is required")
    .min(2, "Name must be at least 2 characters"),
  father_name: yup
    .string()
    .trim()
    .required("Father's Name is required")
    .min(2, "Father's name must be at least 2 characters"),
  mother_name: yup
    .string()
    .trim()
    .required("Mother's Name is required")
    .min(2, "Mother's name must be at least 2 characters"),
  working_address: yup
    .string()
    .trim()
    .required("Working Address is required")
    .min(3, "Working address must be at least 3 characters"),
  permanent_address: yup
    .string()
    .trim()
    .required("Permanent Address is required")
    .min(3, "Permanent address must be at least 3 characters"),
  current_address: yup
    .string()
    .trim()
    .required("Current Address is required")
    .min(3, "Current address must be at least 3 characters"),
  contact: yup
    .string()
    .required("Contact number is required")
    .test("valid-contact", "Contact number must be a valid 10-digit number", (val) => {
      if (!val) return false;
      const clean = String(val).replace(/\D/g, "");
      return clean.length === 10 && /^[6-9]\d{9}$/.test(clean);
    }),
  email: yup
    .string()
    .required("Email is required")
    .test("valid-email", "Email is not valid", (val) => Boolean(val && emailRegExp.test(val.trim()))),
  dob: yup
    .mixed()
    .required("Date of Birth is required")
    .test("dob-required", "Date of Birth is required", (val) => Boolean(val))
    .test("dob-min-age", "Age must be at least 20 years", function (value) {
      if (!value) return false;
      const date = new Date(value as any);
      if (isNaN(date.getTime())) return false;
      const maxAllowedDate = subYears(new Date(), 20);
      return date <= maxAllowedDate;
    }),
  city: yup.string().trim().required("City is required"),
  state: yup.string().required("State is required"),
  pan: yup
    .string()
    .required("PAN is required")
    .test("valid-pan", "PAN is not valid (e.g. ABCDE1234F)", (val) =>
      Boolean(val && panRegExp.test(val.trim().toUpperCase()))
    ),
  employment_type: yup.string().required("Employment Type is required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Business/Director KYC & Document Uploads Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

export const directorPartnerSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required("Full Name as per PAN is required")
    .min(2, "Name must be at least 2 characters"),
  email: yup
    .string()
    .test("valid-director-email", "Invalid email format", (val) => !val || emailRegExp.test(val.trim()))
    .nullable(),
  aadhaar: yup
    .string()
    .required("12-digit Aadhaar number is required")
    .test(
      "valid-director-aadhaar",
      "Aadhaar number must be exactly 12 digits",
      (val) => Boolean(val && /^\d{12}$/.test(val.replace(/\s+/g, "")))
    ),
  pan: yup
    .string()
    .required("10-character PAN number is required")
    .test(
      "valid-director-pan",
      "Invalid PAN format (e.g. ABCDE1234F)",
      (val) => Boolean(val && panRegExp.test(val.trim().toUpperCase()))
    ),
  mobile: yup
    .string()
    .required("10-digit Mobile number is required")
    .test(
      "valid-director-mobile",
      "Mobile number must be a valid 10-digit number starting with 6-9",
      (val) => Boolean(val && /^[6-9]\d{9}$/.test(val.replace(/\s+/g, "")))
    ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Focus & Smooth Scroll Helper
// ─────────────────────────────────────────────────────────────────────────────

export const focusAndScrollToField = (identifier: string, scrollDuration = 650) => {
  if (typeof window === "undefined" || !identifier) return;
  const el =
    document.getElementById(identifier) ||
    document.querySelector(`[name="${identifier}"]`) ||
    document.querySelector(`[data-field="${identifier}"]`) ||
    document.querySelector(`.${identifier}`);

  if (el) {
    const focusable =
      el.matches("input, select, textarea, button, [tabindex]")
        ? el
        : el.querySelector("input, select, textarea, button, [tabindex]") || el;

    // Calculate target Y coordinate centered in the screen
    const targetRect = el.getBoundingClientRect();
    const targetY = Math.max(
      0,
      window.pageYOffset + targetRect.top - window.innerHeight / 2 + targetRect.height / 2
    );
    const startY = window.pageYOffset;
    const distance = targetY - startY;

    // If already in view and distance is tiny, just focus gently
    if (Math.abs(distance) < 20) {
      try {
        (focusable as HTMLElement).focus({ preventScroll: true });
      } catch (_) {
        (focusable as HTMLElement).focus();
      }
      return;
    }

    let startTime: number | null = null;
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * ease);

      if (elapsed < scrollDuration) {
        requestAnimationFrame(animateScroll);
      } else {
        // Use preventScroll: true so the browser focus call doesn't jump abruptly
        try {
          (focusable as HTMLElement).focus({ preventScroll: true });
        } catch (_) {
          (focusable as HTMLElement).focus();
        }
      }
    };

    requestAnimationFrame(animateScroll);
  }
};

export const validatePartnerDetails = (
  personDetails: { name?: string; email?: string; aadhaar?: string; pan?: string; mobile?: string }[],
  options?: { requireEmail?: boolean; label?: string }
): { isValid: boolean; error?: string; fieldId?: string; personIndex?: number; fieldName?: string } => {
  if (!Array.isArray(personDetails) || personDetails.length === 0) {
    return { isValid: true };
  }

  const label = options?.label || "Partner";
  const requireEmail = Boolean(options?.requireEmail);

  for (let i = 0; i < personDetails.length; i++) {
    const p = personDetails[i] || {};
    const prefix = `${label} #${i + 1}`;

    if (!p.name || !p.name.trim()) {
      return {
        isValid: false,
        error: `${prefix}: Please enter full name as per PAN.`,
        fieldId: `person_${i}_name`,
        personIndex: i,
        fieldName: "name",
      };
    }
    if (p.name.trim().length < 2) {
      return {
        isValid: false,
        error: `${prefix}: Name must be at least 2 characters.`,
        fieldId: `person_${i}_name`,
        personIndex: i,
        fieldName: "name",
      };
    }
    if (requireEmail) {
      if (!p.email || !p.email.trim()) {
        return {
          isValid: false,
          error: `${prefix}: Please enter Email ID.`,
          fieldId: `person_${i}_email`,
          personIndex: i,
          fieldName: "email",
        };
      }
      if (!emailRegExp.test(p.email.trim())) {
        return {
          isValid: false,
          error: `${prefix}: Invalid Email ID format.`,
          fieldId: `person_${i}_email`,
          personIndex: i,
          fieldName: "email",
        };
      }
    } else if (p.email && p.email.trim() && !emailRegExp.test(p.email.trim())) {
      return {
        isValid: false,
        error: `${prefix}: Invalid Email ID format.`,
        fieldId: `person_${i}_email`,
        personIndex: i,
        fieldName: "email",
      };
    }
    if (!p.aadhaar || !p.aadhaar.trim()) {
      return {
        isValid: false,
        error: `${prefix}: Please enter 12-digit Aadhaar number.`,
        fieldId: `person_${i}_aadhaar`,
        personIndex: i,
        fieldName: "aadhaar",
      };
    }
    const cleanAadhaar = p.aadhaar.replace(/\s+/g, "");
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return {
        isValid: false,
        error: `${prefix}: Aadhaar number must be exactly 12 digits.`,
        fieldId: `person_${i}_aadhaar`,
        personIndex: i,
        fieldName: "aadhaar",
      };
    }
    if (!p.pan || !p.pan.trim()) {
      return {
        isValid: false,
        error: `${prefix}: Please enter 10-digit PAN number.`,
        fieldId: `person_${i}_pan`,
        personIndex: i,
        fieldName: "pan",
      };
    }
    const cleanPan = p.pan.trim().toUpperCase();
    if (!panRegExp.test(cleanPan)) {
      return {
        isValid: false,
        error: `${prefix}: Invalid PAN format (e.g. ABCDE1234F).`,
        fieldId: `person_${i}_pan`,
        personIndex: i,
        fieldName: "pan",
      };
    }
    if (!p.mobile || !p.mobile.trim()) {
      return {
        isValid: false,
        error: `${prefix}: Please enter 10-digit mobile number.`,
        fieldId: `person_${i}_mobile`,
        personIndex: i,
        fieldName: "mobile",
      };
    }
    const cleanMobile = p.mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return {
        isValid: false,
        error: `${prefix}: Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.`,
        fieldId: `person_${i}_mobile`,
        personIndex: i,
        fieldName: "mobile",
      };
    }
  }

  return { isValid: true };
};

export const step3ValidationSchema = yup.object().shape({
  numPersons: yup.number().nullable(),
  personDetails: yup.array().of(directorPartnerSchema).nullable(),
  files: yup.object().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Profile, Address Proofs & Banking Documents Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

export const step4ValidationSchema = yup.object().shape({
  sameAsCurrentAddress: yup.boolean().nullable(),
  isPdfProtected: yup.boolean().nullable(),
  bankingPassword: yup
    .string()
    .test("banking-pwd-check", "Password is required if PDF is protected", function (val) {
      if (this.parent?.isPdfProtected && !val) {
        // Kept optional for testing mode as per instructions
        return true;
      }
      return true;
    })
    .nullable(),
  aadharFront: yup.mixed().nullable(),
  aadharBack: yup.mixed().nullable(),
  pancard: yup.mixed().nullable(),
  passportSizePhoto: yup.mixed().nullable(),
  currentAddressProof: yup.mixed().nullable(),
  permanentAddressProof: yup.mixed().nullable(),
  salarySlip: yup.mixed().nullable(),
  form26as: yup.mixed().nullable(),
  bankingFiles: yup.array().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 7: Income, Liabilities & Co-Applicant Details Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

export const step7ValidationSchema = yup.object().shape({
  amount: yup
    .mixed()
    .required("Annual Income / Turnover is required")
    .test("salary-amount-required", "Annual Income / Turnover is required", (val) => {
      if (val === null || val === undefined || String(val).trim() === "") return false;
      return true;
    })
    .test("salary-amount-valid", "Amount must be a valid number", (val) => {
      if (!val) return false;
      const num = Number(val);
      return !isNaN(num);
    })
    .test("salary-amount-range", "Amount must be between ₹50,000 and ₹100 Crore", (val) => {
      if (!val) return false;
      const num = Number(val);
      if (isNaN(num)) return false;
      return num >= 50000 && num <= 1000000000;
    }),
  emi: yup
    .mixed()
    .test("valid-emi", "EMI must be a valid number", (val) => {
      if (!val) return true;
      return !isNaN(Number(val));
    })
    .nullable(),
  liability: yup
    .mixed()
    .test("valid-liability", "Liability must be a valid number", (val) => {
      if (!val) return true;
      return !isNaN(Number(val));
    })
    .nullable(),
  // Co-Applicant (Education Loan) Fields
  coAppRelation: yup
    .string()
    .when("$loanType", {
      is: (val: string) => String(val).toLowerCase().trim() === "education loan",
      then: (schema) => schema.required("Relation with applicant is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  coAppEmploymentType: yup
    .string()
    .when("$loanType", {
      is: (val: string) => String(val).toLowerCase().trim() === "education loan",
      then: (schema) => schema.required("Employment type is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  coAppMotherName: yup
    .string()
    .when("$loanType", {
      is: (val: string) => String(val).toLowerCase().trim() === "education loan",
      then: (schema) =>
        schema
          .required("Co-Applicant mother's name is required")
          .min(2, "Mother's name must be at least 2 characters"),
      otherwise: (schema) => schema.nullable(),
    }),
  coAppEmail: yup
    .string()
    .when("$loanType", {
      is: (val: string) => String(val).toLowerCase().trim() === "education loan",
      then: (schema) =>
        schema
          .required("Co-Applicant email is required")
          .test("valid-coapp-email", "Please enter a valid email address", (val) =>
            Boolean(val && emailRegExp.test(val.trim()))
          ),
      otherwise: (schema) =>
        schema.test("valid-coapp-email", "Email is not valid", (val) => !val || emailRegExp.test(val)).nullable(),
    }),
  coAppMobile: yup
    .string()
    .when("$loanType", {
      is: (val: string) => String(val).toLowerCase().trim() === "education loan",
      then: (schema) =>
        schema
          .required("Co-Applicant mobile number is required")
          .test(
            "valid-coapp-mobile",
            "Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9",
            (val) => Boolean(val && /^[6-9]\d{9}$/.test(val.replace(/\s+/g, "")))
          ),
      otherwise: (schema) =>
        schema.test("valid-coapp-mobile", "Mobile number is not valid", (val) => !val || phoneRegExp.test(val)).nullable(),
    }),
  coAppFiles: yup
    .object()
    .shape({
      coAppAadhaar: yup.mixed().nullable(),
      coAppPan: yup.mixed().nullable(),
      coAppCancelledCheque: yup.mixed().nullable(),
      coAppForm16: yup.mixed().nullable(),
      coAppSalarySlips: yup.mixed().nullable(),
      coAppIdCard: yup.mixed().nullable(),
    })
    .nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Default Export (Consolidated Form Validation Schemas)
// ─────────────────────────────────────────────────────────────────────────────

const formValidationSchemas = {
  step1: step1ValidationSchema,
  step3: step3ValidationSchema,
  step4: step4ValidationSchema,
  step7: step7ValidationSchema,
};

export default formValidationSchemas;
