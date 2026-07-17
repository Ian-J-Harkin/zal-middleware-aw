# Zalando Middleware Mock - Setup Guide

## Requirements
- Node.js (v18+)
- TypeScript (`tsx` for execution)
- **Data Prerequisites**:
  - `data/raw/Myntra Fashion Clothing.csv`
  - `data/mappings/category-grids.csv`

## Setup
1. Clone the repository.
2. Run `npm install` to install dependencies (e.g., `fast-csv`).

## Execution
To run the Epic 1 extraction pipeline over the raw Myntra dataset:
```bash
npx tsx src/scripts/extract-kaggle.ts
```

This will automatically process `data/raw/Myntra Fashion Clothing.csv` and output:
- `data/processed/clean-articles.json` (Successes, Models)
- `data/logs/onboarding_failures.json` (Hard rejections)
- `data/logs/dubious_for_review.json` (Data quality compromises for manual review)

## Testing
Run the test suite to verify color-extraction logic, synthetic key generation, and size exploder rules:
```bash
node --test --import tsx test/*.test.ts
```
