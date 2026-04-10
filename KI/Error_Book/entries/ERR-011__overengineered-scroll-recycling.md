---
id: ERR-011
type: error
errorCode: BHV-004
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-09
tags:
  - error/high
  - engine/cocos
  - errorCode/BHV-004
  - ki/error-book
prevention: "选择技术方案前先评估数据规模，< 100 个 item 用简单方案（全量创建），不要照搬复杂组件"
aliases:
  - ERR-009
---

# 过度工程化：30 个 item 用了回收复用 ScrollView，应该用简单全量创建

## 错误现象
星星之路列表（30-50 个 item）使用了 ScrollViewCmpt（对象池回收复用组件），导致：
- 从底部开始显示时，回收逻辑假设被破坏，item 跳位
- scrollToOffset/scrollToBottom 与回收机制冲突，无法定位到底部
- 反复尝试修复（延迟、直接设置 position、新建自定义组件），全部失败
- 最终浪费数小时，答案只是换成普通 ScrollView + 全量创建 + Layout

## 根因分析
1. **没有评估数据规模**：30-50 个 item 完全不需要回收复用，全量创建在性能上毫无压力
2. **盲目照搬**：看到 homeView 用 ScrollViewCmpt 就照搬，没分析差异（homeView 有数百个地图块，需要回收；星星之路只有 30 个 item）
3. **沉没成本陷阱**：第一次尝试失败后，不断在错误方案上修补（延迟、setPosition、新建组件），而不是退一步换方案
4. **没有先验证最简方案**：应该先用最简单的方式跑通，再考虑优化

## 解决方案
```
数据量 < 100：普通 ScrollView + Layout + instantiate 全部 item + scrollToBottom
数据量 100-500：ScrollViewCmpt（回收复用），但只支持从顶部开始
数据量 > 500：虚拟列表或分页加载
```

## 预防规则
**选择技术方案前，先问三个问题：**
1. 数据量是多少？（< 100 就用最简单方案）
2. 有没有特殊的滚动需求？（从底部开始、双向无限等 = 不适合回收组件）
3. 最简单能跑通的方案是什么？（先实现再优化，不要一步到位）

**禁止在没有性能问题的情况下使用回收复用组件。过度工程化比性能问题更浪费时间。**

## 关联
- ScrollViewCmpt 的回收假设：从顶部开始，item 只在滚动方向上单向回收
- 正确方案：cc.ScrollView + cc.Layout(VERTICAL, CONTAINER) + scrollToBottom()
