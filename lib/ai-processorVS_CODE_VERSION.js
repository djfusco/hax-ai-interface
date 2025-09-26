const { ChatOpenAI } = require('@langchain/openai');
const { AgentExecutor, createReactAgent } = require('@langchain/core');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { marked } = require('marked');

class SmartAIProcessor {
  constructor() {
    // Initialize LLM (default to GPT-4o-mini for cost-efficiency)
    this.llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY || 'your-default-key', // Fallback or error if unset
    });

    // Initialize LangChain agent with tools
    this.tools = [
      {
        name: 'executeHaxCli',
        description: 'Executes a HAX CLI command and returns output',
        func: async (command) => {
          try {
            const { stdout, stderr } = await execPromise(command);
            return stderr ? `Error: ${stderr}` : stdout;
          } catch (error) {
            return `Error executing command: ${error.message}`;
          }
        },
      },
      {
        name: 'checkFileSystem',
        description: 'Checks site folder existence or content',
        func: async (sitePath) => {
          const fullPath = path.join(process.env.HOME || process.env.USERPROFILE, '.hax-ai/sites', sitePath);
          try {
            await fs.access(fullPath);
            return `Site folder ${sitePath} exists`;
          } catch {
            return `Site folder ${sitePath} does not exist`;
          }
        },
      },
    ];

    // Initialize agent with system prompt
    this.systemPrompt = 'You are a HAX ecosystem expert. Convert user inputs into valid HAX CLI commands, following provided rules. If input is unclear, ask for clarification. Validate outputs against rules for architecture, design, and accessibility. Respond conversationally.';
    this.agent = createReactAgent({ llm: this.llm, tools: this.tools, prompt: this.systemPrompt });

    // Cache for PRAW rules
    this.prawRules = '';
    this.loadPrawRules(); // Load rules on init
  }

  // Load and parse PRAW rules from GitHub or local clone
  async loadPrawRules() {
    try {
      // Option 1: Fetch from GitHub (dynamic updates)
      const response = await axios.get('https://api.github.com/repos/haxtheweb/praw/contents/RULES.md', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      const rulesContent = Buffer.from(response.data.content, 'base64').toString('utf8');

      // Parse markdown into structured JSON (simplified for brevity)
      const tokens = marked.lexer(rulesContent);
      const parsedRules = tokens
        .filter(token => token.type === 'list_item')
        .map(token => ({
          id: token.text.match(/r[A-Za-z0-9]+/)?.[0] || 'unknown',
          category: token.text.match(/\((architecture|design-system|webcomponent|build-workflow|documentation|project-specific)\)/)?.[1] || 'general',
          text: token.text,
        }));

      // Combine with WARP.md files (example for webcomponents)
      const warpResponse = await axios.get('https://api.github.com/repos/haxtheweb/praw/contents/webcomponents/WARP.md');
      const warpContent = Buffer.from(warpResponse.data.content, 'base64').toString('utf8');
      this.prawRules = `HAX Rules:\n${rulesContent}\nWeb Component Rules:\n${warpContent}`;
      this.systemPrompt += `\nFollow these HAX ecosystem rules: ${this.prawRules}`;
    } catch (error) {
      console.error('Failed to load PRAW rules:', error.message);
      this.prawRules = 'Default HAX rules: Use standard HAX CLI commands and best practices.';
      this.systemPrompt += `\n${this.prawRules}`;
    }
  }

  // Process user input and generate HAX CLI command
  async processCommand(input) {
    try {
      // Run LangChain agent to parse input and generate command
      const result = await this.agent.invoke({
        input: `User input: ${input}\nApply HAX rules: ${this.prawRules}`,
      });

      // Extract command and response from agent output
      const { command, message } = this.parseAgentOutput(result);

      if (!command) {
        return { success: false, message: message || 'Could you clarify your request? e.g., "Create a blog site called my-blog"' };
      }

      // Execute HAX CLI command
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        // Use LLM to analyze error
        const errorAnalysis = await this.llm.call(`Analyze HAX CLI error: ${stderr}\nSuggest fix based on rules: ${this.prawRules}`);
        return {
          success: false,
          message: `Error: ${stderr}\nSuggested fix: ${errorAnalysis}`,
        };
      }

      return {
        success: true,
        message: message || `Command executed: ${command}\nOutput: ${stdout}`,
      };
    } catch (error) {
      // Fallback error handling
      const errorAnalysis = await this.llm.call(`Analyze error: ${error.message}\nSuggest fix based on rules: ${this.prawRules}`);
      return {
        success: false,
        message: `Error: ${error.message}\nSuggested fix: ${errorAnalysis}`,
      };
    }
  }

  // Parse agent output (assumes JSON-like response from LLM)
  parseAgentOutput(agentResult) {
    try {
      const parsed = JSON.parse(agentResult.output || '{}');
      return {
        command: parsed.command || '',
        message: parsed.message || '',
      };
    } catch {
      // Fallback to raw text parsing
      const commandMatch = agentResult.output.match(/Command: (hax .+)/);
      return {
        command: commandMatch ? commandMatch[1] : '',
        message: agentResult.output,
      };
    }
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
}

module.exports = { SmartAIProcessor };