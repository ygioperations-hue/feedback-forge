import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "ff-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "accepted") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-[90] p-4 sm:p-6"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto max-w-3xl rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Cookie className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0 hidden sm:block" />
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            We use a single session cookie to keep you signed in. No tracking, no advertising.
            Learn more in our{" "}
            <Link
              href="/privacy"
              className="underline text-foreground hover:text-primary transition-colors"
              data-testid="link-cookie-privacy"
            >
              Privacy Policy
            </Link>.
          </p>
          <Button
            size="sm"
            onClick={handleAccept}
            className="shrink-0 w-full sm:w-auto"
            data-testid="button-cookie-accept"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
