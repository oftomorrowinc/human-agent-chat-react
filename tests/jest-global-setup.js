/**
 * Jest global setup for browser testing
 */

module.exports = async () => {
  console.log('🚀 Setting up browser testing environment...');
  
  // Set environment variables
  process.env.JEST_PUPPETEER_CONFIG = JSON.stringify({
    launch: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    },
  });
  
  console.log('✅ Browser testing environment ready');
};