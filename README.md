# Self-Consistency AI Orchestrator

A Next.js full-stack application designed to query multiple target Large Language Models (LLMs) concurrently, parse their answers, and utilize a dedicated evaluator LLM to compare, fact-check, and synthesize the optimal, structured response.

**Live Demo**: [https://ai-orchestrator-lake.vercel.app](https://ai-orchestrator-lake.vercel.app)

This project implements a **Self-Consistency Orchestration Pattern** to mitigate individual LLM hallucinations, check facts, compile diverse opinions, and enforce highly structured JSON data contracts using Zod.

---

## 🚀 Key Features

* **Real-Time Streaming Engine**:
  * **Concurrent Multiplexing**: Selected parallel models generate outputs concurrently, streaming their responses side-by-side in real-time.
  * **Word-by-Word Evaluator Synthesis**: The evaluator LLM streams its final synthesized answer chunk-by-chunk using a stateful JSON scanner.
* **Dual Interface**:
  * **Web-Based UI**: A premium Next.js App Router dashboard styled in a matte-charcoal dark mode using Tailwind CSS. Supports dynamic configurations and displays active streams side-by-side.
  * **CLI-Based Scripts**: Console-based test scripts for independent validation of runner, evaluator, and end-to-end pipeline stages.
* **Multi-Provider LLM Layer**: Exposes unified interfaces for:
  * **Google Generative AI**: using `gemini-3.1-flash-lite`.
  * **Groq Cloud**: using `groq-llama-3-3-70b-versatile`.
  * **Mistral API**: using `open-mistral-nemo` and `mistral-large`.
* **Custom JSON Fallback Parser**: A robust fallback mechanism that automatically injects a human-readable Zod schema template and parsing rules into text prompts for providers that lack native API-level JSON Schema validation (like Groq), preventing JSON parsing crashes.
* **Context-Aware Comparison Evaluator**: The synthesis model detects the prompt context (factual trivia vs. subjective trade-off comparisons) and dynamically adjusts its evaluation method (strict right/wrong checks vs. depth of reasoning/opinion analysis).

---

## 🛠️ Tooling & Tech Stack

This project is built using a modern, production-ready stack where each tool plays a specific role:

* **Next.js (App Router)**: Orchestrates the overall application lifecycle. Handles serverless backend route routing (`src/app/api/orchestrate/route.js`) and serves as the React framework for rendering the interactive dashboard UI.
* **Server-Sent Events (SSE)**: Enables real-time uni-directional data streaming from the Next.js API route to the browser using a custom `ReadableStream` piped over `text/event-stream`.
* **Vercel AI SDK (`ai`)**: Standardizes LLM integration. Provides the core `generateText`, `streamText`, and structured JSON hooks across Google, Groq, and Mistral.
* **Zod**: Defines structural validation. Formulates the exact type shapes and rules (schema) that the evaluator model's response must conform to. Also performs runtime parsing to catch and discard invalid model outputs.
* **Tailwind CSS**: Utility-first CSS framework used to build the dark-mode dashboard UI (glassmorphism containers, grid systems, responsive layouts, hover states, and animations).
* **Custom Markdown Parser**: A lightweight, zero-dependency parser written in React to format inline bolding, lists, and headers in real-time as the stream generates.

---

## 📐 Design Patterns Used

To ensure clean separation of concerns and maintainable code, the codebase employs several software design patterns:

* **Factory Method Pattern**: Implemented in `src/lib/models/factory.js` (`createModel`). It decouples model creation from business logic, resolving unified provider interfaces dynamically based on string model IDs.
* **Strategy Pattern**: The unified `ModelProvider` interface acts as a Strategy. Different model providers (Gemini, Groq, Mistral) implement this strategy wrapper differently under the hood, enabling swapping of LLM vendors without altering pipeline code.
* **Orchestrator Pattern**: Manages the multi-stage self-consistency execution pipeline. Co-ordinates concurrent execution (Fan-Out) and aggregates them into the synthesis/evaluator stage (Fan-In).
* **Adapter / Decorator Pattern**: Utilized inside `groq.js`. Acts as an adapter that makes standard text-generation APIs behave like structured-object generators, decorating the prompt with human-readable Zod templates, sanitizing JSON code blocks, and parsing/validating outputs.

---

## 🛠 How the Self-Consistency Flow Works

```
           ┌──────────────────────────┐
           │   User Question Prompt   │
           └─────────────┬────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼ (Concurrently runs)             ▼
  ┌───────────┐     ┌───────────┐     ┌───────────┐
  │  Model A  │     │  Model B  │     │  Model C  │
  └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
           ┌─────────────────────────────┐
           │  Intermediate Responses     │
           │  & Timing Latency Compiled  │
           └──────────────┬──────────────┘
                          │
                          ▼
           ┌─────────────────────────────┐
           │       Evaluator Model       │
           │ (Fact vs. Opinion Checkers) │
           └──────────────┬──────────────┘
                          │
                          ▼
           ┌─────────────────────────────┐
           │    Validated JSON Schema    │
           │ (Zod checks types & enums)  │
           └──────────────┬──────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼ (JSON data passed directly)        ▼
  ┌───────────┐                       ┌───────────┐
  │  Web UI   │                       │  CLI Log  │
  └───────────┘                       └───────────┘
```

1. **Parallel Execution**: The orchestrator receives a prompt and sends it to up to 3 selected LLMs concurrently using `Promise.all` wrappers.
2. **Result Compilation**: The individual model answers and their respective response times are gathered.
3. **Synthesis & Evaluation**:
   * The original question and all intermediate answers are passed to the evaluator model.
   * **Factual Check**: For factual queries, the evaluator isolates false statements, ignores model hallucinations, and falls back to internal knowledge if necessary.
   * **Subjective Check**: For opinion or comparison queries, the evaluator highlights the unique arguments, trade-offs, and quality of reasoning of each model.
4. **Structured JSON Validation**: The output is validated against a Zod schema to guarantee a consistent JSON contract containing:
   * `finalAnswer` (The refined, synthesized response)
   * `reasoning` (Explanation of synthesis details)
   * `contributions` (List of model strengths)
   * `confidence` (Low, Medium, or High)

---

## 🌊 Real-Time Streaming Implementation

Instead of showing static loading state indicators, the pipeline uses a **Server-Sent Events (SSE)** stream (`text/event-stream`) to feed data to the client in real-time. This is achieved in two stages:

### 1. Concurrent Model Multiplexing
- The backend API route (`src/app/api/orchestrate/route.js`) creates a custom `ReadableStream`.
- It initiates async generators using `streamText` for all selected models concurrently.
- As chunks from Gemini, Groq, or Mistral Nemo arrive, they are pushed into a shared SSE event stream using matching tags (e.g. `data: {"type": "model-chunk", "modelId": "...", "text": "..."}`).
- The browser stream reader splits these events on the fly, rendering the text live inside separate tab panels.

### 2. Stateful JSON String Scanner (Evaluator Stream)
- Enforcing a strict JSON Zod schema is difficult when streaming, as JSON is invalid until the closing brace `}` is received.
- **The Solution**: The evaluator is prompted to output the `"finalAnswer"` property first. 
- While the evaluator streams the raw JSON text, a **stateful character-by-character scanner** searches the accumulating buffer for `"finalAnswer"` and extracts the contents of its double-quoted string.
- These extracted characters are instantly pushed to the browser as `evaluator-chunk` events, enabling word-by-word streaming of the synthesized answer card.
- On stream completion, the backend locates the outermost curly braces, cleans the JSON, validates it against the Zod schema, and sends the final structure containing reasoning, confidence, and strengths.

---

## 📂 Project Structure

```
├── docs/                      # Module-by-module development documentation
├── scripts/                   # CLI verification scripts
│   ├── test-parallel.js       # Test parallel runner concurrency and durations
│   ├── test-evaluator.js      # Test fact-checking/synthesis capabilities
│   └── test-pipeline.js       # Test end-to-end pipeline execution
├── src/
│   ├── app/                   # Next.js App Router Web UI
│   │   ├── api/orchestrate/   # POST Route Handler (/api/orchestrate)
│   │   ├── page.js            # Tailwind Responsive Dashboard
│   │   └── globals.css        # Tailwind core directives
│   └── lib/
│       ├── models/            # Model Registry and Provider Abstractions
│       │   ├── providers/     # Gemini, Groq, and Mistral wrappers
│       │   ├── factory.js     # Model resolver factory
│       │   └── registry.js    # Available model definitions and tier metadata
│       └── orchestration/     # Pipeline Orchestration Logic
│           ├── parallelRunner.js
│           ├── evaluator.js
│           ├── schemas.js     # Zod JSON validation schemas
│           └── pipeline.js    # Coordinates E2E workflow
```

---

## ⚡ Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

### 3. Run the CLI Test Pipeline
Validate the full pipeline in the console:
```bash
node scripts/test-pipeline.js
```

### 4. Run the Web Application
Start the Next.js local development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to interact with the dashboard.
