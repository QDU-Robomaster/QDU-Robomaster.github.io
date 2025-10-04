---
id: double_buffer
title: Double Buffer
sidebar_position: 7
---

# Double Buffer

`LibXR::DoubleBuffer` is a double-buffered data structure designed for embedded scenarios. It is primarily used for seamless switching and filling control in high-speed transfers such as DMA and USB. It supports active and pending buffer management, making it especially suitable for performance-critical data transmission tasks.

## Key Features

- Splits a block of contiguous memory into two buffers.
- Supports switching between the active buffer and the pending buffer.
- Provides direct access and data fill interfaces for both buffers.
- Supports manual switching and automatic validity checking.
- Allows querying whether the pending buffer is ready and how much data it holds.

## Interface Overview

### Constructor

```cpp
explicit DoubleBuffer(const LibXR::RawData& raw_data);
```

- Accepts a block of continuous memory and splits it into two buffers.

### Data Operation Interfaces

- `uint8_t* ActiveBuffer()`: Get the currently active buffer.
- `uint8_t* PendingBuffer()`: Get the pending buffer.
- `bool FillActive(const uint8_t* data, size_t len)`: Write data to the active buffer.
- `bool FillPending(const uint8_t* data, size_t len)`: Write data to the pending buffer.
- `void EnablePending()`: Manually mark the pending buffer as valid (used with `FillActive`).
- `bool HasPending() const`: Check if there is a pending buffer ready to be switched.
- `void Switch()`: Switch between active and pending buffers.
- `size_t GetPendingLength() const`: Get the valid data length in the pending buffer.
- `size_t SetPendingLength(size_t size)`: Set the valid data length in the pending buffer.
- `size_t Size() const`: Get the capacity of each buffer.

## Usage Example

```cpp
LibXR::RawData mem{malloc(512), 512};
LibXR::DoubleBuffer buf(mem);

// First write to the pending buffer
buf.FillPending(data1, len1);
if (buf.HasPending()) {
    buf.Switch();  // Switch to the new active buffer
}

// Fill the current active buffer for initial transmission
buf.FillActive(data2, len2);
buf.EnablePending();  // Mark the current active as the next pending
```

## Notes

- You must call `Switch()` after filling the pending buffer to activate it.
- Dynamic allocation is not supported; memory must be prepared before construction.
- `FillPending` is not reentrant; ensure the pending state is false before calling.
- `EnablePending()` is used with `FillActive()` to support proactive switching.

## Application Scenarios

- USB CDC / UART data transmission
- Optimized DMA data streaming
- Ping-pong buffering communication mechanism
