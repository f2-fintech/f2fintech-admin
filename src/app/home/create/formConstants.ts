/**
 * formConstants.ts
 *
 * Centralized repository of static labels, hints, field configurations,
 * loan-type document lists, and helper resolvers across the apply flow.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Indian States & UTs (Step 1)
// ─────────────────────────────────────────────────────────────────────────────

export const INDIAN_STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export interface LoanTypeOption {
  value: string;
  label: string;
}

export interface LoanTypesData {
  unsecured: LoanTypeOption[];
  secured: LoanTypeOption[];
}

export const LOAN_TYPES_DATA: LoanTypesData = {
  unsecured: [
    { value: "personal loan", label: "Personal Loan" },
    { value: "business loan", label: "Business Loan" },
    { value: "doctor", label: "Doctor (MBBS, BDS, BAMS, BHMS) Loan" },
    { value: "ca_cs_cma", label: "CA/CS/CMA Loan" },
    { value: "education loan", label: "Education Loan" },
    { value: "just inquiry", label: "Just Inquiry" }
  ],
  secured: [
    { value: "home loan", label: "Home Loan" },
    { value: "lap", label: "LAP (Loan Against Property)" },
    { value: "auto loan", label: "Auto Loan" },
    { value: "machinery loan", label: "Machinery Loan" }
  ]
};

export interface LeadTypeOption {
  value: string;
  label: string;
}

export const LEAD_TYPES: LeadTypeOption[] = [
  { value: "notion", label: "Notion" },
  { value: "dialler", label: "Dialler" },
  { value: "field visit", label: "Field visit" },
  { value: "sourcer", label: "Sourcer" },
  { value: "channel partner", label: "Channel partner" },
  { value: "ref from customer", label: "Ref from customer" },
  { value: "left employee follow up", label: "Left employee follow up" }
];

export const leadTypes = LEAD_TYPES;

export const TENURE_OPTIONS: Record<"secured" | "unsecured", string[]> = {
  secured: [
    "5 Years",
    "8 Years",
    "10 Years",
    "15 Years",
    "20 Years",
    "25 Years",
    "30 Years"
  ],
  unsecured: [
    "1 Year",
    "2 Years",
    "3 Years",
    "4 Years",
    "5 Years",
    "6 Years",
    "7 Years",
    "8 Years"
  ]
};

export const tenureOptions = TENURE_OPTIONS;

export const getLoanCategory = (type: string): string => {
  const securedLoanTypes = ["home loan", "lap", "auto loan", "machinery loan"];
  const unsecuredLoanTypes = [
    "personal loan",
    "business loan",
    "professional loan",
    "doctor",
    "ca_cs_cma",
    "education loan",
    "just inquiry",
  ];

  if (securedLoanTypes.includes(type)) {
    return "secured";
  } else if (unsecuredLoanTypes.includes(type)) {
    return "unsecured";
  }
  return "";
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Step 3 Document Field Labels
// ─────────────────────────────────────────────────────────────────────────────

export const STEP3_FIELD_LABELS: Record<string, string> = {
  form16: "Form 16 (Last 2 Years – Part A & Part B) * (Mandatory)",
  itr: "ITR (Last 2 Financial Years) * (Mandatory)",
  salarySlip: "3 Months Salary Slip * (Mandatory)",
  banking: "Banking (Multiple Files)",
  computationOfIncome: "Computation of Income (Last 2 Financial Years) * (Mandatory)",
  financials: "Financials (Profit & Loss Statement & Balance Sheet - Last 2 Years) * (Mandatory)",
  udhyamCertificate: "Udyam Registration / Shop & Establishment Act Registration * (Mandatory)",
  udhyam: "Udyam Registration Certificate * (Mandatory)",
  gst: "GST Registration Certificate & Returns (Optional)",
  gstCertificate: "GST Registration Certificate * (Mandatory)",
  form26as: "Form 26AS (Last 2 Financial Years) (Optional)",
  listOfDirectors: "List of Directors (LOD) * (Mandatory)",
  listOfShareholders: "List of Shareholders * (Mandatory)",
  aoa: "Articles of Association (AOA) * (Mandatory)",
  moa: "Memorandum of Association (MOA) * (Mandatory)",
  companyPan: "Company PAN Card * (Mandatory)",
  companyFirmPan: "Company / Firm PAN Card * (Mandatory)",
  certificateOfIncorporation: "Certificate of Incorporation * (Mandatory)",
  boardResolution: "Board Resolution (BR) * (Mandatory)",
  llpAgreement: "LLP Agreement / Articles of Association * (Mandatory)",
  directorsKyc: "Directors KYC",
  partnershipDeed: "Partnership Deed * (Mandatory)",
  ugCertificate: "UG Certificate (MBBS, BDS, BAMS, BHMS) * (Mandatory)",
  pgCertificate: "PG Certificate (MD, MS, MCH) (Optional)",
  registration: "Registration",
  currentAddressProof: "Address Proof for Current Address * (Mandatory)",
  permanentAddressProof: "Address Proof for Permanent Address * (Mandatory)",
  hufDeed: "Deed of HUF / HUF Declaration * (Mandatory)",
  hufPan: "HUF PAN Card * (Mandatory)",
  bbaAts: "BBA and ATS (Builder Buyer Agreement / Agreement To Sell) * (Mandatory)",
  propertySalesDeed: "Property Sales DEED (In case of Resale) * (Mandatory)",
  sanctionLetter: "Sanction Letter (In case of Balance Transfer) (Optional)",
  soa: "SOA - Statement of Account (In case of Balance Transfer) (Optional)",
  copyRegistry: "Copy of Registry * (Mandatory)",
  salesDeed: "Sales Deed * (Mandatory)",
  gpa: "GPA / Power of Attorney * (Mandatory)",
  marksheets: "Marksheets (10th, 12th, Grad) * (Mandatory)",
  collegeOfferLetter: "College Offer Letter * (Mandatory)",
  feeStructure: "Fee Structure Document * (Mandatory)",
  entranceScorecard: "Entrance Exam Scorecard (Optional)",
  cancelledCheque: "Applicant Bank Cancelled Cheque * (Mandatory)",
  coAppAadhaar: "Co-Applicant Aadhaar Card * (Mandatory)",
  coAppPan: "Co-Applicant PAN Card * (Mandatory)",
  coAppCancelledCheque: "Co-Applicant Bank Cancelled Cheque * (Mandatory)",
  coAppForm16: "Form 16 Part A-B (2 Yrs) * (Mandatory)",
  coAppSalarySlips: "3 Months Salary Slips * (Mandatory)",
  coAppIdCard: "Company / Govt ID Card * (Mandatory)",
  ugDegree: "UG Degree (MBBS, BDS, BAMS, BHMS) * (Mandatory)",
  ugRegistration: "UG Registration Certificate * (Mandatory)",
  pgDegree: "PG Degree (MD, MS, MCH) (Optional)",
  pgRegistration: "PG Registration Certificate (Optional)",
  consultancyLetter: "Consultancy Letter * (Mandatory)",
  clinicLetterHead: "Doctor / Clinic Letter Head * (Mandatory)",
  coi: "Certificate of Incorporation (COI) (Optional)",
  udyam: "Udyam Registration Certificate (Optional)",
  copCertificate: "Certificate of Practice (COP) * (Mandatory)",
  comCertificate: "Certificate of Membership (COM) * (Mandatory)",
  firmCard: "Firm Card * (Mandatory)",
  letterHead: "Letter Head * (Mandatory)",
  itrCoi: "2 Yrs ITR & Computation (COI) * (Mandatory)",
  udyamShopReg: "Udyam & Shop Registration * (Mandatory)",
  proformaInvoice: "Vehicle Proforma Invoice / Dealer Quotation * (Mandatory)",
  drivingLicense: "Driving License / RC Copy (Optional)",
  machineryQuotation: "Machinery Quotation / Proforma Invoice * (Mandatory)",
  projectReport: "Project Report / Machine Installation Layout (Optional)",
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Step 3 Loan-Type Document Field Sets
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONAL_LOAN_FIELDS: string[] = [
  "form16",
  "itr",
];

export const HOME_LOAN_SALARIED_FIELDS: string[] = [
  "form16",
  "itr",
  "bbaAts",
  "propertySalesDeed",
  "sanctionLetter",
  "soa",
];

export const HOME_LOAN_SELF_EMPLOYED_FIELDS: string[] = [
  "partnershipDeed",
  "udhyam",
  "gstCertificate",
  "financials",
  "computationOfIncome",
  "bbaAts",
  "propertySalesDeed",
  "sanctionLetter",
  "soa",
];

export const LAP_SALARIED_FIELDS: string[] = [
  "form16",
  "itr",
  "copyRegistry",
  "salesDeed",
  "gpa",
];

export const LAP_SELF_EMPLOYED_FIELDS: string[] = [
  "partnershipDeed",
  "udhyam",
  "gstCertificate",
  "financials",
  "computationOfIncome",
  "copyRegistry",
  "salesDeed",
  "gpa",
];

export const EDUCATION_LOAN_FIELDS: string[] = [
  "marksheets",
  "collegeOfferLetter",
  "feeStructure",
  "entranceScorecard",
  "cancelledCheque",
];

export const SOLE_PROPRIETORSHIP_FIELDS: string[] = [
  "computationOfIncome",
  "financials",
  "udhyamCertificate",
  "gst",
  "itr",
];

export const HUF_FIELDS: string[] = [
  "hufDeed",
  "hufPan",
  "computationOfIncome",
  "financials",
  "itr",
  "banking",
  "udhyam",
];

export const PRIVATE_LIMITED_FIELDS: string[] = [
  "banking",
  "itr",
  "computationOfIncome",
  "financials",
  "gst",
  "listOfDirectors",
  "listOfShareholders",
  "aoa",
  "moa",
  "udhyam",
  "companyPan",
  "gstCertificate",
];

export const LLP_FIELDS: string[] = [
  "banking",
  "certificateOfIncorporation",
  "boardResolution",
  "listOfDirectors",
  "itr",
  "computationOfIncome",
  "financials",
  "gst",
  "listOfShareholders",
  "llpAgreement",
  "moa",
  "udhyam",
  "companyPan",
  "gstCertificate",
];

export const PARTNERSHIP_FIELDS: string[] = [
  "partnershipDeed",
  "udhyam",
  "gstCertificate",
  "financials",
  "computationOfIncome",
];

export const DOCTOR_LOAN_FIELDS: string[] = [
  "ugDegree",
  "ugRegistration",
  "pgDegree",
  "pgRegistration",
  "consultancyLetter",
  "clinicLetterHead",
  "itr",
  "coi",
  "udyam",
];

export const CA_CS_CMA_FIELDS: string[] = [
  "copCertificate",
  "comCertificate",
  "firmCard",
  "letterHead",
  "itrCoi",
  "udyamShopReg",
];

export const AUTO_LOAN_FIELDS: string[] = [
  "proformaInvoice",
  "itr",
  "form16",
  "banking",
  "drivingLicense",
];

export const MACHINERY_LOAN_FIELDS: string[] = [
  "machineryQuotation",
  "financials",
  "itr",
  "computationOfIncome",
  "gstCertificate",
  "gst",
  "udhyam",
  "banking",
  "projectReport",
];

export const FALLBACK_FIELDS: string[] = ["banking"];

// ─────────────────────────────────────────────────────────────────────────────
// 4. Helper Resolvers
// ─────────────────────────────────────────────────────────────────────────────

export const isDoctorLoan = (type: string): boolean =>
  type === "doctor" || type?.includes("doctor");

export const isCaCsCmaLoan = (type: string): boolean =>
  type === "ca_cs_cma" ||
  type?.includes("ca_cs_cma") ||
  type === "professional loan";

export function getFieldKeys(loanType: string, entityType: string, employmentType?: string): string[] {
  if (loanType === "personal loan") return PERSONAL_LOAN_FIELDS;
  if (loanType === "home loan") {
    if (
      employmentType === "self_employed" ||
      employmentType === "business" ||
      employmentType === "self employed" ||
      employmentType === "self_employed(business)" ||
      employmentType === "self-employed"
    ) {
      return HOME_LOAN_SELF_EMPLOYED_FIELDS;
    }
    return HOME_LOAN_SALARIED_FIELDS;
  }
  if (loanType === "lap" || loanType === "loan against property") {
    if (
      employmentType === "self_employed" ||
      employmentType === "business" ||
      employmentType === "self employed" ||
      employmentType === "self_employed(business)" ||
      employmentType === "self-employed"
    ) {
      return LAP_SELF_EMPLOYED_FIELDS;
    }
    return LAP_SALARIED_FIELDS;
  }
  if (loanType === "education loan") return EDUCATION_LOAN_FIELDS;
  if (isDoctorLoan(loanType)) return DOCTOR_LOAN_FIELDS;
  if (isCaCsCmaLoan(loanType)) return CA_CS_CMA_FIELDS;
  if (loanType === "auto loan") return AUTO_LOAN_FIELDS;
  if (loanType === "machinery loan") return MACHINERY_LOAN_FIELDS;
  if (loanType === "just inquiry") return ["banking", "itr"];
  if (loanType === "business loan") {
    if (entityType === "sole_proprietorship") return SOLE_PROPRIETORSHIP_FIELDS;
    if (entityType === "huf") return HUF_FIELDS;
    if (entityType === "private_limited") return PRIVATE_LIMITED_FIELDS;
    if (entityType === "llp") return LLP_FIELDS;
    if (entityType === "partnership") return PARTNERSHIP_FIELDS;
    return SOLE_PROPRIETORSHIP_FIELDS;
  }
  return FALLBACK_FIELDS;
}

export function getEntityLabel(entityType: string): string {
  if (entityType === "sole_proprietorship") return "Sole Proprietorship";
  if (entityType === "private_limited") return "Private Limited";
  if (entityType === "llp") return "Limited Liability Partnership (LLP)";
  if (entityType === "huf") return "HUF (Hindu Undivided Family)";
  if (entityType === "partnership") return "Partnership";
  return "";
}

export function getHeading(loanType: string, entityType?: string): string {
  if (loanType === "personal loan") return "Personal Loan Documents";
  if (loanType === "business loan") {
    if (entityType === "sole_proprietorship") return "Sole Proprietorship Documents";
    if (entityType === "private_limited") return "Private Limited Documents";
    if (entityType === "llp") return "Limited Liability Partnership Documents";
    if (entityType === "huf") return "Hindu Undivided Family Documents";
    if (entityType === "partnership") return "Partnership Documents";
    return "Business Loan Documents";
  }
  if (loanType === "home loan") return "Home Loan Documents";
  if (loanType === "lap" || loanType === "loan against property") return "Loan Against Property (LAP) Documents";
  if (loanType === "auto loan") return "Auto Loan Documents";
  if (loanType === "machinery loan") return "Machinery Loan Documents";
  if (loanType === "education loan") return "Education Loan Documents";
  if (isDoctorLoan(loanType)) return "Doctor Loan Documents";
  if (isCaCsCmaLoan(loanType)) return "CA / CS / CMA Loan Documents";
  if (loanType === "just inquiry") return "Just Inquiry Documents";
  return "Document Upload";
}

export function getSubheading(loanType: string, entityType?: string): string | null {
  if (loanType === "personal loan") {
    return "Customized document requirements for Personal Loan disbursal";
  }
  if (loanType === "home loan") {
    return "Customized document requirements for Home Loan disbursal";
  }
  if (loanType === "lap" || loanType === "loan against property") {
    return "Customized document requirements for Loan Against Property disbursal";
  }
  if (loanType === "auto loan") {
    return "Customized document requirements for Auto Loan disbursal";
  }
  if (loanType === "machinery loan") {
    return "Customized document requirements for Machinery Loan disbursal";
  }
  if (loanType === "education loan") {
    return "Customized document requirements for Education Loan disbursal";
  }
  if (loanType === "just inquiry") {
    return "Upload optional bank statement or supporting financial records for evaluation";
  }
  if (isDoctorLoan(loanType) || isCaCsCmaLoan(loanType)) {
    return "Customized document requirements for Professional Loan disbursal";
  }
  if (loanType === "business loan" && entityType === "sole_proprietorship") {
    return "Customized document requirements for Sole Proprietorship Business Loan disbursal";
  }
  if (loanType === "business loan" && entityType) {
    return `Customized document requirements for ${getEntityLabel(entityType)} Business Loan disbursal`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Step 4 Core Document Definitions & Hints
// ─────────────────────────────────────────────────────────────────────────────

export const STEP4_FIELD_LABELS: Record<string, string> = {
  aadharFront: "Aadhar Card Front * (Mandatory)",
  aadharBack: "Aadhar Card Back * (Mandatory)",
  pancard: "Pan Card * (Mandatory)",
  passportSizePhoto: "Passport Size Photo * (Mandatory)",
  currentAddressProof: "Address Proof for Current Address * (Mandatory)",
  permanentAddressProof: "Address Proof for Permanent Address * (Mandatory)",
  salarySlip: "3 Months Salary Slips (Optional)",
  form26as: "Form 26AS (Last 2 Financial Years) (Optional)",
};

export const STEP4_FIELD_HINTS: Record<string, string> = {
  aadharFront: "Upload front side of Aadhaar card with clear photo & text",
  aadharBack: "Upload back side of Aadhaar card with address details",
  pancard: "Upload clear copy of individual PAN card",
  passportSizePhoto: "Upload recent passport size photograph",
  currentAddressProof: "Electricity Bill, LPG Bill, Rent Agreement, etc.",
  permanentAddressProof: "Electricity Bill, LPG Bill, Home Tax, Water Tax, or Govt issued document",
  salarySlip: "Upload last 3 months salary slips if salaried employee",
  form26as: "Upload Form 26AS for last 2 years for income & tax verification",
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. MySQL customer_document type ENUM Mappings
// ─────────────────────────────────────────────────────────────────────────────

export const DOC_KEY_TO_DB_TYPE: Record<string, string> = {
  form16: 'form 16',
  itr: 'itr',
  salarySlip: 'salary slip',
  banking: 'bank statement',
  computationOfIncome: 'computation of income',
  financials: 'financials',
  form26as: 'form 26 as',
  udhyamCertificate: 'udhyam certificate',
  udhyam: 'udhyam certificate',
  udyam: 'udhyam certificate',
  udyamShopReg: 'udhyam certificate',
  gst: 'gst',
  gstCertificate: 'gst',
  listOfDirectors: 'list of directors',
  listOfShareholders: 'list of shareholders',
  aoa: 'aoa',
  moa: 'moa',
  companyPan: 'company pan',
  companyFirmPan: 'company pan',
  hufPan: 'company pan',
  certificateOfIncorporation: 'coi',
  coi: 'coi',
  boardResolution: 'board resolution',
  llpAgreement: 'aoa',
  directorsKyc: 'directors kyc',
  partnershipDeed: 'partnership deed',
  ugCertificate: 'ug certificate',
  ugDegree: 'ug certificate',
  pgCertificate: 'pg certificate',
  pgDegree: 'pg certificate',
  ugRegistration: 'registration',
  pgRegistration: 'registration',
  consultancyLetter: 'cop',
  clinicLetterHead: 'com',
  copCertificate: 'cop',
  comCertificate: 'com',
  firmCard: 'firm card',
  letterHead: 'letter head',
  itrCoi: 'itr',
  hufDeed: 'huf deed',
  bbaAts: 'ats',
  propertySalesDeed: 'title deed',
  sanctionLetter: 'lod',
  soa: 'tpa',
  copyRegistry: 'title deed',
  salesDeed: 'title deed',
  gpa: 'property papers',
  proformaInvoice: 'property papers',
  machineryQuotation: 'property papers',
  projectReport: 'property papers',
  drivingLicense: 'current address proof',
  marksheets: 'graduation marksheet',
  collegeOfferLetter: 'offer letter',
  feeStructure: 'fee structure',
  entranceScorecard: 'entrance exam result',
  cancelledCheque: 'cancel cheque',
};

export const STEP4_DOC_KEY_TO_DB_TYPE: Record<string, string> = {
  aadharFront: 'aadhaar front',
  aadharBack: 'aadhaar back',
  pancard: 'pancard',
  passportSizePhoto: 'profile photo',
  currentAddressProof: 'current address proof',
  permanentAddressProof: 'current address proof',
  salarySlip: 'salary slip',
  form26as: 'form 26 as',
};

export const COAPP_DOC_KEY_TO_DB_TYPE: Record<string, string> = {
  coAppAadhaar: 'co-applicant aadhaar front',
  coAppPan: 'co-applicant pan',
  coAppCancelledCheque: 'cancel cheque',
  coAppForm16: 'form 16',
  coAppSalarySlips: 'salary slip',
  coAppIdCard: 'company id card',
};
