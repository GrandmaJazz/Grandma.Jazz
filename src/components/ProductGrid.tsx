//src/components/ProductGrid.tsx
import { ProductCard } from '@/components/ProductCard';
import { AnimatedSection } from '@/components/AnimatedSection';

interface Product {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  isOutOfStock: boolean;
  isFeatured: boolean;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
}

export function ProductGrid({ products, title }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl text-[#e3dcd4]">No products found</h2>
      </div>
    );
  }
  
  return (
    <AnimatedSection animation="fadeIn" className="py-8 px-4">
      {title && (
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-editorial-ultralight text-[#D4AF37] mb-4">
            {title}
          </h2>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product._id} {...product} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}