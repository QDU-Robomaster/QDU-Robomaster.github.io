---
id: core-mem
sidebar_position: 11
title: Fast Memory Copy
---

# Memory FastCopy

`LibXR::Memory::FastCopy` is an optimized memory copy path with alignment and burst-copy improvements, designed to replace the generic `memcpy` in hot-path scenarios (such as ring buffer transfers or IO send/receive buffer packaging). It automatically chooses the optimal copy granularity of 8/4/2/1 bytes based on the alignment of source/destination pointers, and applies loop unrolling to improve throughput.

> This implementation only supports **non-overlapping** copy semantics;

## API

``` cpp
namespace LibXR {
class Memory {
 public:
  /**
   * @brief Fast memory copy
   * @param dst  Destination address
   * @param src  Source address
   * @param size Number of bytes to copy
   */
  static void FastCopy(void* dst, const void* src, size_t size);
};
} // namespace LibXR
```

## Usage Example

``` cpp
#include "libxr_def.hpp"

uint8_t src[256];
uint8_t dst[256];

// ... fill src ...

// Non-overlapping fast copy
LibXR::Memory::FastCopy(dst, src, sizeof(src));
```
