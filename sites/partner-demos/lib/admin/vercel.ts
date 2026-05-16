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
