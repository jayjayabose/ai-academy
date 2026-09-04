# Standard Logging Protocol Block - Add to ALL Agent Prompts

**Commands and file paths are per-project.** The blocks below are the shape of what every agent prompt must carry;
where one says "the project's test command" or "the project's test locations", substitute the real thing before
pasting. A worked set is in `examples/<stack>/logging-protocol-integration-examples.md`.

## Copy-Paste Logging Instructions

Add this exact block to every feature-building agent prompt:

```markdown
## SESSION LOGGING REQUIREMENT (MANDATORY)

You MUST maintain a detailed session log throughout your work. This is not optional.

### Log Setup

1. **Create Log File:** `.claude/workspace/[FEATURE]/agent-logs/[YOUR-AGENT-NAME]-session.md`
2. **Use Template:** Copy appropriate template from `.claude/orchestration/core/templates/logging-templates.md`
3. **Update Real-Time:** Log decisions, discoveries, and coordination events as they happen

### Critical Logging Points (MUST LOG)

- **Technology Stack Decisions:** Any library version, pattern, or architecture choices
- **Coordination Assumptions:** What you assume other agents will provide or do
- **Integration Challenges:** Any issues coordinating with other agents' work
- **Field Naming Decisions:** All naming conventions that affect other agents
- **API Integration Patterns:** How frontend communicates with backend services
- **Methodology Insights:** What you learn about parallel execution during your work

### Log Template Selection

- **Infrastructure Agent:** Use Infrastructure Agent Log template
- **Parallel Coordination Agent:** Use Parallel Coordination Agent Log template
- **Sequential Task Agent:** Use Sequential Task Agent Log template

### Why This Matters

Your session log becomes teaching material for the AI orchestration curriculum. The methodology partner uses your detailed execution data to:

- Create systematic failure analysis and prevention guides
- Build teaching examples from real agent coordination
- Improve coordination protocols based on actual agent behavior
- Document what works vs creates friction in parallel execution

### Validation Requirement

Before completing your task:

- [ ] Session log created and maintained throughout work
- [ ] All critical decisions documented with reasoning
- [ ] Coordination events logged with other agents
- [ ] Integration challenges and solutions recorded
- [ ] Final status and recommendations documented

**Failure to maintain session log = Incomplete task regardless of code quality.**
```

## TESTING REQUIREMENTS

Testing framework is initialized and ready for use. Write tests for the code you implement; use the coverage
guideline below as a default, and adjust it if this project's stakes call for more or less rigor.

### Test Coverage Guideline

- **Unit Tests:** All business logic, services, utilities (~80% coverage as a default)
- **Component Tests:** All UI components with user interactions (~80% coverage as a default)
- **Integration Tests:** REST endpoints, controllers, database operations (~70% coverage as a default)

### Writing Tests

**Location Pattern:** one predictable location per kind of code -- services, UI components, utilities,
controllers. Write the project's four real paths into the prompt. Agents that have to guess put tests in four
different places, and the fifth agent then can't find them.

**Running Tests:** an agent needs three modes -- a single full run, a watch mode for development, and a coverage
report. Write the project's three real commands into the prompt.

### Test Quality Standards

- Use descriptive test names that state the behaviour and the condition that triggers it
- Mock external dependencies (APIs, databases, LLM calls) appropriately
- Test both success and error scenarios
- Include edge cases and validation failures
- Ensure tests are deterministic (no flaky tests)

### Pre-Completion Validation

Before reporting task complete:

- [ ] All tests written for new code
- [ ] All tests passing (the project's full suite)
- [ ] Coverage meets this project's testing guideline for new code (the project's coverage report)
- [ ] No skipped or pending tests (unless explicitly documented)
- [ ] Tests documented in session log

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md -- the complete pre-completion
requirements (type/compile check, lint, tests, process cleanup, manual testing) are defined there and nowhere else.

**Failure to write tests = Incomplete task regardless of code quality.**

````

## API INTEGRATION VALIDATION (MANDATORY FOR FRONTEND AGENTS)

### Critical Logging Point for Frontend Agents

When implementing ANY component that:
- Fetches data from REST endpoints
- Handles loading/error states
- Manages client-side state
- Implements optimistic updates

**MUST LOG:**
```markdown
### API Integration Check
**Component:** [ComponentName]
**Integration Points:**
- [ ] REST endpoints defined: [List routes]
- [ ] Loading states handled: [Yes/No - How?]
- [ ] Error states handled: [Yes/No - How?]
- [ ] Cache management: [Describe cache policy]
- [ ] Verified API responses match expected types

**Testing:**
[Describe how API integration was tested - mock responses, real API calls, etc.]
````

### Session Log Template Addition for Frontend Agents

Add to all frontend agent session logs:

```markdown
## API Integration Validation

### Components Created/Modified

- [ComponentName]: [API Integration Status]
    - REST calls: [List routes used]
    - Error handling: [Implemented error boundaries / fallback UI]
    - Loading states: [Skeleton screens / spinners / progressive loading]
    - Cache strategy: [cache-first / network-only / etc.]
    - Notes: [Any integration-related implementation details]
```

### Why This Logging Is Critical

**Problem Pattern:** API integration issues between frontend and backend services
**Root Cause:** Agents don't always coordinate on API contracts and error handling
**Solution:** Explicit logging of API integration patterns creates accountability and teaching material

**This logging helps:**

- Catch API contract mismatches during development
- Create teaching examples of proper HTTP client patterns
- Document agent understanding of REST best practices
- Provide evidence for methodology refinement

## Implementation Strategy

### For All Features:

1. **Add logging block to ALL agent prompts** - Infrastructure, parallel, sequential
2. **Create agent-logs directory** when starting any feature
3. **Verify logging compliance** as part of task completion

### For Existing Agent Specs:

Update all agent specifications in `.claude/orchestration/core/methodology/agent-specs-library.md` to include the logging protocol.

### For Prompt Templates:

Update all templates in `.claude/orchestration/core/methodology/prompt-templates.md` to include the standard logging block.

## Benefits of Systematic Logging

### Rich Methodology Data

Instead of: "A high-coordination feature had field naming issues"
You get: "Schema Agent chose camelCase at 10:23am (see decision log), Query Agent didn't import schema file and used
snake_case at 10:45am (see coordination failure log), UI Agent discovered mismatch at 11:15am (see integration challenge
log)"

### Teaching-Quality Examples

Real agent execution logs become curriculum examples showing:

- How coordination actually works vs theory
- Where agents struggle with cross-dependencies
- What decisions lead to integration success vs failure
- How to debug systematic coordination failures

### Evidence-Based Protocol Improvement

- Which coordination mechanisms agents actually use effectively
- Where coordination protocols need reinforcement
- What types of integration challenges are most common
- How to design better prompts based on agent behavior patterns

This transforms methodology development from "guessing what works" to "systematic analysis of documented agent
behavior."
