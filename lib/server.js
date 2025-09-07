/**
 * HAX AI Interface - Express Server
 * Handles web interface and AI command processing
 */

const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
require('dotenv').config();
const { SmartAIProcessor } = require('./ai-processor');

const app = express();
const port = process.env.PORT || 3001;
const sitesDir = process.env.SITES_DIR || path.join(process.cwd(), '.hax-ai', 'sites');
const userDir = process.env.USER_DIR || path.join(process.cwd(), '.hax-ai');

// Initialize AI processor
const aiProcessor = new SmartAIProcessor();

// Store running processes (for serve commands)
const runningProcesses = new Map();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(sitesDir, { recursive: true });
    await fs.mkdir(path.join(__dirname, '..', 'public'), { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Execute command safely
async function executeCommand(command, workingDir = sitesDir, timeout = 30000) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} in ${workingDir}`);
    
    exec(command, { 
      cwd: workingDir,
      timeout: timeout,
      maxBuffer: 1024 * 1024 * 5 // 5MB buffer
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${command}`, error.message);
        reject({ 
          error: error.message, 
          stderr: stderr || '', 
          stdout: stdout || '',
          command: command
        });
      } else {
        console.log(`Command succeeded: ${command}`);
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    });
  });
}

// Get available sites
async function getAvailableSites() {
  try {
    const entries = await fs.readdir(sitesDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => entry.name);
  } catch (error) {
    console.error('Error reading sites directory:', error);
    return [];
  }
}

// Get site information
async function getSiteInfo(siteName) {
  const sitePath = path.join(sitesDir, siteName);
  try {
    const siteJsonPath = path.join(sitePath, 'site.json');
    const siteJson = JSON.parse(await fs.readFile(siteJsonPath, 'utf8'));
    
    return {
      meta: {
        title: siteJson.title || siteName,
        description: siteJson.description || 'A HAX website',
        theme: siteJson.theme || 'default',
        pageCount: (siteJson.items || []).length,
        created: siteJson.metadata?.created || 'unknown'
      },
      pages: siteJson.items || [],
      path: sitePath
    };
  } catch (error) {
    throw new Error(`Could not read site info for ${siteName}: ${error.message}`);
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sitesDirectory: sitesDir,
    runningSites: Array.from(runningProcesses.keys()),
    aiStatus: aiProcessor.getStatus()
  });
});

// Configuration endpoints
app.get('/api/config/api-keys', async (req, res) => {
  try {
    const envPath = path.join(userDir, '.env');
    let anthropicKey = '';
    let openaiKey = '';
    
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('ANTHROPIC_API_KEY=')) {
          anthropicKey = line.split('=')[1] || '';
          anthropicKey = anthropicKey.replace(/['"]/g, ''); // Remove quotes
          // Return masked version for security
          anthropicKey = anthropicKey ? '***' + anthropicKey.slice(-4) : '';
        }
        if (line.startsWith('OPENAI_API_KEY=')) {
          openaiKey = line.split('=')[1] || '';
          openaiKey = openaiKey.replace(/['"]/g, ''); // Remove quotes
          // Return masked version for security  
          openaiKey = openaiKey ? '***' + openaiKey.slice(-4) : '';
        }
      }
    } catch (error) {
      // .env file doesn't exist, return empty
    }
    
    res.json({ anthropicKey, openaiKey });
  } catch (error) {
    console.error('Error reading API key config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.post('/api/config/api-keys', async (req, res) => {
  try {
    const { anthropicKey, openaiKey } = req.body;
    
    // Ensure user directory exists
    await fs.mkdir(userDir, { recursive: true });
    const envPath = path.join(userDir, '.env');
    
    // Read existing .env content
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, start with empty content
    }
    
    // Parse existing lines
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith('ANTHROPIC_API_KEY=') && 
      !line.startsWith('OPENAI_API_KEY=') &&
      line.trim() !== ''
    );
    
    // Add new API keys
    if (anthropicKey) {
      lines.push(`ANTHROPIC_API_KEY=${anthropicKey}`);
    }
    if (openaiKey) {
      lines.push(`OPENAI_API_KEY=${openaiKey}`);
    }
    
    // Write back to file
    await fs.writeFile(envPath, lines.join('\n') + '\n');
    
    // Reload environment variables
    require('dotenv').config({ path: envPath });
    
    // Reinitialize AI processor with new keys
    aiProcessor.updateConfig();
    
    console.log('✅ API keys updated successfully');
    res.json({ success: true, message: 'API keys saved successfully' });
    
  } catch (error) {
    console.error('Error saving API keys:', error);
    res.status(500).json({ error: 'Failed to save API keys: ' + error.message });
  }
});

app.get('/api/config/deployment', async (req, res) => {
  try {
    const envPath = path.join(userDir, '.env');
    let surgeLogin = '';
    let surgeToken = '';
    let surgeDomain = '';
    
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('SURGE_LOGIN=')) {
          surgeLogin = line.split('=')[1] || '';
          surgeLogin = surgeLogin.replace(/['"]/g, ''); // Remove quotes
        }
        if (line.startsWith('SURGE_TOKEN=')) {
          surgeToken = line.split('=')[1] || '';
          surgeToken = surgeToken.replace(/['"]/g, ''); // Remove quotes
          // Return masked version for security
          surgeToken = surgeToken ? '***' + surgeToken.slice(-4) : '';
        }
        if (line.startsWith('SURGE_DOMAIN=')) {
          surgeDomain = line.split('=')[1] || '';
          surgeDomain = surgeDomain.replace(/['"]/g, ''); // Remove quotes
        }
      }
    } catch (error) {
      // .env file doesn't exist, return empty
    }
    
    res.json({ surgeLogin, surgeToken, surgeDomain });
  } catch (error) {
    console.error('Error reading deployment config:', error);
    res.status(500).json({ error: 'Failed to read deployment configuration' });
  }
});

app.post('/api/config/deployment', async (req, res) => {
  try {
    const { surgeLogin, surgeToken, surgeDomain } = req.body;
    
    // Ensure user directory exists
    await fs.mkdir(userDir, { recursive: true });
    const envPath = path.join(userDir, '.env');
    
    // Read existing .env content
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, start with empty content
    }
    
    // Parse existing lines
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith('SURGE_LOGIN=') && 
      !line.startsWith('SURGE_TOKEN=') &&
      !line.startsWith('SURGE_DOMAIN=') &&
      line.trim() !== ''
    );
    
    // Add new deployment settings
    if (surgeLogin) {
      lines.push(`SURGE_LOGIN=${surgeLogin}`);
    }
    if (surgeToken) {
      lines.push(`SURGE_TOKEN=${surgeToken}`);
    }
    if (surgeDomain) {
      lines.push(`SURGE_DOMAIN=${surgeDomain}`);
    }
    
    // Write back to file
    await fs.writeFile(envPath, lines.join('\n') + '\n');
    
    // Reload environment variables
    require('dotenv').config({ path: envPath });
    
    console.log('✅ Deployment settings updated successfully');
    res.json({ success: true, message: 'Deployment settings saved successfully' });
    
  } catch (error) {
    console.error('Error saving deployment settings:', error);
    res.status(500).json({ error: 'Failed to save deployment settings: ' + error.message });
  }
});

// Check Surge login status
app.get('/api/surge/status', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    
    const checkSurge = new Promise((resolve, reject) => {
      const process = spawn('surge', ['whoami'], { stdio: 'pipe' });
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const userInfo = output.trim();
          // Parse user info (format: "email@example.com - Plan")
          const parts = userInfo.split(' - ');
          resolve({
            loggedIn: true,
            user: parts[0] || userInfo,
            plan: parts[1] || 'Free'
          });
        } else {
          resolve({
            loggedIn: false,
            error: errorOutput || 'Not logged in'
          });
        }
      });
      
      process.on('error', (error) => {
        resolve({
          loggedIn: false,
          error: 'Surge CLI not found or not installed'
        });
      });
    });

    const status = await checkSurge;
    res.json(status);
    
  } catch (error) {
    console.error('Error checking Surge status:', error);
    res.status(500).json({ 
      loggedIn: false, 
      error: 'Failed to check Surge status: ' + error.message 
    });
  }
});

// Main AI command endpoint
app.post('/api/ai-command', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        explanation: "Please enter a command or question about your website.",
        success: false,
        commands: [],
        executions: []
      });
    }

    // Get current context
    const availableSites = await getAvailableSites();
    const fullContext = {
      ...context,
      availableSites,
      sitesDir
    };

    // Process with AI
    const aiResult = await aiProcessor.process(message.trim(), fullContext);
    
    if (!aiResult.success) {
      return res.json(aiResult);
    }
    
    // Execute commands if any
    const executions = [];
    for (const command of aiResult.commands) {
      try {
        // Special handling for serve commands
        if (command.includes('hax serve')) {
          const siteName = aiResult.siteName;
          if (siteName) {
            await startServeProcess(siteName);
            executions.push({
              command: command,
              success: true,
              output: `Development server started for ${siteName} at http://localhost:3000`,
              error: ''
            });
          }
          continue;
        }

          // Always use the selected site from context for workingDir
          let workingDir = sitesDir;
          if (context && context.currentSite) {
            workingDir = path.join(sitesDir, context.currentSite);
          }
          console.log(`[AI DEBUG] Will execute: ${command}`);
          console.log(`[AI DEBUG] In directory: ${workingDir}`);

        // Special handling for surge commands (longer timeout)
        const timeout = command.includes('surge') ? 60000 : 30000;

        const result = await executeCommand(command, workingDir, timeout);
        executions.push({
          command: command,
          success: true,
          output: result.stdout,
          error: result.stderr
        });
      } catch (error) {
        executions.push({
          command: command,
          success: false,
          output: error.stdout || '',
          error: error.error || error.stderr || 'Unknown error occurred'
        });
      }
    }
    
    // Post-process certain actions
    let enhancedResult = { ...aiResult, executions };
    
    if (aiResult.action === 'list-pages' && executions.length > 0 && executions[0].success) {
      try {
        const siteData = JSON.parse(executions[0].output);
        const pages = siteData.items || [];
        enhancedResult.explanation += `\n\n**Pages in ${aiResult.siteName}:**\n` + 
          pages.map(page => `• ${page.title || 'Untitled'} ${page.slug ? `(/${page.slug})` : ''}`).join('\n');
        enhancedResult.data = { pages };
      } catch (e) {
        // If parsing fails, keep original output
      }
    }
    
    if (aiResult.action === 'deploy' && executions.some(e => e.success && e.output.includes('Success!'))) {
      // Look for deployed URL in output
      const deployOutput = executions.find(e => e.output?.includes('surge.sh'))?.output || '';
      const urlMatch = deployOutput.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        enhancedResult.deploymentUrl = urlMatch[0];
        enhancedResult.explanation += `\n\n🎉 **Your site is now live at:** ${urlMatch[0]}`;
      }
    }

    res.json(enhancedResult);
    
  } catch (error) {
    console.error('Error in /api/ai-command:', error);
    res.status(500).json({
      explanation: `I encountered an error processing your request: ${error.message}. Please try again or rephrase your command.`,
      success: false,
      commands: [],
      executions: []
    });
  }
});

// Get available sites
app.get('/api/sites', async (req, res) => {
  try {
    const sites = await getAvailableSites();
    const sitesWithInfo = [];
    
    for (const siteName of sites) {
      try {
        const info = await getSiteInfo(siteName);
        sitesWithInfo.push({ 
          name: siteName, 
          ...info.meta,
          hasError: false
        });
      } catch (error) {
        sitesWithInfo.push({ 
          name: siteName, 
          error: error.message,
          hasError: true
        });
      }
    }
    
    res.json({ sites: sitesWithInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific site information
app.get('/api/sites/:siteName', async (req, res) => {
  try {
    const siteInfo = await getSiteInfo(req.params.siteName);
    res.json(siteInfo);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Read file content
app.get('/api/sites/:siteName/files/*', async (req, res) => {
  try {
    const siteName = req.params.siteName;
    const filePath = req.params[0];
    const fullPath = path.join(sitesDir, siteName, filePath);
    
    // Security check - ensure path is within sites directory
    if (!fullPath.startsWith(sitesDir)) {
      return res.status(403).json({ error: 'Access denied - path outside allowed directory' });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(404).json({ error: `File not found: ${error.message}` });
  }
});

// Update file content
app.put('/api/sites/:siteName/files/*', async (req, res) => {
  try {
    const siteName = req.params.siteName;
    const filePath = req.params[0];
    const { content } = req.body;
    const fullPath = path.join(sitesDir, siteName, filePath);
    
    // Security check
    if (!fullPath.startsWith(sitesDir)) {
      return res.status(403).json({ error: 'Access denied - path outside allowed directory' });
    }
    
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to update file: ${error.message}` });
  }
});

// Start serve process for a site
async function startServeProcess(siteName) {
  const sitePath = path.join(sitesDir, siteName);
  
  // Kill existing process if running
  if (runningProcesses.has(siteName)) {
    try {
      runningProcesses.get(siteName).kill('SIGTERM');
    } catch (e) {
      console.log('Error killing existing process:', e.message);
    }
    runningProcesses.delete(siteName);
  }
  
  // Start new process
  try {
    // Use 'hax serve' to match manual usage
    const serveProcess = spawn('hax', ['serve', '--y', '--no-i'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      cwd: sitePath,
      env: { ...process.env, PORT: '3000' }
    });
    
    runningProcesses.set(siteName, serveProcess);
    
    // Handle process output
    serveProcess.stdout.on('data', (data) => {
      console.log(`[${siteName} serve]`, data.toString().trim());
    });
    
    serveProcess.stderr.on('data', (data) => {
        console.error(`[${siteName} serve error]`, data.toString().trim());
        // Do not exit or kill the process on stderr output; just log the error
        // Previously, this may have triggered a process exit or cleanup
        // Now, we simply log and allow the process to continue running
      });
    
    // Clean up when process exits
    serveProcess.on('exit', (code) => {
      console.log(`[${siteName} serve] Process exited with code ${code}`);
      runningProcesses.delete(siteName);
    });
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('Error starting serve process:', error);
    throw error;
  }
}

// Manual serve endpoint
app.post('/api/sites/:siteName/serve', async (req, res) => {
  try {
    const siteName = req.params.siteName;
    await startServeProcess(siteName);
    
    res.json({ 
      success: true, 
      message: `Development server started for ${siteName}`,
      url: 'http://localhost:3000'
    });
  } catch (error) {
    res.status(500).json({ 
      error: `Failed to start server: ${error.message}` 
    });
  }
});

// Manual deploy endpoint
app.post('/api/sites/:siteName/deploy', async (req, res) => {
  try {
    const siteName = req.params.siteName;
    const { domain } = req.body;
    const sitePath = path.join(sitesDir, siteName);
    
    // Build the site first
    console.log(`Building site ${siteName}...`);
    await executeCommand('npm run build', sitePath, 60000);
    
    // Deploy to Surge
    const distPath = path.join(sitePath, 'dist');
    const finalDomain = domain || `${siteName}-${Date.now()}.surge.sh`;
    
    console.log(`Deploying to ${finalDomain}...`);
    const result = await executeCommand(`surge . ${finalDomain}`, distPath, 60000);
    
    res.json({
      success: true,
      message: `Site deployed successfully to https://${finalDomain}`,
      url: `https://${finalDomain}`,
      output: result.stdout
    });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ 
      error: `Deployment failed: ${error.error || error.message}`,
      details: error.stderr || ''
    });
  }
});

// Clear AI conversation history
app.post('/api/ai/clear-history', (req, res) => {
  aiProcessor.clearHistory();
  res.json({ success: true, message: 'Conversation history cleared' });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Initialize and start server
async function startServer() {
  try {
    await ensureDirectories();
    
    const server = app.listen(port, () => {
      console.log(`\n🚀 HAX AI Interface running on http://localhost:${port}`);
      console.log(`📁 Sites directory: ${sitesDir}`);
      console.log(`🤖 AI Status: ${aiProcessor.getStatus().hasAPIKey ? `${aiProcessor.getStatus().aiProvider} ready` : 'Pattern matching mode'}`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      
      // Kill any running serve processes
      runningProcesses.forEach((process, siteName) => {
        console.log(`🛑 Stopping server for ${siteName}`);
        try {
          process.kill('SIGTERM');
        } catch (e) {
          console.error(`Error stopping ${siteName}:`, e.message);
        }
      });
      
      server.close(() => {
        console.log('👋 HAX AI Interface stopped');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;