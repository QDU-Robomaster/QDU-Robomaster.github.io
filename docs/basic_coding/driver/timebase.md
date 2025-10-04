---
id: timebase
title: 时间基准
sidebar_position: 11
---

# Timebase（时间基准）

`LibXR::Timebase` 是 LibXR 提供的跨平台时间基准抽象类，用于提供高精度的微秒/毫秒时间戳访问接口。它是系统中所有基于时间调度或延迟控制模块的基础。

## 接口定义

```cpp
class Timebase {
public:
  Timebase(uint64_t max_valid_us = UINT64_MAX, uint32_t max_valid_ms = UINT32_MAX);

  // 获取当前时间（微秒）
  static TimestampUS GetMicroseconds();

  // 获取当前时间（毫秒）
  static TimestampMS GetMilliseconds();

  // 派生类需实现：获取微秒级时间戳
  virtual TimestampUS _get_microseconds() = 0;

  // 派生类需实现：获取毫秒级时间戳
  virtual TimestampMS _get_milliseconds() = 0;

  static inline Timebase *timebase = nullptr;
};
```

## 使用说明

- 实例化时会自动注册为全局 `timebase`；
- 所有静态接口均通过当前 `timebase` 实例访问；
- 派生类需提供具体的时间来源（如定时器寄存器、系统 tick 等）；
- 提供毫秒与微秒级时间戳，用于定时器、超时检测等模块；
- 初始化后可直接调用静态方法 `Timebase::GetMilliseconds()` 获取当前系统时间。
