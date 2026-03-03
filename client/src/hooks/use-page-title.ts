import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const suffix = "FeedbackForge";
    document.title = title ? `${title} | ${suffix}` : `${suffix} - Collect & Manage Customer Feedback`;
  }, [title]);
}
