<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bebea5e4-7a34-4519-b920-fab369ef8e49

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in [.env.local](.env.local)
4. Run the app:
   `npm run dev`

## GitHub CI / Deployment

This project is already configured for production builds and deployment:

- Run the GitHub Actions workflow on every push and pull request to `main`.
- Build command: `npm run build`
- Start command for deployed servers: `npm start`

### Deploying with Vercel or Render

- For Vercel, connect this repository and use the existing `vercel.json` file.
- For Render, connect the repository and use `render.yaml` to deploy the app with `npm install --include=dev && npm run build` and `npm start`.

### Required environment variables

Use `.env.example` as a template and set real values in your deployment provider:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `API_KEY` (where applicable)
