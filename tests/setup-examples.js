/**
 * Jest setup for examples testing
 */

const puppeteer = require('puppeteer');

// Global setup for browser testing
global.browser = null;

beforeAll(async () => {
  global.browser = await puppeteer.launch({
    headless: true, // Set to false for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
  });
});

afterAll(async () => {
  if (global.browser) {
    await global.browser.close();
  }
});

// Custom matchers for DOM testing
expect.extend({
  toBeVisible(received) {
    const pass = received && received.offsetWidth > 0 && received.offsetHeight > 0;
    return {
      message: () => `expected element to be ${pass ? 'not ' : ''}visible`,
      pass,
    };
  },
  
  toHaveEmoji(received, emoji) {
    const pass = received && received.textContent.includes(emoji);
    return {
      message: () => `expected element to ${pass ? 'not ' : ''}contain emoji ${emoji}`,
      pass,
    };
  },
});

// Helper functions for testing
global.testHelpers = {
  waitForElement: async (page, selector, timeout = 5000) => {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  },
  
  getElementText: async (page, selector) => {
    try {
      return await page.textContent(selector);
    } catch (error) {
      return null;
    }
  },
  
  clickAndWait: async (page, selector, waitSelector = null, timeout = 3000) => {
    await page.click(selector);
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout });
    } else {
      await page.waitForTimeout(100); // Small delay for DOM updates
    }
  },
};