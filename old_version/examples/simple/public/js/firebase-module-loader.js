/**
 * Browser-compatible Firebase module loader
 * This dynamically loads Firebase modules from CDN when needed
 */

// URL mapping for Firebase modules
const firebaseModules = {
  'firebase/app': 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
  'firebase/firestore': 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js',
  'firebase/auth': 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js',
  'firebase/storage': 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js'
};

// Cache for loaded modules
const loadedModules = {};

/**
 * Custom import function to load Firebase modules from CDN
 * @param {string} moduleName - The name of the module to import
 * @returns {Promise<Object>} - The loaded module
 */
export async function importFirebaseModule(moduleName) {
  // If it's a Firebase module, load it from CDN
  if (moduleName in firebaseModules) {
    if (!loadedModules[moduleName]) {
      console.log(`Loading Firebase module from CDN: ${moduleName}`);
      loadedModules[moduleName] = await import(firebaseModules[moduleName]);
    }
    return loadedModules[moduleName];
  }
  
  // For other modules, use standard import
  return import(moduleName);
}