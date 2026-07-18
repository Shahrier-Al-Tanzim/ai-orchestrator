// // @ts-check
// import { NextResponse } from "next/server";
// import { runSelfConsistencyOrchestrator } from "@/lib/orchestration/pipeline";

// export async function POST(request) {
//     try{
//         const body = await request.json()
//         const {prompt, modelIds, evaluatorId} = body;

//         // 1. Basic validation or request parameters
//         if(!prompt || typeof prompt !== 'string') {
//             return NextResponse.json(
//                 { error: "Invalid parameter: 'prompt' must be a non-empty string." },
//                 { status: 400 }
//             );
//         }

//         if(!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
//             return NextResponse.json(
//                 { error: "Invalid parameter: 'modelIds' must be a non-empty array of strings." },
//                 { status: 400 }
//             );
//         }

//         if(!evaluatorId || typeof evaluatorId !== 'string') {
//             return NextResponse.json(
//                 { error: "Invalid parameter: 'evaluatorId' must be a non-empty string." },
//                 { status: 400 }
//             );
//         }
        

//         // 2. Execute the backend orchestrator pipeline
//         const pipelineResult = await runSelfConsistencyOrchestrator(prompt, modelIds, evaluatorId);

//         // 3. Return the structured result
//         return NextResponse.json(pipelineResult);
//     }catch (error) {
//         console.error('[API Error] Pipeline run failed:', error);
//         return NextResponse.json(
//             { error: error.message || 'An internal error occurred during orchestration.' },
//             { status: 500 }
//         );
//     }
// }


// @ts-check
import { createModel } from '@/lib/models/factory.js';
import { evaluateResponses } from '@/lib/orchestration/evaluator.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, modelIds, evaluatorId } = body;

    // 1. Basic validation
    if (!prompt || !modelIds || !Array.isArray(modelIds) || modelIds.length === 0 || !evaluatorId) {
      return new Response(JSON.stringify({ error: 'Invalid parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();

    // 2. Setup Server-Sent Events ReadableStream
    const customStream = new ReadableStream({
      start(controller) {
        (async () => {
          const sendEvent = (type, data) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
          };

          try {
            // --- STAGE 1: Parallel Model Streaming ---
          console.log(`[Stream API] Initiating concurrent streaming for: ${modelIds.join(', ')}`);
          
          const parallelPromises = modelIds.map(async (modelId) => {
            try {
              sendEvent('model-start', { modelId });
              const provider = createModel(modelId);
              const textStream = await provider.stream(prompt);

              let responseText = '';
              const startTime = Date.now();

              for await (const chunk of textStream) {
                responseText += chunk;
                sendEvent('model-chunk', { modelId, text: chunk });
              }

              const duration = ((Date.now() - startTime) / 1000).toFixed(2);
              sendEvent('model-end', { modelId, response: responseText, duration });
              return { modelId, response: responseText, duration };

            } catch (err) {
              console.error(`[Stream API] Model ${modelId} failed:`, err);
              const errorMsg = err.message || 'Model execution failed.';
              sendEvent('model-error', { modelId, error: errorMsg });
              return { modelId, response: `Error: ${errorMsg}`, duration: '0.00' };
            }
          });

          // Wait for all target models to finish generating
          const parallelResults = await Promise.all(parallelPromises);

          // --- STAGE 2: Evaluator Synthesis Streaming ---
          console.log(`[Stream API] Running evaluator: ${evaluatorId}`);
          sendEvent('evaluator-start', { evaluatorId });

          const evaluator = createModel(evaluatorId);
          
          // Construct evaluator instructions prompt (using our updated opinion-based evaluator)
          // We will use standard evaluatorPrompt template logic:
          const mockResults = parallelResults.map(r => ({
            modelId: r.modelId,
            response: r.response
          }));

          const evaluationPrompt = `You are an expert evaluator synthesizing a final response to this question: "${prompt}"

Here are the answers provided by different AI models:
${mockResults.map((r, i) => `---
Model: ${r.modelId}
Answer: ${r.response}`).join('\n\n')}

CRITICAL EVALUATION RULES:
1. DETECT PROMPT TYPE (FACT VS. OPINION):
   - First, determine if the question seeks objective facts (e.g., capital cities, math, historical dates) or subjective opinions (e.g., NestJS vs. Next.js, apples vs. bananas).
2. IF THE QUESTION IS FACTUAL:
   - Fact-check inputs strictly. If a model is completely incorrect, explicitly state in the contributions: "None - provided incorrect information (specify what was wrong)".
3. IF THE QUESTION IS OPINION-BASED / SUBJECTIVE:
   - Do not label opinions as "incorrect". Evaluate depth of reasoning. Identify the unique perspective or trade-offs that the model contributed.
4. NO DISHONEST ATTRIBUTION: Never claim a model provided a correct fact or argument if it did not literally state it.
5. INTERNAL KNOWLEDGE FALLBACK: If all input answers are wrong, use internal knowledge for "finalAnswer".

You must return your response as a valid JSON object matching this structure:
{
  "finalAnswer": "string - The refined, synthesized best answer for the user",
  "reasoning": "string - Brief explanation of how the final answer was constructed",
  "contributions": [
    {
      "modelId": "string - The exact ID of the model",
      "strengths": "string - What this model got right or contributed"
    }
  ],
  "confidence": "string - Must be exactly one of: 'low', 'medium', or 'high'"
}

CRITICAL FORMATTING RULES:
1. "contributions" MUST be a JSON array of objects. Never return it as a single string.
2. "confidence" MUST be exactly one of: "low", "medium", or "high".
3. Escape all newlines inside string values as '\\n'.
4. Return ONLY the raw JSON object. Do not wrap it in markdown code block formatting and do not write conversational text.`;

          // Stream the evaluator's text output chunk-by-chunk
          const evaluatorStream = await evaluator.stream(evaluationPrompt);

          let evaluatorBuffer = '';
          let lastExtractedAnswer = '';

          for await (const chunk of evaluatorStream) {
            evaluatorBuffer += chunk;

            // Robust character scanner to extract partial string value in real-time
            const marker = '"finalAnswer"';
            const markerIndex = evaluatorBuffer.indexOf(marker);
            if (markerIndex !== -1) {
              const afterMarker = evaluatorBuffer.substring(markerIndex + marker.length);
              const quoteIndex = afterMarker.indexOf('"');
              if (quoteIndex !== -1) {
                const valueStart = afterMarker.substring(quoteIndex + 1);
                let valueText = '';
                for (let i = 0; i < valueStart.length; i++) {
                  const char = valueStart[i];
                  // Stop scanning if we hit an unescaped double quote
                  if (char === '"' && (i === 0 || valueStart[i - 1] !== '\\')) {
                    break;
                  }
                  valueText += char;
                }

                const cleanAnswer = valueText.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                if (cleanAnswer.length > lastExtractedAnswer.length) {
                  const newChunk = cleanAnswer.substring(lastExtractedAnswer.length);
                  lastExtractedAnswer = cleanAnswer;
                  sendEvent('evaluator-chunk', { text: newChunk });
                }
              }
            }
          }

          // Once evaluation stream ends, parse the accumulated JSON string
          try {
            const cleanJSON = evaluatorBuffer.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Extract only the content between the outer-most curly braces to ignore conversational prefixes
            const startBrace = cleanJSON.indexOf('{');
            const endBrace = cleanJSON.lastIndexOf('}');
            if (startBrace === -1 || endBrace === -1 || endBrace <= startBrace) {
              throw new Error('Valid JSON braces not found in response.');
            }
            const jsonSubstring = cleanJSON.substring(startBrace, endBrace + 1);

            // Clean unescaped newlines inside quotes
            let inQuote = false;
            let sanitizedJSON = '';
            for (let i = 0; i < jsonSubstring.length; i++) {
              const char = jsonSubstring[i];
              if (char === '"' && (i === 0 || jsonSubstring[i - 1] !== '\\')) {
                inQuote = !inQuote;
              }
              if (inQuote && char === '\n') {
                sanitizedJSON += '\\n';
              } else if (inQuote && char === '\r') {
                // skip
              } else {
                sanitizedJSON += char;
              }
            }

            const parsed = JSON.parse(sanitizedJSON);
            sendEvent('evaluator-end', { evaluation: parsed, responses: parallelResults });
          } catch (parseError) {
            console.error('[Stream API] Evaluator JSON parse failed:', parseError);
            console.log('[Stream API] Raw Buffer was:', evaluatorBuffer);
            // Fallback: If JSON parsing failed, construct a fallback JSON object
            sendEvent('evaluator-end', {
              evaluation: {
                finalAnswer: lastExtractedAnswer || 'Failed to parse final answer.',
                reasoning: 'Evaluator output format error. Buffer parsing failed.',
                contributions: parallelResults.map(r => ({ modelId: r.modelId, strengths: 'Failed to extract strengths.' })),
                confidence: 'low'
              },
              responses: parallelResults
            });
          }

        } catch (streamError) {
          console.error('[Stream API] Stream loop failed:', streamError);
          sendEvent('error', { message: streamError.message });
        } finally {
          controller.close();
        }
      })();
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[API Error] Route Handler crashed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
