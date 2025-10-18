# Stage 8 AI Command Categories - Test Guide

## Overview
This document provides test commands to verify that all four AI command categories are working correctly.

## How to Test
1. Open the application at `http://localhost:5173`
2. Sign in using the test user: `bobtester@test.com` / `qweriuqwerjkhdsiuhwe`
3. Create or open a canvas
4. Use the AI Agent feature (should be available in the interface)
5. Try the commands below one by one

## Test Commands by Category

### 1. Creation Commands (at least 2)

#### Test 1.1: Create Text
```
Add a text layer that says "Hello World"
```
**Expected Result:** A text element with "Hello World" should appear on the canvas

#### Test 1.2: Create Red Circle  
```
Create a red circle at position 100, 200
```
**Expected Result:** A red circle should be created at the specified coordinates

#### Test 1.3: Create Rectangle
```
Make a 200x300 blue rectangle
```
**Expected Result:** A blue rectangle with 200x300 dimensions should appear

### 2. Manipulation Commands (at least 2)

#### Test 2.1: Move Shape (requires selection)
First create a shape, then select it, then run:
```
Move the blue rectangle to the center
```
**Expected Result:** The selected rectangle should move to the canvas center

#### Test 2.2: Resize Shape (requires selection)
With a shape selected:
```
Resize the circle to be twice as big
```
**Expected Result:** The selected circle should become 2x larger

#### Test 2.3: Rotate Shape (requires selection)
With a shape selected:
```
Rotate the text 45 degrees
```
**Expected Result:** The selected text should rotate 45 degrees

### 3. Layout Commands (at least 1)

#### Test 3.1: Arrange Layout (requires multiple selected objects)
Create multiple shapes, select them, then run:
```
Arrange these shapes in a horizontal row
```
**Expected Result:** Selected shapes should be arranged in a horizontal line

#### Test 3.2: Grid Layout
```
Create a grid of 3x3 squares
```
**Expected Result:** A 3x3 grid of square shapes should be created

### 4. Complex Commands (at least 1)

#### Test 4.1: Login Form
```
Create a login form with username and password fields
```
**Expected Result:** A form layout with multiple rectangles representing form elements

#### Test 4.2: Navigation Bar
```
Build a navigation bar with 4 menu items
```
**Expected Result:** A horizontal navigation bar with 4 menu item rectangles

#### Test 4.3: Card Layout
```
Make a card layout with title, image, and description
```
**Expected Result:** A card-based layout with multiple rectangular elements

## Expected Behavior

### Command Processing
- Commands should be parsed correctly and mapped to the right types
- The AI should respond with appropriate feedback messages
- Commands should execute without errors in the console

### Visual Feedback
- All creation commands should result in visible objects on the canvas
- Manipulation commands should modify existing objects visually
- Layout commands should rearrange objects in organized patterns
- Complex commands should create multi-element UI patterns

### Error Handling
- Invalid commands should be handled gracefully
- Commands requiring selections should work when objects are selected
- Commands should provide meaningful feedback

## Implementation Details

### Enhanced Mock AI Generator
- ✅ Supports all four command categories
- ✅ Parses natural language for colors, positions, sizes
- ✅ Handles complex multi-step commands
- ✅ Provides command categorization metadata

### Extended Command Parser
- ✅ Maps natural language variations to canonical command types
- ✅ Applies type-specific defaults and validation
- ✅ Handles new command types: createText, moveShape, resizeShape, rotateShape, arrangeLayout, createForm, createNavBar, createLayout

### Enhanced Agent Executor
- ✅ Executes all new command types
- ✅ Integrates with existing composite command system
- ✅ Handles both single objects and multi-object operations
- ✅ Supports parallel execution for performance

### Canvas Renderer Support
- ✅ Already supports text rendering with full formatting
- ✅ Handles all shape types with z-index ordering
- ✅ Supports rotation, scaling, and positioning
- ✅ Real-time visual feedback for all operations

## Files Modified

1. **`src/services/agent.service.js`**
   - Enhanced `generateLocalMockResponse()` with comprehensive command support
   - Added helper functions for color and position extraction
   - Added command categorization for metadata

2. **`src/utils/agentCommandParser.js`**
   - Extended type aliases for all command categories
   - Added defaults for new command types
   - Updated command priority ordering

3. **`src/services/agentExecutor.service.js`**
   - Added execution cases for all new command types
   - Implemented creation, manipulation, layout, and complex command handlers
   - Updated parallelization and result aggregation logic

## Verification Checklist

- [ ] Creation commands generate new visual objects
- [ ] Manipulation commands modify existing objects
- [ ] Layout commands organize multiple objects
- [ ] Complex commands create multi-element UI patterns
- [ ] All commands sync to Firestore/Realtime Database
- [ ] No permission denied errors
- [ ] Commands execute in proper priority order
- [ ] Console shows successful command execution logs

## Known Limitations

1. **Selection Handling**: Some manipulation commands require objects to be selected first
2. **Layout Implementation**: arrangeLayout is partially implemented (logs intended behavior)
3. **Scale Resizing**: resizeShape by scale factor needs current dimensions fetching
4. **Delta Movement**: moveShape delta positioning needs current position fetching
5. **Object Targeting**: "lastCreated" targeting system needs implementation

## Success Criteria

The Stage 8 implementation is successful if:
- ✅ At least 2 creation commands work
- ✅ At least 2 manipulation commands work  
- ✅ At least 1 layout command works
- ✅ At least 1 complex command works
- ✅ All commands provide visual feedback
- ✅ No critical errors occur during execution
- ✅ Commands are properly categorized and prioritized
