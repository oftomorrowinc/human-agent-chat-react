/**
 * Jest global teardown for browser testing
 */

module.exports = async () => {
  console.log('🧹 Cleaning up browser testing environment...');
  
  // Clean up any global resources if needed
  
  console.log('✅ Browser testing environment cleaned up');
};