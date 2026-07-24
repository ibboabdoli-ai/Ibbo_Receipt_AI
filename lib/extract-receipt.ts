import OpenAI from "openai";

export type ReceiptExtraction = {
  documentType: string;
  date: string;
  dueDate: string | null;
  merchant: string;
  amount: number | null;
  netAmount: number | null;
  currency: string;
  category: string;
  expenseType: string;
  vatAmount: number | null;
  vatRate: number | null;
  vatCountry: string | null;
  paymentMethod: string;
  invoiceNumber: string | null;
  supplierOrgNumber: string | null;
  supplierVatNumber: string | null;
  ocrReference: string | null;
  accountCode: string | null;
  confidence: number;
  notes: string;
};

const fallbackExtraction: ReceiptExtraction = {
  documentType: "receipt",
  date: new Date().toISOString().slice(0, 10),
  dueDate: null,
  merchant: "Uploaded receipt",
  amount: 0,
  netAmount: null,
  currency: "SEK",
  category: "Unknown",
  expenseType: "unknown",
  vatAmount: null,
  vatRate: null,
  vatCountry: null,
  paymentMethod: "",
  invoiceNumber: null,
  supplierOrgNumber: null,
  supplierVatNumber: null,
  ocrReference: null,
  accountCode: null,
  confidence: 0,
  notes:
    "AI extraction did not return usable receipt data. Receipt saved for manual review.",
};

const extractionPrompt = `Extract bookkeeping data from this receipt, invoice, or faktura.
Return only valid JSON with these keys:
document_type, date, due_date, merchant, amount, net_amount, currency,
category, expense_type, vat_amount, vat_rate, vat_country, payment_method,
invoice_number, supplier_org_number, supplier_vat_number, ocr_reference,
account_code, confidence, notes.

Rules:
- Read the document carefully and do not invent values.
- document_type must be receipt, invoice, credit_note, or unknown.
- merchant is the supplier/vendor/seller, never the bill-to customer.
- amount is the final gross total, total due, or amount paid.
- net_amount is the amount excluding VAT when explicitly shown or safely derivable.
- date is the purchase date or invoice issue date in YYYY-MM-DD.
- due_date is the payment due date in YYYY-MM-DD, otherwise null.
- VAT values must come from the document. vat_rate is a number such as 25, 12, or 6.
- currency must match the document. Use SEK only if unclear.
- category must be one of: Food, Restaurant, Car, Health, Tools, Home, Software, Office, Travel, Business, Private, Unknown.
- expense_type must be business, private, or unknown.
- Software, SaaS, AI tools, OpenAI, Anthropic, Google, Microsoft, hosting, and developer services are usually business/Software.
- account_code may contain a suggested Swedish BAS expense account only when obvious; otherwise null.
- confidence must be 0-100.
- notes should briefly record useful context, not repeat every field.`;

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function cleanNumber(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function cleanConfidence(value: unknown) {
  const parsed = cleanNumber(value, 0) ?? 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeExtraction(value: Record<string, unknown>): ReceiptExtraction {
  const documentType = cleanText(
    value.document_type ?? value.documentType,
    "receipt",
  ).toLowerCase();

  return {
    documentType: ["receipt", "invoice", "credit_note", "unknown"].includes(
      documentType,
    )
      ? documentType
      : "unknown",
    date: cleanText(value.date, fallbackExtraction.date),
    dueDate: cleanNullableText(value.due_date ?? value.dueDate),
    merchant: cleanText(value.merchant, fallbackExtraction.merchant),
    amount: cleanNumber(value.amount, 0),
    netAmount: cleanNumber(value.net_amount ?? value.netAmount, null),
    currency: cleanText(value.currency, "SEK").toUpperCase(),
    category: cleanText(value.category, "Unknown"),
    expenseType: cleanText(
      value.expense_type ?? value.expenseType,
      "unknown",
    ).toLowerCase(),
    vatAmount: cleanNumber(value.vat_amount ?? value.vatAmount, null),
    vatRate: cleanNumber(value.vat_rate ?? value.vatRate, null),
    vatCountry: cleanNullableText(value.vat_country ?? value.vatCountry),
    paymentMethod: cleanText(
      value.payment_method ?? value.paymentMethod,
      "",
    ),
    invoiceNumber: cleanNullableText(
      value.invoice_number ?? value.invoiceNumber,
    ),
    supplierOrgNumber: cleanNullableText(
      value.supplier_org_number ?? value.supplierOrgNumber,
    ),
    supplierVatNumber: cleanNullableText(
      value.supplier_vat_number ?? value.supplierVatNumber,
    ),
    ocrReference: cleanNullableText(
      value.ocr_reference ?? value.ocrReference,
    ),
    accountCode: cleanNullableText(
      value.account_code ?? value.accountCode,
    ),
    confidence: cleanConfidence(value.confidence),
    notes: cleanText(value.notes, "Extracted by OpenAI."),
  };
}

async function extractWithResponses(
  openai: OpenAI,
  input: {
    fileBase64: string;
    mimeType: string;
    fileName: string;
  },
) {
  const fileContent =
    input.mimeType === "application/pdf"
      ? {
          type: "input_file",
          filename: input.fileName || "receipt.pdf",
          file_data: input.fileBase64,
        }
      : {
          type: "input_image",
          image_url: `data:${input.mimeType};base64,${input.fileBase64}`,
          detail: "high",
        };

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0,
    max_output_tokens: 1200,
    text: {
      format: {
        type: "json_object",
      },
    },
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: extractionPrompt,
          },
          fileContent,
        ],
      },
    ],
  } as never);

  return response.output_text;
}

async function extractImageWithChatCompletions(
  openai: OpenAI,
  input: {
    fileBase64: string;
    mimeType: string;
  },
) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: extractionPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.mimeType};base64,${input.fileBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content || "";
}

export async function extractReceiptFromFile(input: {
  fileBase64: string;
  mimeType: string;
  fileName: string;
}): Promise<ReceiptExtraction> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...fallbackExtraction,
      notes: "OPENAI_API_KEY is missing. Receipt saved for manual review.",
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const outputText = await extractWithResponses(openai, input);
    if (!outputText) return fallbackExtraction;
    return normalizeExtraction(
      JSON.parse(outputText) as Record<string, unknown>,
    );
  } catch (responsesError) {
    console.error("Responses API receipt extraction failed", responsesError);

    if (input.mimeType.startsWith("image/")) {
      try {
        const outputText = await extractImageWithChatCompletions(openai, input);
        if (!outputText) return fallbackExtraction;
        return normalizeExtraction(
          JSON.parse(outputText) as Record<string, unknown>,
        );
      } catch (chatError) {
        console.error("Chat Completions extraction fallback failed", chatError);
      }
    }

    return {
      ...fallbackExtraction,
      notes:
        "AI extraction failed. The document was saved for manual review.",
    };
  }
}

export async function extractReceiptFromImage(input: {
  imageBase64: string;
  mimeType: string;
}) {
  return extractReceiptFromFile({
    fileBase64: input.imageBase64,
    mimeType: input.mimeType,
    fileName: "receipt-image",
  });
}
