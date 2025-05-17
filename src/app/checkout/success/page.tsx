// src/app/checkout/success/page.tsx
import { SearchParamsProvider } from './SearchParamsProvider';
import { PageContent } from './PageContent';

export default function CheckoutSuccessPage() {
  return (
    <SearchParamsProvider>
      <PageContent />
    </SearchParamsProvider>
  );
}