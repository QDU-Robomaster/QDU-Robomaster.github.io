---
id: mutex
title: 互斥锁
sidebar_position: 4
---

# Mutex（互斥锁）

`LibXR::Mutex` 提供轻量级、跨平台的 **线程互斥** 机制，用于保护多任务环境中的临界区。当前支持 **POSIX pthread** 与 **FreeRTOS/ThreadX** 实现，裸机环境可退化为空实现（自旋等待或禁用中断临界区）。

> **⚠️ 注意**：互斥锁 **只能** 在任务（线程）上下文调用，**不支持** 在中断服务程序（ISR）中加/解锁。

## 设计要点

| 目标 | 说明 |
| ---- | ---- |
| **跨平台** | 隐藏 `pthread_mutex`, `xSemaphoreHandle`, `TX_MUTEX` 等差异。|
| **RAII 友好** | 内置 `LockGuard`，避免忘记 Unlock。|
| **优先级继承** | 在支持的 RTOS 上启用互斥量优先级继承，减小优先级反转风险。|
| **轻量低开销** | 调用路径贴近底层系统调用。|

## 核心接口

```cpp
class Mutex {
public:
  Mutex();
  ~Mutex();

  ErrorCode Lock();     // 阻塞加锁
  ErrorCode TryLock();  // 非阻塞尝试
  void Unlock();        // 解锁

  class LockGuard {
  public:
    explicit LockGuard(Mutex& m);
    ~LockGuard();
  };
};
```

## 使用示例

```cpp
LibXR::Mutex m;
int shared = 0;

void Worker()
{
  LibXR::Mutex::LockGuard lock(m);  // 构造时加锁
  shared++;                         // 安全访问
}                                    // 析构时自动解锁
```
