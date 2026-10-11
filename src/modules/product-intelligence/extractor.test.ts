import { describe, expect, it } from "vitest";
import { extractProductMetadata, stripHtml, decodeHtmlEntities } from "./extractor";

describe("extractor", () => {
  it("decodes HTML entities and strips tags", () => {
    expect(decodeHtmlEntities("&amp; &quot; &#39; &#x2F;")).toBe("& \" ' /");
    expect(stripHtml("<p>Hello <strong>World</strong> &amp; friends</p>")).toBe("Hello World & friends");
  });

  it("extracts product details from JSON-LD schema", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": "Huile d'Argan Bio Pure",
              "description": "Huile végétale 100% pure et biologique du Maroc.",
              "brand": { "@type": "Brand", "name": "Atlas Naturals" },
              "offers": {
                "@type": "Offer",
                "price": "180.00",
                "priceCurrency": "MAD"
              },
              "image": "https://example.com/argan.jpg"
            }
          </script>
        </head>
        <body>
          <ul>
            <li>100% pure et pressée à froid</li>
            <li>Riche en vitamine E et acides gras</li>
          </ul>
        </body>
      </html>
    `;

    const data = extractProductMetadata(html, "https://example.com/product");
    expect(data.title).toBe("Huile d'Argan Bio Pure");
    expect(data.description).toContain("100% pure et biologique");
    expect(data.brand).toBe("Atlas Naturals");
    expect(data.price).toBe("180.00");
    expect(data.currency).toBe("MAD");
    expect(data.imageUrls).toContain("https://example.com/argan.jpg");
    expect(data.features.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts Moroccan dirham pricing from raw HTML text when JSON-LD is absent", () => {
    const html = `
      <html>
        <head><title>Stickers Dino - Kids Store</title></head>
        <body>
          <h1>Stickers Muraux Dinosaures</h1>
          <div class="price">199 DH</div>
          <p>Superbes autocollants pour décorer la chambre de votre enfant avec des dinosaures colorés.</p>
        </body>
      </html>
    `;

    const data = extractProductMetadata(html, "https://example.com/dino");
    expect(data.title).toBe("Stickers Muraux Dinosaures");
    expect(data.price).toBe("199");
    expect(data.currency).toBe("MAD");
  });
});
