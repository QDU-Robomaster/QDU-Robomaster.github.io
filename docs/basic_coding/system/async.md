---
id: async
title: 异步任务
sidebar_position: 6
---

# ASync（异步任务）

`LibXR::ASync` 通过 **专用工作线程 + 计数信号量** 为耗时操作提供简单、低开销的异步执行能力。用户可在任务或中断回调中分配 `Job` 回调，框架在后台线程中顺序执行并更新状态，无需自行管理线程生命周期或复杂的队列。

> **典型应用**：SPI 采样结束中断后触发 FFT 计算；主循环内提交 OTA 校验；GPIO ISR 内上报事件至云端等。

## 设计要点

| 目标             | 说明                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **线程独占执行** | 每个 `ASync` 实例内部创建 1 个工作线程，通过 `Semaphore` 唤醒执行 `Job`，避免任务间竞态。            |
| **ISR 安全提交** | `AssignJobFromCallback()` 可在中断/回调环境调用，采用 `Semaphore::PostFromCallback()` 安全唤醒线程。 |
| **状态可查询**   | `GetStatus()` 返回 `READY/BUSY/DONE`，任务完成后自动复位，可用于轮询或超时检测。                     |
| **依赖可裁剪**   | 仅依赖 `Thread` 与 `Semaphore` 封装；裸机模式下可退化为同步执行。        |
| **极简接口**     | 不引入模板队列或动态分配，接口面向回调 `Callback<ASync*>`，易于绑定成员函数或自由函数。              |

## 核心接口

```cpp
class ASync {
public:
  enum class Status : uint8_t { READY, BUSY, DONE };

  ASync(size_t stack_depth, Thread::Priority priority);

  using Job = LibXR::Callback<ASync*>;
  ErrorCode AssignJob(Job job);                       // 任务上下文提交
  void       AssignJobFromCallback(Job job, bool isr);// ISR/回调上下文提交
  Status     GetStatus();                             // 查询状态并自动复位
};
```

### 错误码

* `ErrorCode::OK`      提交成功
* `ErrorCode::BUSY`    已有任务在执行

## 使用示例

```cpp
#include <libxr/async.hpp>

LibXR::ASync async_worker(2048, LibXR::Thread::Priority::NORMAL);

void HeavyCalc(bool, int *, LibXR::ASync*)
{
  DoFFT();   // 耗时 5‑10 ms
}

int arg = 0;
auto async_job = LibXR::ASync::Job::Create(HeavyCalc, &arg);

void SensorISR()
{
  // 采样完成后在中断中提交计算任务
  async_worker.AssignJobFromCallback(HeavyCalc, true);
}

void Loop()
{
  // ...

  if (async_worker.GetStatus()==LibXR::ASync::Status::DONE) {
    PublishResult();
  }

  // ...
}
```

## 平台适配

`ASync` 本身不依赖特定 OS，所有平台差异已由 `Thread` 与 `Semaphore` 层吸收：

| 功能     | 依赖模块                        |
| -------- | ------------------------------- |
| 线程创建 | `Thread::Create()`              |
| 任务唤醒 | `Semaphore::Post/Wait`          |
| ISR 兼容 | `Semaphore::PostFromCallback()` |

裸机模式下可在 `async.cpp` 中改为 **同步直调**：若系统无线程支持，`AssignJob()` 直接调用 `job.Run()`，`ASync` 退化为函数调用包装。

设计理念中Callback不允许阻塞/延时，但是此处复用了Callback的接口与数据结构，为防止混淆重命名为`Job`。
