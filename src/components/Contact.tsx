"use client";

import { SiteFooter } from "../../shared/site/Footer";
import { SiteNavigationLink } from "@/components/SiteNavigationLink";

export default function Contact({ homepage = false }: { homepage?: boolean }) {
  return <SiteFooter linkComponent={SiteNavigationLink} homepage={homepage} />;
}
