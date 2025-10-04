---
id: timer
title: Timer
sidebar_position: 7
---

# Timer

`LibXR::Timer` implements **cross-platform periodic task scheduling**, supporting high-precision timed execution across multiple tasks. It provides unified interfaces for creating, starting, stopping, deleting, and adjusting timers. Internally, it uses `Thread::SleepUntil` for precise scheduling, working in both multithreaded and bare-metal environments. It is suitable for timed callbacks, periodic control, asynchronous tasks, and more.

## Design Highlights

| Goal                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Cross-platform**   | Timer decouples scheduling from OS and supports both multithreaded and bare-metal systems. |
| **Multitasking**     | Supports concurrent periodic tasks with independent registration and control. |
| **High Precision**   | 1ms precision using `Thread::SleepUntil`.                                 |
| **Flexible Interface** | Supports dynamic period changes and full task lifecycle operations.         |
| **Thread-safe and Optional** | Manages its own thread in RTOS; auto-refresh in bare-metal without user intervention. |

## Public Interface Overview

| Method                                                                                                 | Description                                         |
|--------------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| `template <typename Arg> static TimerHandle CreateTask(void (*fun)(Arg), Arg arg, uint32_t cycle)`     | Create periodic task (in ms), returns handle.       |
| `static void Start(TimerHandle handle)`                                                                | Start specified task.                               |
| `static void Stop(TimerHandle handle)`                                                                 | Stop specified task.                                |
| `static void SetCycle(TimerHandle handle, uint32_t cycle)`                                             | Modify task cycle.                                  |
| `static void Add(TimerHandle handle)`                                                                  | Add task to scheduler (automatically starts thread).|
| `static void Refresh()`                                                                                | Manually refresh tasks (usually auto-called).       |
| `static void RefreshTimerInIdle()`                                                                     | In bare-metal: auto-called during Thread/Mutex/Semaphore waits. |

> **Note**: All timer periods are in **milliseconds**. Timers are scheduled automatically by a management thread or the main loop. In bare-metal scenarios, timers are refreshed automatically with no user intervention.

## Typical Usage

```cpp
#include <timer.hpp>

void PrintHello(int* value) {
    printf("Hello, value = %d\n", *value);
}

int main() {
    int arg = 123;
    // Create a periodic task to call PrintHello every 1000 ms
    auto handle = LibXR::Timer::CreateTask(PrintHello, &arg, 1000);

    LibXR::Timer::Add(handle);    // Add to scheduler and auto-start
    LibXR::Timer::Start(handle);  // Start the task

    while (1) {
        // Main loop; no need to manually refresh timer in bare-metal
        // In multithreaded systems, other tasks can execute here
        LibXR::Thread::Sleep(UINT32_MAX);
    }
}
```

## Platform Adaptation Overview

| Scenario        | Key Implementation             | Scheduling Details                                       |
|------------------|-------------------------------|----------------------------------------------------------|
| Multithread/RTOS | Thread::SleepUntil + manager  | Automatically spawns manager thread; 1ms-precision loop. |
| Bare-metal       | Auto call RefreshTimerInIdle  | Refreshed automatically during Thread/Mutex/Semaphore wait. |

To port to a new platform, ensure only that Thread and Timebase are supported—no change to Timer logic is required.

## Implementation Notes

* Each task is wrapped in a ControlBlock, managed via a List.
* `CreateTask` supports argument-bound callbacks with type safety.
* First `Add` auto-creates task list and management thread (in RTOS).
* `Refresh` iterates enabled tasks and triggers them by cycle—no manual traversal.
* In bare-metal mode, delay/wait calls auto-refresh timers.
* Supports dynamic cycle change, task start/stop/delete during runtime.
* Asserts guard against invalid operations (e.g., double add or invalid remove).
