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

const extractionPrompt = `Extract data from this receipt, invoice, or faktura image.
Return only valid JSON with these keys: date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, notes.

Rules:
- If the document is an invoice/faktura, merchant must be the supplier/vendor/seller, not the bill-to customer.
- For invoices, amount must be Total, Total due, or Amount due. Do not use unit price or subtotal if a total/amount due exists.
- For invoices, date must be Date of issue or invoice date. Do not use the service period as the invoice date.
- VAT must be the explicit VAT/tax amount if shown.
- Currency must match the document symbol or code, for example EUR for €, SEK for kr/SEK, USD for $.
- Use SEK only if currency is unclear.
- Use ISO date YYYY-MM-DD if possible.
- For software subscriptions, AI tools, SaaS, Claude, OpenAI, Anthropic, Google, Microsoft, or similar services, category should be Software and expense_type should usually be business.
- category must be one of: Food, Restaurant, Car, Health, Tools, Home, Software, Office, Travel, Business, Private, Unknown.
- expense_type must be business, private, or unknown.
- confidence must be 0-100.
- notes should include important invoice/receipt context such as invoice number, period, or VAT rate if visible.`;

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
  return {
    date: cleanText(value.date, fallbackExtraction.date),
    merchant: cleanText(value.merchant, fallbackExtraction.merchant),
    amount: cleanNumber(value.amount, 0),
    currency: cleanText(value.currency, "SEK").toUpperCase(),
    category: cleanText(value.category, "Unknown"),
    expenseType: cleanText(value.expense_type ?? value.expenseType, "unknown"),
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

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extractionPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const outputText = completion.choices[0]?.message?.content;

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
