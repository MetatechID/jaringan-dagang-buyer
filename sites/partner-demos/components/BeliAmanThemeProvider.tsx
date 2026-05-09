"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { BeliAmanProvider, type BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

import { buildYourBrand } from "@/lib/brands/yourbrand";

interface FirebaseConfigShape {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readFirebaseEnv(): FirebaseConfigShape {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

// useSearchParams() requires a Suspense boundary in Next.js 14 to avoid opting
// the entire route out of static rendering. We wrap it here.
export function BeliAmanThemeProvider({
  seedBrand,
  children,
}: {
  seedBrand: BrandTheme;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<InnerProvider seedBrand={seedBrand}>{children}</InnerProvider>}>
      <InnerProviderWithSearch seedBrand={seedBrand}>{children}</InnerProviderWithSearch>
    </Suspense>
  );
}

function InnerProviderWithSearch({
  seedBrand,
  children,
}: {
  seedBrand: BrandTheme;
  children: React.ReactNode;
}) {
  const search = useSearchParams();

  // For yourbrand, allow ?primary=#xxx&secondary=#yyy&radius=Npx&name=...
  const brand: BrandTheme = useMemo(() => {
    if (seedBrand.slug !== "yourbrand") return seedBrand;
    const overrides: Parameters<typeof buildYourBrand>[0] = {};
    const primary = search.get("primary");
    const secondary = search.get("secondary");
    const accent = search.get("accent");
    const radius = search.get("radius");
    const name = search.get("name");
    if (primary) overrides.primary = primary;
    if (secondary) overrides.secondary = secondary;
    if (accent) overrides.accent = accent;
    if (radius) overrides.radius = radius;
    if (name) overrides.name = name;
    return buildYourBrand(overrides);
  }, [seedBrand, search]);

  return <InnerProvider seedBrand={brand}>{children}</InnerProvider>;
}

function InnerProvider({
  seedBrand,
  children,
}: {
  seedBrand: BrandTheme;
  children: React.ReactNode;
}) {
  const firebase = readFirebaseEnv();
  const firebaseMissing = !firebase.apiKey;

  return (
    <BeliAmanProvider
      config={{
        bapUrl: process.env.NEXT_PUBLIC_BAP_URL || "http://localhost:8003",
        firebase,
        brand: seedBrand,
      }}
    >
      {firebaseMissing ? (
        <div
          style={{
            background: "#FEF3C7",
            color: "#92400E",
            padding: "8px 16px",
            fontSize: 12,
            textAlign: "center",
            borderBottom: "1px solid #F59E0B",
          }}
        >
          ⚠️ Firebase config missing — sign-in won't work. Set <code>NEXT_PUBLIC_FIREBASE_*</code> env vars.
        </div>
      ) : null}
      {children}
    </BeliAmanProvider>
  );
}
