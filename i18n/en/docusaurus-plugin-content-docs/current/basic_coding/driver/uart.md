---
id: uart
title: UART
sidebar_position: 2
---

# UART (Universal Asynchronous Receiver-Transmitter)

`LibXR::UART` provides an abstract base class for general asynchronous serial communication. It supports configuration of baud rate, data bits, stop bits, and parity, and encapsulates unified read/write interfaces for easy cross-platform adaptation.

## Interface Overview

### Enum Type

```cpp
enum class Parity : uint8_t {
  NO_PARITY = 0,  // No parity
  EVEN = 1,       // Even parity
  ODD = 2         // Odd parity
};
```

### Configuration Structure

```cpp
struct Configuration {
  uint32_t baudrate;  // Baud rate
  Parity parity;      // Parity mode
  uint8_t data_bits;  // Data bit length
  uint8_t stop_bits;  // Stop bit length
};
```

### Construction and Configuration

```cpp
UART(ReadPort* read_port, WritePort* write_port);
virtual ErrorCode SetConfig(Configuration config) = 0;
```

### Data Transmission Interfaces

```cpp
template <typename OperationType>
ErrorCode Write(ConstRawData data, OperationType&& op);

template <typename OperationType>
ErrorCode Read(RawData data, OperationType&& op);
```

`Write` and `Read` interfaces are based on the unified `Port + Operation` abstraction, supporting blocking, callback, and polling models. They are suitable for both main loop and asynchronous environments.

## Feature Summary

- Full configuration support for baud rate, data bits, stop bits, and parity;  
- Unified read/write interfaces supporting multiple I/O operation models;  
- Platform-independent, facilitating cross-platform adaptation and abstraction;  
- Typically implemented using underlying hardware drivers for TX/RX logic, with users not needing to handle subclass details.
