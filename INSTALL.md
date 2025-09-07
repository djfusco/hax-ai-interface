# 📦 HAX AI Interface - Installation Guide

Complete setup instructions for getting HAX AI Interface running on your system.

## 🚀 Quick Start (1 Minute Setup)

```bash
# Install and run immediately
npx hax-ai-interface
```

That's it! The interface will open in your browser at `http://localhost:3000`.

## 📋 System Requirements

- **Node.js** 16.0.0 or higher
- **npm** 7.0.0 or higher  
- **Operating System:** Windows 10+, macOS 10.15+, or Linux
- **Browser:** Chrome, Firefox, Safari, or Edge
- **Internet:** Required for AI features and deployment

### Check Your System
```bash
# Verify Node.js version
node --version

# Verify npm version  
npm --version
```

## 🛠️ Installation Methods

### Method 1: NPX (Recommended)
No installation required - runs the latest version each time:
```bash
npx hax-ai-interface
```

### Method 2: Global Install
Install once, run anywhere:
```bash
# Install globally
npm install -g hax-ai-interface

# Run from anywhere
hax-ai-interface
```

### Method 3: Local Project Install
For development or custom setups:
```bash
# Create project directory
mkdir my-hax-project
cd my-hax-project

# Install locally
npm init -y
npm install hax-ai-interface

# Run
npx hax-ai-interface
```

## 🔑 API Configuration (Optional but Recommended)

### Why Add an API Key?
- **Without API:** Uses smart pattern matching (works great!)
- **With API:** Advanced natural language understanding (even better!)

### Option 1: Anthropic Claude (Recommended)
1. **Sign up:** Visit [console.anthropic.com](https://console.anthropic.com)
2. **Add billing:** Required for API access
3. **Create key:** Go to API Keys → Create new key
4. **Configure:** The setup wizard will guide you, or add to `~/.hax-ai/.env`

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Option 2: OpenAI GPT
1. **Sign up:** Visit [platform.openai.com](https://platform.openai.com)
2. **Add billing:** Required for API access  
3. **Create key:** Go to API Keys → Create new secret key
4. **Configure:** Add to your environment

```env
OPENAI_API_KEY=sk-xxxxx
```

### Configuration Wizard
The first time you run HAX AI Interface, it will guide you through:
- ✅ API key setup (optional)
- ✅ Site storage location
- ✅ Deployment preferences
- ✅ Basic usage tutorial

## 🌐 Deployment Setup (Optional)

### Surge.sh Integration
For one-click website publishing:

1. **Install Surge:**
```bash
npm install -g surge
```

2. **Create Account:**
```bash
surge login
# Follow prompts to create account
```

3. **Get Token:**
```bash
surge token
# Copy the token
```

4. **Configure HAX AI:**
Add to `~/.hax-ai/.env`:
```env
SURGE_LOGIN=your-email@example.com
SURGE_TOKEN=your_token_here
```

Now you can say: **"Deploy my site"** for instant publishing!

## 📁 File Locations

### User Data Directory
Your sites and configuration are stored in:

**Windows:**
```
C:\Users\YourName\.hax-ai\
├── .env              # API keys and settings
├── sites\            # Your websites
│   ├── my-blog\
│   └── portfolio\
└── config.json       # User preferences
```

**macOS:**
```
/Users/YourName/.hax-ai/
├── .env              # API keys and settings  
├── sites/            # Your websites
│   ├── my-blog/
│   └── portfolio/
└── config.json       # User preferences
```

**Linux:**
```
/home/yourname/.hax-ai/
├── .env              # API keys and settings
├── sites/            # Your websites  
│   ├── my-blog/
│   └── portfolio/
└── config.json       # User preferences
```

### Custom Locations
You can change the storage location:
```bash
HAX_AI_HOME=/custom/path hax-ai-interface
```

## 🔧 Advanced Configuration

### Environment Variables
```bash
# API Configuration
ANTHROPIC_API_KEY=your_key        # Anthropic Claude
OPENAI_API_KEY=your_key           # OpenAI GPT

# Deployment  
SURGE_LOGIN=email@example.com     # Surge.sh email
SURGE_TOKEN=your_token            # Surge.sh token
SURGE_DOMAIN=mysite.surge.sh      # Default domain

# Interface Settings
PORT=3000                         # Server port
DEBUG=true                        # Enable debug logging
HAX_AI_HOME=/custom/path         # Storage location
```

### Configuration File
Edit `~/.hax-ai/config.json`:
```json
{
  "defaultPort": 3000,
  "autoOpenBrowser": true,
  "preferredAI": "anthropic",
  "theme": "default",
  "enableDeployment": true,
  "sitesDirectory": "sites"
}
```

## 🚨 Troubleshooting

### Installation Issues

**"npm command not found"**
```bash
# Install Node.js from nodejs.org
# Then verify:
node --version
npm --version
```

**"Permission denied" (Linux/Mac)**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**"Cannot find module" errors**
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install -g hax-ai-interface
```

### Runtime Issues

**"Port 3000 already in use"**
```bash
# Use different port
hax-ai-interface --port 3001

# Or set environment variable
PORT=3001 hax-ai-interface
```

**"Failed to start server"**
```bash
# Check if any process is using the port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use different port
```

**"API key not working"**
1. Verify the key format and copy-paste carefully
2. Check if you have billing enabled on your AI provider
3. Test with a simple command first
4. Check the debug logs: `DEBUG=true hax-ai-interface`

### Browser Issues

**"localhost refused connection"**
1. Make sure the server started successfully
2. Check the terminal for error messages
3. Try a different browser
4. Disable browser extensions temporarily

**"White screen or loading forever"**
1. Check browser console for errors (F12)
2. Clear browser cache and cookies
3. Try incognito/private browsing mode
4. Restart the server

### Site Building Issues

**"HAX command not found"**
The HAX CLI should install automatically. If not:
```bash
npm install -g @haxtheweb/create
```

**"Site won't build"**
1. Check that your site has the required files
2. Run the build manually: `cd sites/mysite && hax site build`
3. Check for syntax errors in your content
4. Verify file permissions

## 🔄 Updates

### Automatic Updates (NPX)
When using `npx hax-ai-interface`, you always get the latest version.

### Manual Updates (Global Install)
```bash
npm update -g hax-ai-interface
```

### Check Version
```bash
hax-ai-interface --version
```

## 🧪 Testing Your Installation

### 1. Basic Functionality
```bash
# Start the interface
hax-ai-interface

# Open browser to http://localhost:3000
# Try: "Create a site called test"
```

### 2. AI Features (if configured)
```bash
# Try: "Create a blog about cooking with 5 pages"
# Should work smoothly with natural language
```

### 3. Deployment (if configured)
```bash
# Try: "Deploy my test site"
# Should build and publish to Surge.sh
```

## 📞 Getting Help

### Self-Help
- Type **"help"** in the interface
- Check the debug logs: `DEBUG=true hax-ai-interface`  
- Review the main [README.md](README.md)

### Community Support
- **GitHub Issues:** [Report bugs](https://github.com/yourusername/hax-ai-interface/issues)
- **Discussions:** [Ask questions](https://github.com/yourusername/hax-ai-interface/discussions)
- **Documentation:** [Wiki](https://github.com/yourusername/hax-ai-interface/wiki)

### Emergency Reset
If everything breaks:
```bash
# Backup your sites first!
cp -r ~/.hax-ai/sites ~/hax-ai-backup

# Reset everything
rm -rf ~/.hax-ai

# Reinstall  
npm uninstall -g hax-ai-interface
npm install -g hax-ai-interface
```

---

**Ready to create amazing websites? Run: `npx hax-ai-interface`** 🚀
