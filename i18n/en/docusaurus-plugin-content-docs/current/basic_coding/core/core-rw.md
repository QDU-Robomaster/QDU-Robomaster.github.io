---
id: core-rw
title: IO Read/Write Abstraction
sidebar_position: 8
---

# IO Read/Write Abstraction

This module defines the generic `ReadPort` and `WritePort` interface classes for cross-platform encapsulation of various I/O behaviors such as asynchronous, blocking, and polling. It binds completion feedback mechanisms via the `Operation` model. To adapt to different underlying drivers, simply implement the corresponding read/write functions and assign them to the port object to gain full asynchronous I/O capability.

`ReadPort`, `WritePort`, and `WritePort::Stream` are implemented using atomic operations and lock-free data structures, enabling the entire read and write process to be performed without any system calls, while still ensuring thread safety. The "locks" mentioned below are purely logical abstractions and do not involve any actual mutex operations.

## Core Types

### ReadPort / WritePort

`ReadPort` and `WritePort` encapsulate the invocation process, buffer management, and synchronization mechanisms for read/write operations. Each call is accompanied by an `Operation` instance to explicitly specify the desired completion feedback behavior (callback, blocking, polling, or ignore).

### ReadOperation / WriteOperation

```cpp
typedef Operation<ErrorCode> ReadOperation;
typedef Operation<ErrorCode> WriteOperation;
```

These represent asynchronous I/O operations with a completion response behavior. Callbacks, semaphores, or polling status variables can be passed via the constructor—see the [`core-operation`](./core-op.md) page for details.

## ReadPort Interface

### Initialization

```cpp
ReadPort(size_t buffer_size = 128);
```

Constructor that allocates the receive buffer, with a default size of 128 bytes.

### Set Read Function

```cpp
ReadPort &operator=(ReadFun fun);
```

Sets the read function pointer, usually called by the underlying driver—users typically don’t need to manage this.

### Submit Read Request

```cpp
ErrorCode operator()(RawData data, ReadOperation &op);
```

Requests to read `data.size_` bytes; blocks, polls, or invokes a callback depending on `op`.

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Readable();
```

Used to check buffer status and whether data is available to read.

### Process Pending Reads

```cpp
void ProcessPendingReads(bool in_isr);
```

Actively checks and completes previously pending read operations. Typically invoked by the driver after new data arrives.

### Reset State

```cpp
void Reset();
```

Clears the buffer and internal state.

## WritePort Interface

### Initialization

```cpp
WritePort(size_t queue_size = 3, size_t buffer_size = 128);
```

Constructor that allocates the write queue and buffer, supporting queuing of multiple write requests.

### Set Write Function

```cpp
WritePort &operator=(WriteFun fun);
```

Sets the write function pointer, usually assigned by the underlying driver.

### Submit Write Request

```cpp
ErrorCode operator()(ConstRawData data, WriteOperation &op);
```

Adds data to the write queue and handles completion based on the behavior of `op`.

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Writable();
```

Checks buffer space and whether data can be written.

### Reset State

```cpp
void Reset();
```

Clears the write queue and internal state.

## STDIO Interface

LibXR provides a global `STDIO` interface that can be bound to `ReadPort` / `WritePort` instances and used with the `Printf(...)` function to output debug information.

```cpp
LibXR::STDIO::write_ = uart_cdc.write_port_;
LibXR::STDIO::Printf("Hello, %d", 123);
```

## Usage Examples

For data size of 0, Write will return success directly, and Read will wait for any data to be available before returning (blocking mode).

```cpp
// Blocking write to UART, timeout set to 100ms (default is infinite wait)
WriteOperation op_block(sem, 100);
uart.Write("Hello", op_block);

// Asynchronous read with callback
ReadOperation op_cb(callback);
uart.Read(buffer, op_cb);
```

---

## WritePort::Stream Batch Write Interface

`WritePort::Stream` provides a chained batch write capability similar to C++ standard streams, making it suitable for high-throughput, large-packet, or consecutive multi-block data writing scenarios. Its advantages include **locking the port resource only once, submitting data in batches, reducing queue pressure and fragmentation**, all while keeping usage simple and intuitive.

### Key Features

- **Stream-style Chained Writing**: Supports multiple `<<` operations to batch and concatenate multiple data segments, improving throughput efficiency.
- **Automatic Batch Submission**: Unsubmitted data is automatically committed upon destruction, and you can also call `Commit()` manually at any time.

### Example Usage

```cpp
WriteOperation op;
// Typical batch write using stream interface
{
    WritePort::Stream s(&uart_port, op);
    s << data1 << data2 << data3;
    // s.Commit(); // Optional, auto-committed on destruction
}
```

### Typical Scenarios

- Batch output for UART/serial ports
- Network packet fragmentation, batch logging
- Sending multiple packets at once, greatly reducing write waits and queue contention

### Interface Specification

```cpp
class WritePort::Stream {
public:
    Stream(WritePort* port, WriteOperation op);    // Locks the port and enters batch write mode
    ~Stream();                                     // Destructor automatically commits and releases the lock
    Stream& operator<<(const ConstRawData& data);  // Appends a data segment
    ErrorCode Commit();                            // Manually commits the appended data (optional)
};
```

- **Stream(WritePort*, WriteOperation)**: Attempts to acquire the lock during construction; if locking fails, falls back to normal write mode.
- **~Stream()**: Automatically commits all data and releases the lock upon destruction.
- **operator<<**: Chains the addition of data segments for writing.
- **Commit()**: Immediately writes all currently appended data to the queue and (if needed) releases the lock. Can be used for segmented flushing.

---

`ReadPort` and `WritePort` are the core interfaces of the LibXR I/O abstraction layer. They provide unified data buffering and completion feedback mechanisms, suitable for data stream scenarios such as UART, network, and file systems.
