---
name: language-specific
category: language-specific
type: anchor
confidence: 0.70
anchor_base: golang-patterns
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: golang-patterns
    confidence: 0.70
    origin: ECC
  - name: cpp-coding-standards
    confidence: 0.68
    origin: ECC
  - name: python-patterns
    confidence: 0.68
    origin: ECC
  - name: java-coding-standards
    confidence: 0.43
    origin: ECC
  - name: jpa-patterns
    confidence: 0.40
    origin: ECC
iron_law: >
  This anchor file is immutable during normal operations.
  Any modification requires explicit governance approval through the
  Agent layer workflow. Do not edit, split, or duplicate this file
  without following the Skill File Governance process defined in
  Agent/rules/iron_laws.md §11.
---

# Language-Specific Coding Standards & Patterns

Consolidated anchor covering Go, C++, Python, Java, and JPA/Hibernate. Per-language sections provide idiomatic patterns, error handling, concurrency, and tooling.

## When to Activate

- Writing, reviewing, or refactoring code in Go, C++, Python, or Java
- Designing packages, modules, or project layouts
- Making architectural decisions about error handling, concurrency, or resource management
- Working with JPA/Hibernate in Spring Boot projects

---

# Part 1: Go

## Go Core Principles

- **Simplicity over cleverness** -- code should be obvious and easy to read
- **Make the zero value useful** -- types should work without explicit initialization
- **Accept interfaces, return structs** -- functions accept interface params, return concrete types
- **Errors are values** -- treat errors as first-class values, not exceptions
- **Return early** -- handle errors first, keep happy path unindented

## Go Error Handling

```go
// Wrap errors with context
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }
    return &cfg, nil
}

// Custom errors and sentinels
type ValidationError struct { Field, Message string }
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}
var ErrNotFound = errors.New("resource not found")

// Check with errors.Is / errors.As
if errors.Is(err, sql.ErrNoRows) { /* handle */ }
var ve *ValidationError
if errors.As(err, &ve) { /* handle */ }
```

## Go Concurrency

```go
// Worker Pool
func WorkerPool(jobs <-chan Job, results chan<- Result, n int) {
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() { defer wg.Done(); for j := range jobs { results <- process(j) } }()
    }
    wg.Wait(); close(results)
}

// Context for timeouts
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)

// errgroup for coordinated goroutines
g, ctx := errgroup.WithContext(ctx)
for i, url := range urls {
    i, url := i, url
    g.Go(func() error { results[i], err = fetch(ctx, url); return err })
}
if err := g.Wait(); err != nil { return nil, err }

// Avoid goroutine leaks: use buffered channels + select on ctx.Done()
```

## Go Interface & Struct Design

```go
// Small interfaces, defined at consumer site
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

// Functional options pattern
type Option func(*Server)
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func NewServer(addr string, opts ...Option) *Server {
    s := &Server{addr: addr, timeout: 30 * time.Second}
    for _, opt := range opts { opt(s) }
    return s
}
```

## Go Project Layout

```text
myproject/
├── cmd/myapp/main.go
├── internal/ (handler/, service/, repository/, config/)
├── pkg/client/
├── api/v1/
├── testdata/
├── go.mod, go.sum, Makefile
```

**Naming**: Short, lowercase, no underscores. Avoid package-level mutable state; use dependency injection.

## Go Performance & Tooling

- Preallocate slices: `make([]T, 0, len(items))`
- Use `sync.Pool` for frequent allocations, `strings.Builder` or `strings.Join` for string building
- Avoid package-level mutable state; use dependency injection

```bash
go build ./... && go run ./cmd/myapp
go test ./... && go test -race ./... && go test -cover ./...
go vet ./... && staticcheck ./... && golangci-lint run
go mod tidy && go mod verify
gofmt -w . && goimports -w .
```

## Go Idioms Quick Reference

| Idiom | Description |
|-------|-------------|
| Accept interfaces, return structs | Functions accept interface params, return concrete types |
| Errors are values | Treat errors as first-class values, not exceptions |
| Don't communicate by sharing memory | Use channels for coordination between goroutines |
| Make the zero value useful | Types should work without explicit initialization |
| A little copying > a little dependency | Avoid unnecessary external dependencies |
| Clear is better than clever | Prioritize readability over cleverness |
| gofmt is everyone's friend | Always format with gofmt/goimports |
| Return early | Handle errors first, keep happy path unindented |

## Go Anti-Patterns

- Naked returns in long functions -- unclear what is being returned
- Using `panic` for control flow -- only for truly unrecoverable situations
- Passing `context.Context` in struct fields -- context should be first parameter
- Mixing value and pointer receivers inconsistently on the same type
- Ignoring errors with blank identifier `_` without explicit documentation
- Detaching goroutines without lifecycle management

---

# Part 2: C++ (Core Guidelines, C++17/20/23)

## C++ Cross-Cutting Principles

1. **RAII everywhere** -- bind resource lifetime to object lifetime
2. **Immutability by default** -- start with `const`/`constexpr`; mutability is the exception
3. **Type safety** -- use the type system to prevent errors at compile time
4. **Express intent** -- names, types, concepts communicate purpose
5. **Value semantics over pointer semantics** -- prefer returning by value

## C++ Functions

```cpp
// Cheap types by value, others by const&
void print(int x);
void analyze(const std::string& data);

// Return structs, not output parameters
struct ParseResult { std::string token; int position; };
ParseResult parse(std::string_view input);

// constexpr + noexcept for pure functions
constexpr int factorial(int n) noexcept {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}
```

## C++ Classes

- **Rule of Zero**: Let compiler generate special members when no manual resource management needed
- **Rule of Five**: If you define any of destructor/copy/move, define all five

```cpp
// Class hierarchy: virtual destructor, use override
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
class Circle : public Shape {
public:
    explicit Circle(double r) : radius_(r) {}
    double area() const override { return 3.14159 * radius_ * radius_; }
private:
    double radius_;
};
```

## C++ Resource Management

```cpp
auto widget = std::make_unique<Widget>("config");  // unique ownership
auto cache  = std::make_shared<Cache>(1024);        // shared ownership
// Raw pointer = non-owning observer. Never naked new/delete.
```

## C++ Initialization & Immutability

```cpp
const int max_retries{3};
const std::vector<int> primes{2, 3, 5, 7, 11};
// Lambda for complex const init
const auto config = [&] { Config c; c.timeout = 30s; return c; }();
// Con.1-5: const member functions by default, pass by const&
```

## C++ Concurrency

```cpp
// RAII locks, always named
std::lock_guard<std::mutex> lock(mutex_);
// scoped_lock for multiple mutexes (deadlock-free)
std::scoped_lock lock(from.mutex_, to.mutex_);
// Always wait with a condition on condition_variable
cv_.wait(lock, [this] { return !queue_.empty(); });
```

## C++ Templates & Concepts (C++20)

```cpp
template<std::integral T> T gcd(T a, T b) { /* ... */ }
void sort(std::ranges::random_access_range auto& r) { std::ranges::sort(r); }
template<typename T>
concept Serializable = requires(const T& t) {
    { t.serialize() } -> std::convertible_to<std::string>;
};
```

## C++ Standard Library & Naming

- Prefer `std::vector`/`std::array` over C arrays; `std::string_view` for non-owning
- `enum class` over plain `enum`; `nullptr` over `0`/`NULL`
- Use `'\n'` not `std::endl`; no `using namespace` in headers
- Naming: `underscore_style`, trailing `_` for members, ALL_CAPS only for macros

## C++ Performance

```cpp
// Compile-time computation
constexpr auto lookup_table = [] {
    std::array<int, 256> table{};
    for (int i = 0; i < 256; ++i) { table[i] = i * i; }
    return table;
}();
// Prefer contiguous data for cache-friendliness
std::vector<Point> points;  // GOOD: contiguous, not vector<unique_ptr<Point>>
```

## C++ Anti-Patterns

- Returning `T&&` from functions; using `va_arg` / C-style variadics
- Calling virtual functions in constructors/destructors
- `volatile` for synchronization (hardware I/O only)
- Unnamed lock guards that destroy immediately
- Holding locks while calling callbacks (deadlock risk)
- Lock-free programming without deep expertise

## C++ Quick Checklist

No raw `new`/`delete` | Variables `const`/`constexpr` by default | `enum class` | `nullptr` | No C-style casts | `explicit` single-arg constructors | Rule of Zero or Five | Concepts on templates | No `using namespace` in headers | RAII locks | `'\n'` not `endl`

---

# Part 3: Python

## Python Core Principles

- **Readability counts** -- clear, explicit code over clever code
- **EAFP** -- Easier to Ask Forgiveness than Permission (exception handling over condition checking)
- **Type hints everywhere** -- annotate function signatures (Python 3.9+ built-in types)

## Python Type Hints

```python
def process(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

T = TypeVar('T')
def first(items: list[T]) -> T | None:
    return items[0] if items else None

class Renderable(Protocol):
    def render(self) -> str: ...
```

## Python Error Handling

```python
# Specific exceptions, chaining with `from`
def load_config(path: str) -> Config:
    try:
        with open(path) as f: return Config.from_json(f.read())
    except FileNotFoundError as e:
        raise ConfigError(f"Config not found: {path}") from e

# Custom hierarchy
class AppError(Exception): pass
class ValidationError(AppError): pass
class NotFoundError(AppError): pass
```

## Python Context Managers & Generators

```python
@contextmanager
def timer(name: str):
    start = time.perf_counter()
    yield
    print(f"{name} took {time.perf_counter() - start:.4f}s")

# Generator for large data
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f: yield line.strip()
```

## Python Data Classes & Decorators

```python
@dataclass
class User:
    id: str; name: str; email: str
    created_at: datetime = field(default_factory=datetime.now)
    def __post_init__(self):
        if "@" not in self.email: raise ValueError(f"Invalid email: {self.email}")

# Decorator with functools.wraps
def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter() - start:.4f}s")
        return result
    return wrapper
```

## Python Concurrency

- **Threading** (`ThreadPoolExecutor`) for I/O-bound tasks
- **Multiprocessing** (`ProcessPoolExecutor`) for CPU-bound tasks
- **async/await** with `asyncio.gather` for concurrent I/O

## Python Project Layout

```
myproject/
├── src/mypackage/ (__init__.py, main.py, api/, models/, utils/)
├── tests/ (conftest.py, test_*.py)
├── pyproject.toml
```

Import order: stdlib, third-party, local. Use `isort` for automatic sorting.

## Python Performance & Tooling

- `__slots__` for memory efficiency; generators for large datasets
- `"".join()` over string concatenation in loops
- `black .` + `isort .` | `ruff check .` | `mypy .` | `pytest --cov` | `bandit -r .`

## Python Idioms Quick Reference

| Idiom | Description |
|-------|-------------|
| EAFP | Easier to Ask Forgiveness than Permission |
| Context managers | Use `with` for resource management |
| List comprehensions | For simple transformations |
| Generators | For lazy evaluation and large datasets |
| Type hints | Annotate function signatures |
| Dataclasses | For data containers with auto-generated methods |
| `__slots__` | For memory optimization |
| f-strings | For string formatting |
| `pathlib.Path` | For path operations |
| `enumerate` | For index-element pairs in loops |

## Python Anti-Patterns

- Mutable default arguments (`def f(items=[])` -- use `items=None`)
- `type()` instead of `isinstance` for type checking
- `== None` instead of `is None`
- `from module import *` -- use explicit imports
- Bare `except:` -- always catch specific exceptions
- String concatenation in loops -- use `"".join()`

---

# Part 4: Java (17+ / Spring Boot)

## Java Core Principles

- Clarity over cleverness; immutable by default; fail fast with meaningful exceptions

## Java Naming & Immutability

```java
public class MarketService {}                    // PascalCase
public record Money(BigDecimal amount, Currency currency) {}  // Records for DTOs
private static final int MAX_PAGE_SIZE = 100;    // UPPER_SNAKE_CASE constants
```

## Java Optional & Streams

```java
return marketRepository.findBySlug(slug)
    .map(MarketResponse::from)
    .orElseThrow(() -> new EntityNotFoundException("Market not found"));

List<String> names = markets.stream()
    .map(Market::name).filter(Objects::nonNull).toList();
```

## Java Exceptions & Generics

- Unchecked exceptions for domain errors; domain-specific exception classes
- `<T extends Identifiable> Map<Long, T> indexById(Collection<T> items)`
- Avoid broad `catch (Exception ex)` unless rethrowing/logging centrally

## Java Project Structure

```
src/main/java/com/example/app/ (config/, controller/, service/, repository/, domain/, dto/)
src/test/java/... (mirrors main)
```

## Java Code Smells

Long parameter lists -> DTO/builders | Deep nesting -> early returns | Magic numbers -> constants | Static mutable state -> DI | Silent catch blocks -> log and act

## Java Testing & Logging

- JUnit 5 + AssertJ + Mockito; deterministic tests, no hidden sleeps
- `log.info("fetch_market slug={}", slug)`; `@Nullable` only when unavoidable

---

# Part 5: JPA/Hibernate (Spring Boot)

## JPA Entity Design

```java
@Entity @Table(name = "markets", indexes = {
    @Index(name = "idx_slug", columnList = "slug", unique = true) })
@EntityListeners(AuditingEntityListener.class)
public class MarketEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String name;
    @Enumerated(EnumType.STRING) private MarketStatus status = MarketStatus.ACTIVE;
    @CreatedDate private Instant createdAt;
    @LastModifiedDate private Instant updatedAt;
}
```

## JPA N+1 Prevention & Repositories

```java
// Default to lazy; JOIN FETCH when needed
@Query("select m from MarketEntity m left join fetch m.positions where m.id = :id")
Optional<MarketEntity> findWithPositions(@Param("id") Long id);

// Projections for lightweight queries
public interface MarketSummary { Long getId(); String getName(); }
```

## JPA Transactions & Performance

- `@Transactional` on service methods; `readOnly = true` for read paths
- Add indexes for common filters; composite indexes matching query patterns
- Batch writes with `saveAll` + `hibernate.jdbc.batch_size`
- HikariCP: `maximum-pool-size=20`, `minimum-idle=5`, `connection-timeout=30000`

## JPA Migrations & Testing

- Flyway or Liquibase; never Hibernate auto DDL in production
- `@DataJpaTest` with Testcontainers; assert SQL efficiency with Hibernate SQL logging

**Remember**: Keep entities lean, queries intentional, transactions short. Prevent N+1 with fetch strategies and projections.
