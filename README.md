# 🚀 HAX AI Interface

Create and manage beautiful websites using simple conversation! No technical knowledge required.

[![npm version](https://badge.fury.io/js/hax-ai-interface.svg)](https://badge.fury.io/js/hax-ai-interface)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🗣️ Natural Language Interface** - Just talk to create websites
- **🏗️ Powered by HAX** - Professional website builder technology  
- **🤖 Smart AI Processing** - Works with or without API keys
- **📱 Responsive Design** - Beautiful interface that works everywhere
- **🚀 One-Click Publishing** - Deploy to the web instantly with Surge
- **💾 Local Storage** - Your sites stay on your computer
- **🔄 Live Preview** - See changes in real-time

## 🎯 Quick Start

```bash
npx hax-ai-interface
```

That's it! The interface will open in your browser and guide you through everything.

---

## 🏁 Step-by-Step Setup Guide

### 1. Install Node.js (One-Time)

- Go to [nodejs.org](https://nodejs.org)
- Download the **LTS** version for your computer (Windows, Mac, or Linux)
- Open the installer and follow the instructions
- After installing, open your **Terminal** and type:
  ```bash
  node -v
  ```
  If you see a version number, Node.js is installed!


### 2. Install and Set Up Surge (One-Time for Publishing)

Surge lets you put your site online for free.

- In your **Terminal**, run:
  ```bash
  npm install -g surge
  ```
- Then log in to Surge (only needed once):
  ```bash
  surge login
  ```
  Enter your email and password when prompted.

- If you don't have a Surge account, sign up at [surge.sh](https://surge.sh).

---

## 📋 What You Can Say

### Creating Sites
- "Create a blog site called my-adventures"
- "Make a portfolio website" 
- "Create a business site for my bakery"

### Adding Content  
- "Add a page called About with information about myself"
- "Create a contact page with my email"
- "Add a blog post about my vacation"

### Managing Sites
- "Show me all my websites"
- "List the pages in my blog"
- "Preview my portfolio site"

### Publishing
- "Publish my site to the web"
- "Deploy my blog to myblog.surge.sh"
- "Put my portfolio online"

## 🔧 Setup Options

### Basic Setup (Works Great!)
Just run `npx hax-ai-interface` - uses smart pattern matching to understand your commands.

### Enhanced AI Setup (Recommended)
For even better natural language understanding, add an AI API key:

1. **Get an API key:**
   - [OpenAI](https://platform.openai.com/api-keys) (recommended)
   - [Anthropic Claude](https://console.anthropic.com/)

2. **Configure it:**
   - The setup wizard will guide you through this
   - Or manually edit `~/.hax-ai/.env`

## 📁 File Organization

Your websites are saved locally in:
- **Windows:** `C:\Users\YourName\.hax-ai\sites\`
- **Mac:** `/Users/YourName/.hax-ai/sites/`  
- **Linux:** `/home/yourname/.hax-ai/sites/`

Each site gets its own folder with all files included.

## 🌐 Publishing Your Sites

### Automatic (Recommended)
Just say: **"Publish my site to the web"**

The AI will:
1. Build your site automatically
2. Deploy to [Surge.sh](https://surge.sh) (free hosting)
3. Give you a live URL like `https://my-site-12345.surge.sh`

### Custom Domain
Say: **"Deploy my site to mysite.surge.sh"** for a custom domain.

## 💡 Examples

### Complete Workflow
```
You: "Create a blog site called travel-diary"
AI: ✅ Creates the site with all necessary files

You: "Add a page about my trip to Japan"  
AI: ✅ Adds page with starter content

You: "Preview the site"
AI: ✅ Opens http://localhost:3000 in your browser

You: "Publish it to the web"
AI: ✅ Deploys to https://travel-diary-12345.surge.sh
```

### Advanced Features
```
You: "Edit the About page to include my hobbies"
AI: ✅ Helps you modify existing content

You: "Change the site theme to something modern"
AI: ✅ Updates the visual design

You: "Add a contact form to the contact page"
AI: ✅ Adds interactive elements
```

## 🛠️ Requirements

- **Node.js** 16+ (Download from [nodejs.org](https://nodejs.org))
- **Internet connection** (for AI features and publishing)
- **Any modern browser**

## 🔍 Troubleshooting

### "Command not found: npx"
**Solution:** Install Node.js from [nodejs.org](https://nodejs.org)

### "Port already in use"
**Solution:** 
```bash
npx hax-ai-interface --port 3002
```

### "AI not responding well"
**Solutions:**
- Add an OpenAI or Anthropic API key for better AI
- Use specific commands: "Create a site called blog"
- Check the examples section for working phrases

### "Site won't publish"
**Solutions:**
```bash
# Install Surge globally if needed
npm install -g surge

# Login to Surge (one-time setup)
surge login
```

## 🎨 Customization

### Themes and Styling
- HAX sites come with professional themes
- Customize through the AI: "Change my site theme"
- Advanced users can edit files directly

### Adding Custom Content
- Ask the AI to add specific content types
- Upload images and files to your site folder
- Use HAX's built-in components and layouts

## 🆘 Getting Help

### In the Interface
- Type **"help"** for available commands
- Use the example buttons in the sidebar
- The AI provides guidance for errors

### Common Issues
- **Stuck?** Refresh your browser and try again
- **Error messages?** Copy them - the AI can help debug
- **Site not working?** Preview locally first: "preview my site"

## 🔒 Privacy & Security

- **Local-First:** Your sites are stored on your computer
- **API Keys:** Stored locally, never shared
- **No Tracking:** No analytics or data collection
- **Open Source:** Full transparency in code

## 🚀 Advanced Usage

### Command Line Options
```bash
npx hax-ai-interface --port 3002     # Use different port
npx hax-ai-interface --help          # Show all options  
npx hax-ai-interface --reset         # Reset configuration
```

### Environment Variables
```bash
# Set API key via environment
OPENAI_API_KEY=your_key npx hax-ai-interface

# Enable debug mode
DEBUG=true npx hax-ai-interface
```

### Programmatic Usage
```javascript
const { SmartAIProcessor } = require('hax-ai-interface/lib/ai-processor');

const processor = new SmartAIProcessor();
const result = await processor.processCommand('Create a site called test');
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/yourusername/hax-ai-interface.git
cd hax-ai-interface
npm install
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[HAX The Web](https://haxtheweb.org)** - The amazing website building platform
- **[Surge.sh](https://surge.sh)** - Simple, free website hosting
- **[OpenAI](https://openai.com)** & **[Anthropic](https://anthropic.com)** - AI language models

## 📞 Support

- **Documentation:** [GitHub Wiki](https://github.com/yourusername/hax-ai-interface/wiki)
- **Issues:** [GitHub Issues](https://github.com/yourusername/hax-ai-interface/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/hax-ai-interface/discussions)

---

**Made with ❤️ for the HAX community**

Start creating amazing websites today: `npx hax-ai-interface`