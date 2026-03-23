# Aurora.ai - Legal Intelligence Document Classifier

Aurora.ai is a high-performance, lightweight web application built to transform complex legal and financial documents into plain-language insights. It utilizes the Google Gemini API to analyze contracts, invoices, and resumes, immediately identifying high-risk clauses and summarizing obligations.

## 🚀 Features

- **Instant AI Document Analysis:** Upload PDFs, images, or raw text to instantly receive a structured risk assessment, clause breakdown, and plain language summary.
- **Context-Aware Global Chatbot:** A voice-integrated AI assistant that follows you across the application and knows exactly which documents you have stored in your library.
- **Smart Risk Detection:** Automatically categorizes analyzing documents into `LOW` or `HIGH` risk, dynamically highlighting problematic clauses in red.
- **Native Voice Integration:** Speak directly to the AI Assistant using your system microphone, and listen as the system reads the document analysis back to you using Text-To-Speech (TTS).
- **n8n Automation Webhooks:** Conditionally identifies financial or time-sensitive documents (like Invoices and Agreements) and securely forwards their structured analysis to an n8n webhook for downstream workflow automation.
- **Document Library:** A persistent local storage dashboard grid that organizes all your previously uploaded legal documents.

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    classDef frontend fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef ai fill:#a855f7,stroke:#7e22ce,stroke-width:2px,color:#fff;
    classDef external fill:#f97316,stroke:#b45309,stroke-width:2px,color:#fff;

    UI[Client Browser<br/>Vanilla JS/HTML/CSS]:::frontend

    subnode Backend Services
        API_C[/api/classify]:::backend
        API_GC[/api/global-chat]:::backend
        API_DC[/api/chat]:::backend
        API_N8N[/api/n8n-trigger]:::backend
    endsubnode
    
    UI -->|1. Upload Document| API_C
    UI -->|2. Contextual Query + Voice| API_GC
    UI -->|3. Query active document| API_DC
    UI -->|4. Push to Workflow| API_N8N
    
    API_C --> GEMINI[(Google Gemini API)]:::ai
    API_GC --> GEMINI
    API_DC --> GEMINI
    
    GEMINI -->|Returns Structured JSON| Backend_Services
    
    API_N8N --> N8N[n8n Instance / Make.com]:::external
```

---

## 🔄 Workflow

1. **Upload & Analysis Flow**
   - The user selects or drags and drops a document onto the dashboard.
   - The frontend pushes the file stream (`multipart/form-data`) to the Fastify backend via the `/api/classify` route.
   - Fastify extracts text (or forwards the image byte-stream) and generates an engineered instruction prompt, passing it directly to the Google Gemini AI (`gemini-2.5-flash`).
   - Gemini responds with a structured schema detailing: `documentType`, `summary`, `risks`, and `clauses`.
   - If the risk indicates a liability, the system flags the document as **HIGH RISK**.
   - The UI natively speaks the outcome utilizing `SpeechSynthesisUtterance`.

2. **Global Integration Flow**
   - The chat interface continuously monitors the state of your Document Library in LocalBrowser Storage.
   - When communicating with the Global `/api/global-chat` endpoint, the system attaches your library metadata state as a context array.
   - This ensures the AI accurately grounds its responses in reality ("What documents do I have?").

3. **Automation Webhook Flow**
   - When a document features financial triggers (like an Invoice or Payment Receipt), the UI exposes an automation button.
   - Hitting this routes the structured JSON parameters to an `n8n` webhook via `/api/n8n-trigger`.

---

## 🛠️ Tech Stack
- **Frontend:** Vanilla HTML5, CSS3 (No framework runtime required for maximum speed), JavaScript.
- **Backend Application:** Node.js powered by **Fastify** (TypeScript).
- **Core AI Integration:** `@google/generative-ai` SDK.
- **Microservices:** Designed dynamically to offload heavy lifting workflows down the line to external automation systems.

## 📦 Local Iteration

To launch the project locally:
1. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY` and optionally an `N8N_WEBHOOK_URL`.
2. Run `npm install` to grab dependencies.
3. Run `npm run dev` to start the live-reload `tsx` node server.
4. Navigate to `http://localhost:3000`.
