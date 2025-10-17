# Stage 7: AI Agent Tasks

## Overview
Implement the full AI Canvas Agent system with chat interface, command execution, multi-user sync, and metrics tracking.

---

### Task AIA1: Chat Interface & Prompt Flow
**Objective:**  
Build the user-facing chat UI to send prompts and receive AI responses.

**Files to Create:**  
- `src/components/ai/AgentChatPanel.jsx`  
- `src/hooks/useAgentChat.js`

**Specific Changes:**  
1. Build chat panel UI with message list + input bar.  
2. Integrate with `agent.service.js`.  
3. Handle loading, error, and response states.  

**Acceptance Criteria:**  
- [ ] Messages flow correctly user ↔ agent.  
- [ ] Loading indicator visible during requests.  
- [ ] Errors reported non-intrusively.  

---

### Task AIA2: Command Parser Implementation
**Objective:**  
Convert model replies to validated commands.

**Files to Modify:**  
- `src/utils/agentSchemas.js`  
- `src/utils/agentCommandParser.js`

**Specific Changes:**  
1. Parse and validate LLM JSON.  
2. Sanitize fields (types, bounds, colors).  
3. Fallback to default values if missing.  

**Acceptance Criteria:**  
- [ ] 100% valid commands after parser.  
- [ ] Malformed replies fail gracefully with warning.

---

### Task AIA3: Command Execution Layer
**Objective:**  
Map validated commands to canvas actions.

**Files to Modify:**  
- `src/services/canvas.service.js`  
- `src/services/agent.service.js`

**Specific Changes:**  
1. Implement `executeAgentCommand(cmd)` switch.  
2. Support 8+ distinct commands (creation, manipulation, layout, complex).  
3. Batch multi-command exec in transactions.  

**Acceptance Criteria:**  
- [ ] 90%+ execution accuracy.  
- [ ] <2 s average response time.  
- [ ] Undo/redo integrated.  

---

### Task AIA4: Complex Commands (Composites)
**Objective:**  
Add multi-step templates (login form, nav bar, card layout).

**Files to Modify:**  
- `src/utils/agentCommandParser.js`  
- `src/services/canvas.service.js`

**Specific Changes:**  
1. Create helpers like `createLoginFormComposite()`.  
2. Implement relative layout math (spacing, alignment).  
3. Allow custom defaults for colors and sizes.  

**Acceptance Criteria:**  
- [ ] Complex layouts render 3+ elements correctly.  
- [ ] Commands resolve in <3 s.  
- [ ] Users can tweak AI-generated elements.  

---

### Task AIA5: Realtime Multi-User Support
**Objective:**  
Sync AI actions to all clients.

**Files to Modify:**  
- `src/contexts/CanvasContext.jsx`  
- `src/services/presence.service.js`

**Specific Changes:**  
1. Broadcast AI mutations via presence events.  
2. Prevent conflicts with manual edits.  
3. Show “AI is editing…” status indicator.  

**Acceptance Criteria:**  
- [ ] All users see AI changes within 1 s.  
- [ ] No data collisions.  

---

### Task AIA6: Agent Metrics & Feedback
**Objective:**  
Measure latency, accuracy, and success rates.

**Files to Create:**  
- `src/hooks/useAgentMetrics.js`  
- `src/components/ai/AgentMetricsPanel.jsx`

**Specific Changes:**  
1. Track start → response time.  
2. Log success/failure per command.  
3. Display rolling stats in sidebar.  

**Acceptance Criteria:**  
- [ ] Metrics update live.  
- [ ] Logs persist in dev mode.  

---

### Task AIA7: Testing & Evaluation Suite
**Objective:**  
Verify reliability and performance against grading rubric.

**Files to Create:**  
- `tests/ai/agentParser.test.js`  
- `tests/ai/agentExecution.test.js`

**Specific Changes:**  
1. Mock LLM responses.  
2. Validate 8+ commands work.  
3. Measure response time <2 s.  

**Acceptance Criteria:**  
- [ ] All unit tests pass (≥90% coverage).  
- [ ] Manual grading criteria met.  

---

## ✅ Final Success Checklist
- [ ] 8+ commands implemented and tested  
- [ ] Complex commands render properly  
- [ ] Responses < 2 s  
- [ ] Shared state stable  
- [ ] UX smooth with feedback and metrics

