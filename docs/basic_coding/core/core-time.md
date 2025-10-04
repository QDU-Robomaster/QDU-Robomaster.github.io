---
id: core-time
title: 时间戳与时间差
sidebar_position: 7
---

# 时间戳与时间差

本模块定义了微秒级和毫秒级的时间戳类型 `MicrosecondTimestamp` 和 `MillisecondTimestamp`，用于表示系统时钟时间，并可计算两个时间点之间的时间差。适用于定时器、延迟控制、性能分析等场景。

## MicrosecondTimestamp

```cpp
class MicrosecondTimestamp {
 public:
  MicrosecondTimestamp();
  MicrosecondTimestamp(uint64_t microsecond);
  operator uint64_t() const;
  Duration operator-(const MicrosecondTimestamp &old) const;
};
```

表示微秒级时间戳，支持隐式转换为 `uint64_t`，可计算时间差。

### Duration

```cpp
class Duration {
 public:
  Duration(uint64_t diff);
  operator uint64_t() const;
  double ToSecond() const;
  float ToSecondf() const;
  uint64_t ToMicrosecond() const;
  uint32_t ToMillisecond() const;
};
```

表示两个 `MicrosecondTimestamp` 之间的差值，单位为微秒。支持以秒/毫秒返回差值。

## MillisecondTimestamp

```cpp
class MillisecondTimestamp {
 public:
  MillisecondTimestamp();
  MillisecondTimestamp(uint32_t millisecond);
  operator uint32_t() const;
  Duration operator-(MillisecondTimestamp &old);
};
```

表示毫秒级时间戳，支持隐式转换为 `uint32_t`，可计算时间差。

### Duration

```cpp
class Duration {
 public:
  Duration(uint32_t diff);
  operator uint32_t() const;
  double ToSecond() const;
  float ToSecondf() const;
  uint64_t ToMicrosecond() const;
  uint32_t ToMillisecond() const;
};
```

表示两个 `MillisecondTimestamp` 之间的差值，单位为毫秒。支持以秒/微秒返回差值。

## 溢出处理

时间差计算中已考虑时间戳回绕（如溢出），可用于嵌入式平台上的系统时钟处理。

---

本模块是 LibXR 时间处理的基础，可结合 IO、调度器、定时器等模块使用，确保时间相关操作的精度与可移植性。
