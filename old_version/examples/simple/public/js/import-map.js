/**
 * Import map polyfill for browser
 * This provides browser-compatible mappings for Node.js-style imports
 */

// Define our import map
const importMap = {
  imports: {
    "firebase/app": "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js",
    "firebase/firestore": "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js",
    "firebase/auth": "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js",
    "firebase/storage": "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js"
  }
};

// Register the import map
const importMapElement = document.createElement('script');
importMapElement.type = 'importmap';
importMapElement.textContent = JSON.stringify(importMap);
document.currentScript.after(importMapElement);

console.log('Import map installed');