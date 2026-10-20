import { useState } from "react";
import type { EventFamilyIdentity } from "@shared/events-familyIdentity";

/** The original personal brick, with a readable name if the image cannot load. */
export function FamilyIdentityName({ identity, fallbackName }: {
  identity?: EventFamilyIdentity | null; fallbackName: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!identity || failedUrl === identity.tileUrl) return <span className="break-words">{identity?.displayName || fallbackName}</span>;
  return <img src={identity.tileUrl} alt={identity.displayName} width={220} height={72}
    className="block w-[220px] max-w-full h-auto shrink-0" loading="lazy" decoding="async"
    onError={() => setFailedUrl(identity.tileUrl)} />;
}
