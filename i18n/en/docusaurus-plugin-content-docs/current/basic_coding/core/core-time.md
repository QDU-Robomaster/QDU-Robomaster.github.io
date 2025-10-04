---
id: core-time
title: Timestamps and Time Differences
sidebar_position: 7
---

# Timestamps and Time Differences

This module defines microsecond- and millisecond-level timestamp types `MicrosecondTimestamp` and `MillisecondTimestamp`, which represent system clock times and can be used to compute the time difference between two points. It is suitable for scenarios such as timers, delay control, and performance analysis.

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

Represents a microsecond-level timestamp. Supports implicit conversion to `uint64_t` and can be used to compute time differences.

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

Represents the time difference between two `MicrosecondTimestamp` instances, in microseconds. Supports conversion to seconds and milliseconds.

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

Represents a millisecond-level timestamp. Supports implicit conversion to `uint32_t` and can be used to compute time differences.

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

Represents the time difference between two `MillisecondTimestamp` instances, in milliseconds. Supports conversion to seconds and microseconds.

## Overflow Handling

Time difference computations handle timestamp wrap-around (e.g., overflow), making it suitable for system clock management on embedded platforms.

---

This module forms the basis of time handling in LibXR and can be used with IO, schedulers, timers, and other modules to ensure precision and portability in time-related operations.
