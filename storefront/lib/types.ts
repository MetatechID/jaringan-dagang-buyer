// ---------------------------------------------------------------------------
// Beckn catalog types (from BAP search results)
// ---------------------------------------------------------------------------

export interface BecknImage {
  url: string;
  size_type?: string;
}

export interface BecknDescriptor {
  name: string;
  short_desc?: string;
  long_desc?: string;
  images?: BecknImage[];
}

export interface BecknPrice {
  value: string;
  currency: string;
  maximum_value?: string;
}

export interface BecknQuantity {
  available?: { count: number };
  maximum?: { count: number };
}

export interface BecknItem {
  id: string;
  descriptor: BecknDescriptor;
  price: BecknPrice;
  quantity?: BecknQuantity;
  category_ids?: string[];
  fulfillment_ids?: string[];
  tags?: Array<{
    descriptor?: { code: string };
    list?: Array<{ descriptor?: { code: string }; value: string }>;
  }>;
}

export interface BecknProvider {
  id: string;
  descriptor: BecknDescriptor;
  items: BecknItem[];
  locations?: Array<{
    id: string;
    gps?: string;
    address?: string;
    city?: { name: string };
    state?: { name: string };
  }>;
  categories?: Array<{ id: string; descriptor: BecknDescriptor }>;
}

export interface BecknCatalog {
  descriptor?: BecknDescriptor;
  providers?: BecknProvider[];
}

export interface BppResult {
  bpp_id: string;
  bpp_uri?: string;
  catalog: BecknCatalog;
}

// ---------------------------------------------------------------------------
// Search API response
// ---------------------------------------------------------------------------

export interface SearchInitResponse {
  session_id: string;
  transaction_id: string;
  status: string;
  message: string;
}

export interface SearchResultsResponse {
  session_id: string;
  status: string;
  result_count: number;
  results: Record<string, BppResult>;
}

// ---------------------------------------------------------------------------
// Flattened product for display
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  itemId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  availableQty: number;
  categoryIds: string[];
  providerName: string;
  providerLocation: string;
  providerId: string;
  bppId: string;
  bppUri: string;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartItem {
  product: Product;
  quantity: number;
}
