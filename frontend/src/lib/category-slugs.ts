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
