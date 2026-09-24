import { useState } from "react";
import useSWR, { mutate } from "swr";
import { creator, fetcher, modifier } from "@/apis/apiClient";
import { LoanProvider, LoanProviderData } from "@/types/loanProvider";

/**
 * Custom fetcher that includes companyId in headers
 */
const fetcherWithCompanyId = async ( url: string, companyId?: number ) => {
  const response = await fetch( `${ process.env.NEXT_PUBLIC_API_URL }/${ url }`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...( companyId && { 'Companyid': companyId.toString() } ),
    },
  } );

  if ( !response.ok )
  {
    throw new Error( 'Failed to fetch loan providers' );
  }

  return response.json();
};

/**
 * Hook for fetching loan providers with SWR (stale-while-revalidate) strategy.
 *
 * @param initialData - The initial data to be used before SWR fetches fresh data.
 * @param pathKey - The API path key used by SWR to fetch loan provider data.
 * @param page
 * @param limit
 * @returns An object containing the fetched loan providers, loading state, error state and refetch function.
 */
export const useGetLoanProviders = (
  initialData: LoanProvider | null,
  pathKey: string | null,
  page: number = 1,
  limit: number = 6
) => {
  const {
    data: swrData,
    error,
    isValidating,
  } = useSWR<LoanProvider | null>(
    pathKey ? `${pathKey}?page=${page}&limit=${limit}` : null,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: initialData ? 3600000 : 0, // 1 hour refresh if initialData exists
      revalidateOnFocus: false,
    }
  );
  const refetch = async () => {
    return pathKey ? await mutate(`${pathKey}?page=${page}&limit=${limit}`) : null;
  };

  return {
    value: swrData || {
      results: [],
      count: 0,
      pages: 0,
    },
    swrLoading: !error && !swrData && isValidating,
    error,
    refetch,
  };
};

/**
 * Hook for creating a new loan provider.
 *
 * @param pathKey - The API path key used to create a new loan provider.
 * @returns An object containing the loading state, error state, and the createLoanProvider function.
 */
export const useCreateLoanProvider = (pathKey: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createLoanProvider = async (newLoanProviderData: LoanProviderData) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await creator<LoanProviderData, LoanProviderData>(
        pathKey,
        newLoanProviderData
      );
      return resp;
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  return { loading, error, createLoanProvider };
};

/**
 * Hook for modifying an existing loan provider.
 *
 * @param pathKey - The API path key used to modify a loan provider.
 * @returns An object containing loading state, error state, and the modifyLoanProvider function.
 */
export const useModifyLoanProvider = (pathKey: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const modifyLoanProvider = async (
    updatedLoanProviderData: Partial<LoanProviderData>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const loanProvider = await modifier<
        LoanProviderData,
        Partial<LoanProviderData>
      >(pathKey, updatedLoanProviderData);
      return loanProvider;
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  return { loading, error, modifyLoanProvider };
};

export const useUpdateLoanProvider = ( key: string ) => {
  const [ loading, setLoading ] = useState( false );
  const [ error, setError ] = useState<Error | null>( null );

  const updateLoanProvider = async ( id: number, data: any ) => {
    setLoading( true );
    setError( null );
    try
    {
      const response = await fetch(
        `${ process.env.NEXT_PUBLIC_API_URL }/update-loan-provider/${ id }`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify( data ),
        }
      );

      if ( !response.ok )
      {
        const errorData = await response.json();
        throw new Error( errorData.message || 'Failed to update loan provider' );
      }

      mutate( key ); // Revalidate the SWR cache
      return await response.json();
    } catch ( error )
    {
      setError( error as Error );
      throw error;
    } finally
    {
      setLoading( false );
    }
  };

  return { updateLoanProvider, loading, error };
};
