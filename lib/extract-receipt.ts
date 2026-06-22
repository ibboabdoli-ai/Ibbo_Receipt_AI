import OpenAI from "openai";

export type ReceiptExtraction = {
  date: string;
  merchant: string;
  amount: number | null;
  currency: string;
  category: string;
  expenseType: string;
  vatAmount: number | null;
  paymentMethod: string;
  confidence: number;
  notes: string;
};

const fallbackExtraction: ReceiptExtraction = {
  date: new Date().toISOString().slice(0, 10),
  merchant: "Uploaded receipt",
  amount: 0,
  currency: "SEK",
  category: "Unknown",
  expenseType: "unknown",
  vatAmount: null,
  paymentMethod: "",
  confidence: 0,
  notes: "AI extraction did not return usable receipt data. Receipt saved for manual review.",
};

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanNumber(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function cleanConfidence(value: unknown) {
  const parsed = cleanNumber(value, 0) ?? 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeExtraction(value: Record<string, unknown>): ReceiptExtraction {
  const category = cleanText(value.category, "Unknown");
  const expenseType = cleanText(value.expense_type ?? value.expenseType, "unknown");

  return {
    date: cleanText(value.date, fallbackExtraction.date),
    merchant: cleanText(value.merchant, fallbackExtraction.merchant),
    amount: cleanNumber(value.amount, 0),
    currency: cleanText(value.currency, "SEK").toUpperCase(),
    category,
    expenseType,
    vatAmount: cleanNumber(value.vat_amount ?? value.vatAmount, null),
    paymentMethod: cleanText(value.payment_method ?? value.paymentMethod, ""),
    confidence: cleanConfidence(value.confidence),
    notes: cleanText(value.notes, "Extracted by OpenAI vision."),
  };
}

export async function extractReceiptFromImage(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<ReceiptExtraction> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...fallbackExtraction,
      notes: "OPENAI_API_KEY is missing. Receipt saved for manual review.",
    };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract receipt data. Return JSON only. Use SEK if currency is unclear. Category must be one of: Food, Restaurant, Car, Health, Tools, Home, Software, Office, Travel, Business, Private, Unknown.",
            },
            {
              type: "input_image",
              image_url: `data:${input.mimeType};base64,${input.imageBase64}`,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: "string" },
              merchant: { type: "string" },
              amount: { type: ["number", "null"] },
              currency: { type: "string" },
              category: { type: "string" },
              expense_type: { type: "string" },
              vat_amount: { type: ["number", "null"] },
              payment_method: { type: "string" },
              confidence: { type: "number" },
              notes: { type: "string" },
            },
            required: [
              "date",
              "merchant",
              "amount",
              "currency",
              "category",
              "expense_type",
              "vat_amount",
              "payment_method",
              "confidence",
              "notes",
            ],
          },
        },
      },
    });

    const outputText = response.output_text;

    if (!outputText) {
      return fallbackExtraction;
    }

    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    return normalizeExtraction(parsed);
  } catch (error) {
    console.error("AI receipt extraction failed", error);

    return {
      ...fallbackExtraction,
      notes: "AI extraction failed. Receipt saved for manual review.",
    };
  }
}
