# Quality Analysis Rubric

You are analyzing a code quality report for the Ocean PULSE codebase (TypeScript / Next.js App Router). Read the report data below, score each dimension, compute the weighted composite, and output the result in the specified format.

## Input

Read the latest report from `.quality/reports/` — use the most recent `report.json` by timestamp. If a previous report exists, also read it for trend comparison.

Source directories: `app/`, `components/`, `hooks/`, `lib/`, `types/`, `contexts/`

## Scoring Rubric (weighted composite → X.X / 10)

### Type Safety — 25%

| Type Errors | Score |
|-------------|-------|
| 0           | 10    |
| 1–3         | 8     |
| 4–10        | 5     |
| 11–25       | 2     |
| 25+         | 0     |

### Lint Cleanliness — 20%

| Condition                  | Score |
|----------------------------|-------|
| 0 errors, 0 warnings       | 10    |
| 0 errors, 1–10 warnings    | 8     |
| 0 errors, 11–30 warnings   | 6     |
| 1–3 errors                 | 4     |
| 4–10 errors                | 2     |
| 10+ errors                 | 0     |

### Complexity — 25%

Metric: complexity hits (complexity + max-depth + max-lines + max-lines-per-function + max-params warnings) per 1,000 code lines.

| Hits / 1k LOC | Score |
|----------------|-------|
| 0              | 10    |
| 0.1–1.0        | 8     |
| 1.1–3.0        | 6     |
| 3.1–6.0        | 4     |
| 6.1–10.0       | 2     |
| 10+            | 0     |

### Duplication — 15%

| Percentage | Score |
|------------|-------|
| 0–1%       | 10    |
| 1.1–3%     | 8     |
| 3.1–5%     | 6     |
| 5.1–8%     | 4     |
| 8.1–15%    | 2     |
| 15%+       | 0     |

### Growth Health — 15%

Compare current report to the previous report (if available). If no previous report exists, default to 7/10.

| Trend                                             | Score |
|---------------------------------------------------|-------|
| All metrics improved or stable                    | 10    |
| Most metrics improved, none degraded significantly | 8     |
| Mixed — some better, some worse                   | 5     |
| Most metrics degraded                             | 2     |
| All metrics degraded                              | 0     |

## Output Format

```
## Quality Score: X.X / 10

| Dimension        | Weight | Score | Trend |
|------------------|--------|-------|-------|
| Type Safety      | 25%    | X/10  | ↑/↓/→ |
| Lint Cleanliness | 20%    | X/10  | ↑/↓/→ |
| Complexity       | 25%    | X/10  | ↑/↓/→ |
| Duplication      | 15%    | X/10  | ↑/↓/→ |
| Growth Health    | 15%    | X/10  | ↑/↓/→ |

### Top 3 Actions

1. **[Category]**: Description with specific file paths
2. **[Category]**: Description with specific file paths
3. **[Category]**: Description with specific file paths
```

## Instructions

1. Read the latest `report.json` from `.quality/reports/`
2. If a previous report exists, read it too for trend data
3. Calculate each dimension score using the rubric above
4. Compute the weighted composite: `(typeSafety * 0.25) + (lint * 0.20) + (complexity * 0.25) + (duplication * 0.15) + (growth * 0.15)`
5. Identify the top 3 most impactful actions to improve the score
6. For actions, reference specific files from the ESLint and TypeScript outputs
7. Output the result in the format above
