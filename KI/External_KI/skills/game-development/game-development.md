---
category: game_development
anchor: game-development
lastUpdated: 2026-03-21
confidence: 0.72
merged_from:
  - { name: theone-cocos-standards, confidence: 0.72, origin: The1Studio/theone-training-skills, date: 2026-03-21 }
  - { name: game-engine, confidence: 0.40, origin: github/awesome-copilot, date: 2026-03-21 }
---

# Game Development

Comprehensive game development knowledge covering universal fundamentals and engine-specific standards. Designed as an extensible anchor — engine-specific sections (Cocos Creator, Unity, Godot, etc.) are added incrementally.

## When to Use This Anchor

- Building games with any engine (Cocos Creator, Unity, Godot, Web-based)
- Implementing game loops, physics, collision detection, or rendering
- Writing or reviewing game engine TypeScript/C#/GDScript code
- Optimizing game performance (DrawCalls, memory, bundle size)
- Designing game architecture (ECS, component systems, event patterns)
- Working with game controls (keyboard, mouse, touch, gamepad)
- Publishing and distributing games

---

# Part 1: Universal Game Development Fundamentals

<!-- incremental: game-engine (github/awesome-copilot), 2026-03-21 -->

## Game Loop

Every game engine revolves around the game loop — a continuous cycle of:

1. **Process Input** — Read keyboard, mouse, touch, or gamepad input
2. **Update State** — Update game object positions, physics, AI, and logic
3. **Render** — Draw the current game state to the screen

**Delta Time**: Always use delta time in update calculations instead of fixed values, to ensure consistent behavior across different frame rates.

## Rendering Techniques

| Technology | Best For | Notes |
|-----------|----------|-------|
| **Canvas 2D** | 2D games, sprite-based rendering, tilemaps | Simplest API |
| **WebGL** | Hardware-accelerated 3D and advanced 2D | More complex, higher performance |
| **SVG** | Vector-based graphics, UI elements | Scalable, DOM-based |
| **CSS** | DOM-based game elements, transitions | Limited for complex games |
| **Native GPU** (engine-specific) | Cocos/Unity/Godot built-in renderers | Best performance per engine |

## Physics and Collision Detection

### 2D Collision Detection
- **AABB** (Axis-Aligned Bounding Box) — Fast rectangular overlap test
- **Circle collision** — Distance-based, efficient for round objects
- **SAT** (Separating Axis Theorem) — Handles convex polygons

### 3D Collision Detection
- **Bounding box** — 3D AABB for broad-phase
- **Bounding sphere** — Distance check in 3D
- **Raycasting** — Line-based intersection for precise detection

### Core Physics
- **Velocity and Acceleration** — Basic Newtonian physics for movement
- **Gravity** — Constant downward acceleration for platformers
- **Rigid body dynamics** — Mass, force, torque for realistic physics

## Control Mechanisms

| Input | API/Method | Use Case |
|-------|-----------|----------|
| **Keyboard** | KeyboardEvent / engine input system | WASD, arrow keys, custom bindings |
| **Mouse** | MouseEvent / pointer lock | Click, move, FPS-style controls |
| **Touch** | TouchEvent / engine touch system | Mobile touch, virtual joysticks |
| **Gamepad** | Gamepad API / engine gamepad support | Controller support |

## Audio

- **Web Audio API** — Programmatic sound generation and spatial audio
- **HTML5 Audio** — Simple playback for music and sound effects
- **Engine audio systems** — Cocos AudioSource, Unity AudioSource, etc.

## Game Architecture Patterns

### Entity-Component-System (ECS)

Widely adopted pattern favoring composition over inheritance:

- **Entity** — Unique identifier (often an integer ID) representing a game object
- **Component** — Plain data container attached to an entity (position, velocity, sprite, health)
- **System** — Processes all entities with a specific set of components (contains logic)

### Engine Module Structure

```
engine/
  core/           -- Memory, logging, math, utilities
  platform/       -- OS abstraction, windowing, file I/O
  renderer/       -- Graphics API, shaders, materials
  physics/        -- Collision, rigid body dynamics
  audio/          -- Sound playback, mixing, spatial audio
  input/          -- Keyboard, mouse, gamepad, touch
  scripting/      -- Scripting language bindings
  scene/          -- Scene graph, entity management
  resources/      -- Asset loading, caching, streaming
```

### Core Design Principles

- **Modularity** — Independent modules with clean APIs, swappable implementations
- **Separation of Concerns** — Renderer doesn't know game mechanics; physics doesn't know rendering
- **Data-Driven Design** — Behavior controlled by data files (JSON/XML), not hard-coded logic
- **Minimize Dependencies** — Clean hierarchy, no circular dependencies

## Game Publishing Workflow

1. Optimize assets (compress images, minify code)
2. Test across target platforms and devices
3. Choose distribution platform (web, app stores, game portals)
4. Implement monetization if needed
5. Promote through game communities and social media

## Troubleshooting (Universal)

| Issue | Solution |
|-------|----------|
| Game runs at different speeds | Use delta time in update calculations |
| Collision detection inconsistent | Use continuous collision detection or reduce time steps |
| Audio does not play | Browsers require user interaction before playing audio |
| Performance is poor | Profile with dev tools, reduce draw calls, use object pooling |
| Touch controls unresponsive | Prevent default touch behavior, handle separately from mouse |

---

# Part 2: Engine-Specific Standards

---

## Cocos Creator 3.x (TypeScript)

> Cocos Creator 3.x development standards for playable ads and general game development.
> TypeScript 4.1+ compatible.

### Code Quality Rules (Mandatory)

**Always enforce these before writing any code:**

1. **TypeScript strict mode** — `"strict": true` in tsconfig.json
2. **ESLint configuration** — `@typescript-eslint` rules enabled
3. **Access modifiers** — `public`/`private`/`protected` on all members
4. **Throw exceptions** — Never silent failures or undefined returns
5. **console.log for dev only** — Remove or wrap in `CC_DEBUG` for production
6. **readonly for immutable fields** — Mark fields that aren't reassigned
7. **const for constants** — Constants should be `const`, not `let`
8. **No inline comments** — Use descriptive names; code should be self-explanatory
9. **Proper null handling** — Use optional chaining (`?.`) and nullish coalescing (`??`)
10. **Type safety** — Avoid `any` type, use proper types and interfaces

### Modern TypeScript Patterns

```typescript
// Array methods instead of loops
const activeEnemies = allEnemies.filter(e => e.isActive);
const enemyPositions = activeEnemies.map(e => e.node.position);

// Optional chaining and nullish coalescing
const playerName = player?.name ?? 'Unknown';

// Destructuring
const { x, y } = this.node.position;

// Type guards
function isPlayer(node: Node): node is PlayerNode {
    return node.getComponent(PlayerController) !== null;
}
```

### Component System & Lifecycle

**Entity-Component (EC) System:**
- Components extend `Component` class
- Use `@ccclass` and `@property` decorators
- Lifecycle order: `onLoad` -> `start` -> `onEnable` -> `update` -> `lateUpdate` -> `onDisable` -> `onDestroy`

**Lifecycle Rules:**
- `onLoad()` — Component initialization, one-time setup
- `start()` — After all components loaded, can reference other components
- `onEnable()` — Register event listeners (can be called multiple times)
- `update(dt)` — Every frame (use sparingly for playables)
- `lateUpdate(dt)` — After all `update()` calls
- `onDisable()` — Unregister event listeners
- `onDestroy()` — Cleanup, remove listeners, release resources

**Universal Rules:**
- Initialize in `onLoad()`, reference other components in `start()`
- Register events in `onEnable()`, unregister in `onDisable()`
- Always cleanup listeners in `onDestroy()`
- Avoid heavy logic in `update()` (performance critical)
- Use `readonly` for `@property` fields that shouldn't be reassigned
- Throw exceptions for missing required references

### Component Pattern Example

```typescript
import { _decorator, Component, Node, EventTouch, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TouchHandler')
export class TouchHandler extends Component {
    @property(Node)
    private readonly targetNode: Node | null = null;

    private readonly tempVec3: Vec3 = new Vec3();

    protected onLoad(): void {
        if (!this.targetNode) {
            throw new Error('TouchHandler: targetNode is required');
        }
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    private onTouchStart(event: EventTouch): void {
        // Handle touch
    }

    private onTouchMove(event: EventTouch): void {
        this.targetNode!.getPosition(this.tempVec3);
        this.tempVec3.y += 10;
        this.targetNode!.setPosition(this.tempVec3);
    }
}
```

### EventDispatcher Pattern

```typescript
import { _decorator, Component, EventTarget } from 'cc';
const { ccclass } = _decorator;

export enum GameEvent {
    SCORE_CHANGED = 'score_changed',
    LEVEL_COMPLETE = 'level_complete',
    PLAYER_DIED = 'player_died',
}

export interface ScoreChangedEvent {
    oldScore: number;
    newScore: number;
}

@ccclass('EventManager')
export class EventManager extends Component {
    private static instance: EventManager | null = null;
    private readonly eventTarget: EventTarget = new EventTarget();

    protected onLoad(): void {
        if (EventManager.instance) {
            throw new Error('EventManager: instance already exists');
        }
        EventManager.instance = this;
    }

    public static emit(event: GameEvent, data?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.emit(event, data);
    }

    public static on(event: GameEvent, callback: Function, target?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.on(event, callback, target);
    }

    public static off(event: GameEvent, callback: Function, target?: any): void {
        if (!EventManager.instance) {
            throw new Error('EventManager: instance not initialized');
        }
        EventManager.instance.eventTarget.off(event, callback, target);
    }
}
```

### Playable Ads Performance Optimization

**DrawCall Targets:** < 10 DrawCalls for playable ads

```typescript
import { _decorator, Component, Node, SpriteAtlas } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('OptimizedSpriteManager')
export class OptimizedSpriteManager extends Component {
    @property(SpriteAtlas)
    private readonly characterAtlas: SpriteAtlas | null = null;

    private readonly tempNodes: Node[] = [];
    private frameCount: number = 0;

    protected onLoad(): void {
        if (!this.characterAtlas) {
            throw new Error('OptimizedSpriteManager: characterAtlas is required');
        }
        this.prewarmSpriteFrames();
    }

    private prewarmSpriteFrames(): void {
        const spriteFrame = this.characterAtlas!.getSpriteFrame('character_idle');
        if (!spriteFrame) {
            throw new Error('Sprite frame not found in atlas');
        }
    }

    protected update(dt: number): void {
        this.frameCount++;
        if (this.frameCount % 10 === 0) {
            this.updateExpensiveOperation();
        }
    }

    private updateExpensiveOperation(): void {
        this.tempNodes.length = 0;
    }
}
```

**Performance Checklist:**
- Sprite atlas for DrawCall batching (auto-atlas enabled)
- GPU skinning for skeletal animations
- Zero allocations in `update()` loop — preallocate and reuse objects
- Expensive operations throttled (not every frame)
- Object pooling for frequently created objects
- Texture compression enabled
- Bundle size < 5MB target
- DrawCall count < 10 target

### Code Review Severity Levels

#### Critical (Must Fix)
- TypeScript strict mode disabled
- Silent error handling (must throw exceptions)
- `console.log` in production code
- Missing access modifiers
- Using `any` type without justification
- Event listeners not cleaned up (memory leak)
- Missing required reference validation
- Allocations in `update()` loop
- No sprite atlas for multiple sprites
- Bundle size > 5MB

#### Important (Should Fix)
- Missing `readonly` on `@property` fields
- Manual loops instead of array methods
- Missing optional chaining / nullish coalescing
- Heavy logic in `update()` without throttling
- No object pooling for frequent allocations
- Texture compression not enabled
- DrawCall count > 10

#### Nice to Have
- Arrow functions for callbacks
- Destructuring for cleaner code
- Type guards for type safety
- Interface for better typing

### Common Mistakes

| Don't | Do |
|-------|-----|
| Ignore TypeScript strict mode | Enable `"strict": true` |
| Silent error handling | Throw exceptions |
| Leave `console.log` in production | Remove or wrap in `CC_DEBUG` |
| Skip access modifiers | Use `public`/`private`/`protected` |
| Use `any` type | Define proper types and interfaces |
| Add inline comments | Use descriptive names |
| Skip event cleanup | Always unregister in `onDisable`/`onDestroy` |
| Allocate in `update()` | Preallocate and reuse objects |
| Forget sprite atlas | Use atlas for DrawCall batching |
| Heavy logic in `update()` | Throttle expensive operations |
| Skip null checks | Validate required references in `onLoad` |
| Manual loops over arrays | Use `map`/`filter`/`reduce` |
| Ignore bundle size | Monitor and optimize (< 5MB target) |

---

## Future Engine Sections

> The following sections will be added as skills are ingested:
> - **Unity** (C#) — VContainer/SignalBus, MonoBehaviour lifecycle, ECS, performance
> - **Godot** (GDScript) — Signal system, scene tree, GDScript patterns
> - **Unreal Engine** (C++/Blueprint) — Actor/Component, Gameplay Framework
> - **Web Games** (JavaScript) — Phaser, Three.js, Babylon.js, A-Frame
