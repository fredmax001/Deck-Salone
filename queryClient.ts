import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,    // 5 minutes
            gcTime: 10 * 60 * 1000,       // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: (failureCount: number, error: any) => {
                if (error?.response?.status === 404) return false;
                return failureCount < 2;
            },
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            retry: false,
        },
    },
});