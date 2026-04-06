/**
 * Format a number as Indonesian Rupiah.
 * Examples:
 *   formatIDR(79750)  -> "Rp 79.750"
 *   formatIDR(1500000) -> "Rp 1.500.000"
 */
export function formatIDR(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${formatted}`;
}
