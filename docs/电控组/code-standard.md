---
id: ee-code-standard
title: 代码规范
slug: /电控组/code-standard
sidebar_position: 3
---

# 代码规范

本章定义电控组在 `bsp-dev-c` / `qdu-future-modules` 的统一编码规范。目标是减少风格分裂和隐性 bug。

## 1. 基线约束

1. C++ 标准：C++17。
2. 统一格式化工具：`clang-format`。
3. 统一编译配置由项目脚本和 CMake 管理，不在代码里硬编码工具链差异。

## 2. 目录与文件职责

按职责分文件，不把模块做成单大文件。

1. `Module.hpp`：类定义、接口、核心逻辑入口。
2. `ModuleDebug.inl`：调试实现（仅 Debug 构建参与）。
3. `README.md`：模块用途、主要函数、接入方式。

## 3. 命名规范

### 3.1 类型与文件

1. 类名：`PascalCase`，例如 `Gimbal`、`EventBinder`。
2. 文件名与主类同名，模块调试文件用 `XxxDebug.inl`。
3. 枚举类型使用 `enum class`，避免命名污染。

### 3.2 变量与函数

1. 成员变量：`snake_case_` 结尾下划线。
2. 普通函数：`PascalCase` 或与现有模块保持一致，避免同模块混用。
3. 常量：`kXxx` 或 `ALL_CAPS`，但同一模块内部风格必须统一。

### 3.3 Topic 与事件名

1. Topic 名使用小写下划线：`gimbal_cmd`、`chassis_cmd`。
2. 事件枚举命名可读且可区分模块语义：`SET_MODE_RELAX`、`SET_MODE_FOLLOW`。

## 4. 注释规范（Doxygen）

关键接口必须用 Doxygen 注释块说明用途、参数、返回值和调用时机。

推荐模板：

```cpp
/**
 * @brief 更新云台控制输出
 * @details 在控制线程中周期调用，完成指令解析与电机输出。
 * @param dt 控制周期（秒）
 * @return true 更新成功
 */
bool UpdateControl(float dt);
```

注释要求：

1. 接口做什么，而不是“代码逐行翻译”。
2. 说明调用上下文（线程/回调/周期）。
3. 有副作用就写清楚（例如会发送 CAN、会发布 Topic）。

## 5. 函数设计规范

1. 单个函数只做一类逻辑，过长函数必须拆分。
2. 控制线程内流程建议拆成：`Parse -> Compute -> Output`。
3. `OnMonitor` 只做轻量逻辑，不做重计算或阻塞操作。

## 6. 并发与锁规范

1. 锁粒度尽量小，持锁区只读写共享状态。
2. 严禁在持锁区执行潜在阻塞外设调用（CAN/UART 阻塞写）。
3. ISR/回调上下文只做快路径处理，复杂工作下放线程。

## 7. 错误处理规范

1. 外设初始化失败必须显式处理（重试、日志、保护态）。
2. 指针和硬件句柄在构造阶段完成校验。
3. 明确“离线行为”：离线时输出安全值，不允许继续使用陈旧控制量。

## 8. Debug 代码规范

调试代码与业务代码分离，建议模式：

```cpp
#ifdef DEBUG
#define XXX_DEBUG_IMPL
#include "XxxDebug.inl"
#undef XXX_DEBUG_IMPL
#endif
```

规则：

1. Debug 接口只在 Debug 构建参与编译。
2. Release 构建不引入调试命令实现。
3. 调试输出要可筛选（视图化），避免刷屏影响实时性。

## 9. 提交前自检清单

1. 已通过格式化与编译。
2. 新增/修改接口已补充 Doxygen 注释。
3. README 与实现一致（参数、依赖、入口）。
4. Debug 与 Release 行为符合预期。
5. 不引入与本次需求无关的改动。

## 10. 参考

1. 官方基础编程：<https://xrobot-org.github.io/docs/basic-coding/application/>
2. 官方贡献指南：<https://xrobot-org.github.io/docs/project-management/contribute/>
