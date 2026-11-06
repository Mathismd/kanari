import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const target = href.startsWith("/") ? (href === "/" ? "#" : `#${href.slice(1)}`) : href;
  return <a href={target} {...props} />;
}
