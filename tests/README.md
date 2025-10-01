# Tests Directory

This directory contains various test files for the JSRekordfxbridge TypeScript DJ lighting control system.

## Test Files

### `test-di.js` - **Main DI Container Test**
The primary test for validating dependency injection container functionality.
- Tests all critical services resolution
- Validates @unmanaged() decorator fixes
- Confirms TypeScript DI system is working correctly
- **Usage**: `node tests/test-di.js`

### `test-all-services.js` - **Comprehensive Service Test**
Advanced test that validates all services with detailed interaction testing.
- Tests all service types
- Includes additional validation for key services
- Tests service interactions and dependencies
- **Usage**: `node tests/test-all-services.js`

### `validate-di-fixes.js` - **DI Fixes Validation**
Focused test specifically for validating the @unmanaged() decorator implementation.
- Tests constructor parameter handling
- Validates InversifyJS best practices implementation
- **Usage**: `node tests/validate-di-fixes.js`

### `test-direct.js` - **Direct Service Test**
Direct instantiation test without DI container.
- Tests services can be created directly
- Validates constructor parameters work correctly
- **Usage**: `node tests/test-direct.js`

### `test-manual.js` - **Manual Service Test**
Manual testing script for individual service validation.
- Step-by-step service testing
- Useful for debugging specific service issues
- **Usage**: `node tests/test-manual.js`

### `test-minimal.js` - **Minimal Test**
Stripped-down test for basic functionality validation.
- Minimal dependencies
- Quick validation test
- **Usage**: `node tests/test-minimal.js`

## Running Tests

From the project root directory:

```bash
# Run the main DI container test (recommended)
node tests/test-di.js

# Run comprehensive service validation
node tests/test-all-services.js

# Run specific validation tests
node tests/validate-di-fixes.js
node tests/test-direct.js
node tests/test-manual.js
node tests/test-minimal.js
```

## Notes

- All tests require the project to be built first: `npm run build`
- Tests run in DEMO_MODE to use mock controllers
- Import paths are relative to the project root (`../dist/...`)
- Tests validate the @unmanaged() decorator fixes for InversifyJS constructor parameters