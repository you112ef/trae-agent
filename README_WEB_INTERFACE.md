# Trae Agent - Web Interface for Cloudflare Pages

This directory contains the web interface version of Trae Agent, optimized for deployment on Cloudflare Pages with Python Functions support.

## 🌐 What's New

The original CLI-based Trae Agent has been enhanced with:

- **Modern Web Interface**: Beautiful, responsive UI built with Tailwind CSS
- **Real-time Chat Interface**: Interactive conversation with the agent
- **Multi-provider Support**: Easy switching between OpenAI, Anthropic, Azure, etc.
- **Cloud Deployment**: Runs on Cloudflare Pages with global edge distribution
- **Session Management**: Persistent configurations and chat history
- **File Management**: View created/modified files from agent tasks

## 🚀 Quick Deploy

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Deploy to Cloudflare Pages**:
   ```bash
   wrangler pages deploy public --project-name trae-agent-web
   ```

3. **Access your deployment**: Visit the provided URL (e.g., `https://trae-agent-web.pages.dev`)

## 📁 Project Structure

```
├── public/                 # Static web files
│   ├── index.html         # Main web interface
│   └── script.js          # Frontend JavaScript
├── functions/             # Cloudflare Functions (Python)
│   ├── api/
│   │   └── execute-task.py # Backend API endpoint
│   └── requirements.txt   # Python dependencies
├── wrangler.toml          # Cloudflare configuration
├── package.json           # Node.js metadata
└── CLOUDFLARE_DEPLOYMENT.md # Detailed deployment guide
```

## 🎯 Features

### Web Interface
- **Configuration Panel**: Set provider, model, API key, and max steps
- **Chat Interface**: Natural conversation with the agent
- **Example Tasks**: Quick-start buttons for common tasks
- **Results Panel**: View execution details, created files, and output
- **Status Indicators**: Real-time feedback on agent status

### Backend API
- **Task Execution**: Runs the full Trae Agent functionality
- **Multi-provider Support**: OpenAI, Anthropic, Azure, OpenRouter, Doubao
- **Trajectory Recording**: Detailed execution logs
- **File Tracking**: Monitor created/modified files
- **Error Handling**: Comprehensive error reporting

## 🔧 Configuration

### Environment Variables (Cloudflare Dashboard)
- `ENVIRONMENT`: `production`
- `PYTHON_VERSION`: `3.11`

### User Configuration (Web Interface)
- **Provider**: Choose LLM provider
- **Model**: Select specific model
- **API Key**: Enter your API key (session-only)
- **Max Steps**: Limit agent execution steps (1-50)

## 📖 Usage

1. **Open the web interface** in your browser
2. **Configure your settings** in the left panel:
   - Select your preferred LLM provider
   - Choose a model
   - Enter your API key
   - Set max execution steps
3. **Enter a task** in the chat interface
4. **Watch the agent work** with real-time status updates
5. **Review results** in the results panel

### Example Tasks
- "Create a Python script that calculates fibonacci numbers"
- "Write unit tests for a Python function"
- "Review and optimize this code for performance"
- "Create documentation for this project"

## 🔍 Monitoring

### Cloudflare Dashboard
- **Functions**: Monitor API calls and performance
- **Analytics**: View page views and user engagement
- **Logs**: Debug function execution in real-time

### Built-in Features
- Real-time status indicators
- Comprehensive error messages
- Execution trajectory recording
- File change tracking

## 🛡️ Security

- **API Keys**: Only stored in browser session, never persisted
- **Input Validation**: All inputs validated before processing
- **CORS Protection**: Proper cross-origin resource sharing
- **Error Handling**: No sensitive information leaked in errors

## 🔧 Development

### Local Testing
```bash
# Serve static files locally
npm run dev

# Full local development with Functions
wrangler pages dev public
```

### Custom Modifications
- **Styling**: Edit `public/index.html` and CSS
- **Functionality**: Modify `public/script.js`
- **Backend**: Update `functions/api/execute-task.py`
- **Configuration**: Adjust `wrangler.toml`

## 📚 Documentation

- **[Deployment Guide](CLOUDFLARE_DEPLOYMENT.md)**: Complete setup instructions
- **[Original README](README.md)**: CLI version documentation
- **[Cloudflare Docs](https://developers.cloudflare.com/pages)**: Platform documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test locally with `wrangler pages dev public`
4. Commit your changes
5. Deploy and test on Cloudflare Pages
6. Submit a pull request

## 📄 License

This project maintains the same MIT License as the original Trae Agent.

## 🙏 Acknowledgments

- Original Trae Agent team for the core functionality
- Cloudflare for the excellent Pages platform
- Tailwind CSS for the beautiful styling
- All LLM providers for making this possible

---

**Ready to deploy?** Follow the [Deployment Guide](CLOUDFLARE_DEPLOYMENT.md) for detailed instructions! 🚀