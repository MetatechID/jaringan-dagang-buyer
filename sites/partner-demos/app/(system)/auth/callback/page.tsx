"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    // Firebase popup-fallback redirect lands here. The SDK provider's
    // resolveRedirectSignIn() runs on its next mount; we just bounce home so
    // the user re-encounters the modal at whichever brand context they were on.
    const t = setTimeout(() => router.replace("/"), 600);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div style={{ padding: 48, textAlign: "center", color: "#64748B" }}>
      Memproses sign-in...
    </div>
  );
}
