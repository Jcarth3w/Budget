# Budget

Personal budgeting app built with Expo, Express, and Google Sheets.

## Development

Run the backend and app from their own directories:

```text
cd Backend && npm start
cd App && npm start
```

## Quality checks

From the repository root:

```text
npm test
npm run test:app
npm run test:backend
npm run test:watch
npm run coverage
npm run lint
npm run typecheck
```

Backend tests use Node's built-in test runner. App utility tests use Vitest. All
tests live under `Tests/`, mirroring their source paths:

```text
Tests/App/utils/       -> App/utils/
Tests/Backend/utils/   -> Backend/utils/
```

Coverage reports are written to `Tests/coverage/App/` and
`Tests/coverage/Backend/`. Open either generated `index.html` in a browser for
the detailed report.

## Spending insights

The Budget screen generates suggestions locally from the authenticated budget and trends responses. Rules currently cover:

- total and 50/30/20 bucket overruns
- month-end spending pace
- meaningful category increases against recent history
- late-month surplus and savings reminders

Insights are deterministic and explain the values that triggered them. No financial data is sent to an AI provider and there is no AI usage cost.
