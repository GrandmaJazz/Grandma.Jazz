export interface CheckoutItem { product: string; quantity: number }
export interface CheckoutRequest {
  orderItems: CheckoutItem[];
  destinationCountry: string;
  discountCode?: string | null;
}
export interface CheckoutQuote {
  quoteId: string;
  currency: 'USD';
  destinationCountry: string;
  orderItems: Array<CheckoutItem & { name: string; price: number; weight: number; image: string }>;
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  totalCents: number;
  shipping: {
    service: string;
    rateVersion: string;
    productWeightGrams: number;
    packagingGrams: number;
    packedWeightGrams: number;
    shippingCents: number;
  };
}
