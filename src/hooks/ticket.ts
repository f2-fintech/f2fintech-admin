import { Dayjs } from "dayjs";
import { useState } from "react";
import useSWR, { mutate } from "swr";

import { fetcher, creator, modifier, deleter } from "@/apis/apiClient";
import { Ticket, JoinedTicketData } from "@/types/ticket";
import { axiosInstance } from "@/apis/config/axiosConfig";

/**
 * Hook for fetching tickets with SWR (stale-while-revalidate) strategy.
 *
 * @param pathKey - The API path key used by SWR to fetch ticket data.
 * @param page - Current page number for pagination.
 * @param limit - Size of each page for pagination.
 * @returns An object containing the fetched tickets, loading state, and error state.
 */
export const useGetTickets = (
  pathKey: string,
  page: number = 1,
  limit: number = 6,
  filter: string = "",
  startDate: string | null = null,
  endDate: string | null = null,
  companyId?: string
) => {
  const params = new URLSearchParams();
  if (filter) params.set("name", filter);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const fullPath = pathKey.includes('?')
    ? `${pathKey}&page=${page}&limit=${limit}&${params.toString()}`
    : `${pathKey}?page=${page}&limit=${limit}&${params.toString()}`;

  const {
    data: swrData,
    error,
    isValidating
  } = useSWR<{
    statusCode: number;
    message: string;
    data: {
      results: Ticket;
      count: number;
      pages: number;
      totalDisbursedAmount?: number;
    };
  }>(
    fullPath,
    fetcher,
    {
      refreshInterval: 3600000,
      revalidateOnFocus: false,
      dedupingInterval: 1000
    }
  );

  const refetcher = async () => {
    await mutate(fullPath);
  };

  return {
    value: swrData?.data || {
      results: [],
      count: 0,
      pages: 0,
      totalDisbursedAmount: 0
    },
    swrLoading: !error && !swrData && isValidating,
    error,
    refetcher,
  };
};

/**
 * Hook for creating a new ticket.
 *
 * @param pathKey - The API path key used to create a new ticket.
 * @returns An object containing the created ticket, loading state, error state, and the createTicket function.
 */
export const useCreateTicket = (pathKey: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTicket = async (dataObj: object) => {
    setLoading(true);
    setError(null);
    try {
      console.log( 'Creating ticket with data:', dataObj );
      console.log( 'Path key:', pathKey );

      // Log cookies to check companyId availability
      if ( typeof window !== 'undefined' )
      {
        const cookies = document.cookie;
        console.log( 'Cookies:', cookies );
      }
      const response = await creator(pathKey, dataObj);
      console.log( 'Ticket creation response:', response );
      return response;
    } catch (err) {
      console.error( 'Error creating ticket:', err );
      console.error( 'Error details:', err.response?.data || err.message );
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, createTicket };
};

/**
 * Hook for modifying an existing ticket.
 *
 * @param pathKey - The API path key used to modify a ticket.
 * @returns An object containing the updated ticket, loading state, error state, and the modifyTicket function.
 */
export const useModifyTicket = (pathKey: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const modifyTicket = async (
    ticketId: number,
    updatedTicketData: Partial<JoinedTicketData>
  ) => {
    setLoading(true);
    setError(null);
    try {
      console.log('updatedTicketData', updatedTicketData);
      const apiPath = `${pathKey}/${ticketId}`;
      const ticket = await modifier<JoinedTicketData, Partial<JoinedTicketData>>(
        apiPath,
        updatedTicketData
      );
      return ticket;
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, modifyTicket };
};

export const useDeleteTicket = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteTicket = async (pathKey: string,
    ticketId: number,
    reason: string,
    archivedByUserId: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const apiPath = `${ process.env.NEXT_PUBLIC_API_URL}/${pathKey}/${ticketId}`;
      const ticket = await axiosInstance.post(
        apiPath,
        { ticketId, reason, archivedBy: archivedByUserId }, 
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      return ticket;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, deleteTicket };
};
