# Harvest web

Independent React + JavaScript + Vite SPA with feature modules and shared operational controls. Node.js 22.14+ or compatible current LTS. No backend source imports or MongoDB secrets.

`npm ci`, copy `.env.example` to `.env`, set `VITE_API_BASE_URL=https://your-api.example/api/v1`, then `npm run dev`. For local use set the API URL to http://127.0.0.1:4000/api/v1 and allow http://127.0.0.1:5173 in backend CORS.

`npm run build` creates dist for static hosting. A running backend/database is not required for building. Netlify `_redirects` and Vercel rewrites provide SPA fallback. Vite variables are public and read at build time; rebuild after changing the API URL. The backend is separately hosted and never serves this build.

`npm run lint` and `npm test` run in this checkout. For `npx playwright test`, install Chromium with `npx playwright install chromium` and check out ERP-server at `../backend` or set `ERP_SERVER_DIR` to its path. The test harness starts an isolated backend and MongoDB; the production build only needs this repository.

Tokens exist only in memory; reload or 30-minute expiry requires signing in. API errors preserve forms and show recoverable errors. Shared tables offer sorting, row selection, columns, counts, pagination and page/selection export. Cross-record links connect contacts, documents, products, batches, prices and purchases. Date-only labels and reporting periods use UTC; shift instants are entered in browser-local time. Money inputs accept regular currency amounts; API conversion uses integer minor units.

Images are uploaded through the API with authenticated size/type checks and durable MongoDB storage. The interface does not imply an external payment gateway or tax filing.
