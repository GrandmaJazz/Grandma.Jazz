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
 * Format price with comma separators (e.g., 1,234.56)
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
 * Clean up a music/card title that's actually a raw uploaded filename slug
 * (e.g. "groovy-ambient-funk-201745", saved verbatim because nobody set a
 * real title) into something readable for display: "Groovy Ambient Funk".
 * Only touches strings that actually look like a slug — no spaces,
 * hyphen/underscore-separated — so a real title (with a space anywhere,
 * or no separators at all) passes through completely unchanged. Purely
 * cosmetic: doesn't write anything back, so it's safe to apply everywhere
 * a title is displayed without needing the underlying data fixed first.
 */
export const cleanDisplayTitle = (raw: string): string => {
  if (!raw) return raw;
  const trimmed = raw.trim();
  const looksLikeSlug = /^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)+$/.test(trimmed);
  if (!looksLikeSlug) return raw;

  // Strip a trailing numeric id segment — the dedup/timestamp suffix
  // uploads get appended, e.g. the "-201745" in the example above.
  const withoutSuffix = trimmed.replace(/[-_]\d{4,}$/, '');

  return withoutSuffix
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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