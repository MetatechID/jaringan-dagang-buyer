/** Vercel API wrapper — just the deployments lookup we need. */

const TOKEN = process.env.VERCEL_TOKEN || "";
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";

export interface BranchDeployment {
  url: string;             // beli-aman-storefronts-aoqdrbjs0.vercel.app (no protocol)
  state: string;           // QUEUED | BUILDING | READY | ERROR | CANCELED
  ready: boolean;
  created_at: number;
  inspector_url?: string;
}

export interface ProjectDomain {
  name: string;
  verified: boolean;
  apex_name?: string;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
  redirect?: string | null;
  created_at: number | null;
}

export async function listDomains(): Promise<ProjectDomain[]> {
  if (!TOKEN || !PROJECT_ID) return [];
  const url = new URL(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains`);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { domains?: any[] };
  return (data.domains ?? []).map((d) => ({
    name: d.name,
    verified: !!d.verified,
    apex_name: d.apexName,
    verification: d.verification,
    redirect: d.redirect,
    created_at: d.createdAt ?? null,
  }));
}

export async function addDomain(name: string): Promise<ProjectDomain | { error: string }> {
  if (!TOKEN || !PROJECT_ID) return { error: "VERCEL_TOKEN or VERCEL_PROJECT_ID env missing" };
  const url = new URL(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains`);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => null) as any;
  if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}` };
  return {
    name: data.name,
    verified: !!data.verified,
    apex_name: data.apexName,
    verification: data.verification,
    redirect: data.redirect,
    created_at: data.createdAt ?? null,
  };
}

export async function removeDomain(name: string): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN || !PROJECT_ID) return { ok: false, error: "VERCEL_TOKEN missing" };
  const url = new URL(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${encodeURIComponent(name)}`);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
  }
  return { ok: true };
}

export async function verifyDomain(name: string): Promise<ProjectDomain | { error: string }> {
  if (!TOKEN || !PROJECT_ID) return { error: "VERCEL_TOKEN missing" };
  const url = new URL(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${encodeURIComponent(name)}/verify`);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json().catch(() => null) as any;
  if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}` };
  return {
    name: data.name,
    verified: !!data.verified,
    apex_name: data.apexName,
    verification: data.verification,
    redirect: data.redirect,
    created_at: data.createdAt ?? null,
  };
}

export async function latestDeploymentForBranch(branch: string): Promise<BranchDeployment | null> {
  if (!TOKEN || !PROJECT_ID) return null;
  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId", PROJECT_ID);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  url.searchParams.set("limit", "1");
  url.searchParams.set("meta-githubCommitRef", branch);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { deployments?: any[] };
  const d = data.deployments?.[0];
  if (!d) return null;
  return {
    url: d.url,
    state: d.readyState ?? d.state ?? "UNKNOWN",
    ready: (d.readyState ?? d.state) === "READY",
    created_at: d.created ?? Date.now(),
    inspector_url: d.inspectorUrl,
  };
}
