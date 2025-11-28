
# SecureMail AI - Technical Documentation & System Architecture

**Version:** 1.2.0-stable
**License:** MIT
**Stack:** React (Vite), TypeScript, TailwindCSS, Supabase, Google GenAI SDK

---

## Table of Contents

1.  [System Overview](#1-system-overview)
2.  [Architecture Design](#2-architecture-design)
3.  [Core Modules](#3-core-modules)
    *   [Email Management Engine](#31-email-management-engine)
    *   [Heuristic Classification System](#32-heuristic-classification-system)
    *   [AI Assistant Integration](#33-ai-assistant-integration)
    *   [Real-time Collaboration](#34-real-time-collaboration)
4.  [Security Protocol](#4-security-protocol)
5.  [Installation & Deployment](#5-installation--deployment)
6.  [Codebase Analysis (Deep Dive)](#6-codebase-analysis-deep-dive)
    *   [Data Layer (`services/`)](#61-data-layer)
    *   [UI Components (`components/`)](#62-ui-components)
    *   [State Management](#63-state-management)

---

  Environment Variables
  Configure the application via ConfigModal in the UI create .env file:
      VITE_SUPABASE_URL=https://ytvkqfrktofhyxvklfnq.supabase.co 
      VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dmtxZnJrdG9maHl4dmtsZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTkzNjAsImV4cCI6MjA3OTczNTM2MH0.zL_5SW2ryZkLTkJOelJp9crRpYaCYd0jsFJeefqMiZ4
      VITE_GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


# 1. System Overview

SecureMail AI is a next-generation email client designed to enhance productivity and security through a hybrid intelligence model. It integrates traditional email protocols (via Gmail API) with a local heuristic engine and a cloud-based Large Language Model (LLM) to categorize content, detect threats, and automate user interactions.

The system is built as a Single Page Application (SPA) focusing on:
*   **Zero-Latency Interactions:**  userOptimistic UI updates for immediate feedback.
*   **Privacy-First Processing:** Local evaluation of email headers and metadata before AI engagement.
*   **Contextual Assistance:** An embedded chatbot aware of the current view and email content.

# 2. Architecture Design

The application follows a **Client-Serverless** architecture.

```mermaid
graph TD
    Client[React Client] -->|OAuth2| Google[Gmail API]
    Client -->|REST/Realtime| DB[Supabase PostgreSQL]
    Client -->|WebSocket| LLM[Google Gemini API]
    
    subgraph Client_Side_Processing
        HE[Heuristic Engine]
        Sanitizer[DOM Sanitizer]
        State[React State / Context]
    end
    
    Google -->|Raw MIME| Client
    Client -->|Parsed Data| HE
    HE -->|Metadata + Labels| DB
```

### Key Components:
1.  **Ingestion Layer:** Handles OAuth tokens and fetches raw email data using batching strategies to respect API rate limits.
2.  **Processing Layer:** Runs in the browser main thread. It decodes MIME (Base64/Quoted-Printable), sanitizes HTML content to prevent XSS, and runs the classification algorithm.
3.  **Storage Layer:** Supabase is used for persisting user preferences, email metadata (for fast indexing), and chat session history.
4.  **Intelligence Layer:** A dual-layer AI system.
    *   *Layer 1 (Deterministic):* Regex and keyword-based filtering for speed.
    *   *Layer 2 (Probabilistic):* GenAI for complex reasoning, summarization, and natural language command execution.

# 3. Core Modules

## 3.1 Email Management Engine
Located primarily in `src/services/supabase.ts` and `src/components/EmailList.tsx`.

*   **Synchronization:** The `fetchGmailWithToken` function implements a sliding window strategy. It fetches emails in chunks (default 5) to prevent UI blocking.
*   **MIME Decoding:** Custom parsers (`decodeMimeHeader`, `decodeGmailBody`) handle various encoding standards (UTF-8, ISO-8859-1) and transfer encodings (Base64Url).
*   **Content Sanitization:** Before rendering, all email bodies pass through a regex-based stripper to remove `<script>`, `<iframe>`, and `on*` event attributes.

## 3.2 Heuristic Classification System
To minimize API costs and latency, emails are first classified locally.

*   **Algorithm:** Weighted Keyword Matching.
*   **Implementation:** `classifyHeuristicInternal` in `supabase.ts`.
*   **Logic:**
    1.  Concatenate `Subject` + `Sender` + `Snippet`.
    2.  Normalize to lowercase.
    3.  Iterate through `CLASSIFICATION_KEYWORDS` dictionary.
    4.  Assign label based on first match priority (Phishing > Spam > Work > Promotion).
    5.  Assign a `confidence_score`. High-risk labels get a forced high score (0.95) to trigger UI warnings.

## 3.3 AI Assistant Integration
The Chatbot (`Chatbot.tsx`) uses the **Function Calling** capability of the Gemini model.

*   **Tool Definitions:**
    *   `filter_emails(category)`: Maps natural language queries ("Show me work emails") to UI state changes.
    *   `open_email(id)`: Navigates to specific content.
    *   `delete_email(id)`: Performs actions via API.
*   **Context Injection:**
    *   The `systemInstruction` is dynamically updated with a JSON summary of the top 20 emails. This allows the AI to answer questions like "What is my latest email?" without needing to retrieve new data.
    *   This technique reduces token usage by 90% compared to sending full email bodies.

## 3.4 Real-time Collaboration
Implemented via Supabase Realtime channels in `ChatSpaceView.tsx`.

*   **Spaces:** Persistent chat rooms for teams.
*   **Data Model:** `chat_sessions` (parent) and `chat_messages` (child).
*   **Optimistic Updates:** Messages appear instantly in the UI while being asynchronously saved to the database.

# 4. Security Protocol

### Authentication
*   **Provider:** Google OAuth 2.0 via Supabase Auth.
*   **Scope:** `https://mail.google.com/` (Read/Write/Send).
*   **Token Handling:** Access tokens are stored in memory/session storage by the Supabase client SDK. They are never logged or stored in the PostgreSQL database.

### Row Level Security (RLS)
Database access is restricted at the engine level.
*   **Policy:** `auth.uid() = user_id`
*   **Effect:** Users can only query rows where the `user_id` column matches their authenticated JWT `sub` claim. This prevents cross-tenant data leakage even if the API key is exposed.

### Threat Detection
*   **Phishing Detection:** Analyzes sender domains and urgent language patterns (e.g., "verify immediately", "password expired").
*   **Visual Indicators:** High-risk emails are flagged with a red shield icon and a warning banner in the detail view.

# 5. Installation & Deployment

### Prerequisites
*   Node.js v18+
*   Supabase Project
*   Google Cloud Project (Gmail API enabled)

### Database Setup
Execute the following SQL in your Supabase SQL Editor:

```sql
-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz
);
alter table public.profiles enable row level security;
create policy "User can view own profile" on profiles for select using (auth.uid() = id);
create policy "User can update own profile" on profiles for update using (auth.uid() = id);

-- Emails
create table public.emails (
  id text primary key, -- Gmail Message ID
  user_id uuid references auth.users not null,
  sender_name text,
  sender_email text,
  subject text,
  preview text,
  body text,
  date timestamptz,
  label text,
  confidence_score float,
  is_read boolean default false,
  is_starred boolean default false,
  is_archived boolean default false,
  is_deleted boolean default false,
  warnings text[],
  created_at timestamptz default now()
);
alter table public.emails enable row level security;
create policy "User can manage own emails" on emails for all using (auth.uid() = user_id);

-- Chat System
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions on delete cascade,
  role text,
  text text,
  created_at timestamptz default now()
);
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
create policy "User owns sessions" on chat_sessions for all using (auth.uid() = user_id);
create policy "User owns messages" on chat_messages for all using (
  exists (select 1 from chat_sessions where id = session_id and user_id = auth.uid())
);
```

### Environment Variables
Configure the application via `ConfigModal` in the UI or `.env` file:
*   `VITE_SUPABASE_URL`: Your project URL.
*   `VITE_SUPABASE_KEY`: Your `anon` public key.
*   `API_KEY`: Google Gemini API Key.

# 6. Codebase Analysis (Deep Dive)

## 6.1 Data Layer

### `src/services/supabase.ts`
This file acts as the backend-for-frontend (BFF).
*   **`fetchGmailWithToken`**: Manages the Gmail REST API calls. It includes error handling for `401 Unauthorized` (triggering re-login flow) and `429 Too Many Requests` (implementing exponential backoff via `fetchInBatches`).
*   **`transformGmailToAppEmail`**: A critical parser. It navigates the complex nested `multipart/alternative` MIME structure of Gmail messages to extract a usable body (preferring HTML, falling back to Plain Text) and decodes standard headers.
*   **`classifyAndSyncEmails`**: Orchestrates the pipeline: Fetch -> Parse -> Heuristic Classify -> Upsert to DB. The `upsert` operation ensures idempotency; running the sync multiple times won't create duplicate emails.

### `src/services/mockData.ts`
Contains static data for the "Guest Mode". This allows the application to be demonstrated without requiring Google Authentication. It includes a variety of pre-classified emails (Spam, Work, Personal) to showcase the UI capabilities.

## 6.2 UI Components

### `src/components/Chatbot.tsx`
The chatbot uses `useChat` or direct `ai.chats.create` to maintain conversational history.
*   **Function Execution Loop:** When the user sends a message, the model may return a `functionCall`. The component intercepts this, executes the corresponding JavaScript function (e.g., updating React state filters), and sends the result back to the model. The model then generates a natural language confirmation.
*   **Handling Undefined:** Robust checks are implemented for `call.name` to prevent runtime crashes if the model returns malformed tool calls.

### `src/components/EmailList.tsx`
*   **Virtualization:** Designed to handle large lists. It uses a filtering logic derived from `processedEmails` which computes the view based on `searchTerm`, `activeFilter` (Tab), and `sortOrder` in real-time.
*   **Batch Actions:** Manages a `Set` of selected IDs to perform bulk operations like Archive or Delete.

### `src/components/ComposeModal.tsx`
*   **AI Autocomplete:** Uses a debounced effect (1000ms delay) on the `body` input field. It sends the current subject and body context to a lightweight Gemini model (`flash`) to request a short sentence completion, displayed as "ghost text" or a suggestion chip.

## 6.3 State Management
The application relies primarily on React Context and local State (`useState`) lifted to `App.tsx`.
*   **Global State:** `emails`, `user`, `currentView`.
*   **Persistence:** Supabase `subscribeToEmails` sets up a WebSocket listener. Any change in the database (INSERT/UPDATE/DELETE) pushes a payload to the client, which updates the `emails` state array immediately, keeping all connected clients in sync.

---
**End of Documentation**
