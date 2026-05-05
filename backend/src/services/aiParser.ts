// src/services/aiParser.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

interface InvoiceLine {
  description: string;
  unit?: string;
  [key: string]: any;
}

interface NormalizedLine {
  original_desc: string;
  standard_name: string;
  category: string;
  standard_uom: string;
  conversion_factor: number;
  pieces_per_invoice_unit?: number;
  capacity_per_piece?: number;
}

interface AIResult {
  cleanSupplier: string;
  items: NormalizedLine[];
}

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.1,
  }
});

function recomputeAndValidate(items: NormalizedLine[]): NormalizedLine[] {
  const VALID_UOMS = new Set(["KG", "L", "PZ"]);
  const VALID_CATEGORIES = new Set(["Meat", "Fish", "Vegetables", "Dairy", "Pantry", "Beverages", "Other"]);

  return items.map((item, i) => {
    const pieces = item.pieces_per_invoice_unit ?? 1;
    const capacity = item.capacity_per_piece ?? 1;
    const recomputed = parseFloat((pieces * capacity).toFixed(4));

    if (item.conversion_factor !== recomputed) {
      console.warn(
        `[row ${i}] Factor mismatch on "${item.original_desc}": ` +
        `model said ${item.conversion_factor}, recomputed ${recomputed}. Using recomputed.`
      );
    }

    const uom = VALID_UOMS.has(item.standard_uom) ? item.standard_uom : "PZ";
    const category = VALID_CATEGORIES.has(item.category) ? item.category : "Other";
    const recomputedFactor = recomputed > 0 ? recomputed : 1;

    return {
      ...item,
      standard_uom: uom,
      category,
      conversion_factor: recomputedFactor,
    };
  });
}

async function callWithRetry(prompt: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = 1000 * (attempt + 1);
      console.warn(`Gemini attempt ${attempt + 1} failed, retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error("unreachable");
}

function fallback(lines: InvoiceLine[], supplier: string): AIResult {
  return {
    cleanSupplier: supplier,
    items: lines.map(l => ({
      original_desc: l.description,
      standard_name: l.description,
      category: "Other",
      standard_uom: "PZ",
      pieces_per_invoice_unit: 1,
      capacity_per_piece: 1,
      conversion_factor: 1,
    })),
  };
}

export const normalizeInvoiceLinesWithAI = async (
  lines: InvoiceLine[],
  supplier: string
): Promise<AIResult> => {
  if (!lines.length) return { cleanSupplier: supplier, items: [] };
  if (!API_KEY) return fallback(lines, supplier);

  const inputData = lines.map(l => ({
    desc: l.description,
    invoice_unit: l.unit || "PZ"
  }));

  const prompt = `
Act as an Expert Food Cost Auditor for the Italian restaurant industry.
Your goal is to transform raw invoice descriptions into clean, structured data for a SQL database.

=== TASK 1: CLEAN SUPPLIER NAME ===
- Input: "${supplier}"
- Action: Remove legal suffixes (S.R.L., S.P.A., SNC, etc.), trim punctuation, use Title Case.

=== TASK 2: NORMALIZE EACH LINE ===

For each item output:
- "original_desc": EXACT copy of the input desc, character for character
- "standard_name": Clean culinary name in Italian Title Case. 
  RULES for standard_name:
  - Remove brand codes, packaging info, legal suffixes
  - NEVER include volume, size, weight or capacity (no "0.75", "0.33", "500g", "1L")
  - NEVER include invoice unit codes (no "CT", "CS", "BT")
  - Keep the product identity only: "San Benedetto Gas", "Coca Cola", "Valfrutta Pera Italiana"
  - For admin/fee lines (Rif., Bolli, Cauzioni, Spese, Dest.) use a short clean label
- "category": MUST be exactly one of: Meat | Fish | Vegetables | Dairy | Pantry | Beverages | Other
  - Beverages: water, wine, beer, spirits, juices, soft drinks
  - Pantry: flour, oil, vinegar, salt, pasta, rice, coffee, capsules, chocolate, sugar, condiments, packaging
  - Dairy: cheese, butter, cream, milk
  - Other: fees, deposits, stamps, delivery references, admin lines
- "standard_uom": MUST be exactly one of: "KG" | "L" | "PZ"
  - "L" for all liquids (water, wine, soda, oil, juice, milk, vinegar)
  - "KG" for all solids (meat, flour, cheese, veg, coffee by weight)
  - "PZ" ONLY for eggs, coffee capsules, or admin/fee lines
- "pieces_per_invoice_unit": integer — how many physical pieces in 1 invoice unit
- "capacity_per_piece": number — KG or L of a single piece (use 1 for PZ items)
- "conversion_factor": MUST equal pieces_per_invoice_unit × capacity_per_piece exactly

=== UNIT REFERENCE TABLE ===
Single-item units → pieces_per_invoice_unit = 1:
  KG, LT, L  → capacity_per_piece = 1 (already standard)
  N., PZ, ea, NR → one piece, read size from description
  BT → one bottle, read volume from description

Multi-unit containers:
  CS (Cassa) → 6 bottles/packs default for water/wine/beverages
  CT (Cartone):
    - capsules/pods: read explicit count from desc (X100=100, X50=50) → uom PZ
    - beverages 0.33L or smaller: 24 units
    - juice bricks 0.20L: 24 units
    - larger bottles >0.5L: 6 units

=== SIZE EXTRACTION ===
Italian 3-digit codes = litres: "075"=0.75L, "050"=0.5L, "033"=0.33L, "020"=0.2L
Explicit weight: "500 g"=0.5kg, "1 kg"=1kg, "700 g"=0.7kg, "720 g"=0.72kg
Explicit volume: "500ml"=0.5L, "75 cl"=0.75L, "1 L"=1L
Multi-pack in desc: "12X1 kg" → pieces=12, capacity=1

=== ADMIN / FEE LINES ===
Descriptions matching: "Rif.", "Bolli", "Cauzioni", "Spese", "Dest.", or any line with unit_price=0
→ category="Other", standard_uom="PZ", pieces_per_invoice_unit=1, capacity_per_piece=1, conversion_factor=1

=== WORKED EXAMPLES ===
desc:"FIOR DI SALE FINO 12X1 kg", unit:"N."  → pieces:12,  cap:1,    factor:12,   uom:KG, name:"Fior Di Sale Fino"
desc:"MOUSSE C.D'OR CACAO 720 g", unit:"N."  → pieces:1,   cap:0.72, factor:0.72, uom:KG, name:"Mousse Cacao"
desc:"PORTO RUBY SANDEMAN 75 cl",  unit:"N." → pieces:1,   cap:0.75, factor:0.75, uom:L,  name:"Porto Ruby Sandeman"
desc:"PANNA CULINAIRE ORIG.DEBIC 1 L", unit:"N." → pieces:1, cap:1, factor:1,    uom:L,  name:"Panna Culinaire"
desc:"TOMMASI BIANCO CUSTOZA 075 DOC", unit:"BT" → pieces:1, cap:0.75, factor:0.75, uom:L, name:"Tommasi Bianco Custoza"
desc:"S.BENED. GAS 075 VAR PRESTIGE", unit:"CS"  → pieces:6, cap:0.75, factor:4.5, uom:L,  name:"San Benedetto Gas"
desc:"S.BENED. NAT 050 VAR PRESTIGE", unit:"CS"  → pieces:6, cap:0.5,  factor:3,   uom:L,  name:"San Benedetto Naturale"
desc:"COCA COLA 033",               unit:"CT"    → pieces:24, cap:0.33, factor:7.92, uom:L, name:"Coca Cola"
desc:"VALFRUTTA ARANCIA ITALIANA 020", unit:"CT" → pieces:24, cap:0.2,  factor:4.8, uom:L,  name:"Valfrutta Arancia Italiana"
desc:"LAVAZZA DECAFF BLUE X100 CAPS",  unit:"CT" → pieces:100, cap:1,  factor:100, uom:PZ, name:"Lavazza Decaffeinato Blue"
desc:"LAVAZZA ORZOBLUE X50 CAPSULE",   unit:"CT" → pieces:50,  cap:1,  factor:50,  uom:PZ, name:"Lavazza Orzo Blue"
desc:"Spese incasso",               unit:"ea"    → pieces:1,  cap:1,  factor:1,   uom:PZ, name:"Spese Incasso"
desc:"Bolli",                       unit:"ea"    → pieces:1,  cap:1,  factor:1,   uom:PZ, name:"Bolli"

=== INPUT DATA ===
${JSON.stringify(inputData, null, 2)}

=== OUTPUT FORMAT (STRICT JSON ONLY, NO MARKDOWN) ===
{
  "clean_supplier": "Clean Name",
  "normalized": [
    {
      "original_desc": "EXACT COPY FROM INPUT",
      "standard_name": "Clean Name Without Size",
      "category": "Beverages",
      "standard_uom": "L",
      "pieces_per_invoice_unit": 6,
      "capacity_per_piece": 0.75,
      "conversion_factor": 4.5
    }
  ]
}
Array length MUST equal input length. Same order. No extra fields.
`;

  try {
    const text = await callWithRetry(prompt);
    const parsed = JSON.parse(text);

    const rawItems: NormalizedLine[] = parsed.normalized || [];

    if (rawItems.length !== lines.length) {
      console.error(`AI length mismatch: sent ${lines.length}, got ${rawItems.length}. Falling back.`);
      return fallback(lines, supplier);
    }

    return {
      cleanSupplier: parsed.clean_supplier || supplier,
      items: recomputeAndValidate(rawItems),
    };
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return fallback(lines, supplier);
  }
};