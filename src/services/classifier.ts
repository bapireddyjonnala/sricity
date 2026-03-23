import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

let parser: any = null;

export const documentMemory = new Map<string, { text: string; imagePart?: any }>();

export async function globalChat(question: string, docContext?: any[]) {
  let contextStr = "DATABASE_STATE: EMPTY_LIBRARY";
  if (docContext && docContext.length > 0) {
     contextStr = `DATABASE_STATE: DOCUMENTS_FOUND\nDoc List:\n` + 
                  docContext.map(d => `- ${d.name} (Risk: ${d.riskLevel})`).join('\n');
  }

  const systemPrompt = `You are Aurora.ai, an elite Legal Intelligence Assistant.
Listen to these rules and never break them:
1. NEVER tell the user to navigate to "My Documents", a "left-hand menu", or any dashboard section.
2. NEVER claim you do not have access to their documents. You have full systemic access.

Read the following database extract:
---
${contextStr}
---

If the DATABASE_STATE is EMPTY_LIBRARY, reply EXACTLY with: "I checked your library and you currently have no analyzed documents stored. Once you analyze a document, I will remember it here!"
If the DATABASE_STATE is DOCUMENTS_FOUND, explicitly read back the 'Doc List' provided to answer their query.

User Question: ${question}
Aurora Response:`;

  const result = await model.generateContent([systemPrompt]);
  return result.response.text();
}

export async function chatWithDocument(docId: string, question: string) {
  const docMeta = documentMemory.get(docId);
  if (!docMeta) throw new Error('Document session expired or not found.');

  const promptParts: any[] = [];
  const systemPrompt = `You are a professional Legal AI Assistant. Answer the user's question accurately based ONLY on the following document context. Keep your response helpful, concise, and use standard plain language. Do NOT format your response as a raw JSON array; use readable paragraphs or bullet points.
  
Context Text:
---
${docMeta.text ? docMeta.text.substring(0, 15000) : "No text extracted (pure image)."}
---

User Question: ${question}
Assistant Answer:`;

  promptParts.push(systemPrompt);
  if (docMeta.imagePart) {
      promptParts.push(docMeta.imagePart);
  }

  const result = await model.generateContent(promptParts);
  return result.response.text();
}

export async function processDocument(filePath: string) {
  const startTime = Date.now();

  if (!parser) {
    const { LiteParse } = await import('../../../../dist/src/lib.js');
    parser = new LiteParse();
  }

  try {
    // 1. Extract text using LiteParse (graceful fallback)
    let textContent = '';
    try {
      const parsedData = await parser.parse(filePath);
      textContent = parsedData.text || '';
    } catch(err) {
      console.warn('LiteParse encountered an issue or document had no text natively.');
    }

    // Determine if it's a multimodal supported file (image or PDF)
    const isMultimodalFile = filePath.match(/\.(jpeg|jpg|png|webp|heic|pdf)$/i);

    if (!isMultimodalFile && (!textContent || textContent.trim() === '')) {
      throw new Error('Could not extract text from document and it is not a supported image/PDF format to fallback on.');
    }

    // 2. Classify with Gemini Multimodal Model
    const systemPrompt = `You are Aurora.ai, an elite Legal Document Intelligence agent. 
Analyze the provided document/image deeply. If it is a handwritten note, signature snippet, or just a small piece of text (like a name), accurately read the handwriting and categorize it accordingly (e.g., 'Handwritten Note', 'Signature Snippet').

Your tasks are:
1. Classification: Identify the exact document type (e.g., 'Master Services Agreement', 'NDA', 'Invoice', 'Employment Contract', 'Handwritten Note', 'Image Snippet').
2. Plain Language Summary: Describe what this document does in 2-3 clear sentences. If it's a name, state what it says.
3. Key Highlights: Extract 3 brief, actionable bullet points about the document context or status.
4. Key Clauses Extraction: Extract critical clauses, obligations, or terms. If none exist, you MUST return an empty array [] for the "clauses" field instead of writing a "No clauses" string.
5. Rigorous Risk Assessment: Detect any hidden liabilities or risks. If no major risks are identified, you MUST return an empty array [] for the "risks" field instead of writing a "No risks" string.

You must return ONLY a JSON response matching this exact structure:
{
  "category": "Document Type Here",
  "confidence": 95,
  "summary": "Plain language summary of the overall document",
  "highlights": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "clauses": [
    "OBLIGATION: Explanation of a key clause or requirement."
  ],
  "risks": [
    "HIGH RISK: Exact explanation of a severe liability, penalty, or red flag."
  ]
}

Extracted Text (if any):
---
${textContent.substring(0, 15000)}
---`;

    const promptParts: any[] = [systemPrompt];
    let imagePartForCache: any = null;

    // If it's an image or a scanned PDF without text, feed it directly into Gemini Vision!
    // For PDFs, we only do this if text extraction failed to save bandwidth/tokens.
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    if ((isMultimodalFile && !isPdf) || (isPdf && (!textContent || textContent.trim() === ''))) {
      const fileBuffer = await fs.readFile(filePath);
      let mimeType = 'image/jpeg';
      if (filePath.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      else if (filePath.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
      else if (isPdf) mimeType = 'application/pdf';
      
      const p = {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType
        }
      };
      promptParts.push(p);
      imagePartForCache = p; // Store for later
    }

    // Save context for Chat
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    documentMemory.set(docId, {
      text: textContent,
      imagePart: imagePartForCache
    });

    const result = await model.generateContent(promptParts);
    const responseText = result.response.text();
    
    let classification;
    try {
        classification = JSON.parse(responseText);
    } catch(e) {
        classification = { category: 'Unknown', confidence: 0, summary: "Could not parse document correctly.", clauses: [], risks: [] };
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      documentType: classification.category,
      confidenceScore: `${classification.confidence}%`,
      processingTime: `${processingTime} sec`,
      summary: classification.summary || "No summary available.",
      highlights: classification.highlights || [],
      clauses: classification.clauses || [],
      risks: classification.risks || [],
      chatId: docId
    };
  } finally {
     // Clean up temporary file
     try {
         await fs.unlink(filePath);
     } catch(e) { /* ignore cleanup error */ }
  }
}
