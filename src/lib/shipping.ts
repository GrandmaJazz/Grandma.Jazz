export interface ShippingQuote {
  quoteId: string;
  destinationCountry: string;
  subtotal: number;
  shippingCost: number;
  grossGrams: number;
  service: string;
  orderItems: {
    product: string;
    quantity: number;
    name: string;
    price: number;
    image: string;
    weight: number;
  }[];
}
