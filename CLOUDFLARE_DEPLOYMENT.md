# Deploying Trae Agent to Cloudflare Pages

This guide will help you deploy the Trae Agent web interface to Cloudflare Pages with Python Functions support.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Install Node.js (v16 or later) for Wrangler CLI
3. **Python**: Python 3.11+ for local development
4. **Git**: For version control and deployment

## Quick Start

### 1. Install Dependencies

```bash
# Install pnpm globally
npm install -g pnpm

# Install Wrangler CLI
npm install -g wrangler
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Build and Deploy to Cloudflare Pages

```bash
# Install dependencies and build
pnpm install
pnpm run build

# Deploy the project
wrangler pages deploy build/client --project-name trae-agent-web
```

## Detailed Setup

### 1. Project Structure

Your project should have this structure:
```
trae-agent/
├── public/                 # Source files
│   ├── index.html          # Main web interface
│   └── script.js           # Frontend JavaScript
├── build/
│   └── client/             # Built output directory
├── functions/
│   ├── api/
│   │   └── execute-task.py # Backend API function
│   └── requirements.txt    # Python dependencies
├── trae_agent/             # Original Python package
├── wrangler.toml          # Cloudflare configuration
├── package.json           # Node.js metadata
├── pnpm-lock.yaml         # pnpm lock file
└── CLOUDFLARE_DEPLOYMENT.md
```

### 2. Configure Environment Variables

In your Cloudflare Pages dashboard, set up these environment variables:

#### Required Environment Variables

1. **Go to Cloudflare Dashboard** → Pages → Your Project → Settings → Environment Variables

2. **Add these variables** (Production & Preview):
   - `ENVIRONMENT`: `production`
   - `PYTHON_VERSION`: `3.11`

#### Optional Environment Variables (for provider-specific configs)

- `AZURE_BASE_URL`: Your Azure OpenAI endpoint (if using Azure)
- `DOUBAO_BASE_URL`: Doubao API base URL (if using Doubao)

**Note**: API keys are provided by users through the web interface, not stored as environment variables.

### 3. Configure Custom Domain (Optional)

1. In Cloudflare Dashboard → Pages → Your Project → Custom Domains
2. Add your domain (e.g., `trae-agent.yourdomain.com`)
3. Cloudflare will automatically handle SSL certificates

### 4. Enable Functions

Cloudflare Pages will automatically detect the `functions/` directory and enable Functions.

The API endpoint will be available at:
```
https://your-project.pages.dev/api/execute-task
```

## Local Development

### 1. Install Dependencies

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install project dependencies
pnpm install

# Install Python dependencies (optional for local testing)
uv sync  # or pip install -r requirements.txt
```

### 2. Build and Run Local Development Server

```bash
# Build the project
pnpm run build

# Serve built files locally
npm run dev

# Or use pnpm dev command
pnpm run dev:pnpm

# Or use Wrangler for full local development with Functions
wrangler pages dev build/client
```

### 3. Access the Application

Open your browser to:
- Static server: `http://localhost:8000`
- Wrangler dev: `http://localhost:8787`

## Deployment Options

### Option 1: Manual Deployment

```bash
# Build and deploy
pnpm install
pnpm run build
wrangler pages deploy build/client --project-name trae-agent-web

# Or use the automated script
./deploy.sh
```

### Option 2: Git Integration

1. Push your code to GitHub/GitLab
2. In Cloudflare Dashboard → Pages → Create a project
3. Connect your Git repository
4. Set build settings:
   - **Build command**: `npm install -g pnpm@9.0.0 && pnpm install && pnpm run build`
   - **Build output directory**: `/build/client`
   - **Root directory**: `/` (or your subdirectory)

### Option 3: CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build project
        run: pnpm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: trae-agent-web
          directory: build/client
```

## Configuration

### 1. Wrangler Configuration (`wrangler.toml`)

The provided `wrangler.toml` includes:
- Python 3.11 compatibility
- Proper build settings
- Environment configuration

### 2. Function Configuration

Python dependencies are automatically installed from `functions/requirements.txt`.

### 3. CORS Configuration

The API function includes proper CORS headers for web browser access.

## Security Considerations

1. **API Keys**: Users enter their own API keys, which are only used for the session
2. **Rate Limiting**: Consider implementing rate limiting for production use
3. **Input Validation**: The function validates all inputs before processing
4. **Error Handling**: Comprehensive error handling prevents information leakage

## Monitoring and Debugging

### 1. View Logs

```bash
wrangler pages deployment tail
```

### 2. Function Logs

In Cloudflare Dashboard → Pages → Your Project → Functions → View logs

### 3. Analytics

Cloudflare provides built-in analytics for:
- Page views
- Function invocations
- Performance metrics
- Error rates

## Troubleshooting

### Common Issues

1. **Import Errors in Functions**
   - Ensure all dependencies are in `functions/requirements.txt`
   - Check Python version compatibility

2. **CORS Errors**
   - Verify CORS headers in the function
   - Check browser console for specific errors

3. **Function Timeout**
   - Cloudflare Functions have a 30-second timeout
   - Complex tasks might need optimization

4. **Memory Limits**
   - Functions have 128MB memory limit
   - Large models or tasks might hit this limit

### Debug Mode

Set `DEBUG=true` in environment variables for verbose logging.

## Advanced Configuration

### 1. Custom Error Pages

Create custom error pages in `public/`:
- `404.html`: Page not found
- `500.html`: Server error

### 2. Performance Optimization

- Enable Cloudflare caching for static assets
- Use Cloudflare's minification features
- Enable Brotli compression

### 3. Security Headers

Add security headers in `public/_headers`:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' https://cdnjs.cloudflare.com
```

## Support

- **Cloudflare Docs**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **Wrangler CLI**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler)
- **Python Functions**: [developers.cloudflare.com/pages/platform/functions/plugins/python](https://developers.cloudflare.com/pages/platform/functions/plugins/python)

## Next Steps

1. Deploy your application
2. Test with different LLM providers
3. Customize the UI for your needs
4. Set up monitoring and alerts
5. Consider implementing user authentication for production use

Your Trae Agent web interface is now ready for Cloudflare Pages! 🚀