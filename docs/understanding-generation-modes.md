# Understanding Generation Modes: generate() vs. generateStructured()

This guide explains how `generate()` and `generateStructured()` are used in our orchestrator pipeline to process user prompts, query multiple LLMs, and produce a synthesized response.

---

## The Orchestration Pipeline Visualized

```mermaid
flowchart TD
    User([User Prompt]) --> ParallelCall[1. Parallel Run Stage]
    
    subgraph ParallelCall [1. Parallel Run Stage]
        direction LR
        P1[Gemini 2.5] -- calls '.generate()' --> R1[Raw Text Answer]
        P2[Groq Llama 3] -- calls '.generate()' --> R2[Raw Text Answer]
        P3[Mistral Large] -- calls '.generate()' --> R3[Raw Text Answer]
    End
    
    R1 & R2 & R3 --> Evaluator[2. Evaluator/Synthesis Stage]
    
    subgraph Evaluator [2. Evaluator/Synthesis Stage]
        E[Evaluator Model] -- calls '.generateStructured()' with Zod Schema --> JSON[Structured JSON Object]
    End

    JSON --> UI[Display to User]
```

---

## 1. Parallel Run Stage: Using `.generate()`

* **What it does**: Requests standard, unstructured natural language text from the model.
* **Input**: A prompt string.
* **Output**: A plain string containing the model's answer.

### Code Context (Parallel Runner)
For each model selected by the user, we call `.generate()` to get their individual answers:
```javascript
const response = await createModel(id).generate(prompt);
// Output: "The capital of France is Paris..."
```

---

## 2. Evaluator / Synthesis Stage: Using `.generateStructured()`

* **What it does**: Restricts the model to *only* generate a structured JSON object matching a strict Zod schema.
* **Input**: A prompt string + a Zod validation schema.
* **Output**: A validated, parsed JavaScript object.

### The Zod Schema Definition
```javascript
export const EvaluatorResponseSchema = z.object({
  finalAnswer: z.string(),
  reasoning: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});
```

### Code Context (Evaluator)
We feed all three raw answers from Stage 1 into the evaluator model and ask it to output JSON matching the schema:
```javascript
const evaluation = await evaluator.generateStructured(
  evaluationPrompt, 
  EvaluatorResponseSchema
);

/*
Output Object:
{
  finalAnswer: "Paris",
  reasoning: "All models agreed that Paris is the capital...",
  confidence: "high"
}
*/
```

---

## Summary of Differences

| Feature | `.generate()` | `.generateStructured()` |
| :--- | :--- | :--- |
| **Output Type** | `string` | `object` (JSON parsed) |
| **Primary Use Case** | Answering user questions, creative writing, general reasoning. | Extracting data, classifying text, grading answers, building API responses. |
| **Constraint** | None (the model is free to output markdown, conversation, etc.). | Strict (the model is forced by the SDK to conform to your schema). |
| **Error Risk** | Low (almost always returns some text). | Medium (throws an error if the model outputs malformed JSON or invalid schema types). |
