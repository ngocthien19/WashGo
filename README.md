# React + Vite

## Docker (frontend only)

From `wash-go`, run:

```sh
docker compose up -d --build
```

Open `http://localhost:5173`. The image builds with Node and serves the production SPA through Nginx. Deep links support refresh; `/api` requests, uploaded media and SignalR WebSockets are proxied to the existing backend. This Compose file does not start or modify the backend/database.

Defaults: `FE_PORT=5173`, `BACKEND_URL=http://host.docker.internal:5000` (the backend's published port on the host). Override them in a frontend `.env`, or through shell environment variables. `BACKEND_URL` must be an origin without a trailing slash/path; `localhost` inside the frontend container refers to that container, so use `host.docker.internal` to reach your host. An HTTPS upstream must present a trusted certificate.

Optional: copy `.env.example` to `.env` and set the public `VITE_GOOGLE_CLIENT_ID` to match the backend. `VITE_*` settings are compiled into the frontend; rebuild after changing them. No backend secrets belong in this file or in build arguments. The container always uses `/api`, with `BACKEND_URL` configured at runtime. For Google sign-in, allow `http://localhost:5173` in the OAuth client's JavaScript origins.

```sh
docker compose logs -f frontend
docker compose down
```

The health check uses `/healthz` for frontend readiness, independently of backend availability. Build contexts exclude `.env` files, dependencies and test output. The configuration follows the [official Nginx image](https://hub.docker.com/_/nginx) template mechanism.

## Frontend tests

### CI pipeline

`.github/workflows/frontend-ci.yml` follows the backend pipeline: pull requests and pushes to `develop`/`main`, plus manual runs. It runs a Node22 production build, whitespace/PowerShell syntax checks and ESLint, the complete unit/integration suite, all Playwright tests across three Chromium shards, a full-history Gitleaks scan and npm audit including dev/transitive dependencies. Secrets or High/Critical vulnerabilities fail the security gate; scanner/network errors also fail. Docker packaging waits for every gate and then checks the built image with an isolated mock upstream. It does not publish an image or deploy, matching the backend workflow's current scope.

Actions and the secret-scanner image are pinned to immutable revisions, checkout credentials are not persisted, and the workflow only has `contents: read`. No real accounts, application secrets or BE/database services are needed. Browser API fallthrough is directed to an unused loopback port. Reports (JUnit, browser HTML/traces, redacted security results and Docker logs) are retained as GitHub artifacts for 14 days. The build artifact contains only `dist`.

Run the equivalent checks locally (PowerShell for the `.ps1` commands):

```sh
npm ci
npm run lint
npm run test:ci
npm run build
npx playwright install chromium
npm run test:e2e:ci
```

```powershell
./tools/ci/Analyze.ps1
./tools/ci/Security.ps1
./tests/ci/Run-DockerSmoke.ps1
```

Security and Docker smoke require Docker. The latter uses an isolated `washgo-fe-ci-*` project and host port 5380 (override with `-Port`), excludes the developer `.env`, tests SPA refresh/assets/API prefix/query/Bearer/WebSocket forwarding, and removes its containers/network in `finally`. It never contacts the real backend. `-ImageTag <tag> -SkipBuild` checks an already-built image. Local reports live in ignored `tests/ci/results/`, `playwright-report/` and `test-results/`. Set `CI=true` to enable the same Playwright HTML/JUnit reporters, retries and fresh Vite server as GitHub; normal local browser defaults remain unchanged.

The initial lockfile refresh fixes the existing High findings without a forced major upgrade. Low/Moderate findings remain visible in the audit artifact; they are not suppressed. The pipeline has no registry/deployment credentials. Configure a separate deployment target only when deployment is requested.

- `npm test`: unit and integration tests using Vitest, jsdom and React Testing Library.
- `npm run test:watch`: rerun affected unit/integration tests while editing.
- `npm run test:e2e`: Playwright browser flows with mocked backend responses; starts Vite on port 5180.
- `npm run lint` and `npm run build`: static checks and production compilation.

E2E uses installed Microsoft Edge on Windows and Playwright Chromium elsewhere. On non-Windows machines/CI, run `npx playwright install chromium` first. Set `PLAYWRIGHT_BROWSER_CHANNEL` to use another installed Chromium channel. No real accounts or backend writes are used. Test reports/traces are ignored by Git; temporary QA screenshots should be deleted after review.

Unit tests cover translation keys/interpolation and error localization. Integration tests cover language selection with Redux and service details loading/error/retry. E2E covers form preservation, saved language, dark mode, responsive service dialogs and keyboard/focus behavior. Add coverage for subsequent features according to risk; these tests do not cover every existing feature.

Customer profile coverage includes validation/image limits, safe identity synchronization, update failure/retry, avatar upload/removal, persistence, shared breadcrumb navigation and guest access. Run only profile browser flows with `npm run test:e2e -- customer-profile.spec.js`.

Service catalog tests cover POST `/customer/services/filter`, checkbox arrays `serviceTypes` and `priceRanges`, combined keyword filters, name/price sorting, URL persistence, pagination, validation and retry. Values within each array use OR; groups use AND on the server before pagination. Run the catalog browser flow with `npm run test:e2e -- display-preferences.spec.js -g "service checkboxes"`. Run Playwright commands sequentially to avoid sharing its output directory between processes.

Customer order creation is available at `/customer/orders/new`. Tests cover mixed service quantities, server quotes/vouchers, compartment availability and conflicts, duplicate submission protection, uncertain network outcomes, language/theme changes and mobile keyboard interaction. Run its browser flows with `npm run test:e2e -- customer-create-order.spec.js`. Drafts and drop-off PINs are kept in memory only. Creation records the selected Cash/VNPAY/MoMo preference and creates an unpaid order; it does not charge the customer or open a locker.

Customer profiles require a phone number (exactly 10 digits starting with 0), address and province/city. PUT `/customer/me` sends `fullName, phone, address, city, avatarUrl`; it no longer sends a legacy district.

## Online payments

Orders use a combined search/filter row and server-provided workflow progress. ETA distinguishes estimates from historical processing data, rule-based estimates and actual completion times.

Locker QR generation/download uses `qrcode.react`. The simulation dialog supports PIN, camera QR scanning with `@yudiel/react-qr-scanner`, and PNG/JPG/WEBP uploads decoded locally with `barcode-detector`. Its WASM is bundled with the app. Camera access starts only on request and requires HTTPS/localhost. No image is sent to the backend; only the credential is submitted after confirmation. Drop-off uses one API step; pickup uses an expiring in-memory session followed by explicit collection confirmation. There is no physical locker hardware integration.

Completed, paid orders expose `/customer/orders/:orderId/receipt` for a browser-printable payment record. It contains no locker credentials and is explicitly not a tax/electronic invoice; the backend does not currently issue official invoices.

Customer orders are available at `/customer/orders` with server-side search, lifecycle/payment filters, CreatedOn sorting, pagination and shareable URL state. `/customer/orders/:orderId` shows current details and recorded timeline events, with masked PINs and payment navigation. Cancellation first fetches the server quote, then submits a required reason; amounts are never calculated by the client. Run `npm run test:e2e -- customer-orders.spec.js` for orders, cancellation and responsive header coverage. Physical locker operations, invoices, reviews and complaints remain separate features.

Open `/customer/orders/:orderId/payment` from the created-order confirmation to check payment eligibility. POST `/payment/create-url` sends only `orderId` and `paymentMethod` (VNPAY = 2, MoMo = 3). The backend decides the amount and signs gateway requests. Payment is allowed only for AwaitingPayment (8) or MovedToStorage (13), after actual weighing when the order has included weight. Pending orders cannot pay yet.

The frontend return route is `/payment/return`. Set the backend's `VNPAY_RETURN_URL` and `MOMO_REDIRECT_URL` to the **frontend origin** plus this path, for example `http://localhost:5173/payment/return` for local browser testing. A tunnel must route this path to the frontend. These values are different from backend IPN URLs (`/payment/vnpay-ipn`, `/payment/momo-ipn`), which must remain publicly reachable backend endpoints. This work does not change backend code or environment settings. No gateway secrets belong in Vite env.

Return references locate an exact owned order through POST `/wash-order/mine`, then GET `/wash-order/{id}` confirms its current payment status. Redirect success flags are never proof of payment. If IPN is delayed, Check status refreshes server data; the return screen does not create another charge. If the login session is missing, sign-in preserves the payment-return route. Unknown request outcomes remain locked in the current page session, including status refresh; there is no cross-reload idempotency guarantee until the backend exposes one.

Payment unit/integration tests cover lifecycle, gateway selection, payloads and response validation. `npm run test:e2e -- customer-payment.spec.js` covers both gateway redirects, server-confirmed return status, sign-in return, lifecycle restrictions, error/retry handling and mobile/dark mode. Gateways and backend responses are mocked; these tests do not make real payments or verify provider credentials, tunnel routing or IPN delivery.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
