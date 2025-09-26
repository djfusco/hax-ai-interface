# 🚀 HAX AI Interface

Create and manage beautiful websites using simple conversation! No technical knowledge required.

[![npm version](https://badge.fury.io/js/hax-ai-interface.svg)](https://badge.fury.io/js/hax-ai-interface)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🗣️ Natural Language Interface** - Just talk to create websites
- **🏗️ Powered by HAX** - Professional website builder technology  
- **🤖 Smart AI Processing** - Works with or without API keys
- **📚 Resource-First Content Generation** - Upload your course materials and generate rich content from them
- **📄 Faculty-Setup Integration** - Perfect for educators creating course websites
- **📱 Responsive Design** - Beautiful interface that works everywhere
- **🚀 One-Click Publishing** - Deploy to the web instantly with Surge
- **💾 Local Storage** - Your sites stay on your computer
- **🔄 Live Preview** - See changes in real-time

## 🎯 Quick Start

```bash
npx hax-ai-interface
```

That's it! The interface will open in your browser and guide you through everything.

## 🎓 Perfect for Faculty & Educators

**HAX AI Interface revolutionizes how educators create course websites:**

✨ **Upload your textbooks, PDFs, and course materials**  
🤖 **AI reads and understands your content**  
📄 **Generates professional pages using YOUR materials as the primary source**  
🚀 **No technical knowledge required - just natural conversation**  

**Example:** Upload your biology textbook → Ask "Create a page about photosynthesis" → Get detailed, textbook-accurate content with proper scientific terminology, not generic AI-generated text.

### 👩‍🏫 Faculty Success Stories

- **Dr. Smith (Anatomy):** Uploaded 450MB anatomy textbook, generated 20+ lesson pages in 30 minutes
- **Prof. Johnson (Chemistry):** Created comprehensive lab manual from research protocols  
- **Ms. Garcia (History):** Built interactive timeline site from primary source documents

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
- "Create a site called anatomy-101" *(Perfect for course sites)*

### Adding Content (Basic)
- "Add a page called About with information about myself"
- "Create a contact page with my email"
- "Add a blog post about my vacation"

### Adding Content (Resource-First for Educators)
- "Create a new page about the circulatory system" *(Uses your uploaded textbooks/PDFs)*
- "Add a page about photosynthesis" *(Pulls from your biology resources)*
- "Create a lesson page about World War 2" *(Based on your history documents)*

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

### 🎓 Faculty Workflow (Resource-First Content Generation)

#### Step 1: Create Course Site
```
You: "Create a site called biology-101"
AI: ✅ Creates the site with all necessary files
```

#### Step 2: Initialize Course Resources
In the **Course Resources** panel at bottom of interface:
1. Select "biology-101" from dropdown
2. Click **"Initialize Resources"**
3. Upload your textbook PDFs, lecture notes, etc.
4. Add relevant URLs (research papers, videos, etc.)

#### Step 3: Generate Rich Content from Your Materials
```
You: "Create a new page about cellular respiration"
AI: ✅ Reads your biology textbook PDF
    ✅ Extracts relevant information about cellular respiration  
    ✅ Generates 3 detailed paragraphs using YOUR textbook content
    ✅ Creates page with college-level terminology and accuracy

Result: Professional page with content like:
"Cellular respiration is a metabolic process that converts glucose 
into ATP through three main stages: glycolysis, the citric acid cycle, 
and the electron transport chain. The process occurs in the 
mitochondria and produces approximately 36-38 ATP molecules..."
```

#### Step 4: Continue Building Course Content
```
You: "Add a page about photosynthesis"
AI: ✅ Uses your uploaded biology resources as primary source
    ✅ Creates detailed content about light-dependent reactions,
        Calvin cycle, and chloroplast structure

You: "Create a lesson about DNA replication" 
AI: ✅ Pulls from your genetics textbook chapters
    ✅ Includes proper terminology: DNA polymerase, Okazaki fragments, etc.
```

### 📚 Real Example: Anatomy Course

**What You Upload:**
- `Anatomy_and_Physiology_2e.pdf` (451 MB textbook)
- `lecture-notes-cardiovascular.txt`
- URLs to medical animations and research papers

**What You Get:**
```
You: "Create a new page about the heart"

AI Generates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 CARDIAC MUSCLE AND ELECTRICAL ACTIVITY

• The cardiac muscle, also known as the myocardium, is the 
  muscular middle layer of the heart wall composed of specialized 
  cardiac muscle cells called cardiomyocytes.

• The electrical activity is controlled by a specialized conduction 
  system including the sinoatrial (SA) node, atrioventricular 
  (AV) node, and Purkinje fibers.

• This system generates and transmits electrical impulses to 
  stimulate contractions in a coordinated sequence throughout 
  the heart chambers.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**The AI used YOUR textbook content, not generic information!**

### 🌍 Traditional Blog Workflow
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

## 🔧 Advanced Features
```
You: "Edit the About page to include my hobbies"
AI: ✅ Helps you modify existing content

You: "Change the site theme to something modern"
AI: ✅ Updates the visual design

You: "Add a contact form to the contact page"
AI: ✅ Adds interactive elements
```

## 🆚 Resource-First vs Generic AI

### ❌ **Generic AI Tools**
```
You: "Create a page about mitosis"
Generic AI: "Mitosis is a process where cells divide..."
```
*→ Basic, textbook-generic content*
*→ May contain inaccuracies*  
*→ Not aligned with your curriculum*

### ✅ **HAX AI Interface (Resource-First)**
```
You: "Create a page about mitosis"
HAX AI: Reads your uploaded biology textbook...
        Extracts specific information about mitosis...
        Generates content using YOUR textbook's terminology...
        
        "Mitosis consists of prophase, prometaphase, metaphase, 
        anaphase, and telophase. During prophase, chromatin 
        condenses into visible chromosomes, each consisting 
        of two sister chromatids joined at the centromere..."
```
*→ Uses YOUR course materials as the primary source*  
*→ Maintains academic accuracy and your preferred terminology*  
*→ Aligned with your specific curriculum and textbooks*  
*→ Creates content that matches your teaching style*

**This is the difference between generic AI and intelligent resource-first content generation.**

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

### Course Resource Management
- **Course Resources Panel**: Simple interface to upload PDFs, documents, and URLs
- **Resource-First Generation**: Content is created from YOUR materials, not generic AI knowledge
- **Supported Formats**: PDFs, text files, markdown, HTML, and more
- **Faculty-Setup Integration**: Designed specifically for educators and course creation

### Adding Custom Content
- Ask the AI to add specific content types
- Upload course materials and let AI generate content from them
- Use HAX's built-in components and layouts

## 📚 Course Resources Guide

### Setting Up Course Resources

1. **Initialize Resources**
   - Scroll to bottom of interface
   - Find "Course Resources" panel
   - Select your site from dropdown
   - Click "Initialize Resources"

2. **Upload Course Materials**
   - **PDFs**: Textbooks, research papers, handouts
   - **Documents**: Lecture notes, syllabi, assignments
   - **URLs**: Educational videos, online resources, research links

3. **Generate Content**
   - Simply ask: "Create a page about [topic]"
   - AI reads your uploaded materials FIRST
   - Generates content based on YOUR resources
   - Falls back to general knowledge only if needed

### Supported File Types
- ✅ **PDF** - Textbooks, research papers, handouts
- ✅ **TXT** - Plain text notes and documents  
- ✅ **MD** - Markdown formatted content
- ✅ **HTML** - Web-formatted documents
- ✅ **CSV** - Data and spreadsheets
- ✅ **JSON** - Structured data files

### Faculty Use Cases
- **📖 Course Websites** - Upload textbooks, generate lesson pages
- **🔬 Lab Manuals** - Create lab procedures from your protocols
- **📊 Research Sites** - Generate content from your papers and data
- **👩‍🏫 Online Courses** - Build comprehensive course materials

## 🆘 Getting Help

### In the Interface
- Type **"help"** for available commands
- Use the example buttons in the sidebar
- The AI provides guidance for errors
- **Course Resources panel** at bottom for file management

### Common Issues
- **Stuck?** Refresh your browser and try again
- **Error messages?** Copy them - the AI can help debug
- **Site not working?** Preview locally first: "preview my site"
- **Resources not loading?** Click "Refresh Sites & Resources" button

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