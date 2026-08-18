---
name: backend
category: backend
type: anchor
confidence: 0.77
anchor_base: api-design
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - { name: api-design, confidence: 0.77, origin: ECC }
  - { name: database-migrations, confidence: 0.75, origin: ECC }
  - { name: django-patterns, confidence: 0.62, origin: ECC }
  - { name: clickhouse-io, confidence: 0.58, origin: ECC }
  - { name: backend-patterns, confidence: 0.52, origin: ECC }
  - { name: postgres-patterns, confidence: 0.51, origin: ECC }
  - { name: springboot-patterns, confidence: 0.48, origin: ECC }
  - { name: content-hash-cache-pattern, confidence: 0.47, origin: ECC }
iron_law: >
  This anchor file is the SINGLE SOURCE OF TRUTH for the backend category.
  It is IMMUTABLE once deployed. Any changes must go through the skill governance
  workflow (Iron Law §11). Do not create duplicate skill files in this directory.
---

# Backend — Anchor Skill

Comprehensive backend engineering patterns covering API design, server architecture,
database management, caching, and deployment across multiple languages and frameworks.

## When to Activate

- Designing REST or GraphQL API endpoints
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers, content-hash)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)
- Creating or altering database tables and running migrations
- Working with PostgreSQL, ClickHouse, or ORM patterns
- Building Django or Spring Boot applications

---

## 1. API Design

### 1.1 Resource URL Structure

```
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resources for relationships
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Actions that don't map to CRUD (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
```

### 1.2 HTTP Methods and Status Codes

| Method | Idempotent | Safe | Use For |
|--------|-----------|------|---------|
| GET | Yes | Yes | Retrieve resources |
| POST | No | No | Create resources, trigger actions |
| PUT | Yes | No | Full replacement of a resource |
| PATCH | No* | No | Partial update of a resource |
| DELETE | Yes | No | Remove a resource |

```
# Success
200 OK                    -- GET, PUT, PATCH (with response body)
201 Created               -- POST (include Location header)
204 No Content            -- DELETE, PUT (no response body)

# Client Errors
400 Bad Request           -- Validation failure, malformed JSON
401 Unauthorized          -- Missing or invalid authentication
403 Forbidden             -- Authenticated but not authorized
404 Not Found             -- Resource doesn't exist
409 Conflict              -- Duplicate entry, state conflict
422 Unprocessable Entity  -- Semantically invalid (valid JSON, bad data)
429 Too Many Requests     -- Rate limit exceeded

# Server Errors
500 Internal Server Error -- Unexpected failure (never expose details)
502 Bad Gateway           -- Upstream service failed
503 Service Unavailable   -- Temporary overload, include Retry-After
```

### 1.3 Response Format

```json
// Success (single resource)
{ "data": { "id": "abc-123", "email": "alice@example.com", "name": "Alice" } }

// Collection (with pagination)
{
  "data": [{ "id": "abc-123", "name": "Alice" }],
  "meta": { "total": 142, "page": 1, "per_page": 20, "total_pages": 8 },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20"
  }
}

// Error
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address", "code": "invalid_format" }
    ]
  }
}
```

### 1.4 Pagination

**Offset-Based** (simple, supports "jump to page N"):

```
GET /api/v1/users?page=2&per_page=20
-- Slow on large offsets, inconsistent with concurrent inserts
```

**Cursor-Based** (scalable, consistent performance):

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

SELECT * FROM users WHERE id > :cursor_id ORDER BY id ASC LIMIT 21;
```

| Use Case | Pagination Type |
|----------|----------------|
| Admin dashboards, small datasets (<10K) | Offset |
| Infinite scroll, feeds, large datasets | Cursor |
| Public APIs | Cursor (default) with offset (optional) |

### 1.5 Filtering, Sorting, Sparse Fieldsets

```
GET /api/v1/orders?status=active&customer_id=abc-123
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/products?sort=-created_at,price
GET /api/v1/users?fields=id,name,email
```

### 1.6 Versioning

Prefer URL path versioning: `/api/v1/users`. Maintain at most 2 active versions.
Non-breaking changes (new fields, optional params, new endpoints) don't need a new version.
Breaking changes (removing/renaming fields, changing types) require a new version.

### 1.7 Rate Limiting

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| Anonymous | 30/min | Per IP | Public endpoints |
| Authenticated | 100/min | Per user | Standard API access |
| Premium | 1000/min | Per API key | Paid API plans |
| Internal | 10000/min | Per service | Service-to-service |

---

## 2. Server Architecture Patterns

### 2.1 Repository Pattern

```typescript
interface MarketRepository {
  findAll(filters?: MarketFilters): Promise<Market[]>
  findById(id: string): Promise<Market | null>
  create(data: CreateMarketDto): Promise<Market>
  update(id: string, data: UpdateMarketDto): Promise<Market>
  delete(id: string): Promise<void>
}
```

### 2.2 Service Layer Pattern

Separate business logic from data access. Services orchestrate repositories
and apply domain rules.

```typescript
class MarketService {
  constructor(private marketRepo: MarketRepository) {}

  async searchMarkets(query: string, limit = 10): Promise<Market[]> {
    const embedding = await generateEmbedding(query)
    const results = await this.vectorSearch(embedding, limit)
    const markets = await this.marketRepo.findByIds(results.map(r => r.id))
    return markets.sort((a, b) => {
      const scoreA = results.find(r => r.id === a.id)?.score || 0
      const scoreB = results.find(r => r.id === b.id)?.score || 0
      return scoreA - scoreB
    })
  }
}
```

### 2.3 Middleware Pattern

```typescript
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    try {
      req.user = await verifyToken(token)
      return handler(req, res)
    } catch { return res.status(401).json({ error: 'Invalid token' }) }
  }
}
```

### 2.4 Centralized Error Handling

```typescript
class ApiError extends Error {
  constructor(public statusCode: number, public message: string, public isOperational = true) {
    super(message)
  }
}

export function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError)
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  if (error instanceof z.ZodError)
    return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
  console.error('Unexpected error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### 2.5 Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn() }
    catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
  throw lastError!
}
```

### 2.6 Role-Based Access Control

```typescript
const rolePermissions: Record<string, string[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  moderator: ['read', 'write', 'delete'],
  user: ['read', 'write']
}

export function requirePermission(permission: string) {
  return (handler: Function) => async (request: Request) => {
    const user = await requireAuth(request)
    if (!rolePermissions[user.role]?.includes(permission))
      throw new ApiError(403, 'Insufficient permissions')
    return handler(request, user)
  }
}
```

### 2.7 Background Job Queue

```typescript
class JobQueue<T> {
  private queue: T[] = []
  private processing = false

  async add(job: T): Promise<void> {
    this.queue.push(job)
    if (!this.processing) this.process()
  }

  private async process(): Promise<void> {
    this.processing = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      try { await this.execute(job) }
      catch (error) { console.error('Job failed:', error) }
    }
    this.processing = false
  }

  private async execute(job: T): Promise<void> { /* job logic */ }
}
```

### 2.8 Structured Logging

```typescript
class Logger {
  log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }))
  }
}
```

---

## 3. Database & ORM

### 3.1 PostgreSQL Index Cheat Sheet

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| `WHERE col = value` | B-tree (default) | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| `WHERE tsv @@ query` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Time-series ranges | BRIN | `CREATE INDEX idx ON t USING brin (col)` |

### 3.2 PostgreSQL Data Type Reference

| Use Case | Correct Type | Avoid |
|----------|-------------|-------|
| IDs | `bigint` | `int`, random UUID |
| Strings | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Money | `numeric(10,2)` | `float` |
| Flags | `boolean` | `varchar`, `int` |

### 3.3 Key PostgreSQL Patterns

```sql
-- Covering index (avoids table lookup)
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);

-- Partial index (smaller, only active rows)
CREATE INDEX idx ON users (email) WHERE deleted_at IS NULL;

-- UPSERT
INSERT INTO settings (user_id, key, value) VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value;

-- Cursor pagination: O(1) vs OFFSET O(n)
SELECT * FROM products WHERE id > $last_id ORDER BY id LIMIT 20;

-- Queue processing with advisory locks
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
) RETURNING *;
```

### 3.4 Anti-Pattern Detection Queries

```sql
-- Find unindexed foreign keys
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Find slow queries
SELECT query, mean_exec_time, calls FROM pg_stat_statements
WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC;
```

### 3.5 N+1 Query Prevention

```typescript
// BAD: N+1
const markets = await getMarkets()
for (const m of markets) m.creator = await getUser(m.creator_id)

// GOOD: Batch fetch
const creators = await getUsers(markets.map(m => m.creator_id))
const creatorMap = new Map(creators.map(c => [c.id, c]))
markets.forEach(m => { m.creator = creatorMap.get(m.creator_id) })
```

### 3.6 Transaction Pattern

```sql
CREATE OR REPLACE FUNCTION create_market_with_position(
  market_data jsonb, position_data jsonb
) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO markets VALUES (market_data);
  INSERT INTO positions VALUES (position_data);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;
```

---

## 4. Database Migrations

### 4.1 Core Principles

1. **Every change is a migration** -- never alter production databases manually
2. **Migrations are forward-only in production** -- rollbacks use new forward migrations
3. **Schema and data migrations are separate** -- never mix DDL and DML
4. **Test migrations against production-sized data**
5. **Migrations are immutable once deployed**

### 4.2 Safety Checklist

- [ ] Migration has both UP and DOWN
- [ ] No full table locks on large tables
- [ ] New columns are nullable or have defaults
- [ ] Indexes created CONCURRENTLY
- [ ] Data backfill is a separate migration
- [ ] Tested against production-sized data copy
- [ ] Rollback plan documented

### 4.3 Safe Column Operations (PostgreSQL)

```sql
-- GOOD: Nullable column, no lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default (full table rewrite + lock)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

### 4.4 Non-Blocking Index Creation

```sql
-- GOOD: Non-blocking
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
-- Cannot run inside a transaction block
```

### 4.5 Zero-Downtime Expand-Contract Pattern

```
Phase 1 EXPAND:  Add new column (nullable/default), app writes BOTH old+new, backfill
Phase 2 MIGRATE: App reads NEW, writes BOTH, verify consistency
Phase 3 CONTRACT: App uses NEW only, drop old column in separate migration
```

### 4.6 Large Data Migrations (Batched)

```sql
DO $$
DECLARE batch_size INT := 10000; rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users WHERE normalized_email IS NULL
      LIMIT batch_size FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

### 4.7 Migration Tooling Quick Reference

**Prisma** (TypeScript): `npx prisma migrate dev --name desc` / `npx prisma migrate deploy`
**Drizzle** (TypeScript): `npx drizzle-kit generate` / `npx drizzle-kit migrate`
**Django** (Python): `python manage.py makemigrations` / `python manage.py migrate`
**golang-migrate** (Go): `migrate create -ext sql -dir migrations -seq desc` / `migrate up`

### 4.8 Migration Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|-----------------|
| Manual SQL in production | Always use migration files |
| Editing deployed migrations | Create new migration instead |
| NOT NULL without default | Add nullable, backfill, then constrain |
| Inline index on large table | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Separate migrations |
| Drop column before removing code | Remove code first, drop column next deploy |

---

## 5. Caching

### 5.1 Redis Cache-Aside Pattern

```typescript
class CachedMarketRepository implements MarketRepository {
  constructor(private baseRepo: MarketRepository, private redis: RedisClient) {}

  async findById(id: string): Promise<Market | null> {
    const cached = await this.redis.get(`market:${id}`)
    if (cached) return JSON.parse(cached)
    const market = await this.baseRepo.findById(id)
    if (market) await this.redis.setex(`market:${id}`, 300, JSON.stringify(market))
    return market
  }

  async invalidateCache(id: string): Promise<void> { await this.redis.del(`market:${id}`) }
}
```

### 5.2 Django View-Level Caching

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@method_decorator(cache_page(60 * 15), name='dispatch')  # 15 minutes
class ProductListView(generic.ListView):
    model = Product
```

### 5.3 Django Low-Level Caching

```python
from django.core.cache import cache

def get_featured_products():
    products = cache.get('featured_products')
    if products is None:
        products = list(Product.objects.filter(is_featured=True))
        cache.set('featured_products', products, timeout=60 * 15)
    return products
```

### 5.4 Spring Boot Caching

```java
@Cacheable(value = "market", key = "#id")
public Market getById(Long id) {
    return repo.findById(id).map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Market not found"));
}

@CacheEvict(value = "market", key = "#id")
public void evict(Long id) {}
```

### 5.5 Content-Hash File Cache

For expensive file processing (PDF parsing, OCR, image analysis). Uses SHA-256 of
file content as cache key -- survives renames, auto-invalidates on content change.

```python
def compute_file_hash(path: Path) -> str:
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def extract_with_cache(file_path: Path, *, cache_enabled=True, cache_dir=Path(".cache")):
    if not cache_enabled:
        return extract_text(file_path)
    file_hash = compute_file_hash(file_path)
    cached = read_cache(cache_dir, file_hash)
    if cached is not None:
        return cached.document
    doc = extract_text(file_path)
    write_cache(cache_dir, CacheEntry(file_hash=file_hash, source_path=str(file_path), document=doc))
    return doc
```

Key rules: hash content not paths; chunk large files; keep processing functions pure;
handle corruption as cache miss.

---

## 6. Framework-Specific Patterns

### 6.1 Django

#### Project Structure

```
myproject/
├── config/
│   ├── settings/
│   │   ├── base.py / development.py / production.py / test.py
│   ├── urls.py / wsgi.py / asgi.py
└── apps/
    ├── users/ (models, views, serializers, services, tests/)
    └── products/
```

#### Model Best Practices

```python
class Product(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=250)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    category = models.ForeignKey('Category', on_delete=models.CASCADE, related_name='products')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['category', 'is_active']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(price__gte=0), name='price_non_negative')
        ]
```

#### Custom QuerySet

```python
class ProductQuerySet(models.QuerySet):
    def active(self):      return self.filter(is_active=True)
    def with_category(self): return self.select_related('category')
    def with_tags(self):   return self.prefetch_related('tags')
    def in_stock(self):    return self.filter(stock__gt=0)
    def search(self, q):   return self.filter(
        models.Q(name__icontains=q) | models.Q(description__icontains=q))

# Usage: Product.objects.active().with_category().in_stock()
```

#### DRF ViewSet

```python
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('tags')
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']

    def get_serializer_class(self):
        if self.action == 'create': return ProductCreateSerializer
        return ProductSerializer

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        product = self.get_object()
        result = ProductService().purchase(product, request.user)
        return Response(result, status=status.HTTP_201_CREATED)
```

#### Service Layer with Transactions

```python
class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order(user, cart):
        order = Order.objects.create(user=user, total_price=cart.total_price)
        for item in cart.items.all():
            OrderItem.objects.create(order=order, product=item.product,
                                    quantity=item.quantity, price=item.product.price)
        cart.items.all().delete()
        return order
```

#### Signals

```python
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
```

#### Production Settings

Django 生产 settings 完整清单唯一权威见 `security.md` Part 3 (Django Security → Production Settings)。

### 6.2 Spring Boot

#### Controller-Service-Repository

```java
@RestController
@RequestMapping("/api/markets")
class MarketController {
  private final MarketService marketService;

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(marketService.list(PageRequest.of(page, size)).map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(marketService.create(request)));
  }
}

@Service
public class MarketService {
  @Transactional
  public Market create(CreateMarketRequest request) {
    return Market.from(repo.save(MarketEntity.from(request)));
  }
}
```

#### DTOs with Bean Validation

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}
```

#### Global Exception Handler

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String msg = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(msg));
  }
}
```

#### Rate Limiting (Bucket4j)

Configure `ForwardedHeaderFilter` when behind a reverse proxy. Never trust
`X-Forwarded-For` directly without proper proxy configuration.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());
    if (bucket.tryConsume(1)) chain.doFilter(request, response);
    else response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
  }
}
```

#### Production Defaults

- Prefer constructor injection, avoid field injection
- Enable `spring.mvc.problemdetails.enabled=true` for RFC 7807 (Spring Boot 3+)
- Use `@Transactional(readOnly = true)` for queries
- Observability: Micrometer + Prometheus/OTel, structured JSON logging via Logback

### 6.3 TypeScript / Next.js API Routes

```typescript
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const parsed = createUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({
      error: {
        code: "validation_error",
        details: parsed.error.issues.map(i => ({
          field: i.path.join("."), message: i.message, code: i.code,
        })),
      },
    }, { status: 422 });
  }
  const user = await createUser(parsed.data);
  return NextResponse.json({ data: user }, {
    status: 201, headers: { Location: `/api/v1/users/${user.id}` },
  });
}
```

---

## 7. ClickHouse Analytics

### 7.1 Engine Selection

| Engine | Use Case |
|--------|----------|
| MergeTree | General-purpose OLAP |
| ReplacingMergeTree | Deduplication from multiple sources |
| AggregatingMergeTree | Pre-aggregated metrics |

### 7.2 Table Design

```sql
CREATE TABLE markets_analytics (
    date Date, market_id String, volume UInt64, trades UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, market_id)
SETTINGS index_granularity = 8192;
```

### 7.3 Materialized Views for Real-Time Aggregation

```sql
CREATE MATERIALIZED VIEW market_stats_hourly_mv TO market_stats_hourly AS
SELECT toStartOfHour(timestamp) AS hour, market_id,
    sumState(amount) AS total_volume, countState() AS total_trades,
    uniqState(user_id) AS unique_users
FROM trades GROUP BY hour, market_id;
```

### 7.4 Analytics Query Patterns

```sql
-- Time series
SELECT toDate(timestamp) AS date, uniq(user_id) AS dau
FROM events WHERE timestamp >= today() - INTERVAL 30 DAY GROUP BY date;

-- Funnel analysis
SELECT countIf(step='viewed') AS viewed, countIf(step='clicked') AS clicked,
    countIf(step='completed') AS completed,
    round(clicked/viewed*100, 2) AS view_to_click_pct
FROM (SELECT user_id, event_type AS step FROM events WHERE event_date = today());
```

### 7.5 ClickHouse Best Practices

- Partition by time (month/day), avoid too many partitions
- Put most-filtered columns first in ORDER BY
- Use `LowCardinality` for repeated strings, smallest appropriate integer types
- Avoid: `SELECT *`, `FINAL`, too many JOINs, small frequent inserts (batch instead)
- Bulk insert always; use streaming for continuous ingestion

---

## 8. API Design Checklist

Before shipping a new endpoint:

- [ ] Resource URL follows conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method and status codes
- [ ] Input validated with schema (Zod, Pydantic, Bean Validation)
- [ ] Error responses follow standard format with codes
- [ ] Pagination on list endpoints
- [ ] Authentication required (or explicitly public)
- [ ] Authorization checked (ownership, roles)
- [ ] Rate limiting configured
- [ ] No internal details leaked (stack traces, SQL)
- [ ] OpenAPI/Swagger spec updated
