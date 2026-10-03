import React from "react";
import SecuredLoansPage from "./SecuredLoansPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secured Loans | F2 Fintech Admin",
  description: "Manage secured loan applications.",
};

const Page = () => {
  return <SecuredLoansPage />;
};

export default Page;
