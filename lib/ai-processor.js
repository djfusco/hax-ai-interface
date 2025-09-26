/**
 * HAX AI Processor - Hybrid AI approach for command processing
 * Supports OpenAI, Anthropic, and smart pattern matching fallbacks
 * Enhanced with LangChain agents, PRAW rules integration, and dynamic learning
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// LangChain imports - using correct paths for v0.2+
let createReactAgent, AgentExecutor;
try {
  // Try different possible import paths for LangChain
  try {
    const langchainAgents = require('@langchain/langgraph/prebuilt');
    createReactAgent = langchainAgents.createReactAgent;
  } catch (e) {
    try {
      const langchainCore = require('langchain/agents');
      createReactAgent = langchainCore.createReactAgent;
      AgentExecutor = langchainCore.AgentExecutor;
    } catch (e2) {
      console.log('LangChain agent imports not available, using basic AI processing');
    }
  }
} catch (error) {
  console.log('LangChain not fully available, using fallback approach');
}

class SmartAIProcessor {
  constructor(options = {}) {
    this.hasOpenAI = !!process.env.OPENAI_API_KEY;
    this.hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    this.hasAPIKey = this.hasOpenAI || this.hasAnthropic;
    this.conversationHistory = [];
    this.debugMode = true; // Force debug mode for troubleshooting
    this.initialized = false;
    this.aiProvider = 'none';
    
    // Initialize AI if available
    if (this.hasAPIKey) {
      this.initializeAI();
    } else {
      this.log('💡 No AI API key found, using pattern matching');
    }

    // Cache for PRAW rules
    this.prawRules = '';
    this.loadPrawRules(); // Load rules on init
  }

  initializeAI() {
    try {
      this.log('🔄 Using direct AI approach (LangChain disabled for stability)');
      this.initializeDirectAI();
      this.systemPrompt = 'You are a HAX ecosystem expert. Convert user inputs into valid HAX CLI commands, following provided rules. If input is unclear, ask for clarification. Validate outputs against rules for architecture, design, and accessibility. Respond with JSON: {explanation: string, commands: array of strings, success: boolean, error?: string}';
    } catch (error) {
      this.log('⚠️ AI initialization failed, using pattern matching:', error.message);
      this.log('⚠️ Error stack:', error.stack);
      this.hasAPIKey = false;
      this.ai = null;
      this.initialized = false;
    }
  }

  // Initialize AI without LangChain agents (fallback approach)
  initializeDirectAI() {
    try {
      if (this.hasOpenAI) {
        const { OpenAI } = require('openai');
        this.ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.aiProvider = 'openai';
        this.log('🤖 OpenAI initialized (direct mode)');
      } else if (this.hasAnthropic) {
        const { Anthropic } = require('@anthropic-ai/sdk');
        this.ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        this.aiProvider = 'anthropic';
        this.log('🤖 Anthropic Claude initialized (direct mode)');
      }
      this.initialized = true;
    } catch (error) {
      this.log('⚠️ Direct AI initialization failed:', error.message);
      this.hasAPIKey = false;
      this.ai = null;
      this.initialized = false;
    }
  }

  // Get processor status (for server.js)
  getStatus() {
    return {
      initialized: this.initialized,
      aiProvider: this.aiProvider,
      hasAPIKey: this.hasAPIKey,
      rulesLoaded: !!this.prawRules,
      error: this.initialized ? null : 'AI initialization failed, using pattern matching'
    };
  }

  // Load and parse PRAW rules from GitHub or local clone
  async loadPrawRules() {
    try {
      // Dynamically import marked (ESM module)
      const { marked } = await import('marked');

      // Fetch from GitHub for dynamic updates
      const response = await axios.get('https://api.github.com/repos/haxtheweb/praw/contents/RULES.md', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      const rulesContent = Buffer.from(response.data.content, 'base64').toString('utf8');

      // Parse markdown into structured JSON
      const tokens = marked.lexer(rulesContent);
      const parsedRules = tokens
        .filter(token => token.type === 'list_item')
        .map(token => ({
          id: token.text.match(/r[A-Za-z0-9]+/)?.[0] || 'unknown',
          category: token.text.match(/\((architecture|design-system|webcomponent|build-workflow|documentation|project-specific)\)/)?.[1] || 'general',
          text: token.text,
        }));

      // Fetch additional WARP.md (example for webcomponents)
      const warpResponse = await axios.get('https://api.github.com/repos/haxtheweb/praw/contents/webcomponents/WARP.md');
      const warpContent = Buffer.from(warpResponse.data.content, 'base64').toString('utf8');
      this.prawRules = `HAX Rules:\n${rulesContent}\nWeb Component Rules:\n${warpContent}`;

      // Update system prompt with rules
      this.systemPrompt += `\nFollow these HAX ecosystem rules: ${this.prawRules}`;
      this.log('✅ PRAW rules loaded and integrated');

    } catch (error) {
      this.log('Failed to load PRAW rules:', error.message);
      this.prawRules = 'Default HAX rules: Use standard HAX CLI commands and best practices.';
      this.systemPrompt += `\n${this.prawRules}`;
    }
  }

  // Main processing method - prefer AI with rules if available
  async process(userInput, context) {
    try {
      this.log('Processing input:', userInput);
      this.log('Context:', context);

      if (this.hasAPIKey && this.ai && this.initialized) {
        this.log('Using enhanced AI processing with PRAW rules...');
        return await this.processWithAI(userInput, context);
      } else {
        this.log('Using pattern matching fallback...');
        return await this.processWithPatterns(userInput, context);
      }

    } catch (error) {
      this.log('Processing error:', error.message);
      return {
        explanation: `Sorry, I encountered an error: ${error.message}`,
        commands: [],
        success: false,
        error: error.message
      };
    }
  }

  // Enhanced AI processing with LangChain agent and PRAW rules
  async processWithAI(userInput, context) {
    try {
      let response;
      const systemPrompt = await this.buildSystemPrompt(context);

      this.log('🔍 Using direct AI processing');

      if (this.ai) {
        // Use direct AI approach
        if (this.aiProvider === 'openai') {
          const messages = [
            { role: "system", content: systemPrompt },
            ...this.conversationHistory,
            { role: "user", content: userInput }
          ];

          const completion = await this.ai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages,
            max_tokens: 800,
            temperature: 0.7
          });

          response = completion.choices[0].message.content;
        } else if (this.aiProvider === 'anthropic') {
          // Build messages array for Anthropic
          const messages = [
            ...this.conversationHistory,
            { role: "user", content: userInput }
          ];

          this.log('🔍 Direct Anthropic - userInput:', JSON.stringify(userInput));
          this.log('🔍 Direct Anthropic - conversationHistory.length:', this.conversationHistory.length);
          this.log('🔍 Direct Anthropic - messages:', JSON.stringify(messages));
          this.log('🔍 Direct Anthropic - messages.length:', messages.length);
          this.log('🔍 Direct Anthropic - making API call...');

          const completion = await this.ai.messages.create({
            model: "claude-3-haiku-20240307",
            system: systemPrompt,
            messages,
            max_tokens: 800
          });

          this.log('✅ Direct Anthropic - API call successful');
          response = completion.content[0].text;
          this.log('🔍 Direct Anthropic - response preview:', response.substring(0, 100) + '...');
        }
      }

      // Add to conversation history
      this.addToHistory(userInput, response);

      // Parse the AI response
      this.log('🔍 Parsing AI response...');
      this.log('🔍 Full AI response:', response);
      const parsedResult = this.parseAIResponse(response, true);
      this.log('🔍 Parsed result:', JSON.stringify(parsedResult));
      return parsedResult;

    } catch (error) {
      this.log('AI processing failed:', error.message);
      return await this.processWithPatterns(userInput, context);
    }
  }

  // Build comprehensive system prompt with context and rules
  async extractTextFromResource(fullPath) {
    try {
      const lower = fullPath.toLowerCase();
      if (lower.endsWith('.pdf')) {
        // Extract text from PDF using pdf-parse
        const pdf = require('pdf-parse');
        const buf = await fs.readFile(fullPath); // Buffer
        const data = await pdf(buf);
        return (data.text || '').replace(/\s+/g, ' ').trim();
      }
      // Treat these as text-based
      if (/(\.txt|\.md|\.html?|\.csv|\.json)$/i.test(lower)) {
        const content = await fs.readFile(fullPath, 'utf8');
        // crude strip HTML tags for html
        return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      // Unsupported types return empty string (could be extended later)
      return '';
    } catch (e) {
      this.log('Resource extraction failed for', fullPath, e.message);
      return '';
    }
  }

  async buildResourcesSummary(context) {
    try {
      const { currentSite, sitesDir } = context;
      this.log('🔍 buildResourcesSummary - currentSite:', currentSite);
      if (!currentSite) return '';
      const resourcesDir = path.join(sitesDir, currentSite, 'faculty-resources');
      this.log('🔍 buildResourcesSummary - resourcesDir:', resourcesDir);
      // Gather URLs
      let urls = [];
      let notes = '';
      try {
        const meta = await fs.readFile(path.join(resourcesDir, 'resources.json'), 'utf8');
        const parsed = JSON.parse(meta);
        urls = parsed.urls || [];
        notes = parsed.notes || '';
      } catch {}
      // Gather small snippets from text-like files
      let snippets = [];
      try {
        const entries = await fs.readdir(resourcesDir, { withFileTypes: true });
        const files = entries.filter(e => e.isFile() && !e.name.endsWith('.json'));
        this.log('🔍 buildResourcesSummary - found files:', files.map(f => f.name));
        for (const f of files.slice(0, 10)) { // limit to first 10 files
          const full = path.join(resourcesDir, f.name);
          this.log('🔍 buildResourcesSummary - processing file:', f.name);
          const text = await this.extractTextFromResource(full);
          this.log('🔍 buildResourcesSummary - extracted text length:', text.length);
          if (text) {
            snippets.push(text.substring(0, 1200)); // cap per file
          }
        }
      } catch {}
      this.log('🔍 buildResourcesSummary - final counts:', { urls: urls.length, snippets: snippets.length, notes: notes.length });
      if (urls.length === 0 && snippets.length === 0 && !notes) {
        this.log('🔍 buildResourcesSummary - no resources found, returning empty');
        return '';
      }
      const urlList = urls.map(u => `- ${u.url}${u.description ? `: ${u.description}` : ''}`).join('\n');
      const snippetJoined = snippets.join('\n---\n');
      const summary = `\nCOURSE RESOURCES (PRIMARY SOURCE)\nURLs:\n${urlList || '(none)'}\nNotes:\n${notes || '(none)'}\nLocal Snippets:\n${snippetJoined || '(none)'}\n`;
      this.log('🔍 buildResourcesSummary - returning summary length:', summary.length);
      return summary;
    } catch {
      return '';
    }
  }

  async buildSystemPrompt(context) {
    const { availableSites, currentSite, sitesDir } = context;
    const resourcesSummary = await this.buildResourcesSummary(context);
    
    return `You are a helpful HAX website assistant. Convert user requests into HAX CLI commands and provide friendly explanations.

CONTEXT:
- Sites directory: ${sitesDir}
- Available sites: ${availableSites?.join(', ') || 'none'}
- CURRENT SELECTED SITE: ${currentSite || 'none selected'}
- HAX CLI is installed and available

IMPORTANT: When a site is selected, ALL operations happen within that site. Page names like "intro3", "about", etc. are content pages within the selected site, NOT separate sites.

HAX RULES:
${this.prawRules}

${resourcesSummary ? `${resourcesSummary}\nIMPORTANT: Prefer facts, terminology, and structure from COURSE RESOURCES when generating content. Use the LLM only to help draft wording or fill gaps.` : ''}

AVAILABLE COMMANDS:
1. CREATE SITE: hax site start --name [sitename] --y
2. ADD PAGE TO SELECTED SITE: hax site node:add --node-op create --title "[title]" --content "[content]" --y
   (This creates a new page in the currently selected site - do NOT use --path or --site flags)
3. PREVIEW SELECTED SITE: hax serve --path "${sitesDir}/${currentSite || 'SITENAME'}"
4. PUBLISH SELECTED SITE: hax site site:surge --domain [domain]
5. LIST PAGES IN SELECTED SITE: cat "${sitesDir}/${currentSite || 'SITENAME'}/site.json"

IMPORTANT PAGE TITLE RULES:
- NEVER use colons (:) in page titles - they break URL navigation
- Avoid special characters: : ; | \ / ? # [ ] @ ! $ & ' ( ) * + , = %
- Use simple titles like "Chapter 1 Introduction" instead of "Chapter 1: Introduction"
- Replace colons with dashes: "Biology Lab" not "Biology: Lab"
- Keep titles clean and URL-friendly

RESPONSE FORMAT:
Always respond with JSON:
{
  "explanation": "Friendly explanation of what will be done",
  "commands": ["complete hax command with all arguments on one line"],
  "success": true,
  "nextSteps": "Optional next steps or tips"
}

IMPORTANT: 
- Each command in the commands array must be a complete, single-line HAX command
- When adding content to the selected site, DO NOT use --path or --site flags
- The working directory is already set to the selected site
- For multi-line content, escape quotes and newlines properly

Example for adding a page to the selected site: 
"commands": ["hax site node:add --node-op create --title \"My Quiz\" --content \"<quiz-element><h2>Quiz</h2></quiz-element>\" --y"]

CORRECT TITLE EXAMPLES:
- "Chapter 1 Introduction to Biology" ✅
- "Lab Exercise Cellular Structure" ✅  
- "Quiz Cardiovascular System" ✅

INCORRECT TITLE EXAMPLES:
- "Chapter 1: Introduction to Biology" ❌ (colon breaks URLs)
- "Lab Exercise - Cellular Structure" ❌ (can cause issues)
- "Quiz: Cardiovascular System" ❌ (colon breaks URLs)

When user mentions page names like "intro3 page", "about page", treat these as the title/content for a new page in the selected site.

Be encouraging and helpful - this is for non-technical users!`;
  }

  // Parse AI response (enhanced for agent output)
  parseAIResponse(response, isAI = false) {
    this.log('🔍 parseAIResponse - input length:', response.length);
    this.log('🔍 parseAIResponse - first 50 chars:', JSON.stringify(response.substring(0, 50)));
    this.log('🔍 parseAIResponse - last 50 chars:', JSON.stringify(response.substring(response.length - 50)));
    
    try {
      // First try to parse the entire response as JSON
      this.log('🔍 parseAIResponse - attempting direct JSON.parse');
      const parsed = JSON.parse(response);
      this.log('🔍 parseAIResponse - direct parse success');
      return {
        explanation: parsed.explanation || '',
        commands: parsed.commands || [],
        success: parsed.success || false,
        error: parsed.error || undefined,
      };
    } catch (parseError) {
      this.log('🔍 parseAIResponse - direct parse failed:', parseError.message);
      try {
        // Try to extract JSON from response (look for { ... })
        this.log('🔍 parseAIResponse - attempting regex extraction');
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          this.log('🔍 parseAIResponse - regex found match, length:', jsonMatch[0].length);
          const parsed = JSON.parse(jsonMatch[0]);
          this.log('🔍 parseAIResponse - regex parse success');
          return {
            explanation: parsed.explanation || '',
            commands: parsed.commands || [],
            success: parsed.success || false,
            error: parsed.error || undefined,
          };
        } else {
          this.log('🔍 parseAIResponse - no regex match found');
        }
      } catch (jsonError) {
        this.log('🔍 parseAIResponse - regex parse failed:', jsonError.message);
        // JSON extraction failed, continue to fallback
      }
      
      // Fallback parsing - look for hax commands in text
      const lines = response.split('\n');
      const commands = lines.filter(line => line.trim().startsWith('hax '));
      return {
        explanation: lines[0] || 'Processed with AI',
        commands,
        success: commands.length > 0,
        error: commands.length === 0 ? 'No valid commands generated' : undefined,
      };
    }
  }

  // Process input using pattern matching (fallback method)
  async processWithPatterns(userInput, context) {
    if (!userInput || typeof userInput !== 'string') {
      return {
        explanation: "Please provide a valid command. Try 'help' for available commands.",
        commands: [],
        success: false,
        error: 'Invalid input'
      };
    }

    const input = userInput.toLowerCase().trim();
    const { availableSites, currentSite, sitesDir } = context;

    this.log('🔍 Processing with pattern matching:', input);

    // Check for quiz creation
    if (this.matchesQuizCreation(input)) {
      return await this.handleCreateQuiz(input, context, currentSite, this.extractPageSource(input), this.extractContent(input));
    }

    // Check for page creation
    if (this.matchesPageCreation(input)) {
      const pageTitle = this.extractPageTitle(input);
      const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
      
      if (!siteName) {
        return this.askForSiteSelection(availableSites, 'add a page to');
      }
      
      if (!pageTitle) {
        return {
          explanation: "What would you like to call the new page?",
          commands: [],
          success: true,
          examples: [`Add a page called About to ${siteName}`]
        };
      }

      // Generate basic content based on local resources if available (resource-first)
      const generated = await this.generateBasicContentFromResources({ topic: pageTitle, sitesDir, siteName });
      const contentFlag = generated ? ` --content "${generated.replace(/"/g, '\\"')}"` : '';
      const command = `hax site node:add --node-op create --title "${pageTitle}"${contentFlag} --y`;
      return {
        explanation: `I'll add a new page called "${pageTitle}" to your ${siteName} site${generated ? ' with content based on your course resources' : ''}.`,
        commands: [command],
        success: true,
        runFromSiteDir: `${sitesDir}/${siteName}`
      };
    }

    // Default response for unmatched patterns
    return this.getDefaultResponse(input);
  }

  // Helper methods for pattern matching
  matchesQuizCreation(input) {
    return /add.*quiz|create.*quiz|quiz.*about/i.test(input);
  }

  matchesPageCreation(input) {
    return /add.*page|create.*page|new.*page/i.test(input);
  }

  extractPageTitle(input) {
    const match = input.match(/(?:page|called)\s+([a-zA-Z0-9_\-]+)/i);
    return match ? this.sanitizePageTitle(match[1]) : null;
  }

  // Sanitize page titles to prevent URL-breaking characters
  sanitizePageTitle(title) {
    if (!title) return title;
    return title
      // Replace colons with spaces (most common issue)
      .replace(/:/g, ' ')
      // Replace other problematic characters with spaces or remove
      .replace(/[;|\\\/?#\[\]@!$&'()*+,=%]/g, ' ')
      // Replace multiple spaces with single spaces
      .replace(/\s+/g, ' ')
      // Trim and clean up
      .trim();
  }

  extractPageSource(input) {
    const match = input.match(/to\s+(?:the\s+)?([a-zA-Z0-9_\-]+)\s+page/i);
    return match ? match[1] : null;
  }

  extractContent(input) {
    const match = input.match(/about\s+(.+?)(?:\s+to\s+|$)/i);
    return match ? match[1].trim() : null;
  }

  extractSiteFromInput(input, availableSites) {
    for (const site of availableSites) {
      if (input.includes(site)) {
        return site;
      }
    }
    return null;
  }

  askForSiteSelection(availableSites, action = 'work with') {
    if (availableSites.length === 0) {
      return {
        explanation: "You don't have any sites yet. Let's create your first one!",
        commands: [],
        success: true,
        suggestion: 'Try: "Create a site called my-first-site"'
      };
    }
    
    return {
      explanation: `Which site would you like to ${action}? You have: ${availableSites.join(', ')}`,
      commands: [],
      success: true,
      availableSites: availableSites,
      needsSiteSelection: true
    };
  }

  getDefaultResponse(input) {
    return {
      explanation: `I'm not sure how to handle "${input}". Here are some things you can try:`,
      commands: [],
      success: true,
      suggestions: [
        "Add a quiz about sharks to the intro3 page",
        "Create a page called About",
        "Add a page called Contact to mysite"
      ]
    };
  }

  // Faculty-specific: Create course resource folder (port of PRAW faculty-setup.sh)
  async setupCourseFolder(courseName) {
    try {
      const coursePath = path.join(process.env.HOME || process.env.USERPROFILE, '.hax-ai/sites', courseName);
      await fs.mkdir(coursePath, { recursive: true });
      const command = `hax site start ${courseName} --type course`;
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        return { success: false, message: `Error creating course: ${stderr}` };
      }
      return { success: true, message: `Course folder created for ${courseName} at ${coursePath}\n${stdout}` };
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  // Faculty-specific: Add web resource (port of PRAW add-url-resource.sh)
  async addUrlResource(courseName, url, description) {
    try {
      const coursePath = path.join(process.env.HOME || process.env.USERPROFILE, '.hax-ai/sites', courseName);
      const resourceFile = path.join(coursePath, 'resources.json');
      let resources = [];
      try {
        resources = JSON.parse(await fs.readFile(resourceFile, 'utf8'));
      } catch {}
      resources.push({ url, description, added: new Date().toISOString() });
      await fs.writeFile(resourceFile, JSON.stringify(resources, null, 2));
      return { success: true, message: `Added resource ${url} to ${courseName}` };
    } catch (error) {
      return { success: false, message: `Error adding resource: ${error.message}` };
    }
  }

  // Original methods from ai-processorORIG.js
  validateNames(siteName, pageTitle) {
    if (siteName && !/^[a-zA-Z0-9_]+$/.test(siteName)) {
      throw new Error("Invalid site name. Use only letters, numbers, and underscores.");
    }
    if (pageTitle && !/^[a-zA-Z0-9_\s\?\,\-]+$/.test(pageTitle)) {
      throw new Error(`Invalid page title '${pageTitle}'. Use only letters, numbers, spaces, underscores, hyphens, commas, and question marks.`);
    }
  }

  matchesPattern(input, actionWords, objectWords) {
    const hasAction = actionWords.some(word => input.includes(word));
    const hasObject = objectWords.length === 0 || objectWords.some(word => input.includes(word));
    return hasAction && hasObject;
  }

  matchesWebComponent(input) {
    const webComponentPatterns = [
      /add\s+a?\s*(multiple\s*choice|quiz|assessment)/i,
      /create\s+a?\s*(multiple\s*choice|quiz|assessment)/i,
      /make\s+a?\s*(multiple\s*choice|quiz|assessment)/i,
      /add\s+a?\s*(matching|true.*false|fill.*in.*blank|flash.*card)/i,
      /create\s+a?\s*(matching|true.*false|fill.*in.*blank|flash.*card)/i,
      /add\s+a?\s*(carousel|timeline|image.*map|lesson)/i,
      /create\s+a?\s*(carousel|timeline|image.*map|lesson)/i,
      /add\s+a?\s*(code\s*sample|media\s*quote|citation)/i,
      /create\s+a?\s*(code\s*sample|media\s*quote|citation)/i,
      /add.*element/i,
      /create.*element/i
    ];

    return webComponentPatterns.some(pattern => pattern.test(input));
  }

  matchesMultiplePages(input) {
    const multiplePagePatterns = [
      /add\s+.*page.*\s+and\s+.*page/i,
      /create\s+.*page.*\s+and\s+.*page/i,
      /add\s+a\s+\w+\s+page\s+and\s+a?\s*\w+\s+page/i,
      /add\s+\w+\s+and\s+\w+\s+pages?/i,
      /create\s+\w+\s+and\s+\w+\s+pages?/i
    ];

    return multiplePagePatterns.some(pattern => pattern.test(input));
  }

  matchesSlidedeck(input) {
    const slidedeckPatterns = [
      /make\s+a\s+slidedeck/i,
      /create\s+a\s+slidedeck/i,
      /build\s+a\s+slidedeck/i,
      /generate\s+a\s+slidedeck/i,
      /make\s+slides/i,
      /create\s+slides/i,
      /build\s+slides/i,
      /generate\s+slides/i,
      /slidedeck\s+about/i,
      /slides\s+about/i,
      /slides\s+for/i,
      /presentation\s+about/i,
      /make\s+a\s+presentation/i,
      /create\s+a\s+presentation/i
    ];
    
    return slidedeckPatterns.some(pattern => pattern.test(input));
  }

  matchesDeployment(input) {
    const deploymentPatterns = [
      /deploy\s+site/i,
      /deploy\s+website/i,
      /deploy\s+\w+/i,
      /publish\s+site/i,
      /publish\s+website/i,
      /publish\s+\w+/i,
      /make\s+site\s+live/i,
      /make\s+website\s+live/i,
      /go\s+live/i,
      /deploy\s+to\s+surge/i,
      /surge\s+deploy/i
    ];
    
    return deploymentPatterns.some(pattern => pattern.test(input));
  }

  matchesCustomization(input) {
    const customizationPatterns = [
      /customize\s+.*?\s+page/i,
      /customize\s+.*?\s+and\s+make\s+it\s+about/i,
      /customize\s+.*?\s+for/i,
      /adapt\s+.*?\s+page/i,
      /modify\s+.*?\s+page.*?\s+for/i,
      /change\s+.*?\s+page.*?\s+to\s+be\s+about/i
    ];
    
    return customizationPatterns.some(pattern => pattern.test(input));
  }

  matchesSiteCloning(input) {
    const cloningPatterns = [
      /(?:create|make|build)\s+(?:a\s+)?(?:new\s+)?site\s+(?:copying\s+)?from\s+https?:\/\//i,
      /(?:copy|clone)\s+(?:the\s+)?site\s+from\s+https?:\/\//i,
      /(?:copy|clone)\s+https?:\/\/.*?(?:\s+(?:as|into|to)\s+)/i,
      /(?:import|duplicate)\s+(?:site\s+from\s+)?https?:\/\//i,
      /(?:create|make)\s+(?:a\s+)?(?:local\s+)?copy\s+of\s+https?:\/\//i
    ];
    
    return cloningPatterns.some(pattern => pattern.test(input));
  }

  async handleCreateQuiz(input, context, siteName, pageSource, contentPrompt) {
    const { sitesDir } = context;
    let pageTitle = `Quiz`;
    let quizContent = '';
    let topic = 'general knowledge';

    if (!pageSource) {
      return {
        explanation: "To add a quiz, you need to specify which page to add it to. Quizzes are components that get added to existing pages, not standalone pages.",
        commands: [],
        success: false,
        error: 'Target page not specified',
        suggestions: [
          `Add a multiple choice quiz about sharks to the marine life page`,
          `Add a quiz about the content on the history page`,
          `Add a multiple choice quiz about biology to the science page`
        ]
      };
    }

    if (contentPrompt) {
      topic = contentPrompt;
      quizContent = await this.generateQuizFromPrompt(topic);
    } else {
      topic = pageSource;
      quizContent = await this.generateQuizFromPrompt(topic);
    }
    return await this.addComponentToExistingPage(siteName, pageSource, quizContent, 'quiz', sitesDir);
  }

  async addComponentToExistingPage(siteName, pageName, componentContent, componentType, sitesDir) {
    try {
      const siteJsonPath = `${sitesDir}/${siteName}/site.json`;
      let siteData;
      try {
        const siteJsonContent = await fs.readFile(siteJsonPath, 'utf8');
        siteData = JSON.parse(siteJsonContent);
      } catch (error) {
        return {
          explanation: `I couldn't read the site.json file for ${siteName}. The site might be corrupted.`,
          commands: [],
          success: false,
          error: 'Site data not found'
        };
      }

      const pageItem = siteData.items.find(item =>
        item.title.toLowerCase() === pageName.toLowerCase() ||
        item.slug.toLowerCase() === pageName.toLowerCase().replace(/\s+/g, '-')
      ) || siteData.items.find(item =>
        item.title.toLowerCase().includes(pageName.toLowerCase())
      );

      if (!pageItem) {
        const availablePages = siteData.items.map(item => item.title).join(', ');
        return {
          explanation: `I couldn't find a page named "${pageName}" in your ${siteName} site. Available pages: ${availablePages}`,
          commands: [],
          success: false,
          error: 'Page not found',
          suggestions: [
            `List all pages to see available page names`,
            `Try using one of these page names: ${availablePages.split(', ').slice(0, 3).join(', ')}`
          ]
        };
      }

      const pageFilePath = `${sitesDir}/${siteName}/${pageItem.location}`;
      let currentContent;
      try {
        currentContent = await fs.readFile(pageFilePath, 'utf8');
      } catch (error) {
        return {
          explanation: `Found the page "${pageItem.title}" but couldn't read its content file.`,
          commands: [],
          success: false,
          error: 'File read error'
        };
      }

      const updatedContent = currentContent.trim() + '\n\n' + componentContent;
      await fs.writeFile(pageFilePath, updatedContent, 'utf8');

      return {
        explanation: `Added ${componentType} to page "${pageName}" in site "${siteName}"`,
        commands: [],
        success: true
      };
    } catch (error) {
      return {
        explanation: `Error adding ${componentType}: ${error.message}`,
        commands: [],
        success: false,
        error: error.message
      };
    }
  }

  async handleCreateSlidedeck(input, context) {
    return {
      explanation: 'Slidedeck creation not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  async handleDeployment(input, context) {
    return {
      explanation: 'Deployment not fully implemented in this version',
      commands: ['hax site site:surge'],
      success: true
    };
  }

  async handleCustomization(input, context) {
    return {
      explanation: 'Customization not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  async handleSiteCloning(input, context) {
    return {
      explanation: 'Site cloning not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  async handleAddMultiplePages(input, context) {
    return {
      explanation: 'Adding multiple pages not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  async handleAddPage(input, context) {
    return {
      explanation: 'Adding page not fully implemented in this version',
      commands: ['hax site node:add'],
      success: true
    };
  }

  handleCreateSite(input, sitesDir) {
    return {
      explanation: 'Creating site not fully implemented in this version',
      commands: ['hax site start my-site'],
      success: true
    };
  }

  handleListContent(input, context) {
    return {
      explanation: 'Listing content not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  handlePreview(input, context) {
    return {
      explanation: 'Preview not fully implemented in this version',
      commands: ['hax serve'],
      success: true
    };
  }

  handlePublish(input, context) {
    return {
      explanation: 'Publishing not fully implemented in this version',
      commands: ['hax site site:surge'],
      success: true
    };
  }

  handleEdit(input, context) {
    return {
      explanation: 'Editing not fully implemented in this version',
      commands: [],
      success: false,
      error: 'Not implemented'
    };
  }

  getHelpResponse() {
    return {
      explanation: 'Available commands: create site, add page, publish site, etc.',
      commands: [],
      success: true
    };
  }

  getDefaultResponse(input) {
    return {
      explanation: `Sorry, I didn't understand "${input}". Try "help" for available commands.`,
      commands: [],
      success: false,
      error: 'Unknown command'
    };
  }

  async generateQuizFromPrompt(topic) {
    return `<quiz-component topic=\"${topic}\"></quiz-component>`;
  }

  async generateBasicContentFromResources({ topic, sitesDir, siteName }) {
    try {
      const resourcesDir = path.join(sitesDir, siteName, 'faculty-resources');
      const resourcesPath = path.join(resourcesDir, 'resources.json');
      let urls = [];
      let notes = '';
      try {
        const meta = await fs.readFile(resourcesPath, 'utf8');
        const parsed = JSON.parse(meta);
        urls = parsed.urls || [];
        notes = parsed.notes || '';
      } catch {}
      let snippets = [];
      try {
        const entries = await fs.readdir(resourcesDir, { withFileTypes: true });
        const files = entries.filter(e => e.isFile() && !e.name.endsWith('.json'));
        for (const f of files.slice(0, 5)) {
          const full = path.join(resourcesDir, f.name);
          const text = await this.extractTextFromResource(full);
          if (text) snippets.push(text.substring(0, 1500));
        }
      } catch {}
      if (urls.length === 0 && snippets.length === 0 && !notes) return '';
      // Build 3 simple paragraphs prioritized from snippets and notes
      const base = [notes, ...snippets].join(' ').trim();
      const topicText = topic || 'this topic';
      const chunk = base.substring(0, 1500);
      if (!chunk) return '';
      const p1 = `${topicText}: ${chunk.substring(0, 450)}`;
      const p2 = chunk.substring(450, 900);
      const p3 = chunk.substring(900, 1350);
      return `<p>${p1}</p>\n<p>${p2}</p>\n<p>${p3}</p>`;
    } catch {
      return '';
    }
  }

  log(...args) {
    if (this.debugMode) {
      console.log(...args);
    }
  }

  addToHistory(userInput, response) {
    this.conversationHistory.push({ role: 'user', content: userInput });
    this.conversationHistory.push({ role: 'assistant', content: response });
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  updateConfig() {
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    this.anthropicAPI = process.env.ANTHROPIC_API_KEY ? 
      require('@anthropic-ai/sdk').default ? new (require('@anthropic-ai/sdk').default)({
        apiKey: process.env.ANTHROPIC_API_KEY
      }) : null : null;
      
    this.openaiAPI = process.env.OPENAI_API_KEY ?
      require('openai').OpenAI ? new (require('openai').OpenAI)({
        apiKey: process.env.OPENAI_API_KEY
      }) : null : null;
      
    this.log('🔄 AI Processor configuration updated');
  }

  async generateCustomizedContent(originalTitle, originalContent, customization) {
    const prompt = `You are helping to customize web page content. Take the original content and adapt it for a new specific purpose.

Original Page Title: "${originalTitle}"
Original Content: "${originalContent}"

Customization Request: "${customization}"

Please create new content that:
1. Keeps the same general structure and tone as the original
2. Adapts all the information to be specifically about "${customization}"
3. Maintains the same level of detail and professionalism
4. Uses HTML formatting similar to the original
5. Ensures the content is relevant and accurate for the new topic

Return only the HTML content (no title, as that will be set separately). Make it engaging and informative.`;

    try {
      let response;
      if (this.aiProvider === 'anthropic') {
        const completion = await this.anthropicAPI.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 2000,
          system: 'You are an expert content customization assistant. Create high-quality, customized web content that maintains the original structure while adapting it for the new topic.',
          messages: [{ role: "user", content: prompt }]
        });
        response = completion.content[0].text.trim();
      } else if (this.aiProvider === 'openai') {
        const completion = await this.openaiAPI.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an expert content customization assistant. Create high-quality, customized web content that maintains the original structure while adapting it for the new topic." },
            { role: "user", content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });
        response = completion.choices[0].message.content.trim();
      } else {
        throw new Error('No AI provider available');
      }

      return response;
    } catch (error) {
      this.log('Error generating customized content:', error);
      return `<p>Error generating customized content: ${error.message}. Please try again.</p>`;
    }
  }

  async generateSlideStructure(topic) {
    return this.getFallbackSlideStructure(topic);
  }

  getFallbackSlideStructure(topic) {
    return {
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Presentation`,
      slides: [
        {
          title: `Introduction to ${topic}`,
          subtitle: "Overview and key concepts",
          key_points: ["Definition", "Importance", "Overview"]
        },
        {
          title: `Understanding ${topic}`,
          subtitle: "Core principles and fundamentals", 
          key_points: ["Basic concepts", "Key characteristics", "Applications"]
        },
        {
          title: `${topic} in Practice`,
          subtitle: "Real-world applications and examples",
          key_points: ["Case studies", "Examples", "Best practices"]
        },
        {
          title: `Benefits and Challenges`,
          subtitle: "Advantages and potential obstacles",
          key_points: ["Key benefits", "Common challenges", "Solutions"]
        },
        {
          title: `Future of ${topic}`,
          subtitle: "Trends and developments",
          key_points: ["Emerging trends", "Future possibilities", "Implications"]
        },
        {
          title: `${topic} Conclusion`,
          subtitle: "Key takeaways and next steps",
          key_points: ["Summary", "Action items", "Further learning"]
        }
      ]
    };
  }

  async generateSlideContent(slide, topic, slideNumber, structure) {
    return `<div>Slide ${slideNumber}: ${slide.title}</div>`;
  }

  cleanAIResponse(content) {
    return content
      .replace(/<style>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.startsWith('Here is') &&
               !trimmed.startsWith('This slide') &&
               !trimmed.startsWith('The content') &&
               !trimmed.includes('HTML content') &&
               !trimmed.includes('presentation on') &&
               !trimmed.includes('slide of the presentation');
      })
      .join('\n')
      .replace(/\n\n+/g, '\n')
      .trim();
  }

  formatSlideContent(content, title, slideNumber, totalSlides) {
    return `<div style="padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; font-family: Arial, sans-serif; min-height: 500px;">
<div style="text-align: right; font-size: 14px; margin-bottom: 20px;">Slide ${slideNumber} of ${totalSlides}</div>
<h1 style="font-size: 2.5em; margin-bottom: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${title}</h1>
<div style="font-size: 1.3em; line-height: 1.6;">
${this.enhanceSlideContent(content)}
</div>
</div>`;
  }

  enhanceSlideContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const processedLines = [];
    
    let startIndex = 0;
    if (lines.length > 1 && lines[0].trim() && !lines[0].trim().match(/^[-*•]/)) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.match(/^[-*•]\s+/)) {
        const bulletContent = trimmed.replace(/^[-*•]\s+/, '');
        const enhanced = bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFD700;">$1</strong>');
        processedLines.push(`<p style="margin: 10px 0; font-size: 1.2em;">• ${enhanced}</p>`);
      } else {
        const enhanced = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFD700;">$1</strong>');
        if (i === startIndex && !trimmed.match(/^[-*•]/)) {
          processedLines.push(`<p style="margin: 20px 0 30px 0; font-size: 1.3em; font-style: italic; color: #E0E0E0;">${enhanced}</p>`);
        } else {
          processedLines.push(`<p style="margin: 15px 0; font-size: 1.1em;">${enhanced}</p>`);
        }
      }
    }
    
    return processedLines.join('');
  }

  escapeQuotes(content) {
    const singleLine = content.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return singleLine.replace(/'/g, "'\"'\"'");
  }

  sanitizeSlideTitle(title) {
    return title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = { SmartAIProcessor };