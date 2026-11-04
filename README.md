# React + Vite

## Frontend tests

- `npm test`: unit and integration tests using Vitest, jsdom and React Testing Library.
- `npm run test:watch`: rerun affected unit/integration tests while editing.
- `npm run test:e2e`: Playwright browser flows with mocked backend responses; starts Vite on port 5180.
- `npm run lint` and `npm run build`: static checks and production compilation.

E2E uses installed Microsoft Edge on Windows and Playwright Chromium elsewhere. On non-Windows machines/CI, run `npx playwright install chromium` first. Set `PLAYWRIGHT_BROWSER_CHANNEL` to use another installed Chromium channel. No real accounts or backend writes are used. Test reports/traces are ignored by Git; temporary QA screenshots should be deleted after review.

Unit tests cover translation keys/interpolation and error localization. Integration tests cover language selection with Redux and service details loading/error/retry. E2E covers form preservation, saved language, dark mode, responsive service dialogs and keyboard/focus behavior. Add coverage for subsequent features according to risk; these tests do not cover every existing feature.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
