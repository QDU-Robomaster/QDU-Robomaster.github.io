---
id: queue
title: 队列
sidebar_position: 1
---

# 队列（Queue）

`LibXR::Queue` 是一个用于嵌入式系统的高效循环队列，基于固定大小的环形缓冲区实现，支持类型安全和批量操作，适用于数据流缓存、IO 缓冲等场景。

## 类结构

LibXR 队列分为两个层次：

- `BaseQueue`：底层队列类，提供基于 `uint8_t*` 缓冲区的通用循环缓冲实现，支持插入、弹出、查看、批量操作等。
- `Queue<T>`：模板封装类，在 `BaseQueue` 基础上提供类型安全接口，支持负索引访问、类型转换封装。

## 主要特性

- 固定容量循环队列，支持队满与队空判断。
- 支持标准队列操作：`Push`, `Pop`, `Peek`。
- 支持批量操作：`PushBatch`, `PopBatch`, `PeekBatch`。
- 提供负索引访问（从尾部向前）与头尾索引访问接口。
- 支持外部或内部缓冲区分配，适配无动态内存场景。
- 支持数据覆盖、重置与容量查询等功能。

## 使用示例

```cpp
LibXR::Queue<int> q(16);

q.Push(42);
int x;
q.Pop(x);  // x == 42
```

## 注意事项

- 队列大小固定，初始化后不可动态扩展。
- 若使用默认构造方式，会自动分配缓冲区；可通过传入缓冲区实现无动态内存分配。
- 多线程环境下请结合锁使用，或选择 `LockFreeQueue` 替代。

## 接口概览

### 构造与销毁

- `Queue(size_t length)`
- `Queue(size_t length, uint8_t* buffer)`
- `~Queue()`

### 插入与移除

- `ErrorCode Push(const T&)`
- `ErrorCode Pop(T&)`
- `ErrorCode Pop()`
- `ErrorCode Peek(T&)`

### 批量操作

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### 辅助功能

- `int GetFirstElementIndex()`
- `int GetLastElementIndex()`
- `T& operator[](int32_t index)` （支持负索引）

## 适用场景

- 串口/UART 接收缓冲
- 任务间数据队列
- 环形缓冲数据采集

如需线程安全或中断安全，请使用 [`LockFreeQueue`](lockfree_queue.md)。
