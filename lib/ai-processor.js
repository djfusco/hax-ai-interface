/**
 * HAX AI Processor - Hybrid AI approach for command processing
 * Supports OpenAI, Anthropic, and smart pattern matching fallbacks
 */

class SmartAIProcessor {
  constructor(options = {}) {
    this.hasOpenAI = !!process.env.OPENAI_API_KEY;
    this.hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    this.hasAPIKey = this.hasOpenAI || this.hasAnthropic;
    this.conversationHistory = [];
    this.debugMode = true; // Force debug mode for troubleshooting
    
    // Initialize AI if available
    if (this.hasAPIKey) {
      this.initializeAI();
    } else {
      this.log('💡 Using smart pattern matching (no AI API key found)');
    }
  }

  initializeAI() {
    try {
      if (this.hasOpenAI) {
        const { OpenAI } = require('openai');
        this.ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.aiProvider = 'openai';
        this.log('🤖 OpenAI initialized');
      } else if (this.hasAnthropic) {
        this.log('🔍 Attempting to load Anthropic SDK...');
        const { Anthropic } = require('@anthropic-ai/sdk');
        this.log('🔍 Anthropic SDK loaded, creating client...');
        this.ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        this.log('🔍 Anthropic client created, setting provider...');
        this.aiProvider = 'anthropic';
        this.log('🤖 Anthropic Claude initialized');
        this.log('🔍 AI client object:', !!this.ai, 'has messages:', !!this.ai?.messages);
        
        // Skip the test for now and let it work in practice
        // this.testAnthropicClient();
      }
    } catch (error) {
      this.log('⚠️ AI initialization failed, using pattern matching:', error.message);
      this.log('⚠️ Error stack:', error.stack);
      this.hasAPIKey = false;
      this.ai = null;
    }
  }

  async testAnthropicClient() {
    if (this.aiProvider === 'anthropic') {
      try {
        this.log('🔍 Testing Anthropic client...');
        this.log('🔍 Available methods:', Object.keys(this.ai));
        
        // Try different API approaches
        if (this.ai.messages && typeof this.ai.messages.create === 'function') {
          const testResponse = await this.ai.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 50,
            messages: [{ role: "user", content: "Say hello" }]
          });
          this.log('✅ Anthropic messages API test successful');
        } else if (this.ai.completions && typeof this.ai.completions.create === 'function') {
          const testResponse = await this.ai.completions.create({
            model: "claude-instant-1",
            max_tokens_to_sample: 50,
            prompt: "Human: Say hello\n\nAssistant:"
          });
          this.log('✅ Anthropic completions API test successful');
        } else {
          this.log('❌ No known Anthropic API methods found');
          this.hasAPIKey = false;
          this.ai = null;
        }
      } catch (error) {
        this.log('❌ Anthropic test failed:', error.message);
        this.hasAPIKey = false;
        this.ai = null;
      }
    }
  }

  // Validate site and page names
  validateNames(siteName, pageTitle) {
    if (siteName && !/^[a-zA-Z0-9_]+$/.test(siteName)) {
      throw new Error("Invalid site name. Use only letters, numbers, and underscores.");
    }
    if (pageTitle && !/^[a-zA-Z0-9_\s\?\,\-]+$/.test(pageTitle)) {
      throw new Error(`Invalid page title '${pageTitle}'. Use only letters, numbers, spaces, underscores, hyphens, commas, and question marks.`);
    }
  }

  // Main processing method
  async process(userInput, context) {
    try {
      this.log('Processing input:', userInput);
      this.log('Context:', context);

      // Always try pattern matching first for speed and reliability
      const patternResult = await this.processWithPatterns(userInput, context);
      
      // If pattern matching succeeded or we don't have AI, return the result
      if (patternResult.success || !this.hasAPIKey) {
        return patternResult;
      }

      // If pattern matching failed and we have AI, try AI processing
      this.log('Pattern matching failed, trying AI...');
      return await this.processWithAI(userInput, context);

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

  // AI processing with conversation history
  async processWithAI(userInput, context) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      let response;

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
        const messages = [
          ...this.conversationHistory,
          { role: "user", content: userInput }
        ];

        const completion = await this.ai.messages.create({
          model: "claude-3-haiku-20240307",
          system: systemPrompt,
          messages,
          max_tokens: 800
        });

        response = completion.content[0].text;
      }

      // Add to conversation history
      this.addToHistory(userInput, response);

      // Parse the AI response
      return this.parseAIResponse(response, true);

    } catch (error) {
      this.log('AI processing failed:', error.message);
      
      // Fallback to pattern matching if AI fails
      return await this.processWithPatterns(userInput, context);
    }
  }

  async processWithPatterns(userInput, context) {
    const input = userInput.toLowerCase().trim();
    const { availableSites, currentSite, sitesDir } = context;

    // Check for slidedeck creation first
    if (this.matchesSlidedeck(input)) {
      return await this.handleCreateSlidedeck(input, context);
    }

    // Check for multiple pages first (before single page detection)
    if (this.matchesMultiplePages(input)) {
      return await this.handleAddMultiplePages(input, context);
    }

    // Add page patterns (prioritize before site creation)
    if (this.matchesPattern(input, ['add', 'create', 'new'], ['page', 'post', 'article'])) {
      return await this.handleAddPage(input, context);
    }

    // Create site patterns (only if 'site' or 'website' is present and NOT 'page', 'post', 'article')
    if (
      this.matchesPattern(input, ['create', 'make', 'new'], ['site', 'website', 'blog', 'portfolio']) &&
      !this.matchesPattern(input, ['add', 'create', 'new'], ['page', 'post', 'article'])
    ) {
      return this.handleCreateSite(input, sitesDir);
    }

    // List/show patterns
    if (this.matchesPattern(input, ['show', 'list', 'what', 'display'], ['site', 'page'])) {
      return this.handleListContent(input, context);
    }

    // Preview patterns
    if (this.matchesPattern(input, ['preview', 'view', 'see', 'open'], ['site', 'website'])) {
      return this.handlePreview(input, context);
    }

    // Publish patterns
    if (this.matchesPattern(input, ['publish', 'deploy', 'online', 'web', 'live'], [])) {
      return this.handlePublish(input, context);
    }

    // Edit patterns
    if (this.matchesPattern(input, ['edit', 'change', 'update', 'modify'], ['page', 'content'])) {
      return this.handleEdit(input, context);
    }

    // Help patterns
    if (this.matchesPattern(input, ['help', 'what can', 'how do', 'commands'], [])) {
      return this.getHelpResponse();
    }

    // Default fallback
  return this.getDefaultResponse(input);
  }

  // Pattern matching helper
  matchesPattern(input, actionWords, objectWords) {
    const hasAction = actionWords.some(word => input.includes(word));
    const hasObject = objectWords.length === 0 || objectWords.some(word => input.includes(word));
    return hasAction && hasObject;
  }

  // Check if input requests multiple pages
  matchesMultiplePages(input) {
    // Look for patterns like "add contact and about pages", "create contact page and forsale page"
    const multiplePagePatterns = [
      /add\s+.*page.*\s+and\s+.*page/i,
      /create\s+.*page.*\s+and\s+.*page/i,
      /add\s+a\s+\w+\s+page\s+and\s+a?\s*\w+\s+page/i,
      /add\s+\w+\s+and\s+\w+\s+pages?/i,
      /create\s+\w+\s+and\s+\w+\s+pages?/i
    ];
    
    return multiplePagePatterns.some(pattern => pattern.test(input));
  }

  // Check if input requests slidedeck creation
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

  // Extract multiple page titles from input
  extractMultiplePageTitles(input) {
    const pageTitles = [];
    
    // Pattern 1: "add a contact page and a forsale page"
    let match = input.match(/add\s+a\s+(\w+)\s+page\s+and\s+a?\s*(\w+)\s+page/i);
    if (match) {
      pageTitles.push(match[1].trim(), match[2].trim());
      return pageTitles;
    }
    
    // Pattern 2: "add contact and forsale pages"
    match = input.match(/add\s+(\w+)\s+and\s+(\w+)\s+pages?/i);
    if (match) {
      pageTitles.push(match[1].trim(), match[2].trim());
      return pageTitles;
    }
    
    // Pattern 3: "create contact and forsale pages"
    match = input.match(/create\s+(\w+)\s+and\s+(\w+)\s+pages?/i);
    if (match) {
      pageTitles.push(match[1].trim(), match[2].trim());
      return pageTitles;
    }
    
    // Pattern 4: More general approach - split on "and" and look for page names
    const parts = input.split(/\s+and\s+/i);
    if (parts.length === 2) {
      for (const part of parts) {
        const pageMatch = part.match(/(?:add|create)?\s*(?:a\s+)?(\w+)\s*page/i);
        if (pageMatch) {
          pageTitles.push(pageMatch[1].trim());
        }
      }
    }
    
    return pageTitles;
  }

  // Extract content prompts for multiple pages
  extractMultiplePageContents(input) {
    const pageContents = [];
    
    // Pattern: "add a contact page about our company and a forsale page about selling homes"
    const aboutPattern = /(\w+)\s+page\s+about\s+([^a]+?)(?:\s+and\s+a?\s*|$)/gi;
    let match;
    
    while ((match = aboutPattern.exec(input)) !== null) {
      const pageTitle = match[1].trim();
      const content = match[2].trim();
      pageContents.push({ pageTitle, content });
    }
    
    return pageContents;
  }

  // Extract slidedeck topic from input
  extractSlidedeckTopic(input) {
    // Patterns to extract the topic
    const patterns = [
      /(?:make|create|build|generate)\s+a?\s*slidedeck\s+about\s+(.+)/i,
      /(?:make|create|build|generate)\s+slides\s+about\s+(.+)/i,
      /(?:make|create|build|generate)\s+slides\s+for\s+(.+)/i,
      /(?:make|create|build|generate)\s+a?\s*presentation\s+about\s+(.+)/i,
      /slidedeck\s+about\s+(.+)/i,
      /slides\s+about\s+(.+)/i,
      /slides\s+for\s+(.+)/i,
      /presentation\s+about\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  // Handle slidedeck creation
  async handleCreateSlidedeck(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
    const topic = this.extractSlidedeckTopic(input);
    const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
    
    if (!siteName) {
      return this.askForSiteSelection(availableSites, 'add a slidedeck to');
    }
    
    if (!topic) {
      return {
        explanation: "I'd love to create a slidedeck for you! What topic would you like it to cover?",
        commands: [],
        success: true,
        examples: [
          "Make a slidedeck about eagles",
          "Create a presentation about climate change",
          "Build slides about artificial intelligence",
          "Generate a slidedeck about entrepreneurship"
        ]
      };
    }

    this.log('DEBUG - Slidedeck creation analysis:');
    this.log('- Input:', input);
    this.log('- Topic:', topic);
    this.log('- Site name:', siteName);
    this.log('- Has API key:', this.hasAPIKey);
    
    if (!this.hasAPIKey) {
      return {
        explanation: "I need AI capabilities to generate comprehensive slidedecks. Please set up an AI API key first.",
        commands: [],
        success: false,
        suggestion: "Try adding individual pages manually or set up an Anthropic API key for AI-powered slidedeck generation."
      };
    }
    
    try {
      // Generate slidedeck structure and content using AI
      return await this.generateAISlidedeck(topic, siteName, sitesDir);
    } catch (error) {
      this.log('Slidedeck generation failed:', error.message);
      return {
        explanation: `Failed to generate slidedeck about ${topic}. You can try creating individual slides manually.`,
        commands: [],
        success: false,
        error: error.message
      };
    }
  }

  // Handle multiple page creation
  async handleAddMultiplePages(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
    const pageTitles = this.extractMultiplePageTitles(input);
    const pageContents = this.extractMultiplePageContents(input);
    const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
    
    if (!siteName) {
      return this.askForSiteSelection(availableSites, 'add pages to');
    }
    
    if (pageTitles.length === 0) {
      return {
        explanation: "I can see you want to add multiple pages! Can you tell me what you'd like to call them?",
        commands: [],
        success: true,
        examples: [
          "Add a contact page and about page",
          "Create services and portfolio pages",
          "Add contact and forsale pages",
          "Add a contact page about our company and a services page about web development"
        ]
      };
    }
    
    // Validate names
    for (const pageTitle of pageTitles) {
      this.validateNames(siteName, pageTitle);
    }

    this.log('DEBUG - Multiple page creation analysis:');
    this.log('- Input:', input);
    this.log('- Page titles:', pageTitles);
    this.log('- Page contents:', pageContents);
    this.log('- Has API key:', this.hasAPIKey);
    this.log('- Contains "about":', input.includes('about'));
    
    // Check if any pages have content prompts and we have AI capability
    const hasContentPrompts = pageContents.length > 0;
    const shouldUseAI = hasContentPrompts && this.hasAPIKey && input.includes('about');
    
    if (shouldUseAI) {
      this.log('DEBUG - Triggering AI content generation for multiple pages');
      return await this.generateMultipleAIPages(pageTitles, pageContents, siteName, sitesDir);
    } else if (hasContentPrompts) {
      this.log('DEBUG - Using fallback content generation for multiple pages');
      return await this.generateMultiplePagesWithFallbackContent(pageTitles, pageContents, siteName, sitesDir);
    }
    
    // Create commands for pages without content
    const commands = [];
    for (const pageTitle of pageTitles) {
      commands.push(`hax site node:add --title "${pageTitle}" --y`);
    }
    
    const pageList = pageTitles.join(', ');
    const pluralPages = pageTitles.length > 1 ? 'pages' : 'page';
    
    return {
      explanation: `I'll add ${pageTitles.length} new ${pluralPages} to your ${siteName} site: ${pageList}`,
      commands: commands,
      success: true,
      nextSteps: `Pages created! You can preview your site by saying "preview ${siteName}" or add content to any page.`,
      action: 'add_multiple_pages',
      siteName,
      pageTitles,
      runFromSiteDir: `${sitesDir}/${siteName}`
    };
  }

  // Generate multiple pages with AI content
  async generateMultipleAIPages(pageTitles, pageContents, siteName, sitesDir) {
    const commands = [];
    const contentMap = new Map();
    
    // Create a map of page titles to their content prompts
    pageContents.forEach(({ pageTitle, content }) => {
      contentMap.set(pageTitle.toLowerCase(), content);
    });
    
    // Generate AI content for each page
    for (const pageTitle of pageTitles) {
      const contentPrompt = contentMap.get(pageTitle.toLowerCase());
      let command = `hax site node:add --title "${pageTitle}"`;
      
      if (contentPrompt && this.hasAPIKey) {
        try {
          let aiResponse;
          const aiPrompt = `Write exactly 3 paragraphs of engaging HTML content for a web page titled "${pageTitle}" about ${contentPrompt}. Each paragraph should be wrapped in <p> tags. Make it informative, well-written, and appropriate for a website. Do not include any other HTML tags or explanatory text - just the 3 paragraphs.`;

          if (this.aiProvider === 'openai') {
            const completion = await this.ai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: aiPrompt }],
              max_tokens: 500,
              temperature: 0.7
            });
            aiResponse = completion.choices[0].message.content.trim();
          } else if (this.aiProvider === 'anthropic') {
            this.log(`🔍 Generating AI content for ${pageTitle} page...`);
            const completion = await this.ai.messages.create({
              model: "claude-3-haiku-20240307",
              max_tokens: 500,
              messages: [{ role: "user", content: aiPrompt }]
            });
            aiResponse = completion.content[0].text.trim();
            this.log(`✅ AI content generated for ${pageTitle}`);
          }

          command += ` --content "${aiResponse}"`;
        } catch (error) {
          this.log(`⚠️ AI content generation failed for ${pageTitle}:`, error.message);
          // Fallback to basic content
          const fallbackContent = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
          command += ` --content "${fallbackContent}"`;
        }
      } else if (contentPrompt) {
        // Fallback content generation
        const fallbackContent = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
        command += ` --content "${fallbackContent}"`;
      }
      
      command += ' --y';
      commands.push(command);
    }
    
    const pageList = pageTitles.join(', ');
    const pluralPages = pageTitles.length > 1 ? 'pages' : 'page';
    const hasAIContent = pageContents.length > 0 && this.hasAPIKey;
    
    return {
      explanation: `I'll add ${pageTitles.length} new ${pluralPages} to your ${siteName} site with ${hasAIContent ? 'AI-generated' : 'custom'} content: ${pageList}`,
      commands: commands,
      success: true,
      nextSteps: `Pages created with content! You can preview your site by saying "preview ${siteName}"`,
      action: 'add_multiple_pages_with_content',
      siteName,
      pageTitles,
      runFromSiteDir: `${sitesDir}/${siteName}`,
      aiGenerated: hasAIContent
    };
  }

  // Generate multiple pages with fallback content (when no AI available)
  async generateMultiplePagesWithFallbackContent(pageTitles, pageContents, siteName, sitesDir) {
    const commands = [];
    const contentMap = new Map();
    
    // Create a map of page titles to their content prompts
    pageContents.forEach(({ pageTitle, content }) => {
      contentMap.set(pageTitle.toLowerCase(), content);
    });
    
    // Generate fallback content for each page
    for (const pageTitle of pageTitles) {
      const contentPrompt = contentMap.get(pageTitle.toLowerCase());
      let command = `hax site node:add --title "${pageTitle}"`;
      
      if (contentPrompt) {
        const fallbackContent = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
        command += ` --content "${fallbackContent}"`;
      }
      
      command += ' --y';
      commands.push(command);
    }
    
    const pageList = pageTitles.join(', ');
    const pluralPages = pageTitles.length > 1 ? 'pages' : 'page';
    
    return {
      explanation: `I'll add ${pageTitles.length} new ${pluralPages} to your ${siteName} site with custom content: ${pageList}`,
      commands: commands,
      success: true,
      nextSteps: `Pages created with content! You can preview your site by saying "preview ${siteName}"`,
      action: 'add_multiple_pages_with_content',
      siteName,
      pageTitles,
      runFromSiteDir: `${sitesDir}/${siteName}`
    };
  }

  // Command handlers
  handleCreateSite(input, sitesDir) {
    const siteName = this.extractSiteName(input);
    if (!siteName) {
      return {
        explanation: "I'd be happy to create a site for you! What would you like to call it?",
        commands: [],
        success: true,
        examples: [
          "Create a site called my-blog",
          "Make a portfolio site called john-portfolio",
          "Create a business site called my-bakery"
        ]
      };
    }
    this.validateNames(siteName, null);
    let commands = [`hax site start --name ${siteName} --y`];
    let explanation = `I'll create a new HAX site called "${siteName}". This will set up all the files and structure you need to start building your website.`;
    let nextSteps = `Great! Once created, you can add pages by saying: "Add a page called About to ${siteName}"`;
    // Theme support
    if (input.toLowerCase().includes("penn state site")) {
      commands.push('hax site site:theme --theme "polaris-flex-theme"');
      explanation += '\nApplying Penn State theme.';
    }
    return {
      explanation,
      commands,
      success: true,
      nextSteps,
      action: 'create-site',
      siteName
    };
  }

  async handleAddPage(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
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
        examples: [
          `Add a page called About to ${siteName}`,
          `Create a contact page in ${siteName}`,
          `Add a blog post called My First Post`
        ]
      };
    }
    this.validateNames(siteName, pageTitle);
    
    // Detect if this should be a child page
    const parentPage = this.extractParentPage(input);
    
    // Detect if content is requested
    let contentPrompt = this.extractContent(input);
    let workflowType = parentPage ? 'add_child_page' : 'add_page';
    let command = `hax site node:add --title "${pageTitle}"`;

    this.log('DEBUG - Page creation analysis:');
    this.log('- Input:', input);
    this.log('- Page title:', pageTitle);
    this.log('- Parent page:', parentPage);
    this.log('- Site name:', siteName);
    this.log('- Content prompt extracted:', contentPrompt);
    this.log('- Has API key:', this.hasAPIKey);
    this.log('- Contains "with content":', input.includes('with content'));
    this.log('- Contains "about":', input.includes('about'));

    // Handle AI content generation (for both regular and child pages)
    if (contentPrompt && this.hasAPIKey && (input.includes('with content') || input.includes('about'))) {
      this.log('DEBUG - Triggering AI content generation for', parentPage ? 'child page' : 'regular page');
      
      if (parentPage) {
        workflowType = 'add_child_page_with_content';
      } else {
        workflowType = 'add_page_with_content';
      }
      
      // Generate AI content
      return await this.generateAIContentForChildPage(pageTitle, siteName, contentPrompt, sitesDir, command, workflowType, parentPage);
    } else if (contentPrompt) {
      // Fallback content generation
      if (parentPage) {
        workflowType = 'add_child_page_with_content';
      } else {
        workflowType = 'add_page_with_content';
      }
      let content = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
      command += ` --content "${content}"`;
    }
    
    // Handle child pages (with or without content)
    if (parentPage) {
      // Add command to find parent page ID and update the child page's parent field
      const updateParentCommand = `node -e "
        const fs = require('fs');
        const siteData = JSON.parse(fs.readFileSync('site.json', 'utf8'));
        const parentPage = siteData.items.find(item => item.title.toLowerCase() === '${parentPage.toLowerCase()}' || item.slug === '${parentPage.toLowerCase()}');
        const childPage = siteData.items.find(item => item.title === '${pageTitle}');
        if (parentPage && childPage) {
          childPage.parent = parentPage.id;
          childPage.indent = 1;
          fs.writeFileSync('site.json', JSON.stringify(siteData, null, 2));
          console.log('Parent-child relationship set up successfully');
        } else {
          console.log('Could not find parent or child page for relationship setup');
        }
      "`;
      
      command += ' --y';
      
      let explanation = `I'll add a new child page called "${pageTitle}" under the "${parentPage}" page in your ${siteName} site.`;
      if (contentPrompt) {
        explanation += ` The page will include ${this.hasAPIKey ? 'AI-generated' : 'custom'} content about ${contentPrompt}.`;
      }
      explanation += ' The parent-child relationship will be set up automatically.';
      
      return {
        explanation,
        commands: [command, updateParentCommand],
        success: true,
        nextSteps: `Child page created! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`,
        aiGenerated: contentPrompt && this.hasAPIKey
      };
    }
    
    // For regular pages (non-child pages)
    command += ' --y';
    
    let explanation = `I'll add a new page called "${pageTitle}" to your ${siteName} site.`;
    if (contentPrompt) {
      explanation += ` The page will include ${this.hasAPIKey ? 'AI-generated' : 'custom'} content about ${contentPrompt}.`;
    }
    
    return {
      explanation,
      commands: [command],
      success: true,
      nextSteps: `Page added! You can preview your site by saying "preview ${siteName}"`,
      action: workflowType,
      siteName,
      pageTitle,
      runFromSiteDir: `${sitesDir}/${siteName}`,
      aiGenerated: contentPrompt && this.hasAPIKey
    };
  }

  // Use AI to generate three paragraphs for page content
  async generateAIContentForPage(pageTitle, siteName, contentPrompt, sitesDir, command, workflowType) {
    if (!this.hasAPIKey) {
      // Fallback to pattern-based content
      let content = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
      command += ` --content "${content}"`;
      command += ' --y';
      return {
        explanation: `I'll add a new page called "${pageTitle}" to your ${siteName} site with content about ${contentPrompt}.`,
        commands: [command],
        success: true,
        nextSteps: `Page added! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`
      };
    }

    try {
      let aiResponse;
      const aiPrompt = `Write exactly 3 paragraphs of engaging HTML content for a web page titled "${pageTitle}" about ${contentPrompt}. Each paragraph should be wrapped in <p> tags. Make it informative, well-written, and appropriate for a website. Do not include any other HTML tags or explanatory text - just the 3 paragraphs.`;

      if (this.aiProvider === 'openai') {
        const completion = await this.ai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 500,
          temperature: 0.7
        });
        aiResponse = completion.choices[0].message.content.trim();
      } else if (this.aiProvider === 'anthropic') {
        this.log('🔍 Calling Anthropic Messages API...');
        try {
          const completion = await this.ai.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500,
            messages: [{ role: "user", content: aiPrompt }]
          });
          aiResponse = completion.content[0].text.trim();
          this.log('🔍 Anthropic API response received');
        } catch (anthropicError) {
          this.log('🔍 Anthropic API call failed:', anthropicError.message);
          throw anthropicError;
        }
      }

      // Add the AI-generated content to the command
      command += ` --content "${aiResponse}"`;
      command += ' --y';

      return {
        explanation: `I'll add a new page called "${pageTitle}" to your ${siteName} site with AI-generated content about ${contentPrompt}.`,
        commands: [command],
        success: true,
        nextSteps: `Page added with AI content! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`,
        aiGenerated: true
      };

    } catch (error) {
      this.log('AI content generation failed:', error.message);
      // Fallback to pattern-based content
      let content = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
      command += ` --content "${content}"`;
      command += ' --y';
      return {
        explanation: `I'll add a new page called "${pageTitle}" to your ${siteName} site with content about ${contentPrompt}.`,
        commands: [command],
        success: true,
        nextSteps: `Page added! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`
      };
    }
  }

  // Use AI to generate content for child pages (combines AI content + parent-child relationship setup)
  async generateAIContentForChildPage(pageTitle, siteName, contentPrompt, sitesDir, command, workflowType, parentPage) {
    if (!this.hasAPIKey) {
      // Fallback to pattern-based content
      let content = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
      command += ` --content "${content}"`;
      command += ' --y';
      
      // Add parent-child relationship setup
      const updateParentCommand = `node -e "
        const fs = require('fs');
        const siteData = JSON.parse(fs.readFileSync('site.json', 'utf8'));
        const parentPage = siteData.items.find(item => item.title.toLowerCase() === '${parentPage.toLowerCase()}' || item.slug === '${parentPage.toLowerCase()}');
        const childPage = siteData.items.find(item => item.title === '${pageTitle}');
        if (parentPage && childPage) {
          childPage.parent = parentPage.id;
          childPage.indent = 1;
          fs.writeFileSync('site.json', JSON.stringify(siteData, null, 2));
          console.log('Parent-child relationship set up successfully');
        } else {
          console.log('Could not find parent or child page for relationship setup');
        }
      "`;
      
      return {
        explanation: `I'll add a new child page called "${pageTitle}" under the "${parentPage}" page in your ${siteName} site with content about ${contentPrompt}.`,
        commands: [command, updateParentCommand],
        success: true,
        nextSteps: `Child page created with content! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`
      };
    }

    try {
      let aiResponse;
      const aiPrompt = `Write exactly 3 paragraphs of engaging HTML content for a web page titled "${pageTitle}" about ${contentPrompt}. Each paragraph should be wrapped in <p> tags. Make it informative, well-written, and appropriate for a website. Do not include any other HTML tags or explanatory text - just the 3 paragraphs.`;

      if (this.aiProvider === 'openai') {
        const completion = await this.ai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 500,
          temperature: 0.7
        });
        aiResponse = completion.choices[0].message.content.trim();
      } else if (this.aiProvider === 'anthropic') {
        this.log('🔍 Calling Anthropic Messages API for child page content...');
        try {
          const completion = await this.ai.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500,
            messages: [{ role: "user", content: aiPrompt }]
          });
          aiResponse = completion.content[0].text.trim();
          this.log('🔍 Anthropic API response received for child page');
        } catch (anthropicError) {
          this.log('🔍 Anthropic API call failed:', anthropicError.message);
          throw anthropicError;
        }
      }

      // Add the AI-generated content to the command
      command += ` --content "${aiResponse}"`;
      command += ' --y';

      // Add parent-child relationship setup
      const updateParentCommand = `node -e "
        const fs = require('fs');
        const siteData = JSON.parse(fs.readFileSync('site.json', 'utf8'));
        const parentPage = siteData.items.find(item => item.title.toLowerCase() === '${parentPage.toLowerCase()}' || item.slug === '${parentPage.toLowerCase()}');
        const childPage = siteData.items.find(item => item.title === '${pageTitle}');
        if (parentPage && childPage) {
          childPage.parent = parentPage.id;
          childPage.indent = 1;
          fs.writeFileSync('site.json', JSON.stringify(siteData, null, 2));
          console.log('Parent-child relationship set up successfully');
        } else {
          console.log('Could not find parent or child page for relationship setup');
        }
      "`;

      return {
        explanation: `I'll add a new child page called "${pageTitle}" under the "${parentPage}" page in your ${siteName} site with AI-generated content about ${contentPrompt}.`,
        commands: [command, updateParentCommand],
        success: true,
        nextSteps: `Child page created with AI content! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`,
        aiGenerated: true
      };

    } catch (error) {
      this.log('AI content generation failed for child page:', error.message);
      // Fallback to pattern-based content
      let content = this.generateThreeParagraphsContent(pageTitle, contentPrompt);
      command += ` --content "${content}"`;
      command += ' --y';
      
      // Add parent-child relationship setup
      const updateParentCommand = `node -e "
        const fs = require('fs');
        const siteData = JSON.parse(fs.readFileSync('site.json', 'utf8'));
        const parentPage = siteData.items.find(item => item.title.toLowerCase() === '${parentPage.toLowerCase()}' || item.slug === '${parentPage.toLowerCase()}');
        const childPage = siteData.items.find(item => item.title === '${pageTitle}');
        if (parentPage && childPage) {
          childPage.parent = parentPage.id;
          childPage.indent = 1;
          fs.writeFileSync('site.json', JSON.stringify(siteData, null, 2));
          console.log('Parent-child relationship set up successfully');
        } else {
          console.log('Could not find parent or child page for relationship setup');
        }
      "`;
      
      return {
        explanation: `I'll add a new child page called "${pageTitle}" under the "${parentPage}" page in your ${siteName} site with content about ${contentPrompt}.`,
        commands: [command, updateParentCommand],
        success: true,
        nextSteps: `Child page created with content! You can preview your site by saying "preview ${siteName}"`,
        action: workflowType,
        siteName,
        pageTitle,
        runFromSiteDir: `${sitesDir}/${siteName}`
      };
    }
  }

  // Generate three paragraphs of HTML content for a page
  generateThreeParagraphsContent(pageTitle, baseContent) {
    // If baseContent already has <p> tags, use as is
    if (baseContent.includes('<p>')) return baseContent;
    // Otherwise, split into three sentences/paragraphs
    const sentences = baseContent.split(/(?<=[.!?])\s+/).filter(Boolean);
    let paragraphs = [];
    for (let i = 0; i < 3; i++) {
      paragraphs.push(`<p>${sentences[i] || baseContent}</p>`);
    }
    return paragraphs.join('');
  }

  handleListContent(input, context) {
    const { availableSites, sitesDir } = context;
    
    if (input.includes('site')) {
      if (availableSites.length === 0) {
        return {
          explanation: "You don't have any sites yet! Let's create your first one.",
          commands: [],
          success: true,
          suggestion: 'Try: "Create a site called my-first-site"'
        };
      }
      
      return {
        explanation: `You have ${availableSites.length} site(s): ${availableSites.join(', ')}`,
        commands: [],
        success: true,
        data: { sites: availableSites },
        action: 'list-sites'
      };
    }
    
    if (input.includes('page')) {
      const siteName = this.extractSiteFromInput(input, availableSites);
      if (!siteName) {
        return this.askForSiteSelection(availableSites, 'list pages from');
      }
      
      return {
        explanation: `I'll show you all the pages in ${siteName}.`,
        commands: [`cat "${sitesDir}/${siteName}/site.json"`],
        success: true,
        action: 'list-pages',
        siteName: siteName
      };
    }
    
    return this.getDefaultResponse(input);
  }

  handlePreview(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
    const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
    
    if (!siteName) {
      return this.askForSiteSelection(availableSites, 'preview');
    }
    
    return {
      explanation: `I'll start a preview server for ${siteName}. You'll be able to see your site at http://localhost:3000`,
      commands: [`hax serve --path "${sitesDir}/${siteName}"`],
      success: true,
      action: 'serve',
      siteName: siteName,
      nextSteps: 'The preview will open in a new browser tab. Make changes to see them update live!'
    };
  }

  handlePublish(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
    const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
    
    if (!siteName) {
      return this.askForSiteSelection(availableSites, 'publish');
    }
    
    const customDomain = this.extractDomain(input);
    const domain = customDomain || `${siteName}-${Date.now()}.surge.sh`;
    
    return {
      explanation: `I'll publish your ${siteName} site to the web using Surge. This will make it accessible to anyone on the internet!`,
      commands: [
        `cd "${sitesDir}/${siteName}" && npm run build`,
        `cd "${sitesDir}/${siteName}/dist" && surge . ${domain}`
      ],
      success: true,
      action: 'deploy',
      siteName: siteName,
      domain: domain,
      nextSteps: `Once published, your site will be live at https://${domain}`
    };
  }

  handleEdit(input, context) {
    const { availableSites, currentSite, sitesDir } = context;
    const siteName = this.extractSiteFromInput(input, availableSites) || currentSite;
    const pageTitle = this.extractPageTitle(input);
    
    if (!siteName) {
      return this.askForSiteSelection(availableSites, 'edit content in');
    }
    
    if (!pageTitle) {
      return {
        explanation: "Which page would you like to edit?",
        commands: [],
        success: true,
        examples: [
          `Edit the About page in ${siteName}`,
          `Change the homepage content`,
          `Update the contact page`
        ]
      };
    }
    
    return {
      explanation: `I'll help you edit the ${pageTitle} page in ${siteName}. Let me find that page first.`,
      commands: [`cat "${sitesDir}/${siteName}/site.json"`],
      success: true,
      action: 'edit-page',
      siteName: siteName,
      pageTitle: pageTitle
    };
  }

  // Helper methods for extraction
  extractSiteName(input) {
    const patterns = [
      /called\s+([a-zA-Z0-9-_]+)/i,
      /named\s+([a-zA-Z0-9-_]+)/i,
      /site\s+([a-zA-Z0-9-_]+)/i,
      /"([a-zA-Z0-9-_\s]+)"/,
      /'([a-zA-Z0-9-_\s]+)'/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, '-').toLowerCase();
      }
    }
    return null;
  }

  extractPageTitle(input) {
  // Extract page title before any content description or parent page reference
  // Example: Add a new page called aboutme with content about the background of penn state university
  // Example: Add a child page called ourteam under the aboutme page
  
  // First try child page patterns specifically
  let match = input.match(/(?:child|sub)[\s-]*page called\s+([a-zA-Z0-9_\-]+)(?:\s+under|\s+beneath|\s+of|$)/i);
  if (match) return match[1].trim();
  
  // Standard page called patterns with stopping points
  match = input.match(/page called\s+([a-zA-Z0-9_\-]+)(?=\s+with|\s+about|\s+containing|\s+that|\s+under|\s+beneath|$)/i);
  if (match) return match[1].trim();

  match = input.match(/called\s+([a-zA-Z0-9_\-]+)(?=\s+with|\s+about|\s+containing|\s+that|\s+under|\s+beneath|$)/i);
  if (match) return match[1].trim();

  match = input.match(/page named\s+([a-zA-Z0-9_\-]+)(?=\s+with|\s+about|\s+containing|\s+that|\s+under|\s+beneath|$)/i);
  if (match) return match[1].trim();

  match = input.match(/add (?:a|an)? ?(?:new)? ?(?:child\s+)?page (?:called|named)? ?([a-zA-Z0-9_\-]+)(?=\s+with|\s+about|\s+containing|\s+that|\s+under|\s+beneath|\s+to|$)/i);
  if (match) return match[1].trim();

  // Handles quoted titles
  match = input.match(/"([^"]+)"\s*page/i);
  if (match) return match[1].trim();
  match = input.match(/'([^']+)'\s*page/i);
  if (match) return match[1].trim();

  // Handles: edit/change/update the intro4 page
  match = input.match(/(?:edit|change|update)\s+(?:the\s+)?([a-zA-Z0-9_\- ]+)/i);
  if (match) return match[1].trim();

  // Handles: the intro4 page
  match = input.match(/(?:the|a)\s+([a-zA-Z0-9_\- ]+)\s+page/i);
  if (match) return match[1].trim();

  return null;
  }

  extractSiteFromInput(input, availableSites) {
    // Filter out common/invalid words
    const ignoreList = ['is', 'node:add', 'add', 'page', 'called', 'to', 'with', 'new'];
    const validSites = availableSites.filter(site => !ignoreList.includes(site.toLowerCase()));

    // Prefer exact match from user input
    const words = input.split(/\s+/);
    for (const word of words) {
      if (validSites.includes(word)) {
        return word;
      }
    }

    // Fallback to regex whole word match
    for (const site of validSites) {
      const regex = new RegExp(`\b${site}\b`, 'i');
      if (regex.test(input)) {
        return site;
      }
    }
    return null;
  }

  extractContent(input) {
  // Extract content after page title
  let match = input.match(/with content\s+(.+)/i);
  if (match) return match[1].trim();
  match = input.match(/about\s+(.+)/i);
  if (match) return match[1].trim();
  match = input.match(/containing\s+(.+)/i);
  if (match) return match[1].trim();
  match = input.match(/that says\s+(.+)/i);
  if (match) return match[1].trim();

  // If the input contains 'page called' and 'with content', extract after 'with content'
  match = input.match(/page called [a-zA-Z0-9_\- ]+ with content (.+)/i);
  if (match) return match[1].trim();

  return null;
  }

  extractDomain(input) {
    const patterns = [
      /(?:at|to)\s+([a-zA-Z0-9-]+\.surge\.sh)/i,
      /domain\s+([a-zA-Z0-9-]+\.surge\.sh)/i,
      /url\s+([a-zA-Z0-9-]+\.surge\.sh)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  extractParentPage(input) {
    // Extract parent page references
    // Examples: "under the About page", "as a child of Contact", "beneath Services"
    
    let match = input.match(/under\s+(?:the\s+)?([a-zA-Z0-9_\- ]+)\s+page/i);
    if (match) return match[1].trim();
    
    match = input.match(/(?:child|sub-?page)\s+of\s+(?:the\s+)?([a-zA-Z0-9_\- ]+)/i);
    if (match) return match[1].trim();
    
    match = input.match(/beneath\s+(?:the\s+)?([a-zA-Z0-9_\- ]+)/i);
    if (match) return match[1].trim();
    
    match = input.match(/inside\s+(?:the\s+)?([a-zA-Z0-9_\- ]+)\s+(?:page|section)/i);
    if (match) return match[1].trim();
    
    // Handle "Add X to Y" pattern
    match = input.match(/add\s+(?:a\s+)?(?:page\s+)?called\s+[a-zA-Z0-9_\- ]+\s+to\s+([a-zA-Z0-9_\- ]+)/i);
    if (match) return match[1].trim();
    
    return null;
  }

  generateDefaultContent(pageTitle) {
    const contentTemplates = {
      'about': 'Welcome to my About page! This is where I share information about myself, my background, and what I\'m passionate about.',
      'contact': 'Get in touch with me! You can reach me through the contact information below.',
      'home': 'Welcome to my website! I\'m glad you\'re here. Explore the site to learn more about what I do.',
      'services': 'Here are the services I offer. I\'m committed to providing high-quality work that meets your needs.',
      'portfolio': 'Take a look at some of my recent work and projects. Each piece represents my dedication to excellence.',
      'blog': 'Welcome to my blog! Here I share thoughts, insights, and updates about topics I\'m passionate about.'
    };
    
    const lowerTitle = pageTitle.toLowerCase();
    for (const [key, template] of Object.entries(contentTemplates)) {
      if (lowerTitle.includes(key)) {
        return template;
      }
    }
    
    return `Welcome to the ${pageTitle} page! This content was created automatically. You can edit it anytime to add your own information and make it your own.`;
  }

  // Response helpers
  askForSiteSelection(availableSites, action = 'work with') {
    if (availableSites.length === 0) {
      return {
        explanation: "You don't have any sites yet. Let's create your first one!",
        commands: [],
        success: true,
        suggestion: 'Try: "Create a site called my-first-site"'
      };
    }
    
    if (availableSites.length === 1) {
      return {
        explanation: `I'll ${action} your ${availableSites[0]} site.`,
        commands: [],
        success: true,
        autoSelect: availableSites[0]
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

  getHelpResponse() {
    return {
      explanation: `I can help you build websites with simple commands! Here's what you can say:

**🏗️ Creating Sites:**
• "Create a site called my-blog"
• "Make a portfolio site called john-portfolio"
• "Create a business site for my bakery"

**📄 Adding Content:**
• "Add a page called About"
• "Add a page about my hobbies"
• "Create a contact page with my email"
• "Add a blog post called My First Adventure"
• "Add a child page called Team under About"
• "Create a sub-page called Services under Company"
• "Add contact and about pages" (multiple pages)
• "Create services and portfolio pages" (multiple pages)
• "Add a contact page about our company and a services page about web development" (multiple pages with AI content)

**📋 Managing Sites:**
• "Show me all my sites"
• "List pages in my-blog"
• "What sites do I have?"

**👀 Previewing:**
• "Preview my site"
• "Show me how my blog looks"
• "View my portfolio site"

**🚀 Publishing:**
• "Publish my site"
• "Put my blog online"
• "Deploy to myblog.surge.sh"

**✏️ Editing:**
• "Edit the About page"
• "Change the homepage"
• "Update my contact information"

Just tell me what you want to do in plain English - I understand natural conversation!`,
      commands: [],
      success: true,
      isHelp: true
    };
  }

  getDefaultResponse(input) {
    const suggestions = [
      "Create a site called my-blog",
      "Add a page called About", 
      "Show me all my sites",
      "Preview my site",
      "Publish my site"
    ];

    return {
      explanation: `I'm not sure exactly what you want to do with "${input}". Here are some things you can try:

${suggestions.map(s => `• "${s}"`).join('\n')}

Type "help" for more detailed examples, or just tell me what you'd like to do with your website!`,
      commands: [],
      success: true,
      suggestions: suggestions
    };
  }

  // AI-specific methods
  buildSystemPrompt(context) {
    const { availableSites, currentSite, sitesDir } = context;
    
    return `You are a helpful HAX website assistant running locally on the user's computer. Convert user requests into HAX CLI commands and provide friendly explanations.

CONTEXT:
- Sites directory: ${sitesDir}
- Available sites: ${availableSites?.join(', ') || 'none'}
- Current site: ${currentSite || 'none selected'}
- HAX CLI and Surge are installed and available

AVAILABLE COMMANDS:
1. CREATE SITE: hax site [name] --y
2. ADD PAGE: hax site --path "[sitepath]" --node-op create --title "[title]" --content "[content]"
3. PREVIEW: hax serve --path "[sitepath]" (starts local server at http://localhost:3000)
4. PUBLISH: cd "[sitepath]" && npm run build && cd dist && surge . [domain]
5. LIST PAGES: cat "[sitepath]/site.json" (to show site structure)

RESPONSE FORMAT:
Always respond with:
1. A friendly explanation of what you'll do
2. The exact CLI commands needed (in \`\`\`bash blocks)
3. Any helpful next steps or tips

IMPORTANT RULES:
- Always use full paths with quotes: "${sitesDir}/[sitename]"
- Escape any quotes in content properly
- If no site is specified and multiple exist, ask user to specify
- For previews, mention the URL will be http://localhost:3000
- For publishing, explain they'll get a live web URL
- Be encouraging and helpful - this is for non-technical users
- If unsure about something, ask for clarification

EXAMPLES:

User: "Create a blog site called travel-adventures"
Response: I'll create a new HAX site called "travel-adventures" for you! This will set up all the necessary files and structure for your blog.

\`\`\`bash
hax site travel-adventures --y
\`\`\`

Your new site will be ready at: ${sitesDir}/travel-adventures

Next, you might want to add some pages like "About" or "Contact"!

User: "Add a page about my hobbies"
Response: I'll add a new page called "About My Hobbies" to your site with some starter content that you can customize.

\`\`\`bash
hax site --path "${sitesDir}/${currentSite || '[current-site]'}" --node-op create --title "About My Hobbies" --content "Welcome to my hobbies page! Here I share information about the activities and interests that bring me joy and help me grow as a person."
\`\`\`

Be helpful, encouraging, and always explain what each command does in simple terms!`;
  }

  parseAIResponse(response, isAIGenerated = false) {
    // Extract CLI commands from AI response
    const commandBlocks = response.match(/\`\`\`bash\n([\s\S]*?)\n\`\`\`/g) || [];
    const commands = commandBlocks.map(block => 
      block.replace(/\`\`\`bash\n/, '').replace(/\n\`\`\`/, '').trim()
    );

    // Extract explanation (everything not in code blocks)
    const explanation = response.replace(/\`\`\`bash\n[\s\S]*?\n\`\`\`/g, '').trim();

    return {
      explanation,
      commands,
      success: true,
      aiProcessed: isAIGenerated,
      rawResponse: isAIGenerated ? response : undefined
    };
  }

  addToHistory(userInput, aiResponse) {
    this.conversationHistory.push(
      { role: "user", content: userInput },
      { role: "assistant", content: aiResponse }
    );
    
    // Keep only recent history to stay within token limits
    if (this.conversationHistory.length > 16) {
      this.conversationHistory = this.conversationHistory.slice(-16);
    }
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[AI Processor]', ...args);
    }
  }

  // Get processor status for debugging
  getStatus() {
    return {
      hasAPIKey: this.hasAPIKey,
      aiProvider: this.aiProvider,
      conversationLength: this.conversationHistory.length,
      debugMode: this.debugMode
    };
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
    this.log('Conversation history cleared');
  }

  // Generate complete AI-powered slidedeck
  async generateAISlidedeck(topic, siteName, sitesDir) {
    this.log('🎯 Starting AI slidedeck generation for topic:', topic);
    
    try {
      // Step 1: Generate slide structure and titles
      const slideStructure = await this.generateSlideStructure(topic);
      this.log('📝 Generated slide structure:', slideStructure.slides.length, 'slides');
      
      // Step 2: Create parent page for the slidedeck
      const parentPageTitle = slideStructure.title;
      const parentCommand = `hax site node:add --title "${parentPageTitle}" --content "${this.escapeQuotes(this.generateSlidedeckIndexContent(slideStructure))}" --y`;
      
      // Step 3: Generate commands for all child slides
      const slideCommands = [];
      for (let i = 0; i < slideStructure.slides.length; i++) {
        const slide = slideStructure.slides[i];
        const slideContent = await this.generateSlideContent(slide, topic, i + 1, slideStructure);
        const slideCommand = `hax site node:add --title "${slide.title}" --content "${this.escapeQuotes(slideContent)}" --y`;
        slideCommands.push(slideCommand);
      }
      
      // Step 4: Generate parent-child relationship commands
      const relationshipCommands = [];
      for (const slide of slideStructure.slides) {
        const updateCommand = `node -e "
          const fs = require('fs');
          const siteData = JSON.parse(fs.readFileSync('site.json', 'utf8'));
          const parentPage = siteData.items.find(item => item.title === '${this.escapeQuotes(parentPageTitle)}');
          const childPage = siteData.items.find(item => item.title === '${this.escapeQuotes(slide.title)}');
          if (parentPage && childPage) {
            childPage.parent = parentPage.id;
            childPage.indent = 1;
            fs.writeFileSync('site.json', JSON.stringify(siteData, null, 2));
            console.log('Slide relationship set up for: ${this.escapeQuotes(slide.title)}');
          }
        "`;
        relationshipCommands.push(updateCommand);
      }
      
      // Combine all commands
      const allCommands = [parentCommand, ...slideCommands, ...relationshipCommands];
      
      return {
        explanation: `🎯 I'll create a comprehensive slidedeck about "${topic}" with ${slideStructure.slides.length} slides. This includes a main page and individual slide pages with AI-generated content in presentation format.`,
        commands: allCommands,
        success: true,
        nextSteps: `Slidedeck created! You can preview your site by saying "preview ${siteName}" to see the presentation structure.`,
        action: 'create_slidedeck',
        siteName,
        slidedeckTitle: parentPageTitle,
        slideCount: slideStructure.slides.length,
        runFromSiteDir: `${sitesDir}/${siteName}`,
        aiGenerated: true
      };
      
    } catch (error) {
      this.log('❌ AI slidedeck generation failed:', error.message);
      throw error;
    }
  }

  // Simple quote escaping for command line safety
  escapeQuotes(content) {
    return content.replace(/"/g, '\\"');
  }

  // Generate slide structure using AI
  async generateSlideStructure(topic) {
    const structurePrompt = `Create a comprehensive slide presentation structure about "${topic}". Generate a JSON response with:
    
    {
      "title": "Main presentation title (suitable for a parent page)",
      "slides": [
        {
          "title": "Slide title 1",
          "subtitle": "Brief description of slide content",
          "key_points": ["Point 1", "Point 2", "Point 3"]
        },
        {
          "title": "Slide title 2", 
          "subtitle": "Brief description of slide content",
          "key_points": ["Point 1", "Point 2", "Point 3"]
        }
      ]
    }
    
    Create 8-12 slides total. Make titles engaging and educational. Include introduction, main content slides, and conclusion. Focus on making this informative and well-structured for learning. Return only valid JSON.`;

    let aiResponse;
    if (this.aiProvider === 'anthropic') {
      const completion = await this.ai.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        messages: [{ role: "user", content: structurePrompt }]
      });
      aiResponse = completion.content[0].text.trim();
    } else if (this.aiProvider === 'openai') {
      const completion = await this.ai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: structurePrompt }],
        max_tokens: 1500,
        temperature: 0.7
      });
      aiResponse = completion.choices[0].message.content.trim();
    }
    
    // Parse JSON response
    try {
      const cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      this.log('JSON parsing failed, using fallback structure');
      return this.getFallbackSlideStructure(topic);
    }
  }

  // Generate content for individual slide
  async generateSlideContent(slide, topic, slideNumber, structure) {
    const contentPrompt = `Create slide content for a presentation about "${topic}". This is slide ${slideNumber} of ${structure.slides.length}.

    Slide Title: "${slide.title}"
    Slide Focus: ${slide.subtitle}
    Key Points: ${slide.key_points.join(', ')}
    
    IMPORTANT: Generate ONLY plain text content. Do NOT include:
    - HTML tags or CSS code
    - Style blocks or formatting instructions
    - Explanations about the slide or presentation
    - Meta-commentary about the content
    
    Just write the actual slide content as plain text:
    - One subtitle/description line
    - 3-5 bullet points starting with - or •
    - Use **bold** for important terms only
    - Keep it educational and informative
    
    Example format:
    A brief engaging description of the topic
    - First key point with **important term**
    - Second key point
    - Third key point
    
    Generate content about ${topic} for the slide "${slide.title}".`;

    let aiResponse;
    if (this.aiProvider === 'anthropic') {
      const completion = await this.ai.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 600,
        messages: [{ role: "user", content: contentPrompt }]
      });
      aiResponse = completion.content[0].text.trim();
    } else if (this.aiProvider === 'openai') {
      const completion = await this.ai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: contentPrompt }],
        max_tokens: 600,
        temperature: 0.7
      });
      aiResponse = completion.choices[0].message.content.trim();
    }
    
    // Clean the AI response of any HTML/CSS artifacts
    const cleanContent = this.cleanAIResponse(aiResponse);
    
    // Apply our presentation styling
    return this.formatSlideContent(cleanContent, slide.title, slideNumber, structure.slides.length);
  }

  // Clean AI response of any HTML/CSS artifacts
  cleanAIResponse(content) {
    let cleaned = content
      .replace(/<style>[\s\S]*?<\/style>/gi, '') // Remove CSS blocks
      .replace(/<[^>]*>/g, '') // Remove HTML tags
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
      .replace(/\n\n+/g, '\n') // Clean up extra line breaks
      .trim();
    
    // Remove duplicate titles (keep only the first occurrence)
    const lines = cleaned.split('\n');
    const seenLines = new Set();
    const uniqueLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !seenLines.has(trimmed)) {
        seenLines.add(trimmed);
        uniqueLines.push(line);
      }
    }
    
    return uniqueLines.join('\n');
  }

  // Format content with simple, HAX-compatible presentation styling
  formatSlideContent(content, title, slideNumber, totalSlides) {
    return `<div style="padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; font-family: Arial, sans-serif; min-height: 500px;">
<div style="text-align: right; font-size: 14px; margin-bottom: 20px;">Slide ${slideNumber} of ${totalSlides}</div>
<h1 style="font-size: 2.5em; margin-bottom: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${title}</h1>
<div style="font-size: 1.3em; line-height: 1.6;">
${this.enhanceSlideContent(content)}
</div>
</div>`;
  }

  // Enhance content with simple formatting
  enhanceSlideContent(content) {
    // Split into lines and process each one
    const lines = content.split('\n').filter(line => line.trim());
    const processedLines = [];
    
    // Skip the first line if it looks like a title (since we show the title separately)
    let startIndex = 0;
    if (lines.length > 1 && lines[0].trim() && !lines[0].trim().match(/^[-*•]/)) {
      startIndex = 1; // Skip the title line
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check if it's a bullet point
      if (trimmed.match(/^[-*•]\s+/)) {
        const bulletContent = trimmed.replace(/^[-*•]\s+/, '');
        const enhanced = bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFD700;">$1</strong>');
        processedLines.push(`<p style="margin: 10px 0; font-size: 1.2em;">• ${enhanced}</p>`);
      } else {
        // Regular paragraph - treat as subtitle if it's the first non-title line
        const enhanced = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFD700;">$1</strong>');
        if (i === startIndex && !trimmed.match(/^[-*•]/)) {
          // This is likely a subtitle
          processedLines.push(`<p style="margin: 20px 0 30px 0; font-size: 1.3em; font-style: italic; color: #E0E0E0;">${enhanced}</p>`);
        } else {
          processedLines.push(`<p style="margin: 15px 0; font-size: 1.1em;">${enhanced}</p>`);
        }
      }
    }
    
    return processedLines.join('');
  }

  // Generate content for the main slidedeck index page
  generateSlidedeckIndexContent(structure) {
    const slideList = structure.slides.map((slide, index) => 
      `<p style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 5px;">
        <strong>Slide ${index + 1}: ${slide.title}</strong><br>
        <em style="color: #666;">${slide.subtitle}</em>
      </p>`
    ).join('');
    
    return `<div style="padding: 30px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; font-family: Arial, sans-serif;">
<h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">${structure.title}</h1>

<div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<h2 style="color: #667eea; margin-top: 0;">📋 Presentation Overview</h2>
<p style="font-size: 1.1em; line-height: 1.6;">This comprehensive presentation covers key aspects of the topic with <strong>${structure.slides.length} detailed slides</strong>. Navigate through each slide to explore the content designed for interactive learning.</p>
</div>

<h2 style="color: #2c3e50; margin: 30px 0 15px 0;">🎯 Slide Contents</h2>
${slideList}

<div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
<h3 style="margin: 0 0 10px 0;">🧭 Navigation Instructions</h3>
<p style="margin: 0;">Each slide is available as a separate page in this site. Use the navigation arrows or click through the individual slides to explore the content in presentation format.</p>
</div>

<p style="text-align: center; color: #888; font-style: italic; margin: 20px 0 0 0;">✨ Generated automatically using AI-powered content creation</p>
</div>`;
  }

  // Fallback slide structure if AI parsing fails
  getFallbackSlideStructure(topic) {
    return {
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} - Presentation`,
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
          title: "Conclusion",
          subtitle: "Key takeaways and next steps",
          key_points: ["Summary", "Action items", "Further learning"]
        }
      ]
    };
  }
}

module.exports = { SmartAIProcessor };