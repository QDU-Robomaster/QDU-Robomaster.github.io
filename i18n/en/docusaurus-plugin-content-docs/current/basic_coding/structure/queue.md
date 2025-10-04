---
id: queue
title: Queue
sidebar_position: 1
---

# Queue

`LibXR::Queue` is an efficient circular queue designed for embedded systems. It is implemented using a fixed-size ring buffer and supports type safety and batch operations. It is ideal for use cases such as data stream buffering and I/O caching.

## Class Structure

The LibXR queue has two layers:

- `BaseQueue`: The low-level queue class implementing a generic circular buffer based on `uint8_t*`. It supports push, pop, peek, and batch operations.
- `Queue<T>`: A type-safe template wrapper built on top of `BaseQueue`. It supports type-safe access, negative indexing, and casting.

## Key Features

- Fixed-capacity circular queue with support for full/empty status checks.
- Supports standard queue operations: `Push`, `Pop`, `Peek`.
- Supports batch operations: `PushBatch`, `PopBatch`, `PeekBatch`.
- Provides negative index access (from the tail) and head/tail index querying.
- Supports internal or external buffer allocation, suitable for no-dynamic-memory scenarios.
- Includes features like data overwrite, reset, and capacity querying.

## Usage Example

```cpp
LibXR::Queue<int> q(16);

q.Push(42);
int x;
q.Pop(x);  // x == 42
```

## Notes

- The queue has a fixed size and cannot be resized after initialization.
- If using the default constructor, an internal buffer will be allocated. To avoid dynamic memory, pass in an external buffer.
- For multithreaded environments, use external locking or switch to `LockFreeQueue`.

## Interface Overview

### Constructor and Destructor

- `Queue(size_t length)`
- `Queue(size_t length, uint8_t* buffer)`
- `~Queue()`

### Push and Pop

- `ErrorCode Push(const T&)`
- `ErrorCode Pop(T&)`
- `ErrorCode Pop()`
- `ErrorCode Peek(T&)`

### Batch Operations

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### Helper Functions

- `int GetFirstElementIndex()`
- `int GetLastElementIndex()`
- `T& operator[](int32_t index)` (supports negative indexing)

## Application Scenarios

- UART/serial receive buffering
- Inter-task data queues
- Circular buffer data acquisition

For thread-safe or interrupt-safe usage, consider using [`LockFreeQueue`](lockfree_queue.md).
