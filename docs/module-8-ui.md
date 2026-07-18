# Module 8: UI Layout & Interface Documentation

## Goals
- Modify the orchestrator pipeline to return both intermediate parallel responses and the final evaluation result.
- Update API routes and test scripts to conform to the new combined data structure.
- Build an interactive, responsive frontend page (`src/app/page.js`) using Tailwind CSS.
- Enforce parallel model selection limits (maximum 3 choices).
- Render intermediate model outputs alongside the synthesized evaluation results.

## Technical Implementation Details
- **Pipeline Response Shape**:
  - `src/lib/orchestration/pipeline.js` now returns:
    ```javascript
    {
      evaluation: evaluationResult,
      responses: parallelResults
    }
    ```
- **Frontend Dashboard**:
  - Exposes interactive settings (target model checklist, evaluator dropdown, prompt text area).
  - Keeps checkbox state with length validation; disables unselected checkboxes when length reaches 3.
  - Triggers POST requests to `/api/orchestrate` and shows dynamic loading states.
  - Outputs results using a Tab view for raw model responses alongside a card view for synthesized results.
