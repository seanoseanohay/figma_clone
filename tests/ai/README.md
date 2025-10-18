# AI Agent Testing Suite

This directory contains comprehensive tests for the AI Agent functionality, designed to prevent regression and ensure reliability as new features are added.

## Test Structure

### Core Test Files
- **`agentRegression.test.js`** - Prevents breaking changes to existing functionality
- **`agentParser.test.js`** - Unit tests for command parsing logic
- **`agentExecution.test.js`** - Unit tests for command execution
- **`agentIntegration.test.js`** - End-to-end integration tests
- **`agentPerformance.test.js`** - Load testing and performance benchmarks

### Supporting Files
- **`fixtures/goldStandardCommands.json`** - Baseline expected behaviors
- **`monitors/agentHealthCheck.js`** - Automated health monitoring

## Running Tests

```bash
# Run all AI agent tests
npm run test:ai

# Run only regression tests
npm run test tests/ai/agentRegression.test.js

# Run with coverage
npm run test:coverage tests/ai/
```

## Regression Testing Philosophy

The regression test suite maintains a "gold standard" of expected behaviors that should never change without explicit approval. When making changes to AI agent functionality:

1. **Run regression tests first** to establish baseline
2. **Make your changes**
3. **Run regression tests again** to detect any unintended changes
4. **Update gold standards** only if changes are intentional

## Adding New Test Cases

When implementing new AI agent features:

1. **Add unit tests** for individual components
2. **Add regression tests** for the complete user-facing behavior
3. **Update gold standards** in `fixtures/goldStandardCommands.json`
4. **Add performance benchmarks** if introducing new command types

## Test Categories

- **Critical**: Core functionality that must never break (resize, basic shapes)
- **High**: Important features used frequently (text, layouts, colors)
- **Medium**: Secondary features (fallbacks, edge cases)
- **Low**: Complex or rarely used features

## Performance Targets

- **Response Time**: < 1000ms for command generation
- **Success Rate**: > 95% for valid prompts
- **Memory Usage**: < 100MB during normal operation
- **Concurrent Users**: Handle 10+ users simultaneously

## Continuous Monitoring

The test suite integrates with continuous monitoring to:
- Run regression tests on every commit
- Alert on performance degradation
- Track success rates over time
- Monitor for new error patterns

## Best Practices

1. **Keep tests deterministic** - Use fixed mock data, avoid randomness
2. **Test edge cases** - Empty prompts, malformed input, boundary conditions
3. **Verify both success and failure paths** - Ensure graceful error handling
4. **Update baselines carefully** - Changes to gold standards require review
5. **Focus on user-facing behavior** - Test what users actually experience
