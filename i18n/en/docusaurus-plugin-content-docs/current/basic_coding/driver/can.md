---
id: can
title: Controller Area Network
sidebar_position: 5
---

# CAN / FDCAN (Controller Area Network)

`LibXR::CAN` and `LibXR::FDCAN` provide cross-platform interfaces for Controller Area Network (CAN) communication, supporting both classic CAN and FD CAN message transmission and reception. They include callback registration and filtering features, making them suitable for vehicle communication, sensor networks, and other applications.

## CAN Interface Description

### Message Type

```cpp
enum class Type : uint8_t {
  STANDARD,         // Standard frame
  EXTENDED,         // Extended frame
  REMOTE_STANDARD,  // Standard remote frame
  REMOTE_EXTENDED,  // Extended remote frame
};
```

### Message Structure

```cpp
struct ClassicPack {
  uint32_t id;       // Message ID
  Type type;         // Message type
  uint8_t data[8];   // Data, up to 8 bytes
};
```

### Registering Callback

```cpp
using Callback = LibXR::Callback<const ClassicPack &>;
void Register(Callback cb, Type type,
              FilterMode mode = FilterMode::ID_RANGE,
              uint32_t start_id_mask = 0,
              uint32_t end_id_match = UINT32_MAX);
```

- Supports both mask and range-based filtering
- Allows separate callbacks per message type
- Callback type is `Callback<const ClassicPack&>`

### Adding Message

```cpp
virtual ErrorCode AddMessage(const ClassicPack &pack) = 0;
```

- Subclasses must implement this interface to inject messages

---

## FDCAN Interface Extensions

### FD Message Structure

```cpp
struct FDPack {
  uint32_t id;        // Message ID
  Type type;          // Message type
  uint8_t len;        // Data length
  uint8_t data[64];   // Data, up to 64 bytes
};
```

### Registering Callback

```cpp
using CallbackFD = LibXR::Callback<const FDPack &>;
void Register(CallbackFD cb, Type type,
              FilterMode mode = FilterMode::ID_RANGE,
              uint32_t start_id_mask = 0,
              uint32_t end_id_mask = UINT32_MAX);
```

- Supports ID range or mask filtering
- Allows multiple independent callbacks per type

### Adding FD Message

```cpp
virtual ErrorCode AddMessage(const FDPack &pack) = 0;
```

---

## Feature Summary

- Supports both standard CAN and FDCAN protocols;  
- Flexible message filtering with mask and range options;  
- ISR-safe callback invocation;  
- Supports multiple subscribers and lock-free lists;  
- Abstract interfaces suitable for multi-platform driver extensions.
