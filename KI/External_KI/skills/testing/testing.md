---
name: testing
category: testing
type: anchor
confidence: 0.81
anchor_base: test-driven-development
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - { name: test-driven-development, confidence: 0.81, origin: superpowers }
  - { name: python-testing, confidence: 0.72, origin: ECC }
  - { name: django-tdd, confidence: 0.70, origin: ECC }
  - { name: golang-testing, confidence: 0.67, origin: ECC }
  - { name: cpp-testing, confidence: 0.63, origin: ECC }
  - { name: e2e-testing, confidence: 0.56, origin: ECC }
  - { name: systematic-debugging, confidence: 0.56, origin: superpowers }
  - { name: springboot-tdd, confidence: 0.37, origin: ECC }
tier_index:
  tier1_smoke: { anchor: "Tier 1: Smoke Check (auto)", trigger: "auto:files<3 AND low_complexity" }
  tier2_peer_review: { anchor: "Tier 2: Peer Review — Multi-Agent Cross-Audit (auto)", trigger: "auto:files>=3" }
  tier3_module_review: { anchor: "Tier 3: Module Review (manual)", trigger: "manual" }
  tier4_arch_security_perf: { anchor: "Tier 4: Architecture / Security / Performance (manual)", trigger: "manual" }
  tier5_unit_testing: { anchor: "Tier 5: Unit Testing (auto on push — mandatory)", trigger: "auto:push" }
  tier6_risk_monitoring: { anchor: "Tier 6: Risk & Monitoring Review (manual)", trigger: "manual" }
  appendix_debugging: { anchor: "Appendix: Systematic Debugging (cross-tier)", trigger: "on_failure" }
iron_law: "Once designated as anchor, this file is NEVER replaced. Future external skills are merged incrementally (additive only, no duplicates)."
---

# QA & Testing — Anchor Skill

## Activation Rules

```
IF files_changed < 3 AND complexity == low:
    → Tier 1 (Smoke Check) — auto
ELIF files_changed >= 3:
    → Tier 2 (Peer Review) — auto, multi-agent cross-audit

Tier 1 OR Tier 2 FAIL → BLOCK, return to developer

Tier 3 (Module Review)       → manual activation
Tier 4 (Arch/Security/Perf)  → manual activation
Tier 5 (Unit Testing)        → auto on push (mandatory)
Tier 6 (Risk & Monitoring)   → manual activation

Tier 1/2 failure blocks ALL subsequent tiers.
Tier 5 failure blocks push.
Tiers 3/4/6 are independent of each other.
```

---

## Tier 1: Smoke Check (auto)

> Trigger: files < 3, low complexity. Purpose: can it run?

### 1.1 Build Verification

```bash
# JavaScript/TypeScript
npm run build && echo "BUILD PASS" || echo "BUILD FAIL"

# Python
python -m py_compile src/main.py && echo "COMPILE PASS"

# Go
go build ./... && echo "BUILD PASS"

# C++
cmake --build build -j && echo "BUILD PASS"

# Java/Spring
mvn compile -q && echo "BUILD PASS"
```

### 1.2 Lint Pass

```bash
# JS/TS
npx eslint --max-warnings=0 src/
npx tsc --noEmit          # TypeScript type check

# Python
ruff check src/ && mypy src/   # pyright . 可作 mypy 替代

# Go
go vet ./... && golangci-lint run

# C++
clang-tidy src/*.cpp --
```

### 1.3 Basic Runtime Test

Run the minimal test subset to confirm the application starts and core paths aren't broken.

```bash
# Run only smoke-tagged tests
pytest -m smoke --timeout=30
go test -short ./...
npx jest --testPathPattern=smoke
```

### 1.4 Pass/Fail Criteria

| Check | PASS | FAIL |
|-------|------|------|
| Build | Zero errors | Any compile error |
| Lint | Zero warnings (strict mode) | Any warning |
| Smoke test | All smoke tests green | Any failure |

**FAIL → BLOCK. Return to developer. Do not proceed to any other tier.**

---

## Tier 2: Peer Review — Multi-Agent Cross-Audit (auto)

> Trigger: files >= 3. Purpose: code quality and correctness review.

### 2.1 Activation Protocol

When a changeset touches 3+ files, automatically spawn multiple review agents:
- **Agent A**: Logic correctness — trace data flow, verify edge cases
- **Agent B**: Code quality — naming, structure, DRY, KISS
- **Agent C**: Integration risk — side effects on other modules, API contract changes

Each agent independently reviews and produces findings. Conflicts between agents trigger discussion.

### 2.2 Review Checklist

| Dimension | What to Check |
|-----------|---------------|
| **Correctness** | Logic errors, off-by-one, null handling, race conditions |
| **Naming** | Variables/functions describe intent, no abbreviations |
| **Structure** | Functions < 30 lines, single responsibility, no deep nesting |
| **DRY** | No copy-paste, extract shared logic |
| **Error handling** | All error paths covered, no swallowed exceptions |
| **API contracts** | Request/response shapes match, backward compatibility |
| **Test coverage** | Changed code has corresponding tests |
| **Security** | No hardcoded secrets, input validation at boundaries |

### 2.3 Complexity Assessment

```
LOW complexity (Tier 1 eligible):
  - Config changes, copy edits, single-function fixes
  - No new APIs, no schema changes, no dependency changes

HIGH complexity (force Tier 2 even if < 3 files):
  - Schema migrations, API changes, auth logic
  - Concurrency changes, payment/financial logic
  - Infrastructure changes (CI/CD, deploy)
```

### 2.4 Review Report Template

```markdown
## Peer Review Report
**Changeset**: {files changed} files, {lines added/removed}
**Agents**: A (correctness), B (quality), C (integration)

### Findings
| # | Severity | Agent | File:Line | Issue | Recommendation |
|---|----------|-------|-----------|-------|----------------|
| 1 | P0-BLOCK | A     | ...       | ...   | ...            |
| 2 | P1-WARN  | B     | ...       | ...   | ...            |

### Verdict: PASS / BLOCK
```

**Any P0 finding → BLOCK. Return to developer.**

---

## Tier 3: Module Review (manual)

> Trigger: manual activation. Purpose: full module audit + E2E + CI/CD verification.

### 3.1 E2E Testing (Playwright)

#### Page Object Model

```typescript
export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly itemCards: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.itemCards = page.locator('[data-testid="item-card"]')
  }

  async goto() {
    await this.page.goto('/items')
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(r => r.url().includes('/api/search'))
  }
}
```

#### E2E Test Structure

```typescript
test.describe('Item Search', () => {
  let itemsPage: ItemsPage

  test.beforeEach(async ({ page }) => {
    itemsPage = new ItemsPage(page)
    await itemsPage.goto()
  })

  test('searches by keyword', async () => {
    await itemsPage.search('test')
    const count = await itemsPage.getItemCount()
    expect(count).toBeGreaterThan(0)
  })

  test('handles no results', async ({ page }) => {
    await itemsPage.search('xyznonexistent')
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
  })
})
```

#### Flaky Test Handling

```typescript
// Quarantine
test.fixme(true, 'Flaky - Issue #123')

// Root causes and fixes:
// Race condition → use auto-wait locators, not page.click()
// Network timing → waitForResponse(), not waitForTimeout()
// Animation → waitFor({ state: 'visible' }) before click

// Detect flakiness
npx playwright test tests/search.spec.ts --repeat-each=10
```

#### Playwright Configuration

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 3.2 Integration Testing Patterns

#### Full-Flow Test (Python/Django)

```python
class TestCheckoutFlow:
    def test_guest_to_purchase(self, client, db):
        # Register → Login → Browse → Add to Cart → Checkout
        response = client.post(reverse('users:register'), {
            'email': 'test@example.com', 'password': 'testpass123',
            'password_confirm': 'testpass123',
        })
        assert response.status_code == 302
        client.post(reverse('users:login'), {
            'email': 'test@example.com', 'password': 'testpass123',
        })
        product = ProductFactory(price=100)
        client.post(reverse('cart:add'), {'product_id': product.id, 'quantity': 1})
        response = client.get(reverse('checkout:review'))
        assert product.name in response.content.decode()
```

#### API Integration Test (TypeScript)

```typescript
describe('GET /api/markets', () => {
  it('returns markets', async () => {
    const req = new NextRequest('http://localhost/api/markets')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('validates query params', async () => {
    const req = new NextRequest('http://localhost/api/markets?limit=invalid')
    expect((await GET(req)).status).toBe(400)
  })
})
```

### 3.3 CI/CD Pipeline Verification

```yaml
# GitHub Actions E2E
- run: npx playwright install --with-deps
- run: npx playwright test
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### 3.4 Module Completeness Checklist

- [ ] All public APIs have integration tests
- [ ] E2E covers critical user flows
- [ ] CI pipeline runs all test tiers
- [ ] Artifacts (screenshots, traces, videos) collected on failure
- [ ] No flaky tests in quarantine > 7 days without a fix plan

---

## Tier 4: Architecture / Security / Performance (manual)

> Trigger: manual activation. Purpose: non-functional quality audit.

### 4.1 Architecture Review

| Check | What to Verify |
|-------|---------------|
| Dependency direction | No circular deps, layers point inward |
| API contracts | Versioned, backward compatible |
| State management | No hidden global state, explicit data flow |
| Error boundaries | Failures isolated, no cascade |
| Scalability | Identified bottlenecks, horizontal scaling path |

### 4.2 Security Checks

#### C++ Sanitizers

```cmake
# AddressSanitizer (memory errors)
option(ENABLE_ASAN "Enable ASan" OFF)
if(ENABLE_ASAN)
  add_compile_options(-fsanitize=address -fno-omit-frame-pointer)
  add_link_options(-fsanitize=address)
endif()

# ThreadSanitizer (race conditions)
option(ENABLE_TSAN "Enable TSan" OFF)
if(ENABLE_TSAN)
  add_compile_options(-fsanitize=thread)
  add_link_options(-fsanitize=thread)
endif()

# UndefinedBehaviorSanitizer
option(ENABLE_UBSAN "Enable UBSan" OFF)
if(ENABLE_UBSAN)
  add_compile_options(-fsanitize=undefined -fno-omit-frame-pointer)
  add_link_options(-fsanitize=undefined)
endif()
```

#### Go Race Detection

```bash
go test -race -coverprofile=coverage.out ./...
```

#### General Security Checklist

- [ ] No hardcoded secrets (scan with gitleaks/trufflehog)
- [ ] Input validation at all system boundaries
- [ ] SQL parameterization (no string concatenation)
- [ ] Auth/authz on all endpoints
- [ ] Dependencies scanned for CVEs (npm audit, safety, govulncheck)

### 4.3 Performance Benchmarking

#### Go Benchmarks

```go
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// Run: go test -bench=. -benchmem ./...
// Compare: benchstat old.txt new.txt
```

#### Memory Allocation Analysis

```go
func BenchmarkStringConcat(b *testing.B) {
    b.Run("plus", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            s := ""; for _, p := range parts { s += p }; _ = s
        }
    })
    b.Run("builder", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for _, p := range parts { sb.WriteString(p) }; _ = sb.String()
        }
    })
}
```

### 4.4 Fuzzing

#### Go Fuzzing (1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    f.Add(`{"name": "test"}`)
    f.Add(`[]`)
    f.Fuzz(func(t *testing.T, input string) {
        var result map[string]interface{}
        if err := json.Unmarshal([]byte(input), &result); err != nil {
            return
        }
        if _, err := json.Marshal(result); err != nil {
            t.Errorf("Marshal failed after Unmarshal: %v", err)
        }
    })
}
// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s
```

#### C++ libFuzzer

```cpp
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    std::string input(reinterpret_cast<const char *>(data), size);
    ParseConfig(input);
    return 0;
}
```

---

## Tier 5: Unit Testing (auto on push — mandatory)

> Trigger: every push. MUST pass before merge. Coverage >= 80%.

### 5.1 TDD Core Methodology

**Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Write code before the test? Delete it. Start over. No exceptions.

#### Red-Green-Refactor Cycle

1. **RED**: Write one minimal failing test for desired behavior
2. **Verify RED**: Run test, confirm it fails for the right reason (missing feature, not typo)
3. **GREEN**: Write simplest code to make test pass
4. **Verify GREEN**: All tests pass, output clean
5. **REFACTOR**: Clean up, remove duplication — keep tests green
6. **REPEAT**: Next failing test for next requirement

#### Good vs Bad Tests

<Good>
```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const op = () => { attempts++; if (attempts < 3) throw new Error('fail'); return 'ok'; };
  expect(await retryOperation(op)).toBe('ok');
  expect(attempts).toBe(3);
});
```
Clear name, tests real behavior, one assertion focus
</Good>

<Bad>
```typescript
test('retry works', async () => {
  const mock = jest.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce('ok');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(2);
});
```
Vague name, tests mock not code
</Bad>

#### Common Rationalizations (all invalid)

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "TDD slows me down" | TDD is faster than debugging. |
| "Just this once" | Delete code. Start over with TDD. |
| "Already manually tested" | Ad-hoc != systematic. Can't re-run. |

### 5.2 Cross-Language Quick Reference

| Language | Framework | Run | Coverage |
|----------|-----------|-----|----------|
| Python | pytest | `pytest --cov=src` | `pytest --cov-report=html` |
| Django | pytest-django | `pytest --reuse-db --nomigrations` | `pytest --cov=apps` |
| Go | testing | `go test ./...` | `go test -coverprofile=c.out ./...` |
| C++ | GoogleTest | `ctest --test-dir build` | `lcov --capture -d build` |
| Java/Spring | JUnit 5 | `mvn test` | JaCoCo `mvn verify` |
| TypeScript | Jest/Vitest | `npm test` | `npm test -- --coverage` |

### 5.3 Python (pytest)

#### Fixtures

```python
@pytest.fixture
def db():
    db = Database(":memory:")
    db.create_tables()
    yield db
    db.close()

@pytest.fixture(params=["sqlite", "postgresql"])
def multi_db(request):
    return Database(request.param)
```

#### Parametrization

```python
@pytest.mark.parametrize("input,expected", [
    ("valid@email.com", True),
    ("invalid", False),
    ("@no-domain.com", False),
], ids=["valid", "missing-at", "missing-user"])
def test_email_validation(input, expected):
    assert is_valid_email(input) is expected
```

#### Mocking

```python
@patch("mypackage.external_api_call")
def test_with_mock(api_mock):
    api_mock.return_value = {"status": "success"}
    result = my_function()
    api_mock.assert_called_once()

# Async
@pytest.mark.asyncio
@patch("mypackage.async_api_call")
async def test_async(api_mock):
    api_mock.return_value = {"status": "ok"}
    result = await my_async_function()
    api_mock.assert_awaited_once()
```

### 5.4 Django (pytest-django + factory_boy)

#### Factory Pattern

```python
class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')

class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product
    name = factory.Faker('sentence', nb_words=3)
    price = fuzzy.FuzzyDecimal(10.00, 1000.00, 2)
    category = factory.SubFactory(CategoryFactory)
```

#### DRF API Testing

```python
class TestProductAPI:
    def test_list(self, api_client, db):
        ProductFactory.create_batch(10)
        response = api_client.get(reverse('api:product-list'))
        assert response.status_code == 200
        assert response.data['count'] == 10

    def test_create_unauthorized(self, api_client, db):
        response = api_client.post(reverse('api:product-list'), {'name': 'Test'})
        assert response.status_code == 401

    def test_create_authorized(self, authenticated_api_client, db):
        response = authenticated_api_client.post(reverse('api:product-list'), {
            'name': 'Test', 'price': '99.99', 'stock': 10,
        })
        assert response.status_code == 201
```

### 5.5 Go (table-driven tests)

#### Standard Pattern

```go
func TestParseConfig(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Config
        wantErr bool
    }{
        {"valid", `{"host":"localhost","port":8080}`, &Config{Host:"localhost",Port:8080}, false},
        {"invalid JSON", `{invalid}`, nil, true},
        {"empty", "", nil, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig(tt.input)
            if tt.wantErr { if err == nil { t.Error("expected error") }; return }
            if err != nil { t.Fatalf("unexpected: %v", err) }
            if !reflect.DeepEqual(got, tt.want) { t.Errorf("got %+v; want %+v", got, tt.want) }
        })
    }
}
```

#### Interface Mocking

```go
type UserRepository interface {
    GetUser(id string) (*User, error)
}

type MockUserRepo struct {
    GetUserFunc func(id string) (*User, error)
}
func (m *MockUserRepo) GetUser(id string) (*User, error) { return m.GetUserFunc(id) }

func TestUserService(t *testing.T) {
    mock := &MockUserRepo{
        GetUserFunc: func(id string) (*User, error) {
            if id == "123" { return &User{ID:"123", Name:"Alice"}, nil }
            return nil, ErrNotFound
        },
    }
    svc := NewUserService(mock)
    user, err := svc.GetUserProfile("123")
    if err != nil { t.Fatal(err) }
    if user.Name != "Alice" { t.Errorf("got %q", user.Name) }
}
```

### 5.6 C++ (GoogleTest/GMock)

```cpp
// Fixture
class UserStoreTest : public ::testing::Test {
protected:
    void SetUp() override {
        store = std::make_unique<UserStore>(":memory:");
        store->Seed({{"alice"}, {"bob"}});
    }
    std::unique_ptr<UserStore> store;
};

TEST_F(UserStoreTest, FindsExistingUser) {
    auto user = store->Find("alice");
    ASSERT_TRUE(user.has_value());
    EXPECT_EQ(user->name, "alice");
}

// Mock
class MockNotifier : public Notifier {
public:
    MOCK_METHOD(void, Send, (const std::string &msg), (override));
};

TEST(ServiceTest, SendsNotification) {
    MockNotifier notifier;
    Service svc(notifier);
    EXPECT_CALL(notifier, Send("hello")).Times(1);
    svc.Publish("hello");
}
```

### 5.7 Spring Boot (JUnit 5 + Mockito)

```java
// Unit test
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
    @Mock MarketRepository repo;
    @InjectMocks MarketService service;

    @Test void createsMarket() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        Market result = service.create(new CreateMarketRequest("name", "desc"));
        assertThat(result.name()).isEqualTo("name");
        verify(repo).save(any());
    }
}

// Web layer
@WebMvcTest(MarketController.class)
class MarketControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean MarketService marketService;

    @Test void returnsMarkets() throws Exception {
        when(marketService.list(any())).thenReturn(Page.empty());
        mockMvc.perform(get("/api/markets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }
}
```

### 5.8 Coverage Requirements

| Scope | Target |
|-------|--------|
| Overall | >= 80% |
| Critical business logic | 100% |
| Public APIs | >= 90% |
| Generated code | Exclude |

### 5.9 Anti-Patterns

| Anti-Pattern | Why It's Wrong | Fix |
|-------------|----------------|-----|
| Testing implementation details | Breaks on refactor | Test behavior via public API |
| Brittle selectors (`div.css-xyz`) | Breaks on style change | Use `data-testid` or semantic selectors |
| Tests depend on execution order | Flaky, non-deterministic | Each test sets up own data |
| Over-mocking | Tests mock behavior, not real code | Mock only external boundaries |
| No test isolation | Shared state causes cascading failures | Reset state in setup/teardown |
| Sleep-based synchronization | Flaky | Use condition waits, channels |

---

## Tier 6: Risk & Monitoring Review (manual)

> Trigger: manual activation. Purpose: project-level risk and observability audit.

### 6.1 Risk Assessment Checklist

| Risk Dimension | Question | Evidence Required |
|---------------|----------|-------------------|
| **Single point of failure** | Can one component failure bring down the system? | Architecture diagram with failure modes |
| **Data loss** | Is there backup? Recovery time? | Backup schedule + tested restore |
| **Dependency risk** | External APIs down = what happens? | Fallback/circuit breaker in place |
| **Scale limits** | What happens at 10x current load? | Load test results |
| **Security exposure** | What's the blast radius of a breach? | Threat model document |

### 6.2 Monitoring Coverage

| Layer | What to Monitor | Alert Threshold |
|-------|----------------|-----------------|
| Application | Error rate, latency p99 | Error > 1%, p99 > 2s |
| Infrastructure | CPU, memory, disk | > 80% utilization |
| Business | Conversion, failed transactions | Anomaly detection |
| Dependencies | External API health | > 5% error rate |

### 6.3 Failure Scenario Planning

For each critical path, document:
1. **What can fail** — component, network, data corruption
2. **How we detect it** — monitoring, alerts, health checks
3. **How we respond** — runbook, auto-recovery, manual intervention
4. **Recovery time target** — RTO for each scenario

---

## Verification Evidence Discipline (cross-tier)

> 由 workflow.md §7 并入（canonical 归此处）。Claiming work is complete without verification is dishonesty, not efficiency.

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

If you have not run the verification command in this message, you cannot claim it passes.

### The Gate Function

1. IDENTIFY — what command proves this claim?
2. RUN — execute the FULL command (fresh, complete)
3. READ — full output, check exit code, count failures
4. VERIFY — does output confirm the claim?
5. ONLY THEN — make the claim

### Verification Requirements

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

### Red Flags — STOP Immediately

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/push/PR without verification
- Trusting agent success reports without checking
- Relying on partial verification
- ANY wording implying success without having run verification

### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |

### Key Patterns

**Tests:** Run command, see output, then claim. Not "should pass now."

**Regression tests (TDD Red-Green):** Write -> Run (pass) -> Revert fix -> Run (MUST FAIL) -> Restore -> Run (pass).

**Requirements:** Re-read plan -> create checklist -> verify each item -> report gaps or completion.

**Agent delegation:** Agent reports success -> check VCS diff -> verify changes -> report actual state.

---

## Appendix: Systematic Debugging (cross-tier)

> Activate on ANY test/build failure across all tiers.

**Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

### Phase 1: Root Cause Investigation

1. **Read error messages completely** — stack traces, line numbers, error codes
2. **Reproduce consistently** — exact steps, every time, or gather more data
3. **Check recent changes** — git diff, new deps, config changes
4. **Trace data flow in multi-component systems:**
   ```bash
   # Log at each component boundary
   echo "=== Layer 1 (workflow): IDENTITY=${IDENTITY:+SET}${IDENTITY:-UNSET} ==="
   echo "=== Layer 2 (build): ===" && env | grep IDENTITY
   echo "=== Layer 3 (signing): ===" && security find-identity -v
   ```

### Phase 2: Pattern Analysis

Find working examples → compare with broken → list ALL differences → understand dependencies.

### Phase 3: Hypothesis Testing

Form ONE specific hypothesis → make smallest change → verify → if wrong, form NEW hypothesis (don't stack fixes).

### Phase 4: Implementation

1. Create failing test reproducing the bug
2. Implement single fix addressing root cause
3. Verify fix + no regressions
4. **If 3+ fixes failed → STOP. Question the architecture. Discuss with team.**

### Red Flags — Return to Phase 1

- "Quick fix for now"
- "Just try changing X"
- "Skip the test, manually verify"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- 3+ failed fix attempts without questioning architecture
