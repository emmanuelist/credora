import { useQuery } from '@tanstack/react-query';

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

// Fallback price in case API fails
const FALLBACK_BTC_PRICE = 100000;

export function useBTCPrice() {
  return useQuery({
    queryKey: ['btcPrice'],
    queryFn: async () => {
      try {
        const response = await fetch(COINGECKO_API);
        
        if (!response.ok) {
          console.warn('CoinGecko API returned error, using fallback price');
          return FALLBACK_BTC_PRICE;
        }
        
        const data = await response.json();
        return data.bitcoin?.usd || FALLBACK_BTC_PRICE;
      } catch (error) {
        console.error('Error fetching BTC price:', error);
        return FALLBACK_BTC_PRICE;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
