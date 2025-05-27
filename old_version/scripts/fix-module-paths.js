/**
 * This script automatically adds .js extensions to ES module imports in the compiled code
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for dist files
const distDir = path.join(__dirname, '..', 'dist');

/**
 * Add .js extension to import statements and exports
 * @param {string} content - File content
 * @returns {string} - Updated content
 */
function fixImports(content) {
  // Fix relative imports without file extensions
  // Matches import statements like: import { X } from './path/to/module';
  content = content.replace(
    /from\s+['"](\.[^'"]*)['"]/g,
    (match, importPath) => {
      // Don't add .js if the import already has an extension or it's not a relative import
      if (importPath.endsWith('.js') || importPath.includes('.css')) {
        return match;
      }
      return `from '${importPath}.js'`;
    }
  );

  return content;
}

/**
 * Process a directory recursively
 * @param {string} dir - Directory to process
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (stats.isFile() && file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const updatedContent = fixImports(content);
        
        if (content !== updatedContent) {
          fs.writeFileSync(filePath, updatedContent);
          console.log(`Fixed imports in ${filePath}`);
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  }
}

// Main execution
console.log('Fixing module paths...');
processDirectory(distDir);
console.log('Module paths fixed successfully!');