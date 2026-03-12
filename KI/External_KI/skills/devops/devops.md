---
name: devops
category: devops
type: anchor
confidence: 0.67
anchor_base: django-verification
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: django-verification
    confidence: 0.67
    origin: ECC
  - name: docker-patterns
    confidence: 0.64
    origin: ECC
  - name: deployment-patterns
    confidence: 0.63
    origin: ECC
  - name: springboot-verification
    confidence: 0.54
    origin: ECC
  - name: verification-loop
    confidence: 0.50
    origin: ECC
iron_law: >
  This anchor file is the single source of truth for the devops category.
  It must not be duplicated across layers. Any updates must be made here only.
  See Agent/rules/iron_laws.md §4 SOURCE PRESERVATION and §11 SKILL FILE GOVERNANCE.
---

# DevOps Anchor Skill

Comprehensive DevOps practices covering deployment patterns, Docker, CI/CD pipelines, verification loops, and framework-specific verification for Django and Spring Boot.

## When to Activate

- Setting up CI/CD pipelines
- Dockerizing an application
- Planning deployment strategy (blue-green, canary, rolling)
- Implementing health checks and readiness probes
- Preparing for a production release
- Before creating a PR or after major code changes
- Pre-deployment verification for staging or production
- Designing multi-container architectures
- After refactoring or dependency upgrades

---

## Part 1: Deployment Patterns

### Rolling Deployment (Default)

Replace instances gradually — old and new versions run simultaneously during rollout.

```
Instance 1: v1 -> v2  (update first)
Instance 2: v1         (still running v1)
Instance 3: v1         (still running v1)
...gradually all instances reach v2
```

**Pros:** Zero downtime, gradual rollout
**Cons:** Two versions run simultaneously — requires backward-compatible changes
**Use when:** Standard deployments, backward-compatible changes

### Blue-Green Deployment

Run two identical environments. Switch traffic atomically.

```
Blue  (v1) <- traffic
Green (v2)   idle, running new version

# After verification:
Blue  (v1)   idle (becomes standby)
Green (v2) <- traffic
```

**Pros:** Instant rollback (switch back to blue), clean cutover
**Cons:** Requires 2x infrastructure during deployment
**Use when:** Critical services, zero-tolerance for issues

### Canary Deployment

Route a small percentage of traffic to the new version first.

```
v1: 95% -> v1: 50% -> v2: 100%
v2:  5% -> v2: 50%
```

**Pros:** Catches issues with real traffic before full rollout
**Cons:** Requires traffic splitting infrastructure, monitoring
**Use when:** High-traffic services, risky changes, feature flags

### Rollback Strategy

```bash
# Docker/Kubernetes
kubectl rollout undo deployment/app

# Vercel
vercel rollback

# Railway
railway up --commit <previous-sha>

# Database (if reversible)
npx prisma migrate resolve --rolled-back <migration-name>
```

Rollback checklist:
- [ ] Previous image/artifact available and tagged
- [ ] Database migrations are backward-compatible
- [ ] Feature flags can disable new features without deploy
- [ ] Monitoring alerts configured for error rate spikes

---

## Part 2: Docker

### Multi-Stage Dockerfile (Node.js)

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Multi-Stage Dockerfile (Go)

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.19 AS runner
RUN apk --no-cache add ca-certificates
RUN adduser -D -u 1001 appuser
USER appuser
COPY --from=builder /server /server
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["/server"]
```

### Multi-Stage Dockerfile (Python/Django)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
RUN useradd -r -u 1001 appuser
USER appuser
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Docker Compose for Local Development

```yaml
services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Docker Best Practices

- Use specific version tags (node:22-alpine, not node:latest)
- Multi-stage builds to minimize image size
- Run as non-root user
- Copy dependency files first (layer caching)
- Use .dockerignore to exclude node_modules, .git, tests
- Add HEALTHCHECK instruction
- Set resource limits in docker-compose or k8s

### Container Security

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Networking

Services in the same Compose network resolve by service name. Use custom networks to isolate tiers:

```yaml
services:
  frontend:
    networks: [frontend-net]
  api:
    networks: [frontend-net, backend-net]
  db:
    networks: [backend-net]    # Only reachable from api
networks:
  frontend-net:
  backend-net:
```

### Secret Management in Docker

```yaml
# GOOD: Use .env files (gitignored) or Docker secrets
services:
  app:
    env_file:
      - .env
    environment:
      - API_KEY   # Inherits from host environment

# BAD: Never hardcode secrets in images or compose files
```

### Debugging Commands

```bash
docker compose logs -f app           # Follow logs
docker compose exec app sh           # Shell into container
docker compose exec db psql -U postgres  # Connect to postgres
docker compose ps                     # Running services
docker stats                          # Resource usage
docker compose up --build             # Rebuild images
docker compose down -v                # Remove containers + volumes
```

---

## Part 3: CI/CD Pipeline

### GitHub Actions (Standard Pipeline)

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: echo "Deploying ${{ github.sha }}"
```

### Pipeline Stages

```
PR opened:
  lint -> typecheck -> unit tests -> integration tests -> preview deploy

Merged to main:
  lint -> typecheck -> unit tests -> integration tests -> build image -> deploy staging -> smoke tests -> deploy production
```

### Django CI/CD (GitHub Actions)

```yaml
name: Django Verification
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install ruff black mypy pytest pytest-django pytest-cov bandit safety pip-audit
      - name: Code quality checks
        run: |
          ruff check .
          black . --check
          isort . --check-only
          mypy .
      - name: Security scan
        run: |
          bandit -r . -f json -o bandit-report.json
          safety check --full-report
          pip-audit
      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          DJANGO_SECRET_KEY: test-secret-key
        run: pytest --cov=apps --cov-report=xml --cov-report=term-missing
```

---

## Part 4: Verification Loops

### Generic Verification Loop

Run after completing a feature, before PRs, and when ensuring quality gates pass.

#### Phase 1: Build Verification
```bash
npm run build 2>&1 | tail -20   # Node.js
# If build fails, STOP and fix before continuing.
```

#### Phase 2: Type Check
```bash
npx tsc --noEmit 2>&1 | head -30      # TypeScript
pyright . 2>&1 | head -30              # Python
```

#### Phase 3: Lint Check
```bash
npm run lint 2>&1 | head -30           # JS/TS
ruff check . 2>&1 | head -30           # Python
```

#### Phase 4: Test Suite
```bash
npm run test -- --coverage 2>&1 | tail -50
# Target: 80% minimum coverage
```

#### Phase 5: Security Scan
```bash
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

#### Phase 6: Diff Review
```bash
git diff --stat
git diff HEAD~1 --name-only
```

#### Output Format
```
VERIFICATION REPORT
==================
Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]
Overall:   [READY/NOT READY] for PR
```

### Django Verification Loop

#### Phase 1: Environment Check
```bash
python --version
which python
python -c "import os; print('DJANGO_SECRET_KEY set' if os.environ.get('DJANGO_SECRET_KEY') else 'MISSING')"
```

#### Phase 2: Code Quality & Formatting
```bash
mypy . --config-file pyproject.toml
ruff check . --fix
black . --check
isort . --check-only
python manage.py check --deploy
```

#### Phase 3: Migrations
```bash
python manage.py showmigrations
python manage.py makemigrations --check
python manage.py migrate --plan
```

#### Phase 4: Tests + Coverage
```bash
pytest --cov=apps --cov-report=html --cov-report=term-missing --reuse-db
```

Coverage targets:

| Component | Target |
|-----------|--------|
| Models | 90%+ |
| Serializers | 85%+ |
| Views | 80%+ |
| Services | 90%+ |
| Overall | 80%+ |

#### Phase 5: Security Scan
```bash
pip-audit
safety check --full-report
python manage.py check --deploy
bandit -r . -f json -o bandit-report.json
gitleaks detect --source . --verbose
```

#### Phase 6: Django Management Commands
```bash
python manage.py check
python manage.py collectstatic --noinput --clear
python manage.py check --database default
```

#### Phase 7: Performance Checks
- Check for N+1 queries via Django Debug Toolbar
- Verify database indexes are configured
- Target < 50 queries per typical page

#### Phase 8: Configuration Review
```python
# Verify in shell:
checks = {
    'DEBUG is False': not settings.DEBUG,
    'SECRET_KEY set': bool(settings.SECRET_KEY and len(settings.SECRET_KEY) > 30),
    'ALLOWED_HOSTS set': len(settings.ALLOWED_HOSTS) > 0,
    'HTTPS enabled': getattr(settings, 'SECURE_SSL_REDIRECT', False),
    'HSTS enabled': getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
}
```

### Spring Boot Verification Loop

#### Phase 1: Build
```bash
mvn -T 4 clean verify -DskipTests
# or
./gradlew clean assemble -x test
```

#### Phase 2: Static Analysis
```bash
mvn -T 4 spotbugs:check pmd:check checkstyle:check
# or
./gradlew checkstyleMain pmdMain spotbugsMain
```

#### Phase 3: Tests + Coverage
```bash
mvn -T 4 test
mvn jacoco:report   # verify 80%+ coverage
```

##### Unit Tests (Mockito)
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock private UserRepository userRepository;
  @InjectMocks private UserService userService;

  @Test
  void createUser_validInput_returnsUser() {
    var dto = new CreateUserDto("Alice", "alice@example.com");
    var expected = new User(1L, "Alice", "alice@example.com");
    when(userRepository.save(any(User.class))).thenReturn(expected);
    var result = userService.create(dto);
    assertThat(result.name()).isEqualTo("Alice");
    verify(userRepository).save(any(User.class));
  }
}
```

##### Integration Tests (Testcontainers)
```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private UserRepository userRepository;

  @Test
  void findByEmail_existingUser_returnsUser() {
    userRepository.save(new User("Alice", "alice@example.com"));
    var found = userRepository.findByEmail("alice@example.com");
    assertThat(found).isPresent();
  }
}
```

##### API Tests (MockMvc)
```java
@WebMvcTest(UserController.class)
class UserControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockBean private UserService userService;

  @Test
  void createUser_validInput_returns201() throws Exception {
    var user = new UserDto(1L, "Alice", "alice@example.com");
    when(userService.create(any())).thenReturn(user);
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name": "Alice", "email": "alice@example.com"}"""))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Alice"));
  }
}
```

#### Phase 4: Security Scan
```bash
mvn org.owasp:dependency-check-maven:check
grep -rn "password\\s*=\\s*\"" src/ --include="*.java" --include="*.yml"
grep -rn "System\\.out\\.print" src/main/ --include="*.java"
```

#### Phase 5: Lint/Format
```bash
mvn spotless:apply
```

#### Phase 6: Diff Review
Checklist:
- No debugging logs left (`System.out`, `log.debug` without guards)
- Meaningful errors and HTTP statuses
- Transactions and validation present where needed

---

## Part 5: Health Checks & Environment Configuration

### Health Check Endpoint

```typescript
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/detailed", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi(),
  };
  const allHealthy = Object.values(checks).every(c => c.status === "ok");
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    uptime: process.uptime(),
    checks,
  });
});
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

startupProbe:
  httpGet:
    path: /health
    port: 3000
  failureThreshold: 30    # 30 * 5s = 150s max startup time
```

### Twelve-Factor App Configuration

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
API_KEY=${API_KEY}
LOG_LEVEL=info
NODE_ENV=production
```

### Configuration Validation

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
```

---

## Production Readiness Checklist

### Application
- [ ] All tests pass (unit, integration, E2E)
- [ ] No hardcoded secrets in code or config files
- [ ] Error handling covers all edge cases
- [ ] Logging is structured (JSON) and does not contain PII
- [ ] Health check endpoint returns meaningful status

### Infrastructure
- [ ] Docker image builds reproducibly (pinned versions)
- [ ] Environment variables documented and validated at startup
- [ ] Resource limits set (CPU, memory)
- [ ] Horizontal scaling configured (min/max instances)
- [ ] SSL/TLS enabled on all endpoints

### Monitoring
- [ ] Application metrics exported (request rate, latency, errors)
- [ ] Alerts configured for error rate > threshold
- [ ] Log aggregation set up (structured logs, searchable)
- [ ] Uptime monitoring on health endpoint

### Security
- [ ] Dependencies scanned for CVEs
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting enabled on public endpoints
- [ ] Authentication and authorization verified
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)

### Operations
- [ ] Rollback plan documented and tested
- [ ] Database migration tested against production-sized data
- [ ] Runbook for common failure scenarios
- [ ] On-call rotation and escalation path defined

---

**Remember**: Fast feedback beats late surprises. Keep the gate strict -- treat warnings as defects in production systems. Automated verification catches common issues but does not replace manual code review and testing in staging.
