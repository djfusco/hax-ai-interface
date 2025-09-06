#!/usr/bin/env node

/**
 * HAX AI Interface - Main Executable
 * Creates and manages HAX websites through AI conversation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// ASCII Art Banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('🚀 HAX AI Interface')}                                        ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.white('Create beautiful websites using AI conversation')}             ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
`;

class HAXAISetup {
  constructor() {
    this.userDir = path.join(os.homedir(), '.hax-ai');
    this.sitesDir = path.join(this.userDir, 'sites');
    this.configFile = path.join(this.userDir, 'config.json');
    this.envFile = path.join(this.userDir, '.env');
    this.isFirstRun = !fs.existsSync(this.userDir);
    this.port = process.env.PORT || 3001;
  }

  async start() {
    console.clear();
    console.log(banner);
    
    if (this.isFirstRun) {
      await this.firstTimeSetup();
    } else {
      await this.normalStart();
    }
  }

  async firstTimeSetup() {
    console.log(chalk.yellow('🎉 Welcome to HAX AI Interface!\n'));
    console.log('This is your first time running the tool. Let\'s get you set up!\n');

    const spinner = ora('Setting up your workspace...').start();
    
    try {
      // Create directories
      await this.createDirectories();
      spinner.text = 'Installing dependencies...';
      
      // Check and install required tools
      await this.checkDependencies();
      spinner.text = 'Configuring environment...';
      
      // Setup configuration
      await this.setupConfiguration();
      spinner.succeed('Workspace setup complete!');
      
      // Optional AI setup
      await this.setupAI();
      
      console.log(chalk.green('\n✅ Setup complete! Starting HAX AI Interface...\n'));
      
    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('Error during setup:'), error.message);
      process.exit(1);
    }

    await this.startServer();
  }

  async normalStart() {
    console.log(chalk.blue('🌐 Starting HAX AI Interface...\n'));
    
    // Quick health check
    const spinner = ora('Checking system...').start();
    
    try {
      await this.healthCheck();
      spinner.succeed('System ready');
    } catch (error) {
      spinner.warn('Some dependencies may need attention');
      console.log(chalk.yellow(`⚠️  ${error.message}\n`));
    }

    await this.startServer();
  }

  async createDirectories() {
    const dirs = [this.userDir, this.sitesDir];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async checkDependencies() {
    const dependencies = [
      { name: 'HAX CLI', command: 'hax --version', install: 'npm install -g @haxtheweb/create' },
      { name: 'Surge CLI', command: 'surge --version', install: 'npm install -g surge' }
    ];

    for (const dep of dependencies) {
      try {
        await this.executeCommand(dep.command);
        console.log(chalk.green(`  ✅ ${dep.name} found`));
      } catch (error) {
        console.log(chalk.yellow(`  📦 Installing ${dep.name}...`));
        try {
          await this.executeCommand(dep.install);
          console.log(chalk.green(`  ✅ ${dep.name} installed`));
        } catch (installError) {
          console.log(chalk.red(`  ❌ Failed to install ${dep.name}`));
          console.log(chalk.dim(`     You can install it manually: ${dep.install}`));
        }
      }
    }
  }

  async setupConfiguration() {
    const config = {
      version: '1.0.0',
      created: new Date().toISOString(),
      sitesDir: this.sitesDir,
      port: this.port,
      lastUsed: new Date().toISOString()
    };

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));

    // Copy .env template
    const envTemplate = path.join(__dirname, '..', 'templates', '.env.example');
    if (fs.existsSync(envTemplate)) {
      fs.copyFileSync(envTemplate, this.envFile);
    } else {
      // Create basic .env
      const envContent = `# HAX AI Interface Configuration
# Add your OpenAI API key for full AI features (optional)
# OPENAI_API_KEY=your_key_here

# Or use Anthropic Claude instead
# ANTHROPIC_API_KEY=your_key_here

# Server port (default: 3001)
PORT=3001

# Debug mode
# DEBUG=true
`;
      fs.writeFileSync(this.envFile, envContent);
    }
  }

  async setupAI() {
    console.log(chalk.cyan('\n🤖 AI Configuration (Optional)\n'));
    console.log('HAX AI Interface works great without an AI API key, but you can get');
    console.log('enhanced natural language processing by adding one.\n');

    const { setupAI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupAI',
        message: 'Would you like to configure an AI API key now?',
        default: false
      }
    ]);

    if (setupAI) {
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which AI provider would you like to use?',
          choices: [
            { name: 'OpenAI (GPT-4) - Recommended', value: 'openai' },
            { name: 'Anthropic (Claude)', value: 'anthropic' },
            { name: 'Skip for now', value: 'skip' }
          ]
        }
      ]);

      if (provider !== 'skip') {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key:`,
            mask: '*'
          }
        ]);

        if (apiKey) {
          const envKey = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
          const envContent = fs.readFileSync(this.envFile, 'utf8');
          const updatedEnv = envContent.replace(
            new RegExp(`# ${envKey}=.*`),
            `${envKey}=${apiKey}`
          );
          fs.writeFileSync(this.envFile, updatedEnv);
          console.log(chalk.green(`✅ ${provider} API key configured!`));
        }
      }
    }

    console.log(chalk.dim('\n💡 You can always add an API key later by editing:'));
    console.log(chalk.dim(`   ${this.envFile}\n`));
  }

  async healthCheck() {
    // Check if required directories exist
    if (!fs.existsSync(this.sitesDir)) {
      throw new Error('Sites directory missing. Please run setup again.');
    }

    // Check if HAX CLI is available
    try {
      await this.executeCommand('hax --version');
    } catch (error) {
      throw new Error('HAX CLI not found. Install with: npm install -g @haxtheweb/create');
    }

    // Update last used timestamp
    if (fs.existsSync(this.configFile)) {
      const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      config.lastUsed = new Date().toISOString();
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    }
  }

  async startServer() {
    // Load environment variables
    require('dotenv').config({ path: this.envFile });
    
    // Set environment variables for the server
    process.env.SITES_DIR = this.sitesDir;
    process.env.USER_DIR = this.userDir;
    process.env.PORT = this.port;

    console.log(chalk.blue('🏠 Your workspace:'));
    console.log(chalk.dim(`   Sites: ${this.sitesDir}`));
    console.log(chalk.dim(`   Config: ${this.userDir}`));
    console.log('');

    // Start the Express server
    try {
      const serverPath = path.join(__dirname, '..', 'lib', 'server.js');
      require(serverPath);
      
      // Open browser after delay
      setTimeout(async () => {
        const url = `http://localhost:${this.port}`;
        console.log(chalk.green(`🌐 HAX AI Interface is running!`));
        console.log(chalk.blue(`🔗 Open your browser to: ${url}`));
        console.log('');
        console.log(chalk.dim('💡 To stop the server: Press Ctrl+C'));
        console.log(chalk.dim('🆘 Need help? Type "help" in the chat interface'));
        console.log('');

        // Try to open browser
        try {
          const open = require('open');
          await open(url);
          console.log(chalk.green('✅ Browser opened automatically\n'));
        } catch (error) {
          console.log(chalk.yellow('💡 Please manually open your browser to the URL above\n'));
        }
      }, 2000);

    } catch (error) {
      console.error(chalk.red('❌ Failed to start server:'), error.message);
      console.log('\nPlease check the error above and try again.');
      console.log('If the problem persists, please file an issue at:');
      console.log('https://github.com/yourusername/hax-ai-interface/issues');
      process.exit(1);
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${banner}

Usage: npx hax-ai-interface [options]

Options:
  --help, -h          Show this help message
  --version, -v       Show version number
  --port <number>     Specify port (default: 3001)
  --no-browser        Don't open browser automatically
  --reset             Reset configuration and start fresh

Examples:
  npx hax-ai-interface                 # Start normally
  npx hax-ai-interface --port 3002     # Use port 3002
  npx hax-ai-interface --reset         # Reset and start fresh

For more help, visit: https://github.com/yourusername/hax-ai-interface
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const packageJson = require('../package.json');
  console.log(packageJson.version);
  process.exit(0);
}

// Handle port override
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  process.env.PORT = args[portIndex + 1];
}

// Handle reset
if (args.includes('--reset')) {
  const userDir = path.join(os.homedir(), '.hax-ai');
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
    console.log(chalk.green('✅ Configuration reset successfully'));
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Thanks for using HAX AI Interface!'));
  console.log('Your sites are saved in:', chalk.dim(path.join(os.homedir(), '.hax-ai', 'sites')));
  console.log('Run again anytime with: npx hax-ai-interface\n');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error.message);
  console.log('Please report this issue at: https://github.com/yourusername/hax-ai-interface/issues');
  process.exit(1);
});

// Start the application
const setup = new HAXAISetup();
setup.start().catch(error => {
  console.error(chalk.red('Failed to start HAX AI Interface:'), error.message);
  process.exit(1);
});