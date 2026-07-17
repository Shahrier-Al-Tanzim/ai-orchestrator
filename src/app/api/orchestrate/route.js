// @ts-check
import { NextResponse } from "next/server";
import { runSelfConsistencyOrchestrator } from "@/lib/orchestration/pipeline";

export async function POST(request) {
    try{
        const body = await request.json()
        const {prompt, modelIds, evaluatorId} = body;

        // 1. Basic validation or request parameters
        if(!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: "Invalid parameter: 'prompt' must be a non-empty string." },
                { status: 400 }
            );
        }

        if(!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid parameter: 'modelIds' must be a non-empty array of strings." },
                { status: 400 }
            );
        }

        if(!evaluatorId || typeof evaluatorId !== 'string') {
            return NextResponse.json(
                { error: "Invalid parameter: 'evaluatorId' must be a non-empty string." },
                { status: 400 }
            );
        }
        

        // 2. Execute the backend orchestrator pipeline
        const pipelineResult = await runSelfConsistencyOrchestrator(prompt, modelIds, evaluatorId);

        // 3. Return the structured result
        return NextResponse.json(pipelineResult);
    }catch (error) {
        console.error('[API Error] Pipeline run failed:', error);
        return NextResponse.json(
            { error: error.message || 'An internal error occurred during orchestration.' },
            { status: 500 }
        );
    }
}