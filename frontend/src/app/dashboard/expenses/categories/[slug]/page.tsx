import React, { Suspense } from "react";
import CategoryDetailView from "@/components/analytics/CategoryDetailView";
import { CATEGORIES } from "@/lib/constants";
import { categoryToSlug } from "@/lib/category-slugs";

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({
    slug: categoryToSlug(cat),
  }));
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "other";

  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      }
    >
      <CategoryDetailView categorySlug={slug} />
    </Suspense>
  );
}
