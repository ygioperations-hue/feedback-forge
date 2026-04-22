import logoOnDark from "@/assets/logo-on-dark.svg";
import logoOnLight from "@/assets/logo-on-light.svg";
import { cn } from "@/lib/utils";

type BrandLogoSize = "nav" | "sidebar" | "auth" | "footer" | "powered";

const sizeClasses: Record<BrandLogoSize, string> = {
  nav: "h-8",
  sidebar: "h-7 max-w-[11rem]",
  auth: "h-12",
  footer: "h-8",
  powered: "h-7",
};

type BrandLogoProps = {
  alt?: string;
  className?: string;
  size?: BrandLogoSize;
};

export function BrandLogo({ alt = "FeedbackForge", className, size = "nav" }: BrandLogoProps) {
  const imageClassName = cn("w-auto object-contain", sizeClasses[size], className);

  return (
    <>
      <img src={logoOnLight} alt={alt} className={cn(imageClassName, "block dark:hidden")} />
      <img src={logoOnDark} alt={alt} className={cn(imageClassName, "hidden dark:block")} />
    </>
  );
}
