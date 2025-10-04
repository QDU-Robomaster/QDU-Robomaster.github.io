---
id: double_buffer
title: 双缓冲区
sidebar_position: 7
---

# 双缓冲区（DoubleBuffer）

`LibXR::DoubleBuffer` 是一个嵌入式场景下的双缓冲数据结构，主要用于 DMA、USB 等高速传输中数据的无缝切换与填充控制。支持主动与备用缓冲的数据管理机制，在性能要求高的数据发送任务中尤为适用。

## 核心特性

- 将一块连续内存分为两个缓冲区。
- 支持主动缓冲（active）与备用缓冲（pending）之间切换。
- 提供对两个缓冲区的直接访问与数据填充接口。
- 支持手动切换与自动有效性检测。
- 可查询备用区是否准备好、已填充长度。

## 接口概览

### 构造函数

```cpp
explicit DoubleBuffer(const LibXR::RawData& raw_data);
```

- 接收一段连续内存，并自动划分为两个缓冲区。

### 数据操作接口

- `uint8_t* ActiveBuffer()`：获取当前使用的缓冲区。
- `uint8_t* PendingBuffer()`：获取备用缓冲区。
- `bool FillActive(const uint8_t* data, size_t len)`：写入当前缓冲区。
- `bool FillPending(const uint8_t* data, size_t len)`：写入备用缓冲区。
- `void EnablePending()`：手动标记备用区为有效（与 FillActive 配合使用）。
- `bool HasPending() const`：是否存在准备切换的缓冲区。
- `void Switch()`：切换 active/pending 缓冲。
- `size_t GetPendingLength() const`：获取备用缓冲中的有效数据长度。
- `size_t SetPendingLength(size_t size)`：设置备用缓冲的有效数据长度。
- `size_t Size() const`：每个缓冲区的容量。

## 使用示例

```cpp
LibXR::RawData mem{malloc(512), 512};
LibXR::DoubleBuffer buf(mem);

// 第一次写入备用缓冲区
buf.FillPending(data1, len1);
if (buf.HasPending()) {
    buf.Switch();  // 切换为新的 active 缓冲
}

// 填充当前 active 区用于初始传输
buf.FillActive(data2, len2);
buf.EnablePending();  // 标记当前 active 将作为 pending 切换
```

## 注意事项

- 填充备用区后需调用 `Switch()` 才能激活其数据。
- 不支持动态分配，内存必须在构造前准备。
- `FillPending` 不可重入，调用前应确认 pending 状态为 false。
- `EnablePending()` 与 `FillActive()` 配合实现主动缓存切换。

## 应用场景

- USB CDC / UART 数据发送
- DMA 数据流优化
- 双缓存 ping-pong 通信机制
