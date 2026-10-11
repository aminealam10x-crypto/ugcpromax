"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Tag,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductBrief } from "@/modules/product-intelligence/domain";

interface ProductBriefViewProps {
  projectId: string;
  productUrl: string | null;
  initialBrief: ProductBrief | null;
}

export function ProductBriefView({
  projectId,
  productUrl,
  initialBrief,
}: ProductBriefViewProps) {
  const router = useRouter();
  const [brief, setBrief] = useState<ProductBrief | null>(initialBrief);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable form state for brief
  const [title, setTitle] = useState(initialBrief?.title ?? "");
  const [brand, setBrand] = useState(initialBrief?.brand ?? "");
  const [price, setPrice] = useState(initialBrief?.price ?? "");
  const [currency, setCurrency] = useState(initialBrief?.currency ?? "MAD");
  const [description, setDescription] = useState(initialBrief?.description ?? "");
  const [features, setFeatures] = useState<string[]>(initialBrief?.features ?? []);
  const [newFeature, setNewFeature] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>(initialBrief?.imageUrls ?? []);

  async function handleExtract(customUrl?: string) {
    setIsExtracting(true);
    setError(null);
    setSuccessMessage(null);

    const targetUrl = customUrl || productUrl;
    if (!targetUrl) {
      setError("Please add and save a Product URL first.");
      setIsExtracting(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to extract product metadata.");
      }

      const extractedBrief: ProductBrief = result.data;
      setBrief(extractedBrief);
      setTitle(extractedBrief.title);
      setBrand(extractedBrief.brand ?? "");
      setPrice(extractedBrief.price ?? "");
      setCurrency(extractedBrief.currency ?? "MAD");
      setDescription(extractedBrief.description ?? "");
      setFeatures(extractedBrief.features ?? []);
      setSelectedImages(extractedBrief.imageUrls ?? []);
      setSuccessMessage("Product facts extracted successfully! Review and approve below.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during extraction.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSaveBrief(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        title: title.trim(),
        brand: brand.trim() || null,
        price: price.trim() || null,
        currency: currency.trim() || "MAD",
        description: description.trim() || null,
        features: features.map((f) => f.trim()).filter(Boolean),
        imageUrls: selectedImages,
        status: "reviewed" as const,
      };

      const response = await fetch(`/api/projects/${projectId}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save product brief.");
      }

      const updatedBrief: ProductBrief = result.data;
      setBrief(updatedBrief);
      setSuccessMessage("Product brief reviewed and approved!");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function addFeature() {
    if (!newFeature.trim()) return;
    if (features.length >= 10) {
      setError("Maximum 10 key features allowed.");
      return;
    }
    setFeatures([...features, newFeature.trim()]);
    setNewFeature("");
  }

  function removeFeature(index: number) {
    setFeatures(features.filter((_, i) => i !== index));
  }

  function toggleImage(url: string) {
    if (selectedImages.includes(url)) {
      setSelectedImages(selectedImages.filter((img) => img !== url));
    } else {
      if (selectedImages.length >= 12) {
        setError("Maximum 12 product images allowed.");
        return;
      }
      setSelectedImages([...selectedImages, url]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Extraction Banner / Action */}
      <div className="p-5 rounded-xl border border-[#2b273b] bg-gradient-to-r from-[#171522] to-[#121319]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="tiny-dot" />
              <span className="text-[11px] font-semibold tracking-wider text-[#b1a4db] uppercase">
                Phase 1 · Product Intelligence
              </span>
              {brief && (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded border ${
                    brief.status === "reviewed"
                      ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-400"
                      : "border-amber-700/60 bg-amber-950/40 text-amber-400"
                  }`}
                >
                  {brief.status === "reviewed" ? "Reviewed & Ready" : "Extracted · Needs Review"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8f8a9e] mt-1.5 max-w-xl">
              Extract verified facts, authentic images, and selling points directly from the product URL
              with anti-SSRF protection.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => handleExtract()}
            disabled={isExtracting || !productUrl}
            className="text-xs gap-2 shrink-0 bg-[#2b253b] hover:bg-[#362f4b] text-[#d6cbf5] border border-[#4c3f68]"
          >
            {isExtracting ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#a798ff]" />
                Extracting facts…
              </>
            ) : brief ? (
              <>
                <RefreshCw size={14} />
                Re-extract from URL
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Extract product facts
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-800/40 bg-red-950/20 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Extracted Brief Review Section */}
      {brief ? (
        <form onSubmit={handleSaveBrief} className="space-y-6">
          {/* Section 1: Preserved Original Product Images */}
          <div className="p-5 rounded-xl border border-[#26272f] bg-[#131419] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-[#a498ff]" />
                <h3 className="text-sm font-semibold text-[#f0ecf8]">Preserved product imagery</h3>
              </div>
              <span className="text-[11px] text-[#818090]">
                {selectedImages.length} selected of {brief.imageUrls.length} found
              </span>
            </div>
            <p className="text-[11px] text-[#7a7888]">
              Original images preserved from the store. Click images to toggle inclusion in creative references.
            </p>

            {brief.imageUrls.length === 0 ? (
              <p className="text-xs text-[#6e6c7c] italic py-3">No images detected on the product page.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {brief.imageUrls.map((imgUrl, idx) => {
                  const isSelected = selectedImages.includes(imgUrl);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleImage(imgUrl)}
                      className={`relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                        isSelected
                          ? "border-[#9187ff] ring-2 ring-[#9187ff]/30"
                          : "border-[#2b2b35] opacity-50 hover:opacity-80"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Product visual ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? "bg-[#9187ff] text-[#111020]" : "bg-[#1d1e26]/80 text-[#888]"
                        }`}
                      >
                        {isSelected ? "✓" : "+"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Product Core Facts */}
          <div className="p-5 rounded-xl border border-[#26272f] bg-[#131419] space-y-4">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-[#a498ff]" />
              <h3 className="text-sm font-semibold text-[#f0ecf8]">Product specifications</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field mb-0">
                <label htmlFor="brief-title">Product title</label>
                <Input
                  id="brief-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="field"
                />
              </div>

              <div className="form-field mb-0">
                <label htmlFor="brief-brand">Brand / Store</label>
                <Input
                  id="brief-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Bequest Morocco"
                  maxLength={100}
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field mb-0">
                <label htmlFor="brief-price">Price</label>
                <Input
                  id="brief-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 199"
                  maxLength={50}
                  className="field"
                />
              </div>

              <div className="form-field mb-0">
                <label htmlFor="brief-currency">Currency</label>
                <select
                  id="brief-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="field"
                >
                  <option value="MAD">MAD · Moroccan Dirham (درهم)</option>
                  <option value="EUR">EUR · Euro</option>
                  <option value="USD">USD · US Dollar</option>
                </select>
              </div>
            </div>

            <div className="form-field mb-0">
              <label htmlFor="brief-description">Product description</label>
              <textarea
                id="brief-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description from page..."
                maxLength={2000}
                className="field"
              />
            </div>
          </div>

          {/* Section 3: Extracted Selling Points & Features */}
          <div className="p-5 rounded-xl border border-[#26272f] bg-[#131419] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f0ecf8]">Key benefits & features</h3>
              <span className="text-[11px] text-[#818090]">{features.length}/10</span>
            </div>
            <p className="text-[11px] text-[#7a7888]">
              These claims will feed the Moroccan Darija script & angles generator in Phase 2.
            </p>

            <div className="space-y-2">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-[#2b2b35] bg-[#101116]"
                >
                  <span className="text-[10px] text-[#a498ff] font-mono shrink-0 w-5">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => {
                      const updated = [...features];
                      updated[idx] = e.target.value;
                      setFeatures(updated);
                    }}
                    className="flex-1 bg-transparent text-xs text-[#eeeaf6] border-none outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="text-[#726e7e] hover:text-red-400 p-1"
                    title="Remove feature"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Add another selling point or specification…"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                className="field text-xs"
              />
              <Button
                type="button"
                onClick={addFeature}
                disabled={!newFeature.trim() || features.length >= 10}
                className="text-xs shrink-0"
              >
                <Plus size={14} /> Add
              </Button>
            </div>
          </div>

          {/* Source Metadata & Save Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#252430]">
            <div className="text-[10px] text-[#787588] flex items-center gap-2">
              <span>Source URL:</span>
              <a
                href={brief.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#a498ff] hover:underline flex items-center gap-1 max-w-[280px] truncate"
              >
                {brief.sourceUrl}
                <ExternalLink size={10} />
              </a>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="text-xs gap-2 bg-[#9187ff] text-[#111020] hover:bg-[#a69eff]"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving brief…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Approve product brief
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-[#2d293d] bg-[#14141d]/50 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#232030] border border-[#352f48] flex items-center justify-center mx-auto text-[#a498ff]">
            <Sparkles size={18} />
          </div>
          <h4 className="text-sm font-medium text-[#eae5f5]">No product facts extracted yet</h4>
          <p className="text-xs text-[#827d92] max-w-md mx-auto">
            Click &ldquo;Extract product facts&rdquo; above to fetch product titles, pricing, Moroccan currency
            details, and authentic product photos from your saved URL.
          </p>
        </div>
      )}
    </div>
  );
}
