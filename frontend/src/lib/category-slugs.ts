import { CATEGORIES } from "./constants";

export function categoryToSlug(category: string): string {
  if (!category) return "other";
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCategory(slug: string): string {
  if (!slug) return "Other";
  const normalizedSlug = slug.toLowerCase();
  
  // Try matching against canonical categories
  const match = CATEGORIES.find(
    (c) => categoryToSlug(c) === normalizedSlug
  );
  if (match) return match;

  // Custom known common aliases
  if (normalizedSlug === "food-dining" || normalizedSlug === "food") return "Food & Dining";
  if (normalizedSlug === "travel-fuel" || normalizedSlug === "travel") return "Travel & Fuel";
  if (normalizedSlug === "utilities-bills" || normalizedSlug === "bills") return "Utilities & Bills";
  if (normalizedSlug === "health-medical" || normalizedSlug === "health") return "Health & Medical";
  if (normalizedSlug === "education-fees" || normalizedSlug === "education") return "Education & Fees";
  if (normalizedSlug === "salary-income" || normalizedSlug === "salary") return "Salary & Income";

  // Fallback: convert slug to Title Case
  return normalizedSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Robust category matching across aliases, slugs, and case differences
export function matchesCategory(
  txnCategory: string | undefined | null,
  targetCategory: string | undefined | null
): boolean {
  if (!txnCategory || !targetCategory) return false;
  if (targetCategory === "ALL" || targetCategory === "all") return true;

  const tNorm = txnCategory.toLowerCase().trim();
  const targetNorm = targetCategory.toLowerCase().trim();
  if (tNorm === targetNorm) return true;
  if (categoryToSlug(tNorm) === categoryToSlug(targetNorm)) return true;

  const tCanon = slugToCategory(categoryToSlug(tNorm)).toLowerCase();
  const targetCanon = slugToCategory(categoryToSlug(targetNorm)).toLowerCase();
  if (tCanon === targetCanon) return true;

  // Keyword-level alias fallback for database resilience
  if (
    targetCanon.includes("food") &&
    (tNorm.includes("food") || tNorm.includes("dining") || tNorm.includes("restaurant") || tNorm.includes("cafe"))
  )
    return true;
  if (
    targetCanon.includes("travel") &&
    (tNorm.includes("travel") || tNorm.includes("fuel") || tNorm.includes("petrol") || tNorm.includes("uber") || tNorm.includes("ola"))
  )
    return true;
  if (
    targetCanon.includes("util") &&
    (tNorm.includes("util") || tNorm.includes("bill") || tNorm.includes("electric") || tNorm.includes("water") || tNorm.includes("recharge"))
  )
    return true;
  if (
    targetCanon.includes("health") &&
    (tNorm.includes("health") || tNorm.includes("medical") || tNorm.includes("pharma") || tNorm.includes("doctor"))
  )
    return true;
  if (
    targetCanon.includes("shop") &&
    (tNorm.includes("shop") || tNorm.includes("store") || tNorm.includes("amazon") || tNorm.includes("flipkart"))
  )
    return true;
  if (
    targetCanon.includes("transfer") &&
    (tNorm.includes("transfer") || tNorm.includes("sent") || tNorm.includes("upi transfer"))
  )
    return true;
  if (
    targetCanon.includes("invest") &&
    (tNorm.includes("invest") || tNorm.includes("groww") || tNorm.includes("zerodha") || tNorm.includes("mutual"))
  )
    return true;

  return false;
}

