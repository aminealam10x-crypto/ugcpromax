export interface ExtractedProductData {
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  brand: string | null;
  features: string[];
  imageUrls: string[];
  sourceUrl: string;
  rawEvidence: Record<string, unknown>;
}

/** Decode common HTML entities safely without running DOM scripts */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return !Number.isNaN(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return !Number.isNaN(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : "";
    });
}

/** Strip HTML tags and normalize whitespace */
export function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a relative or absolute URL against the base page URL */
function resolveUrl(urlCandidate: string, baseUrl: string): string | null {
  try {
    const trimmed = urlCandidate.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
      return null;
    }
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

function parseMetaTags(html: string): MetaTag[] {
  const metaRegex = /<meta\s+([^>]*?)>/gi;
  const tags: MetaTag[] = [];
  let match: RegExpExecArray | null;

  while ((match = metaRegex.exec(html)) !== null) {
    const attrsStr = match[1];
    const nameMatch = /\bname=["']([^"']*)["']/i.exec(attrsStr);
    const propMatch = /\bproperty=["']([^"']*)["']/i.exec(attrsStr);
    const contentMatch = /\bcontent=["']([^"']*)["']/i.exec(attrsStr);

    if (contentMatch) {
      tags.push({
        name: nameMatch ? nameMatch[1].toLowerCase() : undefined,
        property: propMatch ? propMatch[1].toLowerCase() : undefined,
        content: decodeHtmlEntities(contentMatch[1]),
      });
    }
  }

  return tags;
}

interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string } | { url?: string }[];
  brand?: string | { name?: string };
  offers?:
    | { price?: string | number; priceCurrency?: string }
    | { price?: string | number; priceCurrency?: string }[];
}

function parseJsonLd(html: string): JsonLdProduct | null {
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1].trim();
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      const candidates: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;
        const type = (item as Record<string, unknown>)["@type"];
        const isProduct =
          type === "Product" || (Array.isArray(type) && type.includes("Product"));

        if (isProduct) {
          return item as JsonLdProduct;
        }
      }
    } catch {
      // Ignore JSON parse errors in malformed script tags
    }
  }

  return null;
}

export function extractProductMetadata(html: string, pageUrl: string): ExtractedProductData {
  const metaTags = parseMetaTags(html);
  const jsonLd = parseJsonLd(html);

  const getMeta = (...keys: string[]): string | null => {
    for (const key of keys) {
      const lower = key.toLowerCase();
      const found = metaTags.find((t) => t.property === lower || t.name === lower);
      if (found && found.content.trim()) {
        return found.content.trim();
      }
    }
    return null;
  };

  // 1. Title Extraction
  let title = jsonLd?.name ? stripHtml(String(jsonLd.name)) : null;
  let titleSource = title ? "json-ld" : "";

  if (!title) {
    title = getMeta("og:title", "twitter:title");
    titleSource = title ? "open-graph" : "";
  }

  if (!title) {
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (h1Match) {
      title = stripHtml(h1Match[1]);
      titleSource = "h1";
    }
  }

  if (!title) {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch) {
      // Strip generic store suffix (e.g. "Argan Oil - Morocco Store" -> "Argan Oil")
      const rawTitle = stripHtml(titleMatch[1]);
      title = rawTitle.split(/[-|–—]/)[0].trim() || rawTitle;
      titleSource = "title-tag";
    }
  }

  title = (title || "Untitled Product").slice(0, 200);

  // 2. Description Extraction
  let description = jsonLd?.description ? stripHtml(String(jsonLd.description)) : null;
  let descSource = description ? "json-ld" : "";

  if (!description) {
    description = getMeta("og:description", "twitter:description", "description");
    descSource = description ? "meta" : "";
  }

  if (!description) {
    // Look for first substantive paragraph
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = stripHtml(pMatch[1]);
      if (text.length >= 40 && text.length <= 1000) {
        description = text;
        descSource = "p";
        break;
      }
    }
  }

  description = description ? description.slice(0, 2000) : null;

  // 3. Price and Currency Extraction
  let price: string | null = null;
  let currency = "MAD";
  let priceSource = "";

  if (jsonLd?.offers) {
    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    if (offer && offer.price !== undefined) {
      price = String(offer.price).trim();
      if (offer.priceCurrency) {
        currency = String(offer.priceCurrency).trim().toUpperCase();
      }
      priceSource = "json-ld";
    }
  }

  if (!price) {
    const metaPrice = getMeta("product:price:amount", "og:price:amount");
    if (metaPrice) {
      price = metaPrice;
      const metaCurr = getMeta("product:price:currency", "og:price:currency");
      if (metaCurr) {
        currency = metaCurr.toUpperCase();
      }
      priceSource = "meta";
    }
  }

  if (!price) {
    // Regex Moroccan price pattern in visible HTML text: e.g. "199 DH", "250.00 MAD", "150 Dhs", "299درهم"
    const moroccoPriceRegex = /(\b\d{1,5}(?:[.,]\d{1,2})?)\s*(?:DH|MAD|Dhs|درهم)/i;
    const match = moroccoPriceRegex.exec(html);
    if (match) {
      price = match[1].replace(",", ".");
      currency = "MAD";
      priceSource = "regex-morocco";
    }
  }

  if (price) {
    price = price.slice(0, 50);
  }

  // 4. Brand Extraction
  let brand: string | null = null;
  if (jsonLd?.brand) {
    brand = typeof jsonLd.brand === "object" && jsonLd.brand.name ? String(jsonLd.brand.name) : String(jsonLd.brand);
  }
  if (!brand) {
    brand = getMeta("product:brand", "og:site_name");
  }
  brand = brand ? stripHtml(brand).slice(0, 100) : null;

  // 5. Preserved Image Candidates
  const imageCandidates: string[] = [];

  // From JSON-LD
  if (jsonLd?.image) {
    const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    for (const img of images) {
      const url = typeof img === "object" && img !== null ? img.url : img;
      if (typeof url === "string") {
        const resolved = resolveUrl(url, pageUrl);
        if (resolved) imageCandidates.push(resolved);
      }
    }
  }

  // From OpenGraph
  for (const tag of ["og:image", "og:image:secure_url", "twitter:image"]) {
    const metaImg = getMeta(tag);
    if (metaImg) {
      const resolved = resolveUrl(metaImg, pageUrl);
      if (resolved) imageCandidates.push(resolved);
    }
  }

  // From <img> tags with high resolution / product clues
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    const resolved = resolveUrl(src, pageUrl);
    if (!resolved) continue;

    const lower = resolved.toLowerCase();
    // Exclude icons, trackers, tiny badges
    if (
      lower.includes("favicon") ||
      lower.includes("logo") ||
      lower.includes(".svg") ||
      lower.includes("icon") ||
      lower.includes("pixel") ||
      lower.includes("avatar")
    ) {
      continue;
    }
    imageCandidates.push(resolved);
  }

  // Deduplicate image URLs and keep top 8
  const uniqueImages = Array.from(new Set(imageCandidates)).slice(0, 8);

  // 6. Key Features / Benefits Extraction
  const features: string[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;

  while ((liMatch = liRegex.exec(html)) !== null) {
    const text = stripHtml(liMatch[1]);
    // Filter for concise bullet points that sound like product features
    if (text.length >= 12 && text.length <= 250) {
      // Exclude navigation/cookie/policy items
      const lower = text.toLowerCase();
      if (
        !lower.includes("cookie") &&
        !lower.includes("privacy") &&
        !lower.includes("shipping policy") &&
        !lower.includes("terms of service") &&
        !lower.includes("all rights reserved") &&
        !lower.includes("search") &&
        !lower.includes("cart") &&
        !lower.includes("checkout") &&
        !lower.includes("login") &&
        !features.includes(text)
      ) {
        features.push(text);
        if (features.length >= 6) break;
      }
    }
  }

  return {
    title,
    description,
    price,
    currency,
    brand,
    features,
    imageUrls: uniqueImages,
    sourceUrl: pageUrl,
    rawEvidence: {
      titleSource,
      descSource,
      priceSource,
      imagesFound: uniqueImages.length,
      featuresFound: features.length,
      extractedAt: new Date().toISOString(),
    },
  };
}
