---
id: thread
title: 线程
sidebar_position: 3
---

# Thread（线程）

`LibXR::Thread` 封装了 **线程的创建、调度与时间控制**，在不同平台呈现统一的面向对象接口。目前已提供 **POSIX / FreeRTOS / ThreadX / Bare‑metal** 等多种适配实现；用户无需关心具体 OS 调用，即可在多种环境下保持一致的线程逻辑。

## 设计要点

| 目标         | 说明                                                                                  |
| ---------- | ----------------------------------------------------------------------------------- |
| **跨平台**    | 统一 API 隐藏 `pthread`, `xTask`, `TX_THREAD` 等差异。 |
| **轻量可裁剪**  | 仅依赖 C++17 与可选 RTOS 头文件；可在无 OS 场景开启。                            |
| **优先级枚举**  | 采用 `enum class Priority { IDLE…REALTIME }`，由每个移植层映射到本地优先级区间，避免直接暴露 OS 常量。           |
| **时间基准统一** | 所有 `Sleep` / `SleepUntil` 以 **毫秒** 为单位，`GetTime()` 返回系统启动后的毫秒计数，方便跨平台超时逻辑。          |

## 公开接口速览

| 方法                                                                                                               | 作用                                                 |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `template <typename Arg> void Create(Arg arg, void (*func)(Arg), const char* name, size_t stack, Priority prio)` | 创建并启动线程，支持任意函数签名；栈深、优先级参数由各平台解释。                   |
| `static Thread Current()`                                                                                        | 获取当前线程对象包装。                                        |
| `static uint32_t GetTime()`                                                                                      | 返回自启动以来的毫秒计数（32 位环绕）。                              |
| `static void Sleep(uint32_t ms)`                                                                                 | 阻塞当前线程指定毫秒。                                        |
| `static void SleepUntil(TimestampMS& last, uint32_t period)`                                                     | 周期性延时，常用于固定周期循环。`last` 在函数内自动更新。                   |
| `static void Yield()`                                                                                            | 主动让出 CPU，调用底层 `sched_yield()` / `taskYIELD()` 等实现。 |
| `operator libxr_thread_handle()`                                                                                 | 隐式转换为底层线程句柄，供与平台 API 交互。                           |

> **提示**：若系统不支持线程优先级或实时调度，可在移植层内部降级处理，不影响上层逻辑。

## 典型用法

线程函数的参数一定要与 `Create` 函数的 `arg` 参数类型一致，否则无法识别。

```cpp
#include <thread.hpp>

void Blink(int* arg) {
    auto last = LibXR::Thread::GetTime();
    while (true) {
        ToggleLED();            // 用户自定义函数
        LibXR::Thread::SleepUntil(last, 500); // 500 ms 间隔
    }
}

int main() {
    int arg = 0;
    LibXR::Thread t;
    t.Create(&arg, Blink, "blink", 2048, LibXR::Thread::Priority::MEDIUM);
    // 主线程继续执行其它任务 …
    for (;;) {
        LibXR::Thread::Yield();
    }
}
```

## 平台适配概览

| 平台                       | 头/源文件                       | 关键映射                                                          |
| ------------------------ | --------------------------- | ------------------------------------------------------------- |
| **Linux / POSIX**        | `thread.hpp` + `thread.cpp` | `pthread_create`, `clock_nanosleep`, `sched_yield`            |
| **FreeRTOS**             | `thread.hpp` + `thread.cpp` | `xTaskCreate`, `vTaskDelay`, `xTaskGetTickCount`              |
| **ThreadX (Azure RTOS)** | `thread.hpp` + `thread.cpp` | `tx_thread_create`, `tx_thread_sleep`, `tx_thread_relinquish` |
| **Bare‑metal**           | `thread.hpp` + `thread.cpp` | 轮询 `Timebase` + `Timer::RefreshTimerInIdle` 实现软延时             |

移植新平台时，仅需：

1. 在 `platform/<os>/` 下实现对应的 `thread.hpp / thread.cpp`；
2. 在 `libxr_system.hpp` 中 typedef `libxr_thread_handle`；
3. 更新构建系统以选择正确源文件。

## 参考实现细节

* POSIX 版本优先尝试 `SCHED_FIFO` 并根据可用优先级范围映射 `Priority`；否则回退默认策略并给出日志警告。
* FreeRTOS/ThreadX 版本通过 `configMAX_PRIORITIES` 或 `TX_MAX_PRIORITIES` 动态计算优先级步长，确保与内核配置一致。
* Bare-metal 版本创建线程时会直接开始运行线程函数，无法返回主线程。
