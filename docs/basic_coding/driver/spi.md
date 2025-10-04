---
id: spi
title: SPI
sidebar_position: 4
---

# SPI（串行外设接口）

`LibXR::SPI` 提供平台无关的 SPI 总线通信抽象接口，支持全双工传输、寄存器读写和通信参数配置，适用于传感器、显示器等外设驱动。

## 接口概览

### 枚举类型

```cpp
enum class ClockPolarity : uint8_t {
  LOW,   // 空闲时低电平
  HIGH   // 空闲时高电平
};

enum class ClockPhase : uint8_t {
  EDGE_1, // 第一个时钟边沿采样
  EDGE_2  // 第二个时钟边沿采样
};
```

### 配置结构

```cpp
struct Configuration {
  ClockPolarity clock_polarity;
  ClockPhase clock_phase;
};
```

### 主要接口

```cpp
// 配置 SPI 通信参数
virtual ErrorCode SetConfig(Configuration config) = 0;

// 全双工读写
virtual ErrorCode ReadAndWrite(RawData read_data, ConstRawData write_data, OperationRW& op) = 0;

// 读取数据（简化接口）
virtual ErrorCode Read(RawData read_data, OperationRW& op);

// 写入数据（简化接口）
virtual ErrorCode Write(ConstRawData write_data, OperationRW& op);

// 写寄存器
virtual ErrorCode MemWrite(uint16_t reg, ConstRawData write_data, OperationRW& op) = 0;

// 读寄存器
virtual ErrorCode MemRead(uint16_t reg, RawData read_data, OperationRW& op) = 0;
```

### 操作结构体

```cpp
struct ReadWriteInfo {
  RawData read_data;
  ConstRawData write_data;
  OperationRW op;
};
```

## 特性总结

- 支持 SPI 的极性与相位配置；
- 提供全双工传输接口，适配多种 SPI 外设；
- 封装常用寄存器读写接口，简化驱动开发；
- 通用操作模型，支持同步、回调、轮询等模式；
- 独立于平台实现，便于跨平台适配。
