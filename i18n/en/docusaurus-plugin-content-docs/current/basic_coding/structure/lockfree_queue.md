---
id: lockfree_queue
title: Lock-Free Queue
sidebar_position: 2
---

# LockFreeQueue

`LibXR::LockFreeQueue<T>` is a high-performance Single-Producer-Multiple-Consumer (SPMC) lock-free queue, ideal for real-time and high-concurrency embedded systems.

## Class Structure and Principle

- Manages queue indices using atomic variables `head_` and `tail_`.
- All operations ensure thread safety using C++11 atomic memory ordering.
- Circular buffer structure supports batch read/write, minimizing interrupt overhead.
- Multiple consumers can concurrently `Pop`, but only one producer is allowed.

## Feature Overview

| Feature | Supported |
|---------|-----------|
| Single Producer | ✅ |
| Multiple Consumers | ✅ |
| Batch Operations | ✅ |
| Separate Peek/Pop | ✅ |
| Dynamic Capacity | ❌ (fixed size) |
| Lock-Free Guarantee | ✅ (C++11 atomic) |

## Interface Functions

### Constructor and Destructor

- `LockFreeQueue(size_t length)`
- `~LockFreeQueue()`

### Data Operations

- `ErrorCode Push(const T&)`
- `ErrorCode Pop(T&)`
- `ErrorCode Pop()` (discard head element)
- `ErrorCode Peek(T&)`

### Batch Operations

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### Utility Interfaces

- `Size()`: Number of elements currently in the queue
- `EmptySize()`: Remaining space
- `Reset()`: Clear the queue

## Usage Example

```cpp
LibXR::LockFreeQueue<int> q(128);
q.Push(10);

int value;
if (q.Pop(value) == LibXR::ErrorCode::OK) {
    // Use value
}
```

## Notes

- Only applicable to **single-producer** scenarios. Use external synchronization or another queue if you need multiple producers.
- Fixed capacity: required size must be specified during construction.
- Data structure is cache line aligned to reduce performance loss from false sharing.

## Application Scenarios

- Data communication between interrupt and task threads
- Real-time log collection
- Multi-threaded sensor data sampling
