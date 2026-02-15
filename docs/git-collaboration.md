---
id: git-collaboration
title: Git 协作指南
slug: /git-collaboration
sidebar_position: 2
---

# Git 协作指南

本指南用于统一 QDU-Robomaster 的跨仓库协作流程，覆盖从 `Issue` 到 `Review` 再到 `PR` 合并的完整闭环。

## 1. 角色与仓库分工

### 1.1 Roadmap 仓库（任务中枢）

Roadmap 仓库地址：

<https://github.com/QDU-Robomaster/QDU-Robomaster-Roadmap>

定位：

1. 集中管理路线图、任务拆解、需求讨论。
2. 跨仓库任务统一在这里建 Issue。
3. 实现代码仍在各自代码仓库提交。

### 1.2 代码仓库（实现落地）

1. 电控组：例如 `bsp-dev-c`、模块仓库。
2. 算法组：例如 `bsp-dev-autoaim` 等。
3. 每个代码仓库只处理“可执行代码变更”。

## 2. 标准流程（Issue -> Review -> PR）

## Step 1：在 Roadmap 仓库建 Issue

每个开发任务先建 Issue，再开始写代码。

Issue 至少包含：

1. 背景：为什么要做。
2. 目标：做完后可验证的结果。
3. 范围：改哪些仓库/模块，不改哪些。
4. 验收标准：编译、功能、文档、回归要求。
5. 关联信息：参考链接、历史讨论、日志。

建议标题格式：

```text
[组别/模块] 一句话描述目标
```

示例：

```text
[电控/Gimbal] 重构调试接口并统一 DebugCore 风格
```

## Step 2：任务拆解与分派

在 Issue 内拆分子任务，并指定负责人。

建议拆分维度：

1. 代码改动
2. 文档改动
3. 测试与回归

每个子任务建议可独立提交 PR，避免超大 PR 难评审。

## Step 3：从主干拉开发分支

在对应代码仓库创建功能分支，不在 `main/master/dev` 直改。

建议命名：

```text
feature/<issue-id>-<short-desc>
fix/<issue-id>-<short-desc>
refactor/<issue-id>-<short-desc>
docs/<issue-id>-<short-desc>
```

示例：

```text
feature/128-gimbal-debugcore
fix/203-chassis-deadlock
docs/76-ee-collaboration-guide
```

## Step 4：提交代码与自检

每次提交应满足：

1. 单次提交聚焦一个逻辑改动。
2. 提交信息可读，能看出“改了什么 + 为什么”。
3. 本地至少完成必要编译检查。

建议提交信息格式：

```text
<type>(<scope>): <summary>
```

常用 `type`：

1. `feat`
2. `fix`
3. `refactor`
4. `docs`
5. `test`
6. `chore`

示例：

```text
fix(chassis): move can send out of mutex lock to avoid monitor stall
docs(ee): add communication standard and quick start
```

## Step 5：创建 PR（关联 Issue）

开发完成后，在代码仓库发起 PR。

PR 描述必须包含：

1. 关联 Issue：`Roadmap#<id>` 或完整链接。
2. 变更摘要：做了什么。
3. 风险说明：可能影响哪些模块。
4. 验证结果：编译、运行、回归结果。
5. 回滚方案：出问题时如何快速撤回。

建议在 PR 模板中固定以下段落：

1. 背景与目标
2. 变更清单
3. 影响范围
4. 测试记录
5. 关联 Issue

## Step 6：Code Review

Review 关注点按优先级：

1. 正确性：逻辑是否正确，有无明显 bug。
2. 安全性：异常路径、离线保护、线程与锁风险。
3. 可维护性：命名、注释、模块边界是否清晰。
4. 一致性：是否符合代码规范与架构约束。

Review 规则建议：

1. 至少 1 位核心成员 Approve 才可合并。
2. 涉及核心模块（CMD/Chassis/Gimbal/Launcher）建议 2 人 Review。
3. 提出意见后由作者回复并标记已处理。

## Step 7：合并与关闭

1. 合并方式建议 `Squash and merge`（保持主干整洁）。
2. PR 合并后，关闭对应 Roadmap Issue。
3. 同步更新 Roadmap 状态与文档。

## 3. 状态流转建议

Issue 状态建议：

1. `Todo`：待开始
2. `In Progress`：开发中
3. `In Review`：PR 评审中
4. `Done`：已合并并验证
5. `Blocked`：被阻塞（需明确阻塞原因）

PR 状态建议：

1. `Draft`：开发未完成，仅提前同步思路
2. `Ready for Review`：可评审
3. `Changes Requested`：需修改
4. `Approved`：可合并

## 4. 跨仓库协作规范

一个任务改多个仓库时：

1. 在 Roadmap Issue 中列出所有关联 PR。
2. 明确依赖顺序（先合哪个仓库，后合哪个）。
3. 若存在接口变更，先提交“兼容 PR”，再提交“清理 PR”。

推荐写法：

```text
关联 PR:
- bsp-dev-c: #123
- qdu-future-modules/Gimbal: #45
- QDU-Robomaster.github.io: #9
```

## 5. 常见反模式（避免）

1. 不建 Issue 直接写代码。
2. 一个 PR 混入无关改动。
3. Review 意见不回复直接再推代码。
4. 没有验证记录就合并核心改动。
5. 文档与代码不同步。

## 6. 最小可执行模板

## 6.1 Issue 模板（精简）

```markdown
## 背景

## 目标

## 范围
- in:
- out:

## 验收标准
- [ ] 编译通过
- [ ] 功能验证
- [ ] 文档更新

## 关联仓库
- repo-a
- repo-b
```

## 6.2 PR 模板（精简）

```markdown
## 关联 Issue
- https://github.com/QDU-Robomaster/QDU-Robomaster-Roadmap/issues/<id>

## 变更内容

## 风险与影响范围

## 验证记录
- Debug:
- Release:

## 回滚方案
```

## 7. 参考

1. Roadmap 仓库：<https://github.com/QDU-Robomaster/QDU-Robomaster-Roadmap>
2. GitHub Issues：<https://docs.github.com/issues>
3. GitHub Pull Requests：<https://docs.github.com/pull-requests>
4. GitHub Code Review：<https://docs.github.com/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests>
