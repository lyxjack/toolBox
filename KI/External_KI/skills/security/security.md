---
name: security
category: security
type: anchor
confidence: 0.68
anchor_base: security-review
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: security-review
    confidence: 0.68
    origin: ECC
  - name: security-scan
    confidence: 0.60
    origin: ECC
  - name: django-security
    confidence: 0.58
    origin: ECC
  - name: plankton-code-quality
    confidence: 0.55
    origin: community
  - name: springboot-security
    confidence: 0.53
    origin: ECC
iron_law: >
  This anchor file is the single source of truth for the security category.
  It must not be duplicated across layers. Any updates must be made here only.
  See Agent/rules/iron_laws.md §4 SOURCE PRESERVATION and §11 SKILL FILE GOVERNANCE.
---

# Security Anchor Skill

Comprehensive security practices covering OWASP review, scanning tools, framework-specific security (Django, Spring Boot), and code quality enforcement.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs
- Configuring production security settings
- Setting up a new Claude Code project or modifying configs
- Periodic security hygiene checks
- Adding rate limiting or brute-force protection
- Scanning dependencies for CVEs

---

## Part 1: OWASP Review & Core Security

### 1. Secrets Management

#### NEVER Do This
```typescript
const apiKey = "sk-proj-xxxxx"  // Hardcoded secret
const dbPassword = "password123" // In source code
```

#### ALWAYS Do This
```typescript
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

#### Verification Steps
- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in hosting platform (Vercel, Railway)

### 2. Input Validation

#### Schema-Based Validation (TypeScript)
```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
}
```

#### File Upload Validation
```typescript
function validateFileUpload(file: File) {
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) throw new Error('File too large (max 5MB)')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type')

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) throw new Error('Invalid file extension')
  return true
}
```

### 3. SQL Injection Prevention

#### NEVER Concatenate SQL
```typescript
// DANGEROUS
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
```

#### ALWAYS Use Parameterized Queries
```typescript
const { data } = await supabase.from('users').select('*').eq('email', userEmail)

// Or with raw SQL
await db.query('SELECT * FROM users WHERE email = $1', [userEmail])
```

### 4. Authentication & Authorization

#### JWT Token Handling
```typescript
// WRONG: localStorage (vulnerable to XSS)
localStorage.setItem('token', token)

// CORRECT: httpOnly cookies
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### Authorization Checks
```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } })
  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await db.users.delete({ where: { id: userId } })
}
```

#### Row Level Security (Supabase)
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own data"
  ON users FOR UPDATE USING (auth.uid() = id);
```

### 5. XSS Prevention

#### Sanitize HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### Content Security Policy
```typescript
const securityHeaders = [{
  key: 'Content-Security-Policy',
  value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
    font-src 'self'; connect-src 'self' https://api.example.com;`.replace(/\s{2,}/g, ' ').trim()
}]
```

### 6. CSRF Protection

```typescript
import { csrf } from '@/lib/csrf'

export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')
  if (!csrf.verify(token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
}
```

### 7. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
})
app.use('/api/', limiter)

// Stricter for expensive operations
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 })
app.use('/api/search', searchLimiter)
```

### 8. Sensitive Data Exposure

```typescript
// WRONG: Logging sensitive data
console.log('User login:', { email, password })

// CORRECT: Redact sensitive data
console.log('User login:', { email, userId })

// WRONG: Exposing internal details
catch (error) {
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
}

// CORRECT: Generic error messages
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
}
```

### 9. Blockchain Security (Solana)

```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(publicKey: string, signature: string, message: string) {
  try {
    return verify(Buffer.from(message), Buffer.from(signature, 'base64'), Buffer.from(publicKey, 'base64'))
  } catch { return false }
}

async function verifyTransaction(transaction: Transaction) {
  if (transaction.to !== expectedRecipient) throw new Error('Invalid recipient')
  if (transaction.amount > maxAmount) throw new Error('Amount exceeds limit')
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) throw new Error('Insufficient balance')
  return true
}
```

### 10. Dependency Security

```bash
npm audit && npm audit fix
npm update && npm outdated
npm ci  # In CI/CD for reproducible builds
# ALWAYS commit lock files
```

### Security Testing (Automated)

```typescript
test('requires authentication', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

test('requires admin role', async () => {
  const response = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(response.status).toBe(403)
})

test('rejects invalid input', async () => {
  const response = await fetch('/api/users', {
    method: 'POST', body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})

test('enforces rate limits', async () => {
  const requests = Array(101).fill(null).map(() => fetch('/api/endpoint'))
  const responses = await Promise.all(requests)
  expect(responses.filter(r => r.status === 429).length).toBeGreaterThan(0)
})
```

---

## Part 2: Security Scanning Tools

### AgentShield — Claude Code Config Auditor

Audit Claude Code configuration for security issues using [AgentShield](https://github.com/affaan-m/agentshield).

#### What It Scans

| File | Checks |
|------|--------|
| `CLAUDE.md` | Hardcoded secrets, auto-run instructions, prompt injection patterns |
| `settings.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags |
| `mcp.json` | Risky MCP servers, hardcoded env secrets, npx supply chain risks |
| `hooks/` | Command injection via interpolation, data exfiltration, silent error suppression |
| `agents/*.md` | Unrestricted tool access, prompt injection surface, missing model specs |

#### Usage

```bash
# Basic scan
npx ecc-agentshield scan

# With severity filter
npx ecc-agentshield scan --min-severity medium

# Output formats: terminal (default), json, markdown, html
npx ecc-agentshield scan --format json

# Auto-fix safe issues
npx ecc-agentshield scan --fix

# Deep analysis with three-agent pipeline (red/blue/auditor)
export ANTHROPIC_API_KEY=your-key
npx ecc-agentshield scan --opus --stream

# Initialize secure config from scratch
npx ecc-agentshield init
```

#### GitHub Action Integration

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
```

#### Severity Grading

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100 | Secure configuration |
| B | 75-89 | Minor issues |
| C | 60-74 | Needs attention |
| D | 40-59 | Significant risks |
| F | 0-39 | Critical vulnerabilities |

#### Critical Findings (fix immediately)
- Hardcoded API keys or tokens in config files
- `Bash(*)` in the allow list (unrestricted shell access)
- Command injection in hooks via `${file}` interpolation
- Shell-running MCP servers

#### High Findings (fix before production)
- Auto-run instructions in CLAUDE.md (prompt injection vector)
- Missing deny lists in permissions
- Agents with unnecessary Bash access

---

## Part 3: Django Security

### Production Settings

```python
# settings/production.py
import os

DEBUG = False  # CRITICAL: Never use True in production
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY environment variable is required')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
```

### Django ORM SQL Injection Prevention

```python
# GOOD: ORM auto-escapes
User.objects.get(username=username)
User.objects.filter(Q(username__icontains=query) | Q(email__icontains=query))

# GOOD: Parameterized raw SQL
User.objects.raw('SELECT * FROM users WHERE username = %s', [query])

# BAD: Never interpolate
User.objects.raw(f'SELECT * FROM users WHERE username = {username}')  # VULNERABLE!
```

### Django XSS Prevention

```django
{{ user_input }}           {# Auto-escaped by default #}
{{ user_input|striptags }} {# Remove all HTML tags #}
<script>var username = {{ username|escapejs }};</script>
```

```python
from django.utils.html import format_html, escape
# GOOD: Use format_html for HTML with variables
def greet_user(username):
    return format_html('<span class="user">{}</span>', escape(username))
```

### Django CSRF Protection

```python
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = ['https://example.com']
```

### Django Authorization (DRF Permissions)

```python
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff
```

### Django Rate Limiting (DRF)

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'upload': '10/hour',
    }
}
```

### Django Environment Variables

```python
import environ
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env()
SECRET_KEY = env('DJANGO_SECRET_KEY')
DATABASE_URL = env('DATABASE_URL')
```

### Django Security Logging

```python
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {'level': 'WARNING', 'class': 'logging.FileHandler', 'filename': '/var/log/django/security.log'},
    },
    'loggers': {
        'django.security': {'handlers': ['file'], 'level': 'WARNING', 'propagate': True},
        'django.request': {'handlers': ['file'], 'level': 'ERROR', 'propagate': False},
    },
}
```

---

## Part 4: Spring Boot Security

### Authentication (JWT Filter)

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) { this.jwtService = jwtService; }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      Authentication auth = jwtService.authenticate(header.substring(7));
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

### Authorization

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/users")
  public List<UserDto> listUsers() { return userService.findAll(); }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

### Input Validation (Bean Validation)

```java
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(dto));
}
```

### SQL Injection Prevention

```java
// GOOD: Parameterized native query
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// GOOD: Spring Data derived query (auto-parameterized)
List<User> findByEmailAndActiveTrue(String email);
```

### Password Encoding

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12);
}
```

### Spring Security Headers & CORS

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .xssProtection(Customizer.withDefaults())
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));

// CORS: restrict origins, never use * in production
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}
```

### Spring Boot Rate Limiting (Bucket4j)

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());
    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
    }
  }
}
```

### Spring Boot Secrets Management

```yaml
# BAD: Hardcoded
spring.datasource.password: mySecretPassword123

# GOOD: Environment variable placeholder
spring.datasource.password: ${DB_PASSWORD}

# GOOD: Spring Cloud Vault integration
spring.cloud.vault.uri: https://vault.example.com
```

---

## Part 5: Code Quality Enforcement (Plankton)

### Three-Phase Architecture

Plankton runs on every file edit via PostToolUse hooks:

1. **Phase 1: Auto-Format** — Runs formatters (ruff format, biome, shfmt, taplo, markdownlint). Fixes 40-50% of issues silently.
2. **Phase 2: Collect Violations** — Runs linters, collects unfixable violations as structured JSON.
3. **Phase 3: Delegate + Verify** — Spawns claude subprocess with violations JSON, routes to model tier by complexity:
   - Haiku: formatting, imports, style (120s timeout)
   - Sonnet: complexity, refactoring (300s timeout)
   - Opus: type system, deep reasoning (600s timeout)

### Config Protection (Defense Against Rule-Gaming)

LLMs will modify config files to disable rules rather than fix code. Plankton blocks this:
1. **PreToolUse hook** blocks edits to all linter configs before they happen
2. **Stop hook** detects config changes via `git diff` at session end
3. **Protected files**: `.ruff.toml`, `biome.json`, `.shellcheckrc`, `.yamllint`, `.hadolint.yaml`

### Language-Specific Dependencies

| Language | Required | Optional |
|----------|----------|----------|
| Python | `ruff`, `uv` | `ty` (types), `vulture` (dead code), `bandit` (security) |
| TypeScript/JS | `biome` | `oxlint`, `semgrep`, `knip` (dead exports) |
| Shell | `shellcheck`, `shfmt` | -- |
| YAML | `yamllint` | -- |
| Markdown | `markdownlint-cli2` | -- |
| Dockerfile | `hadolint` (>= 2.12.0) | -- |

### Package Manager Enforcement

PreToolUse hook blocks legacy package managers:
- `pip`, `pip3`, `poetry`, `pipenv` -> Blocked (use `uv`)
- `npm`, `yarn`, `pnpm` -> Blocked (use `bun`)
- Allowed exceptions: `npm audit`, `npm view`, `npm publish`

### CI Integration Pattern

1. Run formatter checks
2. Run lint/type checks
3. Fail fast on strict mode
4. Publish remediation summary

### Health Metrics

Track: edits flagged by gates, average remediation time, repeat violations by category, merge blocks due to gate failures.

---

## Pre-Deployment Security Checklist

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **CSRF**: Protection enabled
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options, HSTS configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Logging**: No sensitive data logged
- [ ] **Dependencies**: Up to date, no vulnerabilities
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
- [ ] **File Uploads**: Validated (size, type)
- [ ] **Wallet Signatures**: Verified (if blockchain)

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)
- [AgentShield](https://github.com/affaan-m/agentshield)
- [Plankton](https://github.com/alexfazio/plankton)

---

**Remember**: Security is not optional. Deny by default, validate inputs, least privilege, and secure-by-configuration first.
