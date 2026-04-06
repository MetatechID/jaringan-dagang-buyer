import type { CartItem, Product } from "./types";

const CART_KEY = "jd_cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  // Dispatch a storage event so other components can react
  window.dispatchEvent(new Event("cart-updated"));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function getCartCount(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCart(product: Product, quantity: number = 1): void {
  const items = readCart();
  const idx = items.findIndex((i) => i.product.id === product.id);

  if (idx >= 0) {
    items[idx].quantity += quantity;
  } else {
    items.push({ product, quantity });
  }

  writeCart(items);
}

export function updateCartItemQty(productId: string, quantity: number): void {
  let items = readCart();
  if (quantity <= 0) {
    items = items.filter((i) => i.product.id !== productId);
  } else {
    const idx = items.findIndex((i) => i.product.id === productId);
    if (idx >= 0) {
      items[idx].quantity = quantity;
    }
  }
  writeCart(items);
}

export function removeFromCart(productId: string): void {
  const items = readCart().filter((i) => i.product.id !== productId);
  writeCart(items);
}

export function clearCart(): void {
  writeCart([]);
}

export function getCartTotal(): number {
  return readCart().reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
}
