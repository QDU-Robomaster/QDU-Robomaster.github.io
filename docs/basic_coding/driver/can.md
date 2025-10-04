---
id: can
title: 控制器局域网
sidebar_position: 5
---

# CAN / FDCAN（控制器局域网）

`LibXR::CAN` 与 `LibXR::FDCAN` 提供跨平台的控制器局域网通信接口，支持经典 CAN 消息与 FD CAN 消息收发，具备回调注册与过滤功能，适用于车辆通信、传感器网络等场景。

## CAN 接口说明

### 消息类型

```cpp
enum class Type : uint8_t {
  STANDARD,         // 标准帧
  EXTENDED,         // 扩展帧
  REMOTE_STANDARD,  // 标准远程帧
  REMOTE_EXTENDED,  // 扩展远程帧
};
```

### 消息结构

```cpp
struct ClassicPack {
  uint32_t id;       // 消息 ID
  Type type;         // 消息类型
  uint8_t data[8];   // 数据，最多 8 字节
};
```

### 注册回调

```cpp
using Callback = LibXR::Callback<const ClassicPack &>;
void Register(Callback cb, Type type,
              FilterMode mode = FilterMode::ID_RANGE,
              uint32_t start_id_mask = 0,
              uint32_t end_id_match = UINT32_MAX);
```

- 支持掩码或区间两种过滤模式
- 可按消息类型分别注册回调
- 回调类型为 `Callback<const ClassicPack&>`

### 添加消息

```cpp
virtual ErrorCode AddMessage(const ClassicPack &pack) = 0;
```

- 派生类需实现该接口完成消息注入

---

## FDCAN 接口扩展

### FD 消息结构

```cpp
struct FDPack {
  uint32_t id;        // 消息 ID
  Type type;          // 消息类型
  uint8_t len;        // 数据长度
  uint8_t data[64];   // 数据，最多 64 字节
};
```

### 注册回调

```cpp
using CallbackFD = LibXR::Callback<const FDPack &>;
void Register(CallbackFD cb, Type type,
              FilterMode mode = FilterMode::ID_RANGE,
              uint32_t start_id_mask = 0,
              uint32_t end_id_mask = UINT32_MAX);
```

- 支持按 ID 区间或掩码过滤
- 每种类型可独立注册多个回调

### 添加 FD 消息

```cpp
virtual ErrorCode AddMessage(const FDPack &pack) = 0;
```

---

## 特性总结

- 支持标准 CAN 与 FDCAN 协议；
- 消息过滤灵活，支持掩码与范围；
- 可在 ISR 安全调用回调；
- 支持多订阅者、无锁列表；
- 抽象接口适用于多平台驱动扩展。
