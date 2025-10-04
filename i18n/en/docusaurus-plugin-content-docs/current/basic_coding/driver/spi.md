---
id: spi
title: SPI
sidebar_position: 4
---

# SPI (Serial Peripheral Interface)

`LibXR::SPI` provides a platform-independent abstract interface for SPI bus communication. It supports full-duplex transmission, register read/write, and communication parameter configuration, suitable for peripherals like sensors and displays.

## Interface Overview

### Enum Types

```cpp
enum class ClockPolarity : uint8_t {
  LOW,   // Idle low
  HIGH   // Idle high
};

enum class ClockPhase : uint8_t {
  EDGE_1, // Sample on first clock edge
  EDGE_2  // Sample on second clock edge
};
```

### Configuration Structure

```cpp
struct Configuration {
  ClockPolarity clock_polarity;
  ClockPhase clock_phase;
};
```

### Core Interfaces

```cpp
// Configure SPI communication parameters
virtual ErrorCode SetConfig(Configuration config) = 0;

// Full-duplex read and write
virtual ErrorCode ReadAndWrite(RawData read_data, ConstRawData write_data, OperationRW& op) = 0;

// Read data (simplified)
virtual ErrorCode Read(RawData read_data, OperationRW& op);

// Write data (simplified)
virtual ErrorCode Write(ConstRawData write_data, OperationRW& op);

// Write to register
virtual ErrorCode MemWrite(uint16_t reg, ConstRawData write_data, OperationRW& op) = 0;

// Read from register
virtual ErrorCode MemRead(uint16_t reg, RawData read_data, OperationRW& op) = 0;
```

### Operation Structure

```cpp
struct ReadWriteInfo {
  RawData read_data;
  ConstRawData write_data;
  OperationRW op;
};
```

## Feature Summary

- Supports SPI polarity and phase configuration;  
- Provides full-duplex transmission interface, suitable for various SPI devices;  
- Encapsulates common register read/write operations to simplify driver development;  
- General operation model supports synchronous, callback, and polling modes;  
- Independent of platform implementation, enabling cross-platform adaptability.
