export interface ProductFacts {
  details: ReadonlyArray<{ label: string; value: string }>;
  beforeOrdering?: string;
  requiresSizeSelection?: boolean;
}

// Based on current seller descriptions and owner confirmation, 19 October 2026.
// Catalogue shipping weights and an old supplier quotation are not net weights,
// dimensions, available variants or evidence of the contents of today's stock.
const PRODUCT_FACTS: Readonly<Record<string, ProductFacts>> = {
  '69296931be2f425d5baed478': {
    details: [{ label: 'Material', value: 'Wood' }],
    beforeOrdering: 'For the board dimensions and the pieces included, ask the shop before ordering.',
  },
  '6960a7f006185775d0cd444c': {
    details: [{ label: 'Origin', value: 'Made in Thailand' }, { label: 'Use', value: 'Manual hand fan' }],
    beforeOrdering: 'Need the open dimensions or material details? Ask the shop before ordering.',
  },
  '6960c0c906185775d0cd4497': {
    details: [{ label: 'Material', value: 'Cork' }],
    beforeOrdering: 'Ask the shop to confirm the diameter and number of coasters included before ordering.',
  },
  '6960c21106185775d0cd449e': {
    details: [{ label: 'Use', value: 'Coffee decanter for chilled brews' }, { label: 'Contents', value: 'Bottle only. Coffee is not included.' }],
    beforeOrdering: 'Need the capacity or material details? Ask the shop before ordering.',
  },
  '6aaa37d4af0110889be25e6c': {
    details: [{ label: 'Fabric', value: 'Cotton' }, { label: 'Fit', value: 'Oversized' }, { label: 'Sizes', value: 'S, M, L, XL, XXL' }],
    beforeOrdering: 'Choose your size at checkout. Need measurements or colour details? Ask the shop before ordering.',
    requiresSizeSelection: true,
  },
  '6aaa39bbaf0110889be25ec8': {
    details: [],
    beforeOrdering: 'Need the open diameter or folded length? Ask the shop before ordering.',
  },
  '6aaa3a0faf0110889be25f00': {
    details: [{ label: 'Net pack weight', value: '250 g per bag' }, { label: 'Grown in', value: 'Chiang Mai, Thailand' }, { label: 'Roast', value: 'Medium, roasted in Phuket' }],
    beforeOrdering: 'Please confirm the whole-bean or ground format, roast date and delivery availability for your country before ordering.',
  },
};

export function getProductFacts(productId: string): ProductFacts | undefined {
  return PRODUCT_FACTS[productId];
}

export function productEnquiryHref(productName: string, sizeEnquiry = false): string {
  const subject = `${sizeEnquiry ? 'Size enquiry' : 'Product enquiry'}: ${productName}`;
  const body = `Hello Grandma Jazz,\n\nI would like to ask about ${productName}.\n${sizeEnquiry ? 'My preferred size / measurements: \n' : 'My question: \n'}Destination country: \n\nThank you.`;
  return `mailto:grandmajazzphuket@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
