/** Only local page paths may be used after sign-in or profile completion. */
export function shopReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://www.grandmajazz.com');
    if (url.origin !== 'https://www.grandmajazz.com' || /^\/login\/?$/.test(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/'; }
}

export function profileReturnPath(value: string | null | undefined): string {
  const path = shopReturnPath(value);
  return path === '/' ? '/profile/' : `/profile/?redirect=${encodeURIComponent(path)}`;
}

/** Accept international dialling formats without asserting a national length. */
export function isShopPhone(value: string): boolean {
  const phone = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
