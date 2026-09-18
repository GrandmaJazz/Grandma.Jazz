/** Merchandise is sold in whole USD; round each unit before multiplying. */
export function roundProductPrice(price: number): number {
  return Math.ceil(price);
}
