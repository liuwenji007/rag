# Brainstorming Session Results

**Session Date:** 2025-11-11
**Facilitator:** Analyst Mary
**Participant:** commander

## Executive Summary

**Topic:** 构建基于 RAG 的代码知识库

**Session Goals:** 在 Node.js/TypeScript 技术栈下，以有限时间与人力提升检索准确性

**Techniques Used:** SCAMPER Method（Substitute / Combine / Adapt / Modify / Put to Other Uses / Eliminate / Reverse）

**Total Ideas Generated:** 11

### Key Themes Identified:

- 通过多检索策略与排序机制提高匹配精度
- 充分利用既有知识结构与历史上下文
- 控制噪音并优先关注核心仓库与关键使用场景

## Technique Sessions

### SCAMPER Method 逐项洞察
- **Substitute**：评估替换嵌入模型、上下文切片策略与数据来源的可行性
- **Combine**：将语义检索与关键词检索并用，并把历史 QA 与代码片段绑定为知识切片
- **Adapt**：借鉴推荐系统的排序权重与反馈调优思路
- **Modify**：为检索结果引入额外评分因子，放大核心仓库权重、过滤噪音仓库
- **Put to Other Uses**：把团队 Wiki 的分类结构复用到知识库检索
- **Eliminate**：屏蔽低质量片段并砍掉多余预处理步骤
- **Reverse**：先按使用场景划分上下文，再决定索引策略

## Idea Categorization

### Immediate Opportunities
_Ideas ready to implement now_

- 语义检索 + 关键词检索双通道互相校正
- 将历史 QA 与相关代码片段绑定为知识单元
- 引入推荐系统式的排序因子与反馈循环
- 为检索结果增加额外评分项，并强化核心仓库权重、降低噪音
- 利用团队 Wiki 结构对知识条目做分类
- 以使用场景为先导，重排上下文构建与索引策略

### Future Innovations
_Ideas requiring development/research_

- 对比不同嵌入模型、上下文切片策略与数据来源的准确性表现
- 建立低质量片段检测机制，并持续精简预处理流程

### Moonshots
_Ambitious, transformative concepts_

- 当前未识别

### Insights and Learnings
_Key realizations from the session_

- 检索准确性需同时从“获取更好的候选”与“更有效排序”两端发力
- 历史上下文与团队既有知识体系（Wiki、QA）是提升回答可信度与可追溯性的关键
- 以“使用场景”作为切分依据，能更贴近 agent 与工作流的实际需求

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: 语义 + 关键词联合检索与排序优化
- Rationale: 直接提升召回与排序质量，可快速落地
- Next steps: 建立双通道检索、合并去重、基于反馈调权评分
- Resources needed: 检索网关改造、排序服务实现、少量实验数据
- Timeline: 1-2 周 PoC，随后滚动迭代

#### #2 Priority: 历史 QA 与代码片段知识联动
- Rationale: 为 agent 提供可信上下文，提高输出解释力
- Next steps: 统一存储 QA 与代码引用、建立索引映射、设计展示格式
- Resources needed: 知识库 Schema 调整、GitLab API & 文档抓取脚本
- Timeline: 2 周完成初版，按需求扩充

#### #3 Priority: 以使用场景驱动上下文切分
- Rationale: 先识别常见任务，再反推索引策略，更贴合实际调用
- Next steps: 汇总常见工作流、定义场景标签、重建索引分层
- Resources needed: 与各业务线对齐、索引配置脚本
- Timeline: 2-3 周内完成试点场景

## Reflection and Follow-up

### What Worked Well

- SCAMPER 七步提供了全面框架，兼顾发散与收敛
- 聚焦“准确性 + 资源有限”使讨论集中且可行动

### Areas for Further Exploration

- 更细化不同嵌入策略与切片方式的评估指标
- 如何持续度量知识库回答的精准度与可解释性

### Recommended Follow-up Techniques

- Morphological Analysis（系统组合设计）
- Five Whys（深入排查准确性偏差根因）
- First Principles Analysis（从根本原则优化索引策略）

### Questions That Emerged

- 如何构建可持续的质量反馈闭环？
- 需要哪些监控指标来量化准确性改进？

### Next Session Planning

- **Suggested topics:** 嵌入模型与切片策略验证、质量反馈体系设计
- **Recommended timeframe:** Brainstorm 结束后 1-2 周内展开调研
- **Preparation needed:** 收集现有检索失败案例、整理常见使用场景清单

---

_Session facilitated using the BMAD CIS brainstorming framework_
