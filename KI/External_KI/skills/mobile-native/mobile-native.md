---
name: mobile-native
category: mobile-native
type: anchor
confidence: 0.51
anchor_base: vercel-react-native-skills
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: vercel-react-native-skills
    confidence: 0.51
    origin: Vercel
  - name: swiftui-patterns
    confidence: 0.50
    origin: ECC
  - name: swift-concurrency-6-2
    confidence: 0.49
    origin: ECC
  - name: swift-actor-persistence
    confidence: 0.41
    origin: ECC
  - name: swift-protocol-di-testing
    confidence: 0.38
    origin: ECC
iron_law: >
  This anchor file is immutable during normal operations.
  Any modification requires explicit governance approval through the
  Agent layer workflow. Do not edit, split, or duplicate this file
  without following the Skill File Governance process defined in
  Agent/rules/iron_laws.md §11.
---

# Mobile-Native Patterns

Consolidated anchor for mobile-native skills covering React Native/Expo best practices, SwiftUI patterns, Swift 6.2 concurrency, actor-based persistence, and protocol-based dependency injection with testing.

## When to Activate

- Building React Native or Expo applications
- Building SwiftUI views and managing state
- Working with Swift concurrency (actors, async/await, Sendable)
- Designing persistence layers for iOS/macOS apps
- Writing testable Swift code with protocol-based dependency injection
- Optimizing mobile app performance (lists, animations, rendering)

---

# Part 1: React Native & Expo Best Practices

Comprehensive best practices for React Native and Expo applications covering performance, animations, UI patterns, and platform-specific optimizations.

## Rule Categories by Priority

| Priority | Category         | Impact   | Prefix               |
| -------- | ---------------- | -------- | -------------------- |
| 1        | List Performance | CRITICAL | `list-performance-`  |
| 2        | Animation        | HIGH     | `animation-`         |
| 3        | Navigation       | HIGH     | `navigation-`        |
| 4        | UI Patterns      | HIGH     | `ui-`                |
| 5        | State Management | MEDIUM   | `react-state-`       |
| 6        | Rendering        | MEDIUM   | `rendering-`         |
| 7        | Monorepo         | MEDIUM   | `monorepo-`          |
| 8        | Configuration    | LOW      | `fonts-`, `imports-` |

## List Performance (CRITICAL)

- **Virtualize**: Use FlashList for large lists
- **Memoize items**: Memoize list item components
- **Stabilize callbacks**: Stabilize callback references
- **No inline objects**: Avoid inline style objects in list items
- **Extract functions**: Extract functions outside render
- **Optimize images**: Optimize images in lists
- **Offload expensive work**: Move expensive computation outside list items
- **Use item types**: Use item types for heterogeneous lists

## Animation (HIGH)

- **GPU properties**: Animate only `transform` and `opacity`
- **Derived values**: Use `useDerivedValue` for computed animations
- **Gesture detection**: Use `Gesture.Tap` instead of `Pressable` in Reanimated

## Navigation (HIGH)

- Use native stack and native tabs over JS navigators

## UI Patterns (HIGH)

- **expo-image**: Use `expo-image` for all images
- **Image gallery**: Use Galeria for image lightboxes
- **Pressable**: Use `Pressable` over `TouchableOpacity`
- **Safe areas**: Handle safe areas in ScrollViews
- **Content inset**: Use `contentInset` for headers in ScrollViews
- **Native menus**: Use native context menus
- **Native modals**: Use native modals when possible
- **View measurement**: Use `onLayout`, not `measure()`
- **Styling**: Use `StyleSheet.create` or Nativewind

## State Management (MEDIUM)

- **Minimize subscriptions**: Minimize state subscriptions
- **Dispatcher pattern**: Use dispatcher pattern for callbacks
- **Fallback on first render**: Show fallback on first render
- **React Compiler**: Destructure for React Compiler compatibility
- **Reanimated shared values**: Handle shared values with React Compiler

## Rendering (MEDIUM)

- Wrap text in `Text` components
- Avoid falsy `&&` for conditional rendering

## Monorepo (MEDIUM)

- Keep native dependencies in app package
- Use single versions across packages

## Configuration (LOW)

- Use config plugins for custom fonts
- Organize design system imports
- Hoist `Intl` object creation

---

# Part 2: SwiftUI Patterns

Modern SwiftUI patterns for building declarative, performant user interfaces on Apple platforms.

## SwiftUI State Management

### Property Wrapper Selection

| Wrapper | Use Case |
|---------|----------|
| `@State` | View-local value types (toggles, form fields, sheet presentation) |
| `@Binding` | Two-way reference to parent's `@State` |
| `@Observable` class + `@State` | Owned model with multiple properties |
| `@Observable` class (no wrapper) | Read-only reference passed from parent |
| `@Bindable` | Two-way binding to an `@Observable` property |
| `@Environment` | Shared dependencies injected via `.environment()` |

### @Observable ViewModel

Use `@Observable` (not `ObservableObject`) -- it tracks property-level changes so SwiftUI only re-renders views that read the changed property:

```swift
@Observable
final class ItemListViewModel {
    private(set) var items: [Item] = []
    private(set) var isLoading = false
    var searchText = ""

    private let repository: any ItemRepository

    init(repository: any ItemRepository = DefaultItemRepository()) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        items = (try? await repository.fetchAll()) ?? []
    }
}
```

### View Consuming the ViewModel

```swift
struct ItemListView: View {
    @State private var viewModel: ItemListViewModel

    init(viewModel: ItemListViewModel = ItemListViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
        }
        .searchable(text: $viewModel.searchText)
        .overlay { if viewModel.isLoading { ProgressView() } }
        .task { await viewModel.load() }
    }
}
```

### Environment Injection

Replace `@EnvironmentObject` with `@Environment`:

```swift
ContentView()
    .environment(authManager)

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    var body: some View {
        Text(auth.currentUser?.name ?? "Guest")
    }
}
```

## SwiftUI View Composition

### Extract Subviews to Limit Invalidation

```swift
struct OrderView: View {
    @State private var viewModel = OrderViewModel()
    var body: some View {
        VStack {
            OrderHeader(title: viewModel.title)
            OrderItemList(items: viewModel.items)
            OrderTotal(total: viewModel.total)
        }
    }
}
```

### ViewModifier for Reusable Styling

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

extension View {
    func cardStyle() -> some View { modifier(CardModifier()) }
}
```

## SwiftUI Navigation

### Type-Safe NavigationStack

```swift
@Observable
final class Router {
    var path = NavigationPath()
    func navigate(to destination: Destination) { path.append(destination) }
    func popToRoot() { path = NavigationPath() }
}

enum Destination: Hashable {
    case detail(Item.ID)
    case settings
    case profile(User.ID)
}

struct RootView: View {
    @State private var router = Router()
    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Destination.self) { dest in
                    switch dest {
                    case .detail(let id): ItemDetailView(itemID: id)
                    case .settings: SettingsView()
                    case .profile(let id): ProfileView(userID: id)
                    }
                }
        }
        .environment(router)
    }
}
```

## SwiftUI Performance

- Use `LazyVStack`/`LazyHStack` for large collections -- creates views only when visible
- Always use stable, unique IDs in `ForEach` -- avoid array indices
- Never perform I/O, network calls, or heavy computation inside `body`
- Use `.task {}` for async work -- it cancels automatically on disappear
- Minimize `.shadow()`, `.blur()`, `.mask()` in lists -- triggers offscreen rendering
- Conform expensive views to `Equatable` to skip unnecessary re-renders

```swift
struct ExpensiveChartView: View, Equatable {
    let dataPoints: [DataPoint]
    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.dataPoints == rhs.dataPoints
    }
    var body: some View { /* Complex chart rendering */ }
}
```

## SwiftUI Previews

```swift
#Preview("Empty state") {
    ItemListView(viewModel: ItemListViewModel(repository: EmptyMockRepository()))
}
#Preview("Loaded") {
    ItemListView(viewModel: ItemListViewModel(repository: PopulatedMockRepository()))
}
```

## SwiftUI Anti-Patterns

- Using `ObservableObject`/`@Published`/`@StateObject`/`@EnvironmentObject` in new code -- migrate to `@Observable`
- Putting async work directly in `body` or `init` -- use `.task {}`
- Creating view models as `@State` in child views that don't own the data
- Using `AnyView` type erasure -- prefer `@ViewBuilder` or `Group`
- Ignoring `Sendable` requirements when passing data to/from actors

---

# Part 3: Swift 6.2 Approachable Concurrency

Patterns for adopting Swift 6.2's concurrency model where code runs single-threaded by default and concurrency is introduced explicitly.

## Core Problem and Solution

In Swift 6.1 and earlier, async functions could be implicitly offloaded to background threads, causing data-race errors. Swift 6.2 fixes this: async functions stay on the calling actor by default.

```swift
// Swift 6.2: OK -- async stays on MainActor, no data race
@MainActor
final class StickerModel {
    let photoProcessor = PhotoProcessor()
    func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
        guard let data = try await item.loadTransferable(type: Data.self) else { return nil }
        return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
    }
}
```

## Isolated Conformances

MainActor types can now conform to non-isolated protocols safely:

```swift
protocol Exportable {
    func export()
}

extension StickerModel: @MainActor Exportable {
    func export() { photoProcessor.exportAsPNG() }
}
```

## Global and Static Variables

Protect global/static state with MainActor:

```swift
@MainActor
final class StickerLibrary {
    static let shared: StickerLibrary = .init()
}
```

### MainActor Default Inference Mode

Swift 6.2 introduces a mode where MainActor is inferred by default -- no manual annotations needed. Opt-in and recommended for apps, scripts, and executable targets.

## @concurrent for Background Work

When you need actual parallelism, explicitly offload with `@concurrent`:

```swift
nonisolated final class PhotoProcessor {
    private var cachedStickers: [String: Sticker] = [:]

    func extractSticker(data: Data, with id: String) async -> Sticker {
        if let sticker = cachedStickers[id] { return sticker }
        let sticker = await Self.extractSubject(from: data)
        cachedStickers[id] = sticker
        return sticker
    }

    @concurrent
    static func extractSubject(from data: Data) async -> Sticker { /* ... */ }
}
```

To use `@concurrent`: mark the type as `nonisolated`, add `@concurrent` to the function, add `async` if needed, add `await` at call sites.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single-threaded by default | Most natural code is data-race free |
| Async stays on calling actor | Eliminates implicit offloading |
| Isolated conformances | MainActor types conform to protocols without unsafe workarounds |
| `@concurrent` explicit opt-in | Background execution is deliberate, not accidental |
| MainActor default inference | Reduces boilerplate annotations for app targets |

## Migration Steps

1. Enable in Xcode: Swift Compiler > Concurrency section
2. Enable in SPM: Use `SwiftSettings` API in package manifest
3. Use migration tooling: Automatic code changes via swift.org/migration
4. Start with MainActor defaults for app targets
5. Add `@concurrent` where needed after profiling
6. Test thoroughly: Data-race issues become compile-time errors

## Swift Concurrency Best Practices

- Start on MainActor -- write single-threaded code first, optimize later
- Use `@concurrent` only for CPU-intensive work (image processing, compression)
- Enable MainActor inference mode for single-threaded app targets
- Profile before offloading -- use Instruments to find actual bottlenecks
- Protect globals with MainActor
- Use isolated conformances instead of `nonisolated` workarounds
- Migrate incrementally -- enable features one at a time

## Swift Concurrency Anti-Patterns

- Applying `@concurrent` to every async function
- Using `nonisolated` to suppress compiler errors without understanding isolation
- Keeping legacy `DispatchQueue` patterns when actors provide the same safety
- Fighting the compiler -- data race reports indicate real concurrency issues
- Assuming all async code runs in the background (Swift 6.2 default: stays on calling actor)

---

# Part 4: Swift Actors for Thread-Safe Persistence

Patterns for building thread-safe data persistence layers using Swift actors, combining in-memory caching with file-backed storage.

## Actor-Based Repository

```swift
public actor LocalRepository<T: Codable & Identifiable> where T.ID == String {
    private var cache: [String: T] = [:]
    private let fileURL: URL

    public init(directory: URL = .documentsDirectory, filename: String = "data.json") {
        self.fileURL = directory.appendingPathComponent(filename)
        self.cache = Self.loadSynchronously(from: fileURL)
    }

    public func save(_ item: T) throws {
        cache[item.id] = item
        try persistToFile()
    }

    public func delete(_ id: String) throws {
        cache[id] = nil
        try persistToFile()
    }

    public func find(by id: String) -> T? { cache[id] }
    public func loadAll() -> [T] { Array(cache.values) }

    private func persistToFile() throws {
        let data = try JSONEncoder().encode(Array(cache.values))
        try data.write(to: fileURL, options: .atomic)
    }

    private static func loadSynchronously(from url: URL) -> [String: T] {
        guard let data = try? Data(contentsOf: url),
              let items = try? JSONDecoder().decode([T].self, from: data) else { return [:] }
        return Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
    }
}
```

### Usage with @Observable ViewModel

```swift
@Observable
final class QuestionListViewModel {
    private(set) var questions: [Question] = []
    private let repository: LocalRepository<Question>

    init(repository: LocalRepository<Question> = LocalRepository()) {
        self.repository = repository
    }

    func load() async {
        questions = await repository.loadAll()
    }

    func add(_ question: Question) async throws {
        try await repository.save(question)
        questions = await repository.loadAll()
    }
}
```

## Actor Persistence Design Decisions

| Decision | Rationale |
|----------|-----------|
| Actor (not class + lock) | Compiler-enforced thread safety |
| In-memory cache + file persistence | Fast reads, durable writes |
| Synchronous init loading | Avoids async initialization complexity |
| Dictionary keyed by ID | O(1) lookups |
| Generic over `Codable & Identifiable` | Reusable across any model type |
| Atomic file writes (`.atomic`) | Prevents partial writes on crash |

## Actor Persistence Best Practices

- Use `Sendable` types for all data crossing actor boundaries
- Keep the actor's public API minimal -- only domain operations
- Use `.atomic` writes to prevent data corruption
- Load synchronously in `init` -- async initializers add complexity
- Combine with `@Observable` ViewModels for reactive UI

## Actor Persistence Anti-Patterns

- Using `DispatchQueue` or `NSLock` instead of actors for new Swift code
- Exposing the internal cache dictionary to external callers
- Forgetting that all actor method calls are `await`
- Using `nonisolated` to bypass actor isolation

---

# Part 5: Swift Protocol-Based Dependency Injection for Testing

Patterns for making Swift code testable by abstracting external dependencies behind small, focused protocols.

## Define Small, Focused Protocols

```swift
public protocol FileSystemProviding: Sendable {
    func containerURL(for purpose: Purpose) -> URL?
}

public protocol FileAccessorProviding: Sendable {
    func read(from url: URL) throws -> Data
    func write(_ data: Data, to url: URL) throws
    func fileExists(at url: URL) -> Bool
}

public protocol BookmarkStorageProviding: Sendable {
    func saveBookmark(_ data: Data, for key: String) throws
    func loadBookmark(for key: String) throws -> Data?
}
```

## Production Implementations

```swift
public struct DefaultFileAccessor: FileAccessorProviding {
    public init() {}
    public func read(from url: URL) throws -> Data { try Data(contentsOf: url) }
    public func write(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: .atomic)
    }
    public func fileExists(at url: URL) -> Bool {
        FileManager.default.fileExists(atPath: url.path)
    }
}
```

## Mock Implementations

```swift
public final class MockFileAccessor: FileAccessorProviding, @unchecked Sendable {
    public var files: [URL: Data] = [:]
    public var readError: Error?
    public var writeError: Error?

    public init() {}

    public func read(from url: URL) throws -> Data {
        if let error = readError { throw error }
        guard let data = files[url] else { throw CocoaError(.fileReadNoSuchFile) }
        return data
    }
    public func write(_ data: Data, to url: URL) throws {
        if let error = writeError { throw error }
        files[url] = data
    }
    public func fileExists(at url: URL) -> Bool { files[url] != nil }
}
```

## Inject Dependencies with Default Parameters

```swift
public actor SyncManager {
    private let fileSystem: FileSystemProviding
    private let fileAccessor: FileAccessorProviding

    public init(
        fileSystem: FileSystemProviding = DefaultFileSystemProvider(),
        fileAccessor: FileAccessorProviding = DefaultFileAccessor()
    ) {
        self.fileSystem = fileSystem
        self.fileAccessor = fileAccessor
    }

    public func sync() async throws {
        guard let containerURL = fileSystem.containerURL(for: .sync) else {
            throw SyncError.containerNotAvailable
        }
        let data = try fileAccessor.read(
            from: containerURL.appendingPathComponent("data.json")
        )
        // Process data...
    }
}
```

## Testing with Swift Testing

```swift
import Testing

@Test("Sync manager handles missing container")
func testMissingContainer() async {
    let mockFileSystem = MockFileSystemProvider(containerURL: nil)
    let manager = SyncManager(fileSystem: mockFileSystem)
    await #expect(throws: SyncError.containerNotAvailable) {
        try await manager.sync()
    }
}

@Test("Sync manager reads data correctly")
func testReadData() async throws {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.files[testURL] = testData
    let manager = SyncManager(fileAccessor: mockFileAccessor)
    let result = try await manager.loadData()
    #expect(result == expectedData)
}

@Test("Sync manager handles read errors gracefully")
func testReadError() async {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.readError = CocoaError(.fileReadCorruptFile)
    let manager = SyncManager(fileAccessor: mockFileAccessor)
    await #expect(throws: SyncError.self) {
        try await manager.sync()
    }
}
```

## Protocol DI Best Practices

- **Single Responsibility**: Each protocol handles one concern
- **Sendable conformance**: Required when protocols are used across actor boundaries
- **Default parameters**: Production code uses real implementations by default
- **Error simulation**: Design mocks with configurable error properties
- **Only mock boundaries**: Mock external dependencies, not internal types

## Protocol DI Anti-Patterns

- Creating a single large protocol for all external access
- Mocking internal types with no external dependencies
- Using `#if DEBUG` conditionals instead of proper DI
- Forgetting `Sendable` conformance with actors
- Over-engineering: types without external dependencies don't need protocols
