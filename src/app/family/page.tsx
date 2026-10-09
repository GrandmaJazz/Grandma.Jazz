import { FAMILY_EMBED_URL } from '@/lib/externalLinks';

// Keep the current independently maintained Family experience intact.
// The surrounding page and navigation remain on grandmajazz.com.
export default function FamilyPage() {
  return (
    <section aria-label="Join the Grandma Jazz family" className="bg-black pt-[100px] min-[1050px]:pt-[116px]">
      <div style={{ height: 'calc(100svh - 100px)', minHeight: 620, position: 'relative', overflow: 'hidden', clipPath: 'inset(0)', WebkitClipPath: 'inset(0)' }}>
        <iframe
          src={FAMILY_EMBED_URL}
          title="Grandma Jazz — Add Your Brick"
          style={{ display: 'block', width: '100%', height: '100%', border: 0, transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
        />
      </div>
    </section>
  );
}
