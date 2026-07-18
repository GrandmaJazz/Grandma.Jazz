// src/components/BlogViews.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface BlogViewsProps {
    slug: string;
    initialViews: number;
}

export function BlogViews({ slug, initialViews }: BlogViewsProps) {
    const [views, setViews] = useState(initialViews);
    const hasCounted = useRef(false);

  useEffect(() => {
        if (hasCounted.current) return;
        hasCounted.current = true;

                let cancelled = false;

                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/public/${slug}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
                    if (!cancelled && data?.success && typeof data.blog?.views === 'number') {
                                setViews(data.blog.views);
                    }
          })
          .catch(() => {});

                return () => {
                        cancelled = true;
                };
  }, [slug]);

    return <span>{views} views</span>;
}
