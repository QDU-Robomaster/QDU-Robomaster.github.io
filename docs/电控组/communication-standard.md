---
id: ee-communication-standard
title: 通信规范
slug: /电控组/communication-standard
sidebar_position: 4
---

# 通信规范

本章定义电控组模块之间、板间之间的通信约定。目标是保证“可替换、可联调、可定位问题”。

## 1. 通信机制分工

按照 XRobot/LibXR 的语义分工使用：

1. `Topic`：传输状态与数据流（高频、连续数据）。
2. `Event`：表达离散动作/模式切换（低频、触发语义）。
3. `RamFS/Terminal`：人机调试命令入口。
4. `CAN/UART`：板间或设备物理传输层。

原则：

1. 状态数据不用 Event 传。
2. 模式切换不用 Topic 轮询。
3. 外设协议细节不暴露到业务层。

## 2. Topic 规范

### 2.1 命名规范

1. 全小写 + 下划线，例如 `gimbal_cmd`、`ahrs_euler`。
2. 名称表达“数据语义”，不表达“实现细节”。
3. 同一语义在全项目只保留一个标准名字。

### 2.2 数据结构规范

1. Topic 数据结构必须稳定，跨模块共享时避免随意改字段顺序。
2. 单位必须统一并在结构注释中注明（角度/弧度、rpm/rad/s）。
3. 高频 Topic 优先用紧凑结构，减少拷贝压力。

### 2.3 生命周期规范

1. 发布频率在模块 README 写明。
2. 订阅方必须定义“数据超时”策略。
3. 超时后进入安全输出，而不是继续使用上次数据。

## 3. Event 规范

### 3.1 事件定义

1. 事件 ID 来自 `enum class`，禁止裸数字硬编码。
2. 事件名称必须可读，能体现动作语义。
3. 同一事件含义在不同模块不能“同名异义”。

### 3.2 事件绑定

使用 `EventBinder` 做跨模块映射时：

1. `modules` 名称必须唯一且稳定。
2. 一条绑定只做一件事（一个源事件映射一个目标事件）。
3. 大规模联动拆分成多组 `binding group`，便于逐组验证。

## 4. 回调上下文规范

基于官方回调接口约定（带 `in_isr`）：

1. 回调里不做阻塞操作。
2. 回调里不做大计算。
3. 重逻辑下放到线程，通过队列/信号量传递。
4. ISR 上下文必须使用 `FromCallback` 风格接口。

## 5. CAN 通信规范（队内约定）

### 5.1 ID 与总线规划

1. 车上每条 CAN 总线建立 ID 分配表。
2. 电机反馈 ID、控制 ID 不得冲突。
3. 多模块共享总线时，先做总线负载预算。

### 5.2 收发行为

1. 发送周期必须固定，禁止无节制“有变化就发”导致突发拥塞。
2. 接收解析失败要计数并可观测。
3. 关键控制帧丢失要有降级策略（保持/清零/Relax）。

## 6. UART 通信规范（队内约定）

1. UART 用于上位机、跨板 Topic 转发、调试链路。
2. 结构化数据优先走统一打包协议（例如 SharedTopic）。
3. 接收线程只做解析分发，不做业务决策。
4. 串口参数（波特率/校验位）必须写入文档并与对端统一。

## 7. 终端命令规范

1. 命令名与模块名或功能名一致（例如 `gimbal`、`launcher`）。
2. 命令帮助必须能直接告诉用户怎么用。
3. 调试输出要支持视图筛选，避免全字段常驻打印。
4. 非 Debug 构建默认不启用调试命令实现。

## 8. 联调排障流程（建议）

通信问题排查顺序：

1. 物理层：线束、电源、波特率、终端电阻。
2. 协议层：ID、帧格式、字节序、校验。
3. 框架层：Topic 名、Event 映射、回调上下文。
4. 业务层：超时策略、模式机逻辑、保护态条件。

## 9. 参考

1. 官方 Message Topic：<https://xrobot-org.github.io/docs/middleware/message-topic/>
2. 官方 Event：<https://xrobot-org.github.io/docs/middleware/event/>
3. 官方 RamFS：<https://xrobot-org.github.io/docs/middleware/ramfs/>
4. 官方 Terminal：<https://xrobot-org.github.io/docs/middleware/terminal/>
5. 官方设计思想（回调与上下文）：<https://xrobot-org.github.io/docs/design-thought/>
