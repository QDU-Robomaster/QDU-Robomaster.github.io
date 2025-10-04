---
id: lockfree_queue
title: 无锁队列
sidebar_position: 2
---

# LockFreeQueue（无锁队列）

`LibXR::LockFreeQueue<T>` 是一个高性能单生产者多消费者（SPMC）无锁队列，适用于实时性要求高、并发访问频繁的嵌入式系统中。

## 类结构与原理

- 使用原子变量 `head_` 和 `tail_` 管理队列索引。
- 所有操作使用 C++11 原子内存序保证线程安全。
- 环形缓冲结构支持批量读写，避免频繁中断。
- 多个消费者可以并发 Pop，生产者唯一。

## 特性概览

| 特性 | 支持 |
|------|------|
| 单生产者 | ✅ |
| 多消费者 | ✅ |
| 批量操作 | ✅ |
| Peek/Pop 分离 | ✅ |
| 动态容量 | ❌（固定容量） |
| 无锁保证 | ✅（C++11 atomic） |

## 接口函数

### 构造与销毁

- `LockFreeQueue(size_t length)`
- `~LockFreeQueue()`

### 数据操作

- `ErrorCode Push(const T&)`
- `ErrorCode Pop(T&)`
- `ErrorCode Pop()`（丢弃头部元素）
- `ErrorCode Peek(T&)`

### 批量操作

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### 工具接口

- `Size()`：当前元素数量
- `EmptySize()`：剩余空间
- `Reset()`：重置队列为空

## 使用示例

```cpp
LibXR::LockFreeQueue<int> q(128);
q.Push(10);

int value;
if (q.Pop(value) == LibXR::ErrorCode::OK) {
    // 使用 value
}
```

## 注意事项

- 仅适用于 **单生产者** 场景，多生产者需使用外部同步或其他队列方案。
- 容量固定，构造时需明确所需大小。
- 数据结构对齐至 cache line，可减少伪共享带来的性能损失。

## 适用场景

- 中断与任务线程间的数据通信
- 实时日志收集
- 多线程传感器数据采样
