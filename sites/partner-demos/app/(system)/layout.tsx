import { BeliAmanThemeProvider } from "@/components/BeliAmanThemeProvider";
import { DEFAULT_YOURBRAND } from "@/lib/brands/yourbrand";

// System pages (orders, admin, auth/callback) need Firebase to be initialized
// — the BeliAmanProvider does that. Use a neutral theme here since these
// pages are brand-agnostic.
export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <BeliAmanThemeProvider seedBrand={DEFAULT_YOURBRAND}>
      {children}
    </BeliAmanThemeProvider>
  );
}
