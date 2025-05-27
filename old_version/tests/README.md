# HumanAgentChat Tests

This directory contains tests for the HumanAgentChat package. The test structure mirrors the source code structure:

- `/tests/components/` - Tests for UI components
- `/tests/lib/` - Tests for Firebase and other libraries
- `/tests/utils/` - Tests for utility functions

## Running Tests

To run all tests:

```bash
npm test
```

To run tests with coverage:

```bash
npm test -- --coverage
```

## Test Structure

Each test file follows the same naming convention as its corresponding source file, with `.test.ts` appended. For example, the test for `src/utils/access-control.ts` is `tests/utils/AccessControl.test.ts`.

## Known Issues

Some tests for UI components are currently disabled due to JSDOM compatibility issues. These tests will be fixed in a future update.