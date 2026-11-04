export interface JoinedTicketData {
  customer_application_id: number;
  user_id: number;
  forwarded_to: number;
  forwarded_by: number;
  is_forwarded: number;
  original_estimate: string;
  voice_note_url: string | null;
  due_date: Date;
  created_at: Date;
  ticketId: number;
  ticketStatus: string;
  applicationAmount: string;
  applicationTenure: number;
  applicationDate: string;
  applicationId: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  customerProfileImage: string;
  customerLocation: string;
  customerState: string;
  loanStatus: string;
  loanCategory: string;
  case_type?: string;
  cashback_amount?: number;
  fixed_commission_percentage?: number;
  approved_at?: string | Date;
  approved_amount?: number;
  disbursed_at?: string | Date;
  disbursed_amount?: number;
  gross_disbursed_amount?: number;
  net_disbursed_amount?: number;
  abnd_at?: string | Date;
  abnd_amount?: number;
}

export interface Ticket {
  results: JoinedTicketData[];
  count: number;
  pages: number;
  errorMessage?: string;
}
