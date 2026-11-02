import { Fragment } from "react";
import { SiteNavigationLink } from "@/components/SiteNavigationLink";

export function BrandText({
  text,
  linked = false,
}: { text: string; linked?: boolean }) {
  return (
    <>
      {text.split(/(\bgarments\b)/gi).map((part, i) => {
        if (!/^garments$/i.test(part))
          return <Fragment key={i}>{part}</Fragment>;
        const mark = (
          <>
            <img src="/images/garments.png" width={1031} height={218} alt="" />
            <span className="wordmark-label">GARMENTS</span>
          </>
        );
        return linked ? (
          <SiteNavigationLink
            key={i}
            href="/garments/"
            className="brand-wordmark"
            aria-label="Explore GARMENTS"
          >
            {mark}
          </SiteNavigationLink>
        ) : (
          <span className="brand-wordmark" key={i}>
            {mark}
          </span>
        );
      })}
    </>
  );
}
