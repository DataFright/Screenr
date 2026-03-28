import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/suite-*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: false, // Disable to save memory
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    
    // Memory management - critical for Electron
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 0,
    
    // Reduce retries to save memory
    retries: 0,
    
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@cypress/code-coverage/task')(on, config)
      
      // Electron-specific optimizations
      on('before:browser:launch', (browser, launchOptions) => {
        // Apply to all Chromium-based browsers including Electron
        if (browser.family === 'chromium') {
          // GPU and rendering optimizations
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--disable-gpu-compositing')
          launchOptions.args.push('--disable-software-rasterizer')
          launchOptions.args.push('--disable-dev-shm-usage')
          
          // Memory optimizations
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-setuid-sandbox')
          launchOptions.args.push('--disable-extensions')
          launchOptions.args.push('--disable-plugins')
          launchOptions.args.push('--disable-images') // Don't load images
          launchOptions.args.push('--disable-background-networking')
          launchOptions.args.push('--disable-sync')
          launchOptions.args.push('--disable-translate')
          launchOptions.args.push('--metrics-recording-only')
          launchOptions.args.push('--disable-default-apps')
          launchOptions.args.push('--mute-audio')
          launchOptions.args.push('--no-first-run')
          
          // Limit memory
          launchOptions.args.push('--max-old-space-size=512')
          launchOptions.args.push('--js-flags="--max_old_space_size=512"')
          
          // Single process mode (more stable in containers)
          launchOptions.args.push('--single-process')
          launchOptions.args.push('--no-zygote')
          
          // Disable features that consume memory
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
          launchOptions.args.push('--disable-blink-features=AutomationControlled')
          
          // Set window size explicitly
          launchOptions.args.push('--window-size=1280,720')
        }
        
        return launchOptions
      })
      
      // Clear cache between spec runs
      on('before:spec', () => {
        // Force garbage collection hint
        if (global.gc) {
          global.gc()
        }
      })
      
      // Handle crashes gracefully
      on('after:spec', (spec, results) => {
        if (results?.stats?.failures > 0) {
          console.log(`Spec ${spec.name} had ${results.stats.failures} failures`)
        }
      })
      
      return config
    },
  },
})
