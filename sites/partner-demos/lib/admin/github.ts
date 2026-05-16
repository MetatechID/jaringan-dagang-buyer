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
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...ghHeaders(), ...(init?.headers as any) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface CommitEntry {
  sha: string;
  message: string;
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

/** List recent commits on a branch (default: main). */
export async function listCommits(branch = DEFAULT_BRANCH, perPage = 20): Promise<CommitEntry[]> {
  const data = await gh<any[]>(`/repos/${REPO}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`);
  return data.map((c) => ({
    sha: c.sha,
    message: (c.commit?.message || "").split("\n")[0],
    authorEmail: c.commit?.author?.email || "",
    authorName: c.commit?.author?.name || "",
    date: c.commit?.author?.date || "",
    url: c.html_url,
  }));
}

/** Revert a commit on `branch` by creating a revert commit. We do it manually
 *  via the contents API since GitHub doesn't expose a one-call revert. */
export async function revertCommit(
  branch: string,
  sha: string,
  author: { email: string; name: string },
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
  return commitFiles(branch, `Revert ${sha.slice(0, 7)}`, changes, author, branch);
}
