---
id: timer
title: 定时器
sidebar_position: 7
---

# Timer（定时器）

`LibXR::Timer` 实现了**跨平台的周期性任务调度**，支持高精度多任务定时执行。它提供统一的定时任务创建、启动、停止、删除及周期调整等接口，底层利用 `Thread::SleepUntil` 实现精确调度，适配多线程和裸机场景。可用于定时回调、周期控制、异步定时任务等各种需求。

## 设计要点

| 目标          | 说明                                        |
| ----------- | ----------------------------------------- |
| **跨平台统一**   | 定时调度机制与 OS 解耦，兼容多线程与裸机环境。                 |
| **多任务支持**   | 支持并发多个周期性任务调度，任务独立注册与管理。                  |
| **高精度**     | 任务调度精度达 1ms，基于 `Thread::SleepUntil` 精确控制。 |
| **灵活接口**    | 支持任务周期动态调整、启动/停止/删除/添加等全生命周期操作。           |
| **线程安全可裁剪** | 内部自动管理任务线程，裸机模式下自动刷新，无需用户主动调用。            |

## 公开接口速览

| 方法                                                                                                 | 作用                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `template <typename Arg> static TimerHandle CreateTask(void (*fun)(Arg), Arg arg, uint32_t cycle)` | 创建周期性任务（周期 ms），返回任务句柄。                      |
| `static void Start(TimerHandle handle)`                                                            | 启动指定任务。                                     |
| `static void Stop(TimerHandle handle)`                                                             | 停止指定任务。                                     |
| `static void SetCycle(TimerHandle handle, uint32_t cycle)`                                         | 修改任务周期。                                     |
| `static void Add(TimerHandle handle)`                                                              | 将任务添加到调度列表（首次添加会自动启动管理线程）。                  |
| `static void Refresh()`                                                                            | 主动刷新所有任务（轮询场景下调用，通常由定时线程自动执行）。              |
| `static void RefreshTimerInIdle()`                                                                 | 在裸机下**由 Thread 延时/Mutex/信号量自动调用**，用户无需手动调用。 |

> **提示**：所有定时任务周期单位均为**毫秒**，所有任务由 Timer 管理线程或主循环自动调度，无需手动管理任务遍历与时间计算。裸机场景下，Thread 延时、Mutex 和信号量等待时会自动刷新定时器，无需用户干预。

## 典型用法

```cpp
#include <timer.hpp>

void PrintHello(int* value) {
    printf("Hello, value = %d\n", *value);
}

int main() {
    int arg = 123;
    // 创建定时任务，每 1000ms 调用一次 PrintHello
    auto handle = LibXR::Timer::CreateTask(PrintHello, &arg, 1000);

    LibXR::Timer::Add(handle);    // 加入调度并自动启动定时线程
    LibXR::Timer::Start(handle);  // 启动任务

    while (1) {
        // 主循环，裸机下无需主动刷新定时器
        // 多线程下可执行其它任务
        LibXR::Thread::Sleep(UINT32_MAX);
    }
}
```

## 平台适配概览

| 场景       | 关键实现                      | 调度机制说明                             |
| -------- | ------------------------- | ---------------------------------- |
| 多线程/RTOS | Thread::SleepUntil + 管理线程 | 自动启动管理线程，1ms 精度循环检查并调度任务。          |
| 裸机/单线程   | RefreshTimerInIdle 自动调用   | Thread 延时/Mutex/信号量等待时自动刷新，无需手动调用。 |

移植到新平台时，仅需保证 Thread 及 Timebase 支持，无需修改 Timer 主体逻辑。

## 参考实现细节

* 每个定时任务都封装为 ControlBlock，通过 List 链表统一管理；
* CreateTask 支持带参数回调，内部类型安全，无需手动绑定上下文；
* Add 第一次调用会自动分配任务列表与管理线程（多线程环境）；
* Refresh 遍历所有已启用任务，按周期自动计数与触发，无需用户管理遍历与计时；
* 裸机下，Thread 延时/Mutex/信号量等待自动刷新定时器，确保任务及时调度；
* 支持任务周期动态调整、运行中启停与删除，接口灵活安全；
* 断言机制保证非法操作（如多次添加、错误删除）即时报错。
