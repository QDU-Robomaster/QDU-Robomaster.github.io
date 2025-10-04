---
id: structure-coding
title: 数据结构
sidebar_position: 2
---

# 数据结构

本模块汇总了 LibXR 中用于任务调度、数据通信、资源管理等场景的通用数据结构，设计充分考虑嵌入式系统中的内存限制、并发访问与平台差异，涵盖如下内容：

## 模块特性

- **平台独立**：所有接口均采用平台无关的抽象，支持移植。
- **内存可控**：多数结构支持外部缓冲或固定容量，避免运行时分配。
- **线程/中断安全**：部分结构使用互斥锁或无锁算法设计，适配多线程/中断上下文。
- **结构清晰**：每种结构均封装基础节点、模板节点与核心操作接口，易于扩展。

## 快速导航

- [Queue（队列）](./queue.md)
- [LockFreeQueue（无锁队列）](./lockfree_queue.md)
- [Stack（栈）](./stack.md)
- [List（链表）](./list.md)
- [LockFreeList（无锁链表）](./lockfree_list.md)
- [RBTree（红黑树）](./rbt.md)
- [DoubleBuffer（双缓冲区）](./double_buffer.md)

更多使用方式、性能差异与适用场景，请参考各页面的详细说明及设计思想。
