---
id: ERR-036
type: error
errorCode: "EVD-002"
severity: "low"
status: "recurring"
recurrence: 1
firstSeen: "2026-06-24"
tags:
  - "error/low"
  - "artifact/state-json"
  - "topic/json-integrity"
  - "errorCode/EVD-002"
  - ki/error-book
prevention: "改 state.json 的状态字段时，用 Edit 就地改既有 currentState；绝不在别的块里追加第二个 currentState 键（会产生重复键 / 歧义 JSON）。写完必跑 json.load 校验。"
aliases:
  - "ERR-036"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
ci_rules:
  - type: "code-pattern-ban"
    file_pattern: "state\\.json$"
    pattern: "\"currentState\"[\\s\\S]*\"currentState\""
    message: "state.json 出现两个 currentState 键 — 状态转移应就地改既有键，勿追加（ERR-036）"
---

# state.json 状态转移时追加重复 currentState 键，产生歧义 JSON

## 错误现象
更新 `state.json` 把状态推进到下一阶段（如 → APPROVED）时，Agent 在 `reworkCount`/`history` 那一块**新增**了一行 `"currentState": "APPROVED"`，而文件顶部**已存在** `"currentState": "PM_ANALYSIS"`。结果同一对象出现两个 `currentState` 键 —— 多数解析器取最后一个，但属歧义/非法 JSON，状态机读值不可靠。

本 session 内**连犯两次**：REQ-20260624-212600（codebase-memory）与 REQ-20260624-231500（workflow gate）各一次，均当场 `json.load` 校验时发现并修。

## 根因分析
1. 用 Edit 追加新字段时，凭"在最近的 anchor（reworkCount 行）旁边加"的直觉落键，没有先确认该键**已在文件顶部存在**。
2. state.json 的 `currentState` 是顶层单值字段，语义上只能有一个；Agent 把"记录新状态"误当成"新增字段"而非"改既有字段"。
3. 校验兜住了（每次写后 `json.load`），但属于"先污染再修"，应在源头避免。

## 解决方案
1. **就地改**：定位顶部既有 `"currentState": "<old>"`，用 Edit 把值改成新状态，**不**在别处新增同名键。
2. 历史/审计信息走 `history[]` 数组追加（那才是 append 的正确位置），`currentState` 只改值。
3. 写完**必跑** `python3 -c "import json;json.load(open('state.json'))"`；可加严格重复键检测。

## 预防规则
- Agent 每次准备给 JSON 文件"加一个状态/单值字段"前，先 `grep -c '"<key>"' file` 确认它是否已存在：已存在 → 就地改值；不存在 → 才新增。
- 单值顶层字段（`currentState`、`complexity`、`status` 等）永远就地改，绝不追加同名键。
- 配套 CI：`ci_rules` 检测 state.json 内重复 `currentState`。

## 关联
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — 首次发生时所在 REQ 的决策
- [[DEC-007__pm-dynamic-workflow-ultracode-gate|DEC-007]] — 复犯时所在 REQ 的决策
