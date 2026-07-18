# Module 3: Factory Pattern Documentation

## Goals
- Establish a decoupled lookup system (registry) for all available models.
- Implement the factory method `createModel` to dynamically resolve model provider instances.

## Technical Implementation Details
- **Registry**:
  - `src/lib/models/registry.js` lists metadata for UI rendering (friendly label, provider tier) mapped by model IDs.
- **Factory**:
  - `src/lib/models/factory.js` imports the free providers (`geminiProvider`, `groqProvider`, `mistralProvider`).
  - Implements `createModel(modelId)` which maps the string IDs to their imported provider objects.
  - Throws an informative error if a model ID is requested but not registered.

## Verification
- Verified module files exist in `src/lib/models/`.
