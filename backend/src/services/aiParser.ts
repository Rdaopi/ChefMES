// src/services/aiParser.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Define interfaces for better type safety
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

// Using 2.5-flash-lite for speed and cost-efficiency
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: { 
    responseMimeType: "application/json",
    temperature: 0.1, 
  } 
});

export const normalizeInvoiceLinesWithAI = async (lines: InvoiceLine[], supplier: string): Promise<AIResult> => {
  if (!lines.length) return { cleanSupplier: supplier, items: [] };

  if (!API_KEY) {
    return {
      cleanSupplier: supplier,
      items: lines.map(l => ({ 
        original_desc: l.description, 
        standard_name: l.description, 
        category: "Other",
        standard_uom: "PZ",
        conversion_factor: 1
      }))
    };
  }

 
  const inputData = lines.map(l => ({
    desc: l.description,
    invoice_unit: l.unit || "PZ"
  }));
  
  const prompt = `
    Context: You are a strict data structurer for a restaurant's food cost database.
    Task 1: Clean the supplier name "${supplier}" by removing legal entities (SPA, SRL, SNC) and standardizing to Title Case (e.g., "MARR S.P.A." -> "Marr").
    Task 2: Analyze the following invoice items. Extract the base ingredient and calculate how to convert the invoice unit into a standard cooking unit.

    CRITICAL RULES:
    1. "standard_name": Only the pure culinary ingredient in Title Case (e.g., "Tonno Rosso"). Remove weights, packaging, brands.
    2. "category": Must strictly be one of: Meat, Fish, Vegetables, Dairy, Pantry, Beverages, Other.
    3. "standard_uom": MUST be strictly one of: "KG" (for weight), "L" (for volume), or "PZ" (for indivisible pieces like eggs).
    4. "conversion_factor": How many standard_uom are in 1 invoice_unit? 
       - Ex A: Desc: "FARINA 25KG", Inv_Unit: "PZ" -> Factor is 25, UOM is "KG".
       - Ex B: Desc: "LATTE INTERO 1L", Inv_Unit: "CT" (Carton of 6) -> Factor is 6, UOM is "L".
       - Ex C: Desc: "CARNE", Inv_Unit: "KG" -> Factor is 1, UOM is "KG".
    
    Input items to analyze: ${JSON.stringify(inputData)}
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "clean_supplier": "Clean Supplier Name",
      "normalized": [ 
        { 
          "original_desc": "exact input desc", 
          "standard_name": "Clean Name", 
          "category": "Category Name",
          "standard_uom": "KG",
          "conversion_factor": 1.5
        } 
      ] 
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const parsed = JSON.parse(text);
    return {
      cleanSupplier: parsed.clean_supplier || supplier,
      items: parsed.normalized || []
    };

  } catch (error) {
    console.error("Gemini AI Error:", error);
    
    return {
      cleanSupplier: supplier,
      items: lines.map(l => ({ 
        original_desc: l.description, 
        standard_name: l.description, 
        category: "Other",
        standard_uom: "PZ",
        conversion_factor: 1
      }))
    };
  }
};