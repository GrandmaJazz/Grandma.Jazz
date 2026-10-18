export function familyDisplayName(title: string, name: string): string {
  // Never allow a chosen name to introduce another email header or recipient.
  if (/[\r\n\x00-\x1f\x7f]/.test(title + name)) throw new Error("Invalid family identity");
  return [title.trim(), name.trim()].filter(Boolean).join(" ");
}

export function familyTileUrl(title: string, name: string): string {
  const base = (process.env.PUBLIC_URL || "https://www.grandmajazz.com").replace(/\/+$/, "");
  const params = new URLSearchParams({ title, name, artwork: "badge-v1" });
  return base + "/api/brick.png?" + params.toString();
}

export function familyEmailRecipient(email: string, title: string, name: string): string {
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new Error("Invalid recipient");
  const display = familyDisplayName(title, name).replace(/["\\]/g, "\\$&");
  return display ? '"' + display + '" <' + email + ">" : email;
}
