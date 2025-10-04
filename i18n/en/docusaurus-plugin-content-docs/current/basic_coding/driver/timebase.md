---
id: timebase
title: Timebase
sidebar_position: 11
---

# Timebase

`LibXR::Timebase` is a cross-platform abstract class provided by LibXR for accessing high-precision microsecond and millisecond timestamps. It serves as the foundation for all time-based scheduling or delay control modules in the system.

## Interface Definition

```cpp
class Timebase {
public:
  Timebase(uint64_t max_valid_us = UINT64_MAX, uint32_t max_valid_ms = UINT32_MAX);

  // Get current time in microseconds
  static TimestampUS GetMicroseconds();

  // Get current time in milliseconds
  static TimestampMS GetMilliseconds();

  // Must be implemented by subclass: get microsecond-level timestamp
  virtual TimestampUS _get_microseconds() = 0;

  // Must be implemented by subclass: get millisecond-level timestamp
  virtual TimestampMS _get_milliseconds() = 0;

  static inline Timebase *timebase = nullptr;
};
```

## Usage Notes

- Upon instantiation, it is automatically registered as the global `timebase`;  
- All static methods access the current `timebase` instance;  
- Subclasses must provide a concrete time source (e.g., timer registers, system tick, etc.);  
- Provides both millisecond and microsecond timestamps for use in timers, timeout detection, etc.;  
- After initialization, you can directly call `Timebase::GetMilliseconds()` to get the current system time.
