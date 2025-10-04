---
id: core-mem
sidebar_position: 11
title: 快速内存拷贝
---

# Memory FastCopy

`LibXR::Memory::FastCopy`
是一条经过对齐与突发（burst）拷贝优化的内存复制路径，用于替代通用 `memcpy` 的热路径场景（如环形缓冲搬运、IO 收发缓存打包等）。它会根据源/目的指针的对齐关系，自动选择 8/4/2/1 字节的最优拷贝粒度，并进行环路展开以提升吞吐。

> 本实现仅面向非重叠（non-overlapping）的拷贝语义。

## API

``` cpp
namespace LibXR {
class Memory {
 public:
  /**
   * @brief 快速内存拷贝
   * @param dst  目标地址
   * @param src  源地址
   * @param size 拷贝字节数
   */
  static void FastCopy(void* dst, const void* src, size_t size);
};
} // namespace LibXR
```

## 使用示例

``` cpp
#include "libxr_def.hpp"

uint8_t src[256];
uint8_t dst[256];

// ... 填充 src ...

// 非重叠快速复制
LibXR::Memory::FastCopy(dst, src, sizeof(src));
```
