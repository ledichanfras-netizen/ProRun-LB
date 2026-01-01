<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1tPht8fUTcY5xfjU2h3Em5WipVb3F3D0B

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

> For production (Vercel), add the same key in the Vercel Environment Variables (prefer `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`). The project includes a server-side endpoint at `/api/gemini` that proxies requests to Gemini so your key stays server-side and is not exposed in the client bundle.
3. Run the app:
   `npm run dev`

Local dev proxy for `/api` (recommended):
- Start the test API server: `npm run dev:api` (reads `.env.local` automatically)
- The Vite dev server is configured to proxy `/api` to `http://localhost:3001`, so frontend calls to `/api/gemini` will be forwarded to the local test server.
