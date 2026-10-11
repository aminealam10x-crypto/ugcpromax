import { z } from "zod";

export const extractProductInputSchema = z.object({
  url: z.string().url().max(2048).optional(),
});

export type ExtractProductInput = z.infer<typeof extractProductInputSchema>;

export const updateProductBriefInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Product title cannot be blank.")
    .max(200, "Product title cannot exceed 200 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters.")
    .optional()
    .nullable(),
  price: z
    .string()
    .trim()
    .max(50, "Price cannot exceed 50 characters.")
    .optional()
    .nullable(),
  currency: z.string().trim().max(10).default("MAD"),
  brand: z
    .string()
    .trim()
    .max(100, "Brand cannot exceed 100 characters.")
    .optional()
    .nullable(),
  features: z
    .array(z.string().trim().min(1).max(300))
    .max(10, "Cannot specify more than 10 key features.")
    .default([]),
  imageUrls: z
    .array(z.string().url().max(2048))
    .max(12, "Cannot keep more than 12 product images.")
    .default([]),
  status: z.enum(["extracted", "reviewed"]).default("reviewed"),
});

export type UpdateProductBriefInput = z.infer<typeof updateProductBriefInputSchema>;

export interface ProductBrief {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  brand: string | null;
  features: string[];
  imageUrls: string[];
  sourceUrl: string;
  status: "extracted" | "reviewed";
  rawEvidence: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProductBrief {
  projectId: string;
  title: string;
  description?: string | null;
  price?: string | null;
  currency?: string;
  brand?: string | null;
  features: string[];
  imageUrls: string[];
  sourceUrl: string;
  status?: "extracted" | "reviewed";
  rawEvidence?: Record<string, unknown> | null;
}
