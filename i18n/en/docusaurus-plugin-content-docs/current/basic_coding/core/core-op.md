---
id: core-op
title: Operation Model
sidebar_position: 9
---

# Operation Model

This module defines the generic template class `Operation<Args...>` to describe asynchronous operations with completion feedback mechanisms. It supports three modes: Callback, Blocking, and Polling, and is designed to unify completion handling in embedded I/O operations.

## Operation Modes

### OperationType

```cpp
enum class OperationType : uint8_t {
  CALLBACK,  // Uses a callback function to handle completion
  BLOCK,     // Waits using a semaphore (blocking)
  POLLING,   // Uses a polling flag
  NONE       // No completion handling
};
```

### POLLING Status Enum

```cpp
enum class OperationPollingStatus : uint8_t {
  READY,
  RUNNING,
  DONE
};
```

## Constructors

```cpp
// Default constructor: type is NONE
Operation();

// Construct a blocking operation
Operation(Semaphore &sem, uint32_t timeout = UINT32_MAX);

// Construct a callback-based operation
Operation(Callback<Args...> &cb);

// Construct a polling-based operation
Operation(OperationPollingStatus &status);
```

## Status Updates

```cpp
void UpdateStatus(bool in_isr, Args&&... args);
void MarkAsRunning();
```

- `UpdateStatus(...)` triggers a callback, releases a semaphore, or sets polling state depending on the operation type.
- `MarkAsRunning()` sets the polling status to RUNNING if the type is POLLING.
- These functions are typically called by the driver; the user usually does not need to handle them directly.

## Usage Examples

### Blocking write with timeout

```cpp
Semaphore sem;
WriteOperation op_block(sem, 100);
write_port(data, op_block);
```

### Asynchronous read with callback

```cpp
auto cb = Callback<ErrorCode>::Create([](bool in_isr, int context, ErrorCode ec) {
  // Callback logic
}, 123);  // Binds context value 123

ReadOperation op_cb(cb);
read_port(buffer, op_cb);
```

### Polling to check for completion

```cpp
OperationPollingStatus status = OperationPollingStatus::READY;
ReadOperation op_poll(status);
read_port(buffer, op_poll);

// Later check if completed
if (status == OperationPollingStatus::DONE) {
  // Data read completed
}
```

---

`Operation` is the foundation of LibXR's I/O operation mechanism, suitable for serial, network, timer, and other modules. It provides a unified way to manage completion behavior, ensuring safe use in both thread and interrupt contexts.
