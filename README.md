# Safe Multisig Lookup

A simple tool to lookup Safe multisig wallets by owner address across multiple networks.

## Features

- Lookup Safe multisigs across Ethereum, Polygon, Arbitrum, Optimism, Base, Gnosis, and BNB networks
- Simple web interface
- CLI tool for command-line usage

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
SAFE_API_KEY=your_api_key_here
```

3. Run the CLI tool:
```bash
npm run dev <wallet-address>
```

## Deployment to Vercel

1. Push your code to GitHub

2. Import your repository to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Build Settings** (IMPORTANT):
   - Framework Preset: "Other" or leave as default
   - **Build Command**: Leave **EMPTY** (no build needed for static files)
   - **Output Directory**: Leave **EMPTY** (Vercel will auto-detect `public/` folder)
   - Root Directory: `./` (root)

4. Add Environment Variable:
   - In your Vercel project settings, go to "Environment Variables"
   - Add `SAFE_API_KEY` with your API key value
   - Make sure it's available for Production, Preview, and Development

5. Deploy:
   - Vercel will automatically deploy when you push to your main branch
   - Or click "Deploy" in the Vercel dashboard

## Updating and Redeploying

### Automatic Redeployment (Recommended)

Vercel automatically redeploys when you push changes to your connected Git repository:

1. **Make your changes** (e.g., update `src/networks.ts` to add/remove networks)
2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Add new network"
   git push
   ```
3. **Vercel automatically detects the push** and starts a new deployment
4. **Check the Vercel dashboard** - you'll see the new deployment in progress
5. **Your changes go live** once the deployment completes (usually 1-2 minutes)

### Manual Redeployment

If you need to manually trigger a redeployment:

1. Go to your Vercel project dashboard
2. Click on the "Deployments" tab
3. Click the "..." menu on any deployment
4. Select "Redeploy"

### Adding/Changing Networks

To add or modify networks:

1. Edit `src/networks.ts`:
   ```typescript
   export const SAFE_NETWORKS: Record<string, string> = {
     ethereum: "https://api.safe.global/tx-service/eth",
     polygon: "https://api.safe.global/tx-service/pol",
     // Add your new network here
     newNetwork: "https://api.safe.global/tx-service/new",
   };
   ```

2. The change will be picked up by both:
   - CLI tool (`src/index.ts`)
   - Web API (`api/lookup.ts`)

3. Commit and push - Vercel will automatically redeploy with the new networks

## Project Structure

- `src/` - Source code for CLI tool
- `api/lookup.ts` - Vercel serverless function for the web API
- `index.html` - Simple frontend interface
- `vercel.json` - Vercel configuration

## Usage

### Web Interface
After deployment, visit your Vercel URL and enter a wallet address in the input field.

### CLI
```bash
npm run dev 0x86CbBAEB08861D005fD2147A5123E43e558db167
```
