export const PRIVACY_KEY = 'gj-privacy-v1';
export const PRIVACY_EVENT = 'gj-privacy-change';
export const PRIVACY_SETTINGS_EVENT = 'gj-privacy-settings';
const lifetime = 180 * 24 * 60 * 60 * 1000;
export type PrivacyChoice = { version: 1; analytics: boolean; marketing: boolean; savedAt: number };
type PrivacyWindow = Window & { gjPrivacyChoice?: PrivacyChoice };

export function privacySignal(): boolean {
  return typeof window !== 'undefined' && (window.navigator.doNotTrack === '1' ||
    (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
}

export function parsePrivacyChoice(raw: string | null, now = Date.now()): PrivacyChoice | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value?.version === 1 && typeof value.analytics === 'boolean' && typeof value.marketing === 'boolean' &&
      Number.isFinite(value.savedAt) && value.savedAt <= now + 60000 && value.savedAt > now - lifetime ? value : null;
  } catch { return null; }
}

export function readPrivacyChoice(): PrivacyChoice | null {
  if (typeof window === 'undefined') return null;
  const memory = (window as PrivacyWindow).gjPrivacyChoice;
  try { return parsePrivacyChoice(JSON.stringify(memory ?? JSON.parse(window.localStorage.getItem(PRIVACY_KEY) || 'null'))); }
  catch { return memory ?? null; }
}

export function permitsAnalytics(): boolean {
  return !privacySignal() && readPrivacyChoice()?.analytics === true;
}

export function savePrivacyChoice(analytics: boolean, marketing: boolean): PrivacyChoice {
  const value: PrivacyChoice = { version: 1, analytics: !privacySignal() && analytics,
    marketing: !privacySignal() && marketing, savedAt: Date.now() };
  (window as PrivacyWindow).gjPrivacyChoice = value;
  try { window.localStorage.setItem(PRIVACY_KEY, JSON.stringify(value)); } catch { /* A choice still works for this visit. */ }
  window.dispatchEvent(new Event(PRIVACY_EVENT));
  return value;
}

// Withdraw only optional measurement cookies, never login, basket or music state.
export function clearOptionalStorage(analytics: boolean, marketing: boolean) {
  if (typeof document === 'undefined') return;
  const domains = ['', `; domain=${window.location.hostname}`, '; domain=.grandmajazz.com'];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if ((!analytics && /^(_ga(?:_|$)|_gid$|_gat)/.test(name)) || (!marketing && /^_fb[pc]$/.test(name))) {
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`;
    }
  }
  if (!analytics) try { window.localStorage.removeItem('gj-analytics-paid-orders-v1'); } catch { /* Optional storage. */ }
}
