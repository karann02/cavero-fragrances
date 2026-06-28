export function slugifyUrlPart(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getSeoRouteParam(entity: any): string {
  const slug = slugifyUrlPart(entity?.slug || entity?.product_slug || entity?.category_slug);
  if (slug) return slug;

  const nameSlug = slugifyUrlPart(entity?.name || entity?.product_name || entity?.title);
  if (nameSlug) return nameSlug;

  return String(entity?.id ?? entity?.product_id ?? '').trim();
}
