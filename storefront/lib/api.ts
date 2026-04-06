import type {
  SearchInitResponse,
  SearchResultsResponse,
  Product,
  BppResult,
  BecknProvider,
  BecknItem,
} from "./types";

const BAP_BASE = process.env.NEXT_PUBLIC_BAP_URL ?? "http://localhost:8002";

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function initiateSearch(
  query: string,
  category?: string,
): Promise<SearchInitResponse> {
  const res = await fetch(`${BAP_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, category }),
  });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  return res.json();
}

export async function pollSearchResults(
  sessionId: string,
): Promise<SearchResultsResponse> {
  const res = await fetch(`${BAP_BASE}/api/search/${sessionId}/results`);
  if (!res.ok) {
    throw new Error(`Poll failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Flatten Beckn catalog into Product[]
// ---------------------------------------------------------------------------

function extractProviderLocation(provider: BecknProvider): string {
  if (provider.locations && provider.locations.length > 0) {
    const loc = provider.locations[0];
    const parts: string[] = [];
    if (loc.city?.name) parts.push(loc.city.name);
    if (loc.state?.name) parts.push(loc.state.name);
    if (parts.length > 0) return parts.join(", ");
    if (loc.address) return loc.address;
  }
  return "";
}

function flattenItem(
  item: BecknItem,
  provider: BecknProvider,
  bppId: string,
  bppUri: string,
): Product {
  const imageUrl =
    item.descriptor.images && item.descriptor.images.length > 0
      ? item.descriptor.images[0].url
      : "";

  return {
    id: `${bppId}::${provider.id}::${item.id}`,
    itemId: item.id,
    name: item.descriptor.name,
    description: item.descriptor.short_desc ?? "",
    imageUrl,
    price: parseFloat(item.price.value) || 0,
    currency: item.price.currency || "IDR",
    availableQty: item.quantity?.available?.count ?? 0,
    categoryIds: item.category_ids ?? [],
    providerName: provider.descriptor.name,
    providerLocation: extractProviderLocation(provider),
    providerId: provider.id,
    bppId,
    bppUri: bppUri || "",
  };
}

export function flattenResults(
  results: Record<string, BppResult>,
): Product[] {
  const products: Product[] = [];

  for (const [bppId, bpp] of Object.entries(results)) {
    const bppUri = bpp.bpp_uri ?? "";
    const providers = bpp.catalog?.providers ?? [];

    for (const provider of providers) {
      for (const item of provider.items ?? []) {
        products.push(flattenItem(item, provider, bppId, bppUri));
      }
    }
  }

  return products;
}
