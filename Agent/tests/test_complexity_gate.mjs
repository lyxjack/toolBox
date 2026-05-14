/**
 * test_complexity_gate.mjs — Unit tests for PM workflow Step 4.5b
 *
 * 测试对象：`PM/pm_workflow.md` Step 4.5b 的 10 项否决式 disqualifier 清单 +
 * 决策矩阵。本文件是 prose 规范的可执行镜像（fixture + evaluator）。
 *
 * Run: node --test Agent/tests/test_complexity_gate.mjs
 *
 * 设计取舍：Q1/Q3/Q4/Q5/Q10 走客观函数判定；Q2/Q6/Q7/Q8/Q9 用 fixture
 * 预声明（因为依赖项目特定文件系统 / Error_Book 索引 / 语义判断）。
 * 未来若把这些 Q 也机械化（grep ERR_Book/index.json 等），再升级。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ──────────────────────────────────────────────────────────
// Evaluator — encodes 4.5b prose rules
// ──────────────────────────────────────────────────────────

const KEYWORD_PATTERNS = [
  /新功能/, /新接口/, /重构/, /迁移/, /整合/, /改造/, /schema/i, /数据库/, /\bAPI\b/i,
  /新增/,  // pulled in from conv 回放（"新增按钮 / 新增方法" 类）
];

const CRITICAL_DIR_PATTERNS = [
  /^assets\/script\/core\//,
  /\/const\//,
  /^assets\/script\/wx\//,
  /^server\/src\//,
  /playerSchema/,
  /storageHelper/,
  /^extensions\/cocos-mcp-server\/source\//,
];

function detectLayer(path) {
  if (path.startsWith('server/')) return 'backend';
  if (path.startsWith('data/')) return 'data';
  if (path.startsWith('assets/') || path.startsWith('extensions/')) return 'frontend';
  return 'tooling';
}

function evaluateComplexity(fixture) {
  const triggers = [];

  // Q1 文件数 > 2
  if (fixture.touchedFiles.length > 2) triggers.push('Q1');

  // Q2 import 入度 > 5 — fixture 预声明
  if (fixture.semanticHits?.highIndegree) triggers.push('Q2');

  // Q3 关键目录
  const inCriticalDir = fixture.touchedFiles.some(f =>
    CRITICAL_DIR_PATTERNS.some(re => re.test(f))
  );
  if (inCriticalDir) triggers.push('Q3');

  // Q4 跨层（≥ 2 个不同 layer）
  const layers = new Set(fixture.touchedFiles.map(detectLayer));
  layers.delete('tooling');  // tooling 不算跨业务层
  if (layers.size >= 2) triggers.push('Q4');

  // Q5 关键词
  if (KEYWORD_PATTERNS.some(re => re.test(fixture.userRequest))) triggers.push('Q5');

  // Q6 ERR Book critical — fixture 预声明
  if (fixture.semanticHits?.errBookCritical) triggers.push('Q6');

  // Q7 6 业务领域 — fixture 预声明（含金币/支付/登录/分享/排行榜/存档/体力）
  if (fixture.semanticHits?.businessDomain) triggers.push('Q7');

  // Q8 新 KI/skill — fixture 预声明
  if (fixture.semanticHits?.requiresNewKI) triggers.push('Q8');

  // Q9 storage key / schemaVersion — fixture 预声明 OR grep 请求
  if (fixture.semanticHits?.storageOrSchema ||
      /BombVer|BomVerr|schemaVersion|storage[._-]?key/i.test(fixture.userRequest)) {
    triggers.push('Q9');
  }

  // Q10 行数估算 > 30
  if (fixture.estimatedLineDelta > 30) triggers.push('Q10');

  // 决策矩阵
  const complexity = triggers.length > 0 ? 'standard' : 'micro';
  return { complexity, triggers };
}

// ──────────────────────────────────────────────────────────
// Fixtures — canonical cases
// ──────────────────────────────────────────────────────────

const FIXTURES = [
  // 1) 真 micro：改 1 个 prefab 的 1 个 fontSize
  {
    name: 'micro: 改 fontSize 30→28',
    userRequest: '把 confirmBtn 的字号改成 28',
    touchedFiles: ['assets/resources/prefab/ui/needBackToParentTip.prefab'],
    estimatedLineDelta: 3,
    semanticHits: {},
    expected: 'micro',
    expectedTriggers: [],
  },
  // 2) Q1 触发：3 文件
  {
    name: 'Q1: 改 3 文件',
    userRequest: '改三个 ui prefab 字号',
    touchedFiles: [
      'assets/resources/prefab/ui/a.prefab',
      'assets/resources/prefab/ui/b.prefab',
      'assets/resources/prefab/ui/c.prefab',
    ],
    estimatedLineDelta: 9,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q1'],
  },
  // 3) Q3 触发：core/ 目录
  {
    name: 'Q3: 改 core/app.ts',
    userRequest: '改 App.audio 的初始化时机',
    touchedFiles: ['assets/script/core/app.ts'],
    estimatedLineDelta: 5,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q3'],
  },
  // 4) Q4 触发：跨 frontend + backend（server/src/ 也命中 Q3）
  {
    name: 'Q4: 跨 frontend+backend (含 Q3)',
    userRequest: '改前端 puzzleSave 调 server 接口的 payload',
    touchedFiles: ['assets/script/game/api/puzzleSave.ts', 'server/src/routes/save.ts'],
    estimatedLineDelta: 20,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q3', 'Q4'],
  },
  // 5) Q5 触发：关键词 "重构"
  {
    name: 'Q5: 含关键词"重构"',
    userRequest: '把排行榜列表重构成虚拟滚动',
    touchedFiles: ['assets/script/game/ui/rankView.ts'],
    estimatedLineDelta: 15,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q5'],
  },
  // 6) Q6 触发：ERR Book critical (prefab JSON 序列化)
  {
    name: 'Q6: ERR Book critical 命中',
    userRequest: '改 prefab 文件结构',
    touchedFiles: ['assets/resources/prefab/ui/x.prefab'],
    estimatedLineDelta: 20,
    semanticHits: { errBookCritical: true },
    expected: 'standard',
    expectedTriggers: ['Q6'],
  },
  // 7) Q7 触发：金币业务
  {
    name: 'Q7: 金币业务',
    userRequest: '调金币商店购买道具的逻辑',
    touchedFiles: ['assets/script/game/ui/buyViewCmpt.ts'],
    estimatedLineDelta: 25,
    semanticHits: { businessDomain: true },
    expected: 'standard',
    expectedTriggers: ['Q7'],
  },
  // 8) Q8 触发：需新 KI
  {
    name: 'Q8: 需新 KI 切片',
    userRequest: '记录新的 Pattern 到 Internal_KI',
    touchedFiles: ['.claude/Internal_KI/new_pattern.md'],
    estimatedLineDelta: 20,
    semanticHits: { requiresNewKI: true },
    expected: 'standard',
    expectedTriggers: ['Q8'],
  },
  // 9) Q9 触发：storage key（项目特有 BombVer typo）
  {
    name: 'Q9: 改 BombVer storage key',
    userRequest: '在 storageHelper 加 BombVer 版本检查',
    touchedFiles: ['assets/script/utils/storageHelper.ts'],
    estimatedLineDelta: 10,
    semanticHits: {},  // 关键词在 request 里直接被 Q9 grep 命中（+Q3 因 storageHelper 在 critical 列表）
    expected: 'standard',
    expectedTriggers: ['Q3', 'Q9'],
  },
  // 10) Q10 触发：> 30 行
  {
    name: 'Q10: 行数 > 30',
    userRequest: '加个 utility 函数',
    touchedFiles: ['assets/script/utils/newHelper.ts'],
    estimatedLineDelta: 50,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q10'],
  },
  // 11) 多 Q 同时触发（含 Q3：server/src/ 在 critical dirs）
  {
    name: '多 Q: 跨层 + 关键词 + 行数 + 关键目录',
    userRequest: '重构存档接口同时改 schema',
    touchedFiles: ['assets/script/game/api/save.ts', 'server/src/routes/save.ts'],
    estimatedLineDelta: 80,
    semanticHits: { businessDomain: true },
    expected: 'standard',
    expectedTriggers: ['Q3', 'Q4', 'Q5', 'Q7', 'Q10'],
  },
  // 14) Q2 触发：高 import 入度（fixture 预声明）
  {
    name: 'Q2: 高 import 入度',
    userRequest: '调 BaseViewCmpt 的某个工具方法行为',
    touchedFiles: ['assets/script/components/baseViewCmpt.ts'],
    estimatedLineDelta: 5,
    semanticHits: { highIndegree: true },
    expected: 'standard',
    expectedTriggers: ['Q2'],
  },
  // 12) Conv 回放: 替换 dialoguebg + 删 Label
  {
    name: 'conv 回放: 替换 dialoguebg',
    userRequest: '替换 dialoguebg 删子节点',
    touchedFiles: [
      'assets/resources/prefab/ui/needBackToParentTip.prefab',
      'assets/res/ui/Sprite/needBackToParentBg.png',
    ],
    estimatedLineDelta: 30,  // 边界，但实测改了 175+/36- 大 diff
    semanticHits: { errBookCritical: true },
    expected: 'standard',
    expectedTriggers: ['Q6'],
  },
  // 13) Conv 回放: 加 homeBtn + onClick_homeBtn
  {
    name: 'conv 回放: 加 homeBtn',
    userRequest: '加一个新增按钮 homeBtn 返回主界面',
    touchedFiles: [
      'assets/resources/prefab/ui/needBackToParentTip.prefab',
      'assets/script/game/ui/needBackToParentTipCmpt.ts',
    ],
    estimatedLineDelta: 30,
    semanticHits: {},
    expected: 'standard',
    expectedTriggers: ['Q5'],  // "新增" 命中
  },
];

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

describe('Complexity Gate — 10 项 disqualifier 决策', () => {
  for (const fx of FIXTURES) {
    it(fx.name, () => {
      const { complexity, triggers } = evaluateComplexity(fx);
      assert.equal(
        complexity,
        fx.expected,
        `[${fx.name}] complexity 不匹配：期望 ${fx.expected}，实际 ${complexity}；触发 [${triggers.join(',')}]`
      );
      assert.deepEqual(
        new Set(triggers),
        new Set(fx.expectedTriggers),
        `[${fx.name}] 触发集不匹配：期望 [${fx.expectedTriggers.join(',')}]，实际 [${triggers.join(',')}]`
      );
    });
  }
});

describe('Complexity Gate — 反例验证（evaluator 不空过）', () => {
  it('故意错配应触发 assertion fail', () => {
    const wrong = { ...FIXTURES[0], expected: 'standard', expectedTriggers: ['Q1'] };
    const { complexity, triggers } = evaluateComplexity(wrong);
    // 反例确认：evaluator 仍报 micro，与 wrong.expected 不符，证明 evaluator 没空过
    assert.equal(complexity, 'micro');
    assert.notEqual(complexity, wrong.expected);
    assert.notDeepEqual(new Set(triggers), new Set(wrong.expectedTriggers));
  });
});

describe('Complexity Gate — 覆盖完整性', () => {
  it('Q1-Q10 每条都有 fixture 触发', () => {
    const allTriggered = new Set();
    for (const fx of FIXTURES) {
      for (const t of fx.expectedTriggers) allTriggered.add(t);
    }
    for (let i = 1; i <= 10; i++) {
      assert.ok(
        allTriggered.has(`Q${i}`),
        `Q${i} 没有 fixture 触发样例 — 覆盖不全`
      );
    }
  });
});
