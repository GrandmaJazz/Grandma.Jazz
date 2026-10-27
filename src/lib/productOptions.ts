export const productColours: Record<string, readonly string[]> = {
  '69296a1cbe2f425d5baed4a7': ['Cream', 'Black', 'Brown'],
  '6aaa37a3af0110889be25e65': ['Black', 'White'],
};
export const cartItemKey = (item: { productId: string; colour?: string }) => `${item.productId}:${item.colour || ''}`;
