import Link from "next/link";
import type { ComponentProps } from "react";

// The site already handles route transitions on click. Avoid the beta
// router's speculative RSC setup on links before the user navigates.
export default function SiteLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}
