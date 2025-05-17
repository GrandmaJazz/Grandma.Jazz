/**
 * Format date to localized string
 */
export const formatDate = (dateString: string, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateString) return 'N/A';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', mergedOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format price to currency string
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + '...';
};

/**
 * Get order status badge color
 */
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'paid':
      return 'bg-blue-500/20 text-blue-300';
    case 'shipped':
      return 'bg-purple-500/20 text-purple-300';
    case 'delivered':
      return 'bg-green-500/20 text-green-300';
    case 'canceled':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-zinc-500/20 text-zinc-300';
  }
};