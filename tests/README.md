# Chat Examples Testing

This directory contains comprehensive integration tests for the chat examples functionality.

## Recent Fixes Covered by Tests

### ✅ Emoji Functionality
- **Toggle emoji picker**: Tests that emoji buttons appear on hover and can be toggled
- **Emoji positioning**: Verifies emoji picker appears in correct position and expands in right direction
- **User switching**: Tests that emoji buttons show/hide correctly when switching users
- **Emoji reactions**: Tests that clicking emojis adds reactions to messages
- **Emoji configuration**: Verifies all 11 configured emojis are present with correct titles
- **Cross-example consistency**: Ensures both basic and advanced examples have same emoji functionality

### ✅ File Upload Functionality
- **Real file uploads**: Tests the new file upload functionality in advanced example
- **Image display**: Tests that images display correctly in basic example (picsum.photos fix)
- **Upload progress**: Tests upload progress messages and file handling

### ✅ Audio Functionality
- **Audio generation**: Tests the new audio file generation in advanced example
- **Audio controls**: Verifies audio elements have controls and proper sources
- **Audio error handling**: Tests fallback behavior when audio fails to load

### ✅ User Interface
- **User switching**: Tests that user displays update in both sidebar and chat header
- **Message ownership**: Tests that message styling updates when switching users
- **Form functionality**: Tests stars and slider form elements

### ✅ Media Handling
- **Image lightbox**: Tests image click-to-expand functionality
- **Media attachments**: Tests various media type rendering
- **Media grid**: Tests the fixed btoa/encodeURIComponent functionality

## Test Structure

### Integration Tests (`examples-integration.test.js`)
Comprehensive tests that cover:
- Basic chat example functionality
- Advanced chat example functionality
- Cross-example consistency
- User interaction flows
- Media handling
- Form functionality

### Test Setup Files
- `setup-examples.js`: Jest setup for browser testing with Puppeteer
- `jest-global-setup.js`: Global test environment setup
- `jest-global-teardown.js`: Global test environment cleanup

## Running Tests

```bash
# Run all example tests
npm run test:examples

# Run tests in watch mode (for development)
npm run test:examples:watch

# Run tests with debug info
npm run test:examples:debug

# Run all tests (React + Examples)
npm run test:all
```

## Test Configuration

Tests use:
- **Jest** for test framework
- **Puppeteer** for browser automation
- **File-based testing** for direct HTML example testing
- **Headless Chrome** for fast, reliable testing

## Test Coverage

Tests cover all major functionality that was recently fixed:
- ✅ Emoji picker positioning and functionality
- ✅ User switching and display updates
- ✅ File upload and media handling
- ✅ Audio generation and playback
- ✅ Form rendering with custom elements
- ✅ Image display and lightbox functionality
- ✅ Cross-browser compatibility

## Writing New Tests

When adding new functionality to the examples, add corresponding tests to:
1. The appropriate test section in `examples-integration.test.js`
2. Add helper functions to `setup-examples.js` if needed
3. Update this README with new test coverage

## Test Best Practices

- Tests run against actual HTML files for realistic behavior
- Use meaningful test descriptions
- Test both positive and negative scenarios
- Include accessibility testing where applicable
- Maintain cross-example consistency tests