/** Thin GitHub REST API client — just the endpoints the vibe-coder uses. */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = process.env.ADMIN_GITHUB_REPO || "MetatechID/jaringan-dagang-buyer";
const DEFAULT_BRANCH = process.env.ADMIN_GITHUB_BASE_BRANCH || "main";

const API = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN env var missing on server");
  return {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function gh<T = any>(path: string, init?: RequestInit): Promise<T> {
  // Next.js App Router caches fetch() GETs by default. `dynamic = "force-dynamic"`
  // on the route only opts out the route render, NOT internal fetch calls. We
  // need always-fresh GitHub data — especially when polling for a PR comment
  // that the Vercel bot hasn't posted yet — so explicit no-store is required.
  const res = await fetch(`${API}${path}`, { cache: "no-store", ...init, headers: { ...ghHeaders(), ...(init?.headers as any) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  // 204 No Content (e.g., DELETE /git/refs/...) returns an empty body —
  // calling res.json() on it would throw "Unexpected end of JSON input".
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface CommitEntry {
  sha: string;
  message: string;            // first line (commit subject)
  full_message: string;       // full body, for trailer parsing
  authorEmail: string;
  authorName: string;
  date: string;
  url: string;
}

export interface FileChange {
  path: string;
  content: string;  // utf-8 file content (will be base64-encoded by us)
}

export const REPO_PATH = REPO;
export const BASE_BRANCH = DEFAULT_BRANCH;

/** Fetch raw file contents at the tip of `branch`. */
export async function readFile(path: string, branch = DEFAULT_BRANCH): Promise<string | null> {
  try {
    const data = await gh<{ content: string; encoding: string }>(
      `/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    );
    if (data.encoding !== "base64") return Buffer.from(data.content).toString("utf-8");
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}

async function getBranchHead(branch: string): Promise<{ sha: string } | null> {
  try {
    const data = await gh<{ object: { sha: string } }>(
      `/repos/${REPO}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    return { sha: data.object.sha };
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}

async function createBranch(branch: string, fromBranch: string): Promise<void> {
  const base = await getBranchHead(fromBranch);
  if (!base) throw new Error(`Base branch ${fromBranch} not found`);
  await gh(`/repos/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.sha }),
  });
}

async function ensureBranch(branch: string, fromBranch = DEFAULT_BRANCH): Promise<void> {
  const head = await getBranchHead(branch);
  if (head) return;
  await createBranch(branch, fromBranch);
}

/** Commit a set of file changes onto `branch`. Creates the branch if missing.
 *  Returns the new commit SHA. */
export async function commitFiles(
  branch: string,
  message: string,
  changes: FileChange[],
  author: { email: string; name: string },
  fromBranch = DEFAULT_BRANCH,
): Promise<string> {
  await ensureBranch(branch, fromBranch);
  const head = await getBranchHead(branch);
  if (!head) throw new Error(`Branch ${branch} disappeared`);

  // Fetch the tree of the current branch HEAD to base our new tree on.
  const commit = await gh<{ tree: { sha: string } }>(
    `/repos/${REPO}/git/commits/${head.sha}`,
  );

  // Create blobs for each file change.
  const blobs = await Promise.all(
    changes.map(async (c) => {
      const blob = await gh<{ sha: string }>(`/repos/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(c.content, "utf-8").toString("base64"),
          encoding: "base64",
        }),
      });
      return { path: c.path, sha: blob.sha, mode: "100644", type: "blob" as const };
    }),
  );

  const tree = await gh<{ sha: string }>(`/repos/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }),
  });

  const newCommit = await gh<{ sha: string }>(`/repos/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [head.sha],
      author: { name: author.name, email: author.email },
    }),
  });

  await gh(`/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  return newCommit.sha;
}

/** Open a PR if none exists for the branch, return the PR number. */
export async function ensurePr(
  branch: string,
  title: string,
  body: string,
  base = DEFAULT_BRANCH,
): Promise<{ number: number; html_url: string } | null> {
  // Check for an existing open PR.
  const owner = REPO.split("/")[0];
  const existing = await gh<any[]>(
    `/repos/${REPO}/pulls?state=open&head=${encodeURIComponent(owner + ":" + branch)}`,
  );
  if (existing.length > 0) return { number: existing[0].number, html_url: existing[0].html_url };
  try {
    const pr = await gh<{ number: number; html_url: string }>(`/repos/${REPO}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, head: branch, base, body }),
    });
    return { number: pr.number, html_url: pr.html_url };
  } catch (e) {
    // "No commits between main and branch" — branch has no diff yet.
    if (String(e).includes("422")) return null;
    throw e;
  }
}

/** Merge a PR — squash. */
export async function mergePr(prNumber: number, commitTitle: string): Promise<string> {
  const data = await gh<{ sha: string }>(
    `/repos/${REPO}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      body: JSON.stringify({ commit_title: commitTitle, merge_method: "squash" }),
    },
  );
  return data.sha;
}

/** Return only the commits in `head` that are NOT in `base` — the
 *  "this draft is ahead of main by N commits" set. Uses GitHub's compare
 *  endpoint so the result is exact regardless of how far main has moved. */
export async function compareBranchAhead(
  base: string,
  head: string,
): Promise<Array<{ sha: string; message: string; date: string; author: string; url: string; vibe_by: string | null }>> {
  const data = await gh<any>(
    `/repos/${REPO}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
  );
  const commits = (data?.commits ?? []) as any[];
  // GitHub returns oldest-first; we want newest-first to mirror the UI.
  return commits
    .map((c) => {
      const fullMsg = c.commit?.message || "";
      const subject = fullMsg.split("\n")[0];
      const vibeByMatch = fullMsg.match(/^Vibe-By:\s*(.+)$/m);
      return {
        sha: c.sha as string,
        message: subject,
        date: c.commit?.author?.date || "",
        author: c.commit?.author?.name || "",
        url: c.html_url as string,
        vibe_by: vibeByMatch ? vibeByMatch[1].trim() : null,
      };
    })
    .reverse();
}

/** List recent commits on a branch (default: main). */
export async function listCommits(branch = DEFAULT_BRANCH, perPage = 20): Promise<CommitEntry[]> {
  const data = await gh<any[]>(`/repos/${REPO}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`);
  return data.map((c) => ({
    sha: c.sha,
    message: (c.commit?.message || "").split("\n")[0],
    full_message: c.commit?.message || "",
    authorEmail: c.commit?.author?.email || "",
    authorName: c.commit?.author?.name || "",
    date: c.commit?.author?.date || "",
    url: c.html_url,
  }));
}

/** Filter commits to only those produced by the vibe editor for the given
 *  tenant. Looks for a `Vibe-Tenant: <slug>` trailer in the commit message. */
export function isVibeCommitForTenant(c: CommitEntry, tenant: string): boolean {
  const re = new RegExp(`(^|\\n)Vibe-Tenant:\\s*${tenant}\\b`, "i");
  return re.test(c.full_message);
}

export function extractVibeBy(c: CommitEntry): string | null {
  const m = c.full_message.match(/(?:^|\n)Vibe-By:\s*([^\s\n]+)/i);
  return m ? m[1] : null;
}

export interface DraftBranch {
  branch: string;
  pr_number: number | null;
  pr_url: string | null;
  pr_title: string | null;
  head_sha: string;
  last_commit_message: string;
  last_commit_date: string;
}

/** List open `vibe/*` branches with their PR (if any). */
export async function listDraftBranches(prefix = "vibe/"): Promise<DraftBranch[]> {
  // 1. Pull all branches via the heads ref API.
  const refs = await gh<any[]>(`/repos/${REPO}/git/matching-refs/heads/${prefix}`);
  // 2. Pull open PRs once and index by head ref.
  const prs = await gh<any[]>(`/repos/${REPO}/pulls?state=open&per_page=50`);
  const prByBranch = new Map<string, any>(prs.map((p) => [p.head.ref, p]));

  const out: DraftBranch[] = [];
  await Promise.all(
    refs.map(async (r) => {
      const branch = r.ref.replace(/^refs\/heads\//, "");
      const headSha = r.object.sha;
      let commit: any = null;
      try {
        commit = await gh(`/repos/${REPO}/commits/${headSha}`);
      } catch {
        /* skip stale ref */
      }
      const pr = prByBranch.get(branch);
      out.push({
        branch,
        pr_number: pr?.number ?? null,
        pr_url: pr?.html_url ?? null,
        pr_title: pr?.title ?? null,
        head_sha: headSha,
        last_commit_message: (commit?.commit?.message ?? "").split("\n")[0],
        last_commit_date: commit?.commit?.author?.date ?? "",
      });
    }),
  );
  out.sort((a, b) => b.last_commit_date.localeCompare(a.last_commit_date));
  return out;
}

/** Close the PR + delete the draft branch. */
export async function discardDraft(branch: string): Promise<void> {
  // Close any open PR first.
  try {
    const owner = REPO.split("/")[0];
    const prs = await gh<any[]>(
      `/repos/${REPO}/pulls?state=open&head=${encodeURIComponent(owner + ":" + branch)}`,
    );
    for (const pr of prs) {
      await gh(`/repos/${REPO}/pulls/${pr.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed" }),
      });
    }
  } catch {
    /* close errors aren't fatal — branch delete is the real action */
  }
  await gh(`/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "DELETE" });
}

/** Look up the most recent Vercel preview URL for `branch` by scraping the
 *  Vercel bot's PR comment. Works without a Vercel token, which is essential
 *  while our VERCEL_TOKEN env var is unusable (returns 403 invalidToken).
 *
 *  The bot writes a comment containing a hidden `[vc]: #...:<base64>` block
 *  whose decoded JSON has `projects[].previewUrl` and `nextCommitStatus`.
 *  We pick the project whose rootDirectory matches our partner-demos path —
 *  in monorepos there's a comment block per Vercel project.
 */
export async function previewFromPrComment(
  branch: string,
  rootDirectoryHint = "sites/partner-demos",
  diag?: Record<string, any>,
): Promise<{ url: string; ready: boolean } | null> {
  const d = diag ?? {};
  d.repo = REPO;
  d.branch = branch;
  try {
    const owner = REPO.split("/")[0];
    d.owner = owner;
    d.pr_query = `/repos/${REPO}/pulls?state=open&head=${encodeURIComponent(owner + ":" + branch)}`;
    const prs = await gh<any[]>(d.pr_query);
    d.pr_count = prs?.length ?? 0;
    const pr = prs?.[0];
    if (!pr) { d.reason = "no_open_pr"; return null; }
    d.pr_number = pr.number;
    const comments = await gh<any[]>(
      `/repos/${REPO}/issues/${pr.number}/comments?per_page=100`,
    );
    d.comment_count = comments?.length ?? 0;
    d.comment_users = (comments ?? []).map((c: any) => c?.user?.login);
    // Walk newest → oldest looking for the Vercel bot's block.
    for (const c of [...comments].reverse()) {
      const body = c?.body ?? "";
      const m = body.match(/\[vc\]:\s*#[^:]+:([A-Za-z0-9+/=]+)/);
      if (!m) { d.match_misses = (d.match_misses ?? 0) + 1; continue; }
      d.match_payload_len = m[1].length;
      try {
        const decoded = Buffer.from(m[1], "base64").toString("utf8");
        d.decoded_len = decoded.length;
        // The base64 payload can be truncated mid-JSON; tolerate trailing garbage.
        const fixed = decoded.replace(/[ -]+/g, "") + "}}]}";
        const parsed = (() => {
          try { return JSON.parse(decoded); } catch (e: any) { d.full_parse_err = e?.message; }
          const open = decoded.indexOf("{");
          for (let end = decoded.length; end > open; end--) {
            try { return JSON.parse(decoded.slice(open, end)); } catch { /* keep shrinking */ }
          }
          return null;
        })();
        if (!parsed) { d.reason = "json_parse_failed"; continue; }
        const projects = parsed.projects ?? [];
        d.projects = projects.map((p: any) => ({ name: p.name, root: p.rootDirectory, status: p.nextCommitStatus }));
        const match = projects.find((p: any) =>
          (p.rootDirectory ?? "").toLowerCase() === rootDirectoryHint.toLowerCase()
          || p.name === "beli-aman-storefronts",
        ) ?? projects[0];
        d.match_name = match?.name;
        if (match?.previewUrl) {
          d.reason = "found";
          return {
            url: match.previewUrl,
            ready: match.nextCommitStatus === "DEPLOYED",
          };
        }
        d.reason = "no_previewUrl_on_match";
      } catch (e: any) { d.decode_err = e?.message; }
    }
    if (!d.reason) d.reason = "no_vc_block_in_any_comment";
    return null;
  } catch (e: any) {
    d.outer_err = e?.message || String(e);
    return null;
  }
}

/** Revert a commit on `branch` by creating a revert commit. We do it manually
 *  via the contents API since GitHub doesn't expose a one-call revert. */
export async function revertCommit(
  branch: string,
  sha: string,
  author: { email: string; name: string; tenant?: string },
): Promise<string> {
  // Get the patch of the bad commit so we can apply its reverse.
  const detail = await gh<{ files: { filename: string; patch?: string; status: string }[] }>(
    `/repos/${REPO}/commits/${sha}`,
  );
  // For simplicity v0: we re-fetch each touched file at the commit's PARENT
  // and overwrite it on the target branch. This works for added/modified files;
  // deleted files would need a deletion API call which we skip in v0.
  const parent = await gh<{ parents: { sha: string }[] }>(
    `/repos/${REPO}/commits/${sha}`,
  );
  if (!parent.parents || parent.parents.length === 0) {
    throw new Error("Cannot revert root commit");
  }
  const parentSha = parent.parents[0].sha;
  const changes: FileChange[] = [];
  for (const f of detail.files) {
    if (f.status === "added") continue;  // v0 limitation
    const original = await readFile(f.filename, parentSha);
    if (original == null) continue;
    changes.push({ path: f.filename, content: original });
  }
  if (changes.length === 0) {
    throw new Error("No revertable files in commit (v0 only reverts modify/delete)");
  }
  const tenant = author.tenant || "safiyafood";
  const msg = `Revert ${sha.slice(0, 7)}\n\nVibe-Tenant: ${tenant}\nVibe-By: ${author.email}`;
  return commitFiles(branch, msg, changes, author, branch);
}
