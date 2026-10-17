/** Production site. Used when NEXT_PUBLIC_SITE_URL is unset. */
export const PRODUCTION_SITE_URL = "https://ask-buddha-wine.vercel.app";

/** New path so link-preview crawlers do not keep the previous portrait. */
export const SHARE_IMAGE_PATH = "/art/ask-buddha-card.jpg";

export function siteUrl(env: Record<string, string | undefined> = process.env) {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(PRODUCTION_SITE_URL);
}
