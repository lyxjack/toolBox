---
name: frontend
category: frontend
type: anchor
confidence: 0.70
anchor_base: ui-ux-pro-max
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - { name: ui-ux-pro-max, confidence: 0.70, origin: independent }
  - { name: coding-standards, confidence: 0.63, origin: ECC }
  - { name: frontend-patterns, confidence: 0.52, origin: ECC }
  - { name: liquid-glass-design, confidence: 0.52, origin: ECC }
  - { name: vercel-composition-patterns, confidence: 0.46, origin: Vercel }
  - { name: canvas-design, confidence: 0.39, origin: independent }
  - { name: frontend-design, confidence: 0.16, origin: independent }
iron_law: >
  IMMUTABILITY CONSTRAINT — This anchor file is the single source of truth
  for the frontend category. All original skill files have been merged and
  deleted. Do NOT recreate individual skill files. Modifications to this
  anchor must preserve the merged_from provenance and follow Iron Law §11
  (Skill File Governance).
---

# Frontend — Anchor Skill

Comprehensive frontend knowledge covering UI/UX design systems, React/Next.js component patterns, coding standards, visual design philosophy, Apple Liquid Glass, and composition architecture. Synthesized from 7 skills across 4 origins.

## When to Activate

- Designing new UI components, pages, or design systems
- Building React/Next.js applications with TypeScript
- Choosing color palettes, typography, and visual styles
- Reviewing code for quality, accessibility, or UX issues
- Implementing animations, transitions, or Liquid Glass effects
- Optimizing frontend performance (memoization, virtualization, code splitting)
- Creating visual art, posters, or canvas-based designs
- Working with forms, validation, state management, or data fetching

---

## 1. Design System Generation

### Priority-Based Rule Categories

| Priority | Category | Impact | Domain |
|----------|----------|--------|--------|
| 1 | Accessibility | CRITICAL | `ux` |
| 2 | Touch & Interaction | CRITICAL | `ux` |
| 3 | Performance | HIGH | `ux` |
| 4 | Layout & Responsive | HIGH | `ux` |
| 5 | Typography & Color | MEDIUM | `typography`, `color` |
| 6 | Animation | MEDIUM | `ux` |
| 7 | Style Selection | MEDIUM | `style`, `product` |
| 8 | Charts & Data | LOW | `chart` |

### Design System Workflow

**Step 1 — Analyze Requirements**: Extract product type (SaaS, e-commerce, portfolio, dashboard), style keywords (minimal, playful, professional), industry (healthcare, fintech, gaming), and stack (React, Vue, Next.js, or default `html-tailwind`).

**Step 2 — Generate Design System** (REQUIRED):

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

**Step 2b — Persist with Master + Overrides Pattern**:

```bash
# Global master
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
# Page-specific override
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

Creates `design-system/MASTER.md` (source of truth) and `design-system/pages/` (overrides). Page files override Master; if no page file exists, use Master exclusively.

**Step 3 — Supplement with Domain Searches**:

| Need | Domain | Example |
|------|--------|---------|
| More style options | `style` | `--domain style "glassmorphism dark"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Alternative fonts | `typography` | `--domain typography "elegant luxury"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |

**Step 4 — Stack Guidelines**:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`.

---

## 2. Frontend Aesthetics & Design Thinking

### Design Philosophy

Before coding, commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme — brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian.
- **Differentiation**: What makes this UNFORGETTABLE?

**CRITICAL**: Choose a clear conceptual direction and execute with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

### Typography

- Choose distinctive, characterful fonts — NEVER generic (Inter, Roboto, Arial, system fonts).
- Pair a distinctive display font with a refined body font.
- Line height: 1.5-1.75 for body text. Line length: 65-75 characters max.
- Minimum 16px body text on mobile.

### Color & Theme

- Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- Minimum 4.5:1 contrast ratio for normal text.
- NEVER use cliched color schemes (purple gradients on white backgrounds).
- Vary between light and dark themes across projects.

### Spatial Composition

- Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements.
- Generous negative space OR controlled density — both work with intention.
- Floating navbar: `top-4 left-4 right-4` spacing, not stuck to edges.
- Consistent max-width (`max-w-6xl` or `max-w-7xl`).

### Backgrounds & Visual Details

- Create atmosphere and depth — never default to solid colors.
- Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

### Light/Dark Mode Contrast

| Context | Do | Don't |
|---------|----|----- |
| Glass card (light) | `bg-white/80` or higher | `bg-white/10` (too transparent) |
| Text (light) | `#0F172A` (slate-900) | `#94A3B8` (slate-400) |
| Muted text (light) | `#475569` (slate-600) min | gray-400 or lighter |
| Borders | `border-gray-200` in light | `border-white/10` (invisible) |

---

## 3. Component Patterns

### Composition Over Inheritance

```typescript
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>
}
```

### Compound Components with Context

```typescript
interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ children, defaultTab }: {
  children: React.ReactNode
  defaultTab: string
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function Tab({ id, children }: { id: string, children: React.ReactNode }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')
  return (
    <button
      className={context.activeTab === id ? 'active' : ''}
      onClick={() => context.setActiveTab(id)}
    >
      {children}
    </button>
  )
}
```

### Render Props for Data Loading

```typescript
interface DataLoaderProps<T> {
  url: string
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode
}

export function DataLoader<T>({ url, children }: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  return <>{children(data, loading, error)}</>
}
```

### Architecture Rules (Vercel Composition)

- **Avoid boolean props** — use composition instead of `showX`/`hideY` flags.
- **Explicit variants** — create `CardCompact` / `CardFull` instead of `<Card compact={true}>`.
- **Children over render props** — prefer `children` for composition over `renderX` callbacks.
- **Decouple state** — Provider is the only place that knows how state is managed.
- **Context interface** — define generic interface with `state`, `actions`, `meta` for dependency injection.
- **React 19+**: No `forwardRef` needed; use `use()` instead of `useContext()`.

### Error Boundary

```typescript
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

---

## 4. Custom Hooks

### useToggle

```typescript
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle]
}
```

### useDebounce

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

### useQuery (Async Data Fetching)

```typescript
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { onSuccess?: (data: T) => void; onError?: (error: Error) => void; enabled?: boolean }
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      options?.onSuccess?.(result)
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, options])

  useEffect(() => {
    if (options?.enabled !== false) refetch()
  }, [key, refetch, options?.enabled])

  return { data, error, loading, refetch }
}
```

---

## 5. State Management

### Context + Reducer Pattern

```typescript
interface State {
  items: Item[]
  selected: Item | null
  loading: boolean
}

type Action =
  | { type: 'SET_ITEMS'; payload: Item[] }
  | { type: 'SELECT'; payload: Item }
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ITEMS': return { ...state, items: action.payload }
    case 'SELECT': return { ...state, selected: action.payload }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    default: return state
  }
}

const StoreContext = createContext<{
  state: State; dispatch: Dispatch<Action>
} | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [], selected: null, loading: false
  })
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}
```

### State Update Best Practices

```typescript
// Functional update for state based on previous value
setCount(prev => prev + 1)  // CORRECT
setCount(count + 1)          // BAD — can be stale in async

// Immutability — always spread
const updated = { ...user, name: 'New Name' }   // CORRECT
user.name = 'New Name'                           // BAD — direct mutation
```

---

## 6. Performance Optimization

### Memoization

```typescript
const sortedItems = useMemo(() =>
  items.sort((a, b) => b.volume - a.volume), [items])

const handleSearch = useCallback((query: string) =>
  setSearchQuery(query), [])

export const ItemCard = React.memo<ItemCardProps>(({ item }) => (
  <div className="item-card"><h3>{item.name}</h3></div>
))
```

### Code Splitting & Lazy Loading

```typescript
const HeavyChart = lazy(() => import('./HeavyChart'))

export function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  )
}
```

### Virtualization for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(row => (
          <div key={row.index} style={{
            position: 'absolute', top: 0, left: 0, width: '100%',
            height: `${row.size}px`,
            transform: `translateY(${row.start}px)`
          }}>
            <ItemCard item={items[row.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Image & Asset Performance

- Use WebP format, `srcset`, and lazy loading.
- Check `prefers-reduced-motion` before animating.
- Reserve space for async content to prevent layout shift.

---

## 7. Animation & Motion

### Framer Motion

```typescript
import { motion, AnimatePresence } from 'framer-motion'

export function AnimatedList({ items }: { items: Item[] }) {
  return (
    <AnimatePresence>
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <ItemCard item={item} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

### Animation Best Practices

- Duration: 150-300ms for micro-interactions.
- Use `transform`/`opacity` for GPU-accelerated animations — never animate `width`/`height`.
- Skeleton screens or spinners for loading states.
- Staggered reveals via `animation-delay` for page load impact.
- Respect `prefers-reduced-motion`.

---

## 8. Accessibility

### Keyboard Navigation

```typescript
export function Dropdown({ options, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActiveIndex(i => Math.min(i + 1, options.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); break
      case 'Enter': e.preventDefault(); onSelect(options[activeIndex]); setIsOpen(false); break
      case 'Escape': setIsOpen(false); break
    }
  }

  return (
    <div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" onKeyDown={handleKeyDown}>
      {/* Dropdown implementation */}
    </div>
  )
}
```

### Focus Management

```typescript
export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      {children}
    </div>
  ) : null
}
```

### Accessibility Checklist

- Color contrast: minimum 4.5:1 for normal text.
- Visible focus rings on all interactive elements.
- Descriptive `alt` text for meaningful images.
- `aria-label` for icon-only buttons.
- Tab order matches visual order.
- `<label>` with `for` attribute on all form inputs.
- Touch targets: minimum 44x44px.
- Color is never the only indicator.

---

## 9. Coding Standards

### Naming Conventions

```typescript
// Variables: descriptive camelCase
const marketSearchQuery = 'election'
const isUserAuthenticated = true

// Functions: verb-noun pattern
async function fetchMarketData(marketId: string) { }
function calculateSimilarity(a: number[], b: number[]) { }
function isValidEmail(email: string): boolean { }

// Files
// components/Button.tsx    — PascalCase for components
// hooks/useAuth.ts         — camelCase with 'use' prefix
// lib/formatDate.ts        — camelCase for utilities
// types/market.types.ts    — camelCase with .types suffix
```

### Error Handling

- async fetch 必须 try/catch 包裹，检查 `response.ok`，非 2xx 抛 `HTTP ${status}` 错误
- catch 中先 `console.error` 保留原始上下文，再抛规整化业务错误（不吞错、不裸透传）
- 完整异步错误处理范式与范例代码见 [[PAT-005__async-error-handling|PAT-005]]

### Async Best Practices

```typescript
// Parallel execution when possible
const [users, markets, stats] = await Promise.all([
  fetchUsers(), fetchMarkets(), fetchStats()
])
```

### Type Safety

```typescript
interface Market {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
  created_at: Date
}

// NEVER use 'any' — define proper interfaces
```

### Input Validation with Zod

```typescript
import { z } from 'zod'

const CreateMarketSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  endDate: z.string().datetime(),
  categories: z.array(z.string()).min(1)
})
```

### Code Smell Detection

- **Long functions**: Split functions > 50 lines into smaller units.
- **Deep nesting**: Use early returns instead of 5+ levels of nesting.
- **Magic numbers**: Extract to named constants (`MAX_RETRIES = 3`).
- **Comments**: Explain WHY, not WHAT. Self-documenting code preferred.

### Testing (AAA Pattern)

```typescript
test('returns empty array when no markets match query', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]
  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)
  // Assert
  expect(similarity).toBe(0)
})
```

---

## 10. Apple Liquid Glass (iOS 26+)

本节（Swift/UIKit 内容）已整体移至 `mobile-native.md` Part 6 (Apple Liquid Glass, iOS 26+)，见彼处。

---

## 11. Canvas & Visual Art Design

### Design Philosophy Creation

For static visual art (posters, PDF/PNG art pieces), follow a two-step process:

1. **Create a Visual Philosophy** (4-6 paragraphs): Name the movement (e.g., "Brutalist Joy", "Chromatic Silence"). Articulate how it manifests through space/form, color/material, scale/rhythm, composition/balance, visual hierarchy.

2. **Express on Canvas**: Use the philosophy to create museum-quality work. Treat text as a contextual visual element — always minimal. Use repeating patterns, perfect shapes, systematic visual language.

### Philosophy Archetypes

| Movement | Visual Expression |
|----------|------------------|
| Concrete Poetry | Massive color blocks, sculptural typography, Brutalist spatial divisions |
| Chromatic Language | Geometric precision, color zones create meaning, Josef Albers meets data viz |
| Analog Meditation | Paper grain, ink bleeds, vast negative space, Japanese photobook aesthetic |
| Organic Systems | Rounded forms, organic arrangements, color from nature through architecture |
| Geometric Silence | Grid-based precision, bold photography, Swiss formalism meets Brutalist honesty |

### Canvas Principles

- The topic is a subtle, niche reference embedded within the art — not literal, always sophisticated.
- Sophistication is non-negotiable regardless of subject matter.
- Use different fonts from the `./canvas-fonts` directory. Make typography part of the art itself.
- Nothing falls off the page. Nothing overlaps unintentionally. Proper margins always.
- Refinement pass: rather than adding more, make what exists more cohesive.

---

## 12. Form Handling

```typescript
interface FormData { name: string; description: string; endDate: string }
interface FormErrors { name?: string; description?: string; endDate?: string }

export function CreateForm() {
  const [formData, setFormData] = useState<FormData>({ name: '', description: '', endDate: '' })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    else if (formData.name.length > 200) newErrors.name = 'Name must be under 200 characters'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await createItem(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Name" />
      {errors.name && <span className="error">{errors.name}</span>}
      <button type="submit">Create</button>
    </form>
  )
}
```

---

## 13. API Design Standards

API 响应信封唯一权威见 `backend.md` §1 (API Design)；前端按该契约消费（`data`/`meta`/`links`/`error` 结构，REST 路由、状态码、分页、过滤规范同见彼处）。

---

## 14. Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| Icons | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis as UI icons |
| Hover states | Color/opacity transitions | Scale transforms that shift layout |
| Brand logos | Official SVG from Simple Icons | Guess or use incorrect paths |
| Icon sizing | Fixed viewBox (24x24) with w-6 h-6 | Mix different sizes randomly |
| Cursor | `cursor-pointer` on all clickable elements | Default cursor on interactive elements |
| Transitions | `transition-colors duration-200` | Instant changes or >500ms |

---

## 15. Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages (route groups)
├── components/
│   ├── ui/               # Generic UI components
│   ├── forms/            # Form components
│   └── layouts/          # Layout components
├── hooks/                # Custom React hooks
├── lib/
│   ├── api/             # API clients
│   ├── utils/           # Helper functions
│   └── constants/       # Constants
├── types/                # TypeScript types
└── styles/              # Global styles
```

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (use SVG)
- [ ] All icons from consistent set (Heroicons/Lucide)
- [ ] Hover states don't cause layout shift
- [ ] Theme colors used directly (not `var()` wrapper)

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Transitions smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Light/Dark Mode
- [ ] Text has sufficient contrast (4.5:1 min)
- [ ] Glass/transparent elements visible in both modes
- [ ] Borders visible in both modes

### Layout
- [ ] Floating elements have proper edge spacing
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets minimum 44x44px
