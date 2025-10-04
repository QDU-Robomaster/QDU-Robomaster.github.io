---
id: uart
title: 串口
sidebar_position: 2
---

# UART（通用异步收发）

`LibXR::UART` 提供通用异步串口通信接口的抽象基类，支持配置波特率、数据位、停止位和校验位等参数，并封装统一的读写接口，便于跨平台适配。

## 接口概览

### 枚举类型

```cpp
enum class Parity : uint8_t {
  NO_PARITY = 0,  // 无校验
  EVEN = 1,       // 偶校验
  ODD = 2         // 奇校验
};
```

### 配置结构体

```cpp
struct Configuration {
  uint32_t baudrate;  // 波特率
  Parity parity;      // 校验模式
  uint8_t data_bits;  // 数据位长度
  uint8_t stop_bits;  // 停止位长度
};
```

### 构造与配置

```cpp
UART(ReadPort* read_port, WritePort* write_port);
virtual ErrorCode SetConfig(Configuration config) = 0;
```

### 数据收发接口

```cpp
template <typename OperationType>
ErrorCode Write(ConstRawData data, OperationType&& op);

template <typename OperationType>
ErrorCode Read(RawData data, OperationType&& op);
```

`Write` 与 `Read` 接口基于统一的 `Port + Operation` 抽象，支持阻塞、回调、轮询等模式，便于在主循环或异步环境中使用。

## 特性总结

- 支持波特率、数据位、停止位、校验方式的完整配置；
- 读写接口统一封装，支持多种 I/O 操作模型；
- 平台无关，便于跨平台适配与封装；
- 通常结合底层硬件驱动实现接收发送逻辑，用户无需关心派生细节。
