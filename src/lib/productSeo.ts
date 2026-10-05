import { SITE_URL } from './structuredData';

export interface SeoProduct {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  isOutOfStock: boolean;
  isFeatured: boolean;
}

// Reviewed ordinary merchandise only. Smoking accessories remain browsable,
// but are not submitted as Google shopping rich-result candidates.
const SHOPPING_PRODUCT_IDS = new Set([
  '69296931be2f425d5baed478', // wooden board game
  '6960a7f006185775d0cd444c', // hand fan
  '6960c0c906185775d0cd4497', // coaster
  '6960c21106185775d0cd449e', // coffee bottle
  '6aaa37d4af0110889be25e6c', // T-shirt
  '6aaa39bbaf0110889be25ec8', // umbrella
  '6aaa3a0faf0110889be25f00', // coffee beans
]);

export function productSchema(product: SeoProduct) {
  if (!SHOPPING_PRODUCT_IDS.has(product._id) || !product.name ||
      !Number.isFinite(product.price) || product.price < 0 ||
      typeof product.isOutOfStock !== 'boolean' || !product.images?.length) return null;
  const url = `${SITE_URL}/products/${product._id}/`;
  return {
    '@context': 'https://schema.org', '@type': 'Product', '@id': `${url}#product`,
    name: product.name, description: product.description,
    image: product.images.map(image => new URL(image, SITE_URL).href), url,
    offers: {
      '@type': 'Offer', url, price: product.price,
      priceCurrency: 'USD', // Matches the storefront and checkout catalogue.
      availability: product.isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@id': `${SITE_URL}/#business` },
    },
  };
}
